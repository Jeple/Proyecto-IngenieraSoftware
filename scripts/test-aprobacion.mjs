/**
 * test-aprobacion.mjs — US-20 pharmacist approval test suite (Node >= 18, zero deps).
 *
 * Extracts the named functions from parse_pharmacist_command and
 * evaluate_approval jsCode in workflows/US-20-aprobacion-recetas.json and
 * asserts the approval/rejection behaviour, the AUTHORIZATION layers and the
 * idempotency guards over the origin state.
 */
import { readFileSync } from 'node:fs';

const workflowUrl = new URL('../workflows/US-20-aprobacion-recetas.json', import.meta.url);
const workflow = JSON.parse(readFileSync(workflowUrl, 'utf8'));

function apiOf(nodeName, names) {
  const node = workflow.nodes.find((n) => n.name === nodeName);
  if (!node || !node.parameters || !node.parameters.jsCode) {
    console.error('FAIL could not locate ' + nodeName + ' jsCode in workflow JSON');
    process.exit(1);
  }
  return new Function(node.parameters.jsCode + '\n;return { ' + names.join(', ') + ' };')();
}

const parseApi = apiOf('parse_pharmacist_command', [
  'isAuthorized',
  'isPharmacist',
  'sanitizeMotivo',
  'parsePharmacistCommand',
  'parseTelegramUpdate',
]);
const evalApi = apiOf('evaluate_approval', [
  'findOrderByCode',
  'findInventoryFor',
  'decideTransition',
  'buildInventoryUpdate',
  'buildBitacoraRow',
  'evaluateApproval',
]);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function makeOrder(overrides = {}) {
  return {
    codigo_far: 'FAR-0001',
    fecha_creacion: '2026-10-15T09:00:00.000Z',
    rut: '12.345.678-5',
    telefono: '56911111111',
    nombre_cliente: 'María Rojas',
    medicamento_id: 'MED-4410',
    cantidad: 3,
    precio_total_clp: 4990,
    estado: 'RECETA_RECIBIDA',
    url_receta: 'https://drive.google.com/file/d/abc/view',
    fecha_receta: '2026-10-15T10:00:00.000Z',
    fecha_expiracion: '2026-10-15T21:00:00.000Z',
    notas: '',
    ...overrides,
  };
}

function makeInventory(overrides = {}) {
  return {
    medicamento_id: 'MED-4410',
    stock_real: 50,
    stock_reservado: 10,
    ultima_actualizacion: '2026-10-15T09:00:00.000Z',
    ...overrides,
  };
}

const SECRET = 'us20-secret';
const goodHeaders = { 'X-Telegram-Bot-Api-Secret-Token': SECRET };
const PHARMACISTS = '11111, 22222';
const NOW = '2026-10-15T12:00:00.000Z';

// ---------------------------------------------------------------------------
// Tiny PASS/FAIL harness — any throw inside a check counts as FAIL.
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    const ok = fn();
    if (ok) {
      passed += 1;
      console.log(`PASS ${name}`);
    } else {
      failed += 1;
      console.log(`FAIL ${name}`);
    }
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} — threw: ${error.message}`);
  }
}

// 1. Webhook secret layer.
check('1. isAuthorized accepts correct secret, rejects wrong and missing', () => {
  return (
    parseApi.isAuthorized(goodHeaders, SECRET) === true &&
    parseApi.isAuthorized(goodHeaders, 'wrong') === false &&
    parseApi.isAuthorized({}, SECRET) === false &&
    parseApi.isAuthorized(undefined, SECRET) === false &&
    parseApi.isAuthorized({ 'x-telegram-bot-api-secret-token': SECRET }, SECRET) === true
  );
});

// 2. Pharmacist chat allowlist.
check('2. isPharmacist matches trimmed ids, rejects outsiders and empty list', () => {
  return (
    parseApi.isPharmacist('22222', PHARMACISTS) === true &&
    parseApi.isPharmacist('11111', PHARMACISTS) === true &&
    parseApi.isPharmacist('33333', PHARMACISTS) === false &&
    parseApi.isPharmacist('22222', '') === false &&
    parseApi.isPharmacist('22222', undefined) === false &&
    parseApi.isPharmacist(null, PHARMACISTS) === false
  );
});

// 3. Command parsing: variants, optional slash and '#', strict code shape.
check('3. parsePharmacistCommand accepts variants and rejects non-commands', () => {
  const a = parseApi.parsePharmacistCommand('aprobar FAR-0001');
  const b = parseApi.parsePharmacistCommand('APROBAR #far-0001');
  const c = parseApi.parsePharmacistCommand('/rechazar FAR-0002 Receta ilegible');
  return (
    a && a.command === 'aprobar' && a.codigo_far === '#FAR-0001' && a.motivo === '' &&
    b && b.command === 'aprobar' && b.codigo_far === '#FAR-0001' &&
    c && c.command === 'rechazar' && c.codigo_far === '#FAR-0002' && c.motivo === 'Receta ilegible' &&
    parseApi.parsePharmacistCommand('hola') === null &&
    parseApi.parsePharmacistCommand('aprobar') === null &&
    parseApi.parsePharmacistCommand('aprobar FAR-123') === null &&
    parseApi.parsePharmacistCommand('') === null &&
    parseApi.parsePharmacistCommand(null) === null
  );
});

// 4. Motivo sanitization: quotes, backslashes and newlines never reach JSON bodies.
check('4. sanitizeMotivo strips JSON-unsafe characters and limits length', () => {
  const dirty = parseApi.sanitizeMotivo('cita "x" y \\ z');
  const long = parseApi.sanitizeMotivo('a'.repeat(300));
  return (
    !/["\\\r\n\t]/.test(dirty) &&
    dirty.includes('cita') &&
    long.length === 120
  );
});

// 5. Full Telegram update parsing: happy path.
check('5. valid pharmacist update -> { chat_id, command, codigo_far, motivo }', () => {
  const items = parseApi.parseTelegramUpdate(
    {
      update_id: 700001,
      message: {
        message_id: 41,
        chat: { id: 22222, type: 'private' },
        date: 1770000000,
        text: 'aprobar FAR-0001',
      },
    },
    goodHeaders,
    SECRET,
    PHARMACISTS
  );
  return (
    items.length === 1 &&
    items[0].json.chat_id === '22222' &&
    items[0].json.command === 'aprobar' &&
    items[0].json.codigo_far === '#FAR-0001'
  );
});

// 6. Unauthorized updates produce EMPTY output (silent drop).
check('6. wrong secret / non-pharmacist / non-command / non-text -> EMPTY', () => {
  const goodUpdate = {
    update_id: 700002,
    message: { message_id: 42, chat: { id: 22222, type: 'private' }, date: 1, text: 'aprobar FAR-0001' },
  };
  return (
    parseApi.parseTelegramUpdate(goodUpdate, { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' }, SECRET, PHARMACISTS).length === 0 &&
    parseApi.parseTelegramUpdate(goodUpdate, {}, SECRET, PHARMACISTS).length === 0 &&
    parseApi.parseTelegramUpdate(goodUpdate, goodHeaders, SECRET, '99999').length === 0 &&
    parseApi.parseTelegramUpdate({ ...goodUpdate, message: { ...goodUpdate.message, text: 'hola' } }, goodHeaders, SECRET, PHARMACISTS).length === 0 &&
    parseApi.parseTelegramUpdate({ ...goodUpdate, message: { ...goodUpdate.message, text: '' } }, goodHeaders, SECRET, PHARMACISTS).length === 0 &&
    parseApi.parseTelegramUpdate({ update_id: 1 }, goodHeaders, SECRET, PHARMACISTS).length === 0
  );
});

// 7. Approve from RECETA_RECIBIDA.
check('7. aprobar + RECETA_RECIBIDA -> APPROVE sin cambio de stock', () => {
  const d = evalApi.decideTransition(makeOrder(), 'aprobar', '', '#FAR-0001');
  return (
    d.decisionKey === 'APPROVE' &&
    d.estado_anterior === 'RECETA_RECIBIDA' &&
    d.estado_nuevo === 'EN_PREPARACION' &&
    d.delta_reservado === 0 &&
    d.customer_message.includes('#FAR-0001')
  );
});

// 8. Reject from RECETA_RECIBIDA carries the motive and the stock delta.
check('8. rechazar + RECETA_RECIBIDA -> REJECT con motivo y delta', () => {
  const d = evalApi.decideTransition(makeOrder(), 'rechazar', 'receta ilegible', '#FAR-0001');
  return (
    d.decisionKey === 'REJECT' &&
    d.estado_nuevo === 'RECHAZADO' &&
    d.delta_reservado === -3 &&
    d.customer_message.includes('receta ilegible')
  );
});

// 9. Idempotency: repeated commands never produce writes.
check('9. repetidos -> INVALID sin cambios (aprobar EN_PREPARACION, rechazar RECHAZADO)', () => {
  const a = evalApi.decideTransition(makeOrder({ estado: 'EN_PREPARACION' }), 'aprobar', '', '#FAR-0001');
  const r = evalApi.decideTransition(makeOrder({ estado: 'RECHAZADO' }), 'rechazar', '', '#FAR-0001');
  return (
    a.decisionKey === 'INVALID' && a.pharmacist_message.includes('ya estaba aprobado') &&
    r.decisionKey === 'INVALID' && r.pharmacist_message.includes('ya estaba rechazado')
  );
});

// 10. Wrong origin states -> INVALID, no writes.
check('10. otros estados de origen -> INVALID', () => {
  const states = ['PENDIENTE_RECETA', 'EN_RUTA', 'ENTREGADO', 'CANCELADO_EXPIRADO'];
  return states.every((estado) => {
    const d1 = evalApi.decideTransition(makeOrder({ estado }), 'aprobar', '', '#FAR-0001');
    const d2 = evalApi.decideTransition(makeOrder({ estado }), 'rechazar', '', '#FAR-0001');
    return d1.decisionKey === 'INVALID' && d2.decisionKey === 'INVALID';
  });
});

// 11. Unknown order and unknown command are handled without throwing.
check('11. pedido inexistente y comando desconocido -> INVALID', () => {
  const noOrder = evalApi.decideTransition(null, 'aprobar', '', '#FAR-9999');
  const badCommand = evalApi.decideTransition(makeOrder(), 'pagar', '', '#FAR-0001');
  return (
    noOrder.decisionKey === 'INVALID' && noOrder.pharmacist_message.includes('#FAR-9999') &&
    badCommand.decisionKey === 'INVALID' && badCommand.pharmacist_message.includes('Comando no reconocido')
  );
});

// 12. Inventory update math: exact release and clamp at zero.
check('12. buildInventoryUpdate libera exacto y nunca queda negativo', () => {
  const exact = evalApi.buildInventoryUpdate(makeOrder({ cantidad: 3 }), makeInventory({ stock_reservado: 10 }), NOW);
  const clamp = evalApi.buildInventoryUpdate(makeOrder({ cantidad: 5 }), makeInventory({ stock_reservado: 2 }), NOW);
  const missing = evalApi.buildInventoryUpdate(makeOrder(), null, NOW);
  return (
    exact && exact.stock_reservado === 7 && exact.stock_real === 50 &&
    exact.ultima_actualizacion === NOW &&
    clamp && clamp.stock_reservado === 0 &&
    missing === null
  );
});

// 13. Code lookup tolerates the '#' and case.
check('13. findOrderByCode normaliza # y mayúsculas', () => {
  const found = evalApi.findOrderByCode('far-0001', [makeOrder()]);
  const missing = evalApi.findOrderByCode('FAR-9999', [makeOrder()]);
  return Boolean(found) && found.codigo_far === 'FAR-0001' && missing === null;
});

// 14. Bitacora row: extended audit columns on approval.
check('14. bitacora de aprobación con estado_anterior/estado_nuevo/actor', () => {
  const d = evalApi.decideTransition(makeOrder(), 'aprobar', '', '#FAR-0001');
  const row = evalApi.buildBitacoraRow(makeOrder(), d, '22222', '', NOW);
  return (
    row.accion === 'RECETA_APROBADA' &&
    row.codigo_far === 'FAR-0001' &&
    row.estado_anterior === 'RECETA_RECIBIDA' &&
    row.estado_nuevo === 'EN_PREPARACION' &&
    row.delta_reservado === 0 &&
    row.actor === 'farmaceutico:22222' &&
    row.detalle.includes('22222') &&
    row.timestamp === NOW
  );
});

// 15. Bitacora row: rejection records the motive.
check('15. bitacora de rechazo con motivo y delta negativo', () => {
  const d = evalApi.decideTransition(makeOrder(), 'rechazar', 'foto borrosa', '#FAR-0001');
  const row = evalApi.buildBitacoraRow(makeOrder(), d, '22222', 'foto borrosa', NOW);
  return (
    row.accion === 'RECETA_RECHAZADA' &&
    row.delta_reservado === -3 &&
    row.estado_nuevo === 'RECHAZADO' &&
    row.detalle.includes('foto borrosa')
  );
});

// 16. Full payload: approval writes the order and the log, never the inventory.
check('16. evaluateApproval aprobación: update_stock NO y bitacora presente', () => {
  const p = evalApi.evaluateApproval(
    { chat_id: '22222', command: 'aprobar', codigo_far: '#FAR-0001', motivo: '' },
    [makeOrder()],
    [makeInventory()],
    NOW
  );
  return (
    Boolean(p) &&
    p.decision === 'APPROVE' &&
    p.codigo_far === 'FAR-0001' &&
    p.update_stock === 'NO' &&
    p.inventory_update === null &&
    Boolean(p.bitacora_row) &&
    p.telefono === '56911111111' &&
    p.message_customer.includes('#FAR-0001')
  );
});

// 17. Full payload: rejection writes inventory with the released value.
check('17. evaluateApproval rechazo: update_stock SI con stock liberado', () => {
  const p = evalApi.evaluateApproval(
    { chat_id: '22222', command: 'rechazar', codigo_far: '#FAR-0001', motivo: 'ilegible' },
    [makeOrder()],
    [makeInventory({ stock_reservado: 10 })],
    NOW
  );
  return (
    Boolean(p) &&
    p.decision === 'REJECT' &&
    p.update_stock === 'SI' &&
    p.inventory_update.stock_reservado === 7 &&
    p.message_pharmacist.includes('liberó') &&
    p.bitacora_row.accion === 'RECETA_RECHAZADA'
  );
});

// 18. Rejection without an inventory row warns and does not write stock.
check('18. rechazo sin fila de inventario -> warning, sin update de stock', () => {
  const p = evalApi.evaluateApproval(
    { chat_id: '22222', command: 'rechazar', codigo_far: '#FAR-0001', motivo: '' },
    [makeOrder()],
    [],
    NOW
  );
  return (
    Boolean(p) &&
    p.decision === 'REJECT' &&
    p.update_stock === 'NO' &&
    p.inventory_update === null &&
    p.message_pharmacist.includes('Advertencia') &&
    Boolean(p.bitacora_row)
  );
});

// 19. Invalid decisions carry no writes but carry a reply.
check('19. evaluateApproval INVALID: sin escrituras, con respuesta', () => {
  const p = evalApi.evaluateApproval(
    { chat_id: '22222', command: 'aprobar', codigo_far: '#FAR-9999', motivo: '' },
    [makeOrder()],
    [makeInventory()],
    NOW
  );
  const empty = evalApi.evaluateApproval(null, [], [], NOW);
  return (
    Boolean(p) &&
    p.decision === 'INVALID' &&
    p.update_stock === 'NO' &&
    p.inventory_update === null &&
    p.bitacora_row === null &&
    p.message_customer === '' &&
    p.message_pharmacist.length > 0 &&
    empty === null
  );
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const summary = `${failed === 0 ? 'PASS' : 'FAIL'}: ${passed} passed, ${failed} failed`;
console.log(summary);
process.exit(failed === 0 ? 0 : 1);
