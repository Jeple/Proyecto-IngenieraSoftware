/**
 * test-trazabilidad.mjs — US-06 delivery tracking test suite (Node >= 18, zero deps).
 *
 * Extracts the named functions from build_tracking_reply's jsCode in
 * workflows/US-06-trazabilidad.json and asserts the RF-07 behaviour.
 */
import { readFileSync } from 'node:fs';

const workflowUrl = new URL('../workflows/US-06-trazabilidad.json', import.meta.url);
const workflow = JSON.parse(readFileSync(workflowUrl, 'utf8'));

const buildNode = workflow.nodes.find((node) => node.name === 'build_tracking_reply');
if (!buildNode || !buildNode.parameters || !buildNode.parameters.jsCode) {
  console.error('FAIL could not locate build_tracking_reply jsCode in workflow JSON');
  process.exit(1);
}

// The n8n assembly block is guarded by `typeof $ !== 'undefined'`, so evaluating
// the whole jsCode outside n8n only defines the named functions.
const factory = new Function(
  buildNode.parameters.jsCode +
    '\n;return { extractCode, extractRut, normalizeRut, findOrder, statusMessage, buildTrackingReply };'
);
const {
  extractCode,
  extractRut,
  normalizeRut,
  findOrder,
  statusMessage,
  buildTrackingReply,
} = factory();

const parseNode = workflow.nodes.find((node) => node.name === 'parse_tracking_request');
if (!parseNode || !parseNode.parameters || !parseNode.parameters.jsCode) {
  console.error('FAIL could not locate parse_tracking_request jsCode in workflow JSON');
  process.exit(1);
}
const parseApi = new Function(
  parseNode.parameters.jsCode + '\n;return { isAuthorized, parseTelegramUpdate };'
)();

// ---------------------------------------------------------------------------
// Fixtures (rows follow the authoritative schema from setup-sheets.gs)
// ---------------------------------------------------------------------------
function makeOrder(overrides = {}) {
  return {
    codigo_far: 'FAR-0001',
    fecha_creacion: '2026-10-01T09:00:00.000Z',
    rut: '12.345.678-5',
    telefono: '56911111111',
    nombre_cliente: 'María Rojas',
    medicamento_id: 'MED-4410',
    cantidad: 3,
    precio_total_clp: 4990,
    estado: 'PENDIENTE_RECETA',
    url_receta: '',
    fecha_receta: '',
    fecha_expiracion: '',
    notas: 'Pregabalina 75 mg despacho a domicilio',
    ...overrides,
  };
}

const catalog = [makeOrder()];
const noDispatches = [];

const NOT_FOUND =
  'No encontré ese pedido. Revisa el código #FAR-XXXX o tu RUT e inténtalo de nuevo.';
const FALLBACK = 'Tu pedido #FAR-0001 está en revisión. Consulta en la farmacia.';

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

// 1. Code extraction is case/symbol tolerant and normalizes identically.
check('1. extractCode normalizes #FAR-0001 / far-0001 / FAR-0001', () => {
  const a = extractCode('#FAR-0001');
  const b = extractCode('far-0001');
  const c = extractCode('FAR-0001');
  return a === '#FAR-0001' && a === b && b === c;
});

// 2. Text without a code extracts nothing and never throws.
check('2. no code in text -> null, no throw', () => {
  return extractCode('hola buenas tardes') === null && extractCode('') === null;
});

// 3. RUT normalization is format-tolerant; malformed input yields none.
check('3. extractRut normalizes dotted/plain RUT, rejects malformed', () => {
  const dotted = extractRut('12.345.678-5');
  const plain = extractRut('12345678-5');
  if (dotted === null || dotted !== plain) return false;
  if (extractRut('12.345.67') !== null) return false;
  if (extractRut('esto no es un RUT 12345') !== null) return false;
  if (extractRut(null) !== null) return false;
  if (normalizeRut('12.345.678-5') !== normalizeRut('12345678-5')) return false;
  return true;
});

// 4. Lookup by code works when the request carries no RUT.
check('4. lookup by code succeeds without RUT', () => {
  const reply = buildTrackingReply({ chat_id: '56911111111', codigo_far: '#FAR-0001' }, catalog, noDispatches);
  return Boolean(reply) && reply.message.includes('#FAR-0001') && reply.chat_id === '56911111111';
});

// 5. When both code and RUT are present, the code match wins.
check('5. code takes precedence over RUT', () => {
  const other = makeOrder({
    codigo_far: 'FAR-0007',
    rut: '99.999.999-9',
    fecha_creacion: '2026-10-02T09:00:00.000Z',
    estado: 'ENTREGADO',
  });
  const picked = findOrder({ codigo_far: '#FAR-0001', rut: '99.999.999-9' }, [makeOrder(), other]);
  const reply = buildTrackingReply(
    { chat_id: '56911111111', codigo_far: '#FAR-0001', rut: '99.999.999-9' },
    [makeOrder(), other],
    noDispatches
  );
  return (
    Boolean(picked) &&
    picked.codigo_far === 'FAR-0001' &&
    reply.message.includes('#FAR-0001') &&
    !reply.message.includes('#FAR-0007')
  );
});

// 6. RUT lookup: most recent fecha_creacion wins; tie -> highest code suffix.
check('6. RUT lookup picks most recent, ties broken by code number', () => {
  const older = makeOrder({ codigo_far: 'FAR-0002', fecha_creacion: '2026-10-01T08:00:00.000Z' });
  const newer = makeOrder({ codigo_far: 'FAR-0005', fecha_creacion: '2026-10-03T08:00:00.000Z' });
  const byDate = findOrder({ rut: '12345678-5' }, [older, newer]);
  const tieA = makeOrder({ codigo_far: 'FAR-0003', fecha_creacion: '2026-10-04T08:00:00.000Z' });
  const tieB = makeOrder({ codigo_far: 'FAR-0009', fecha_creacion: '2026-10-04T08:00:00.000Z' });
  const byTie = findOrder({ rut: '12.345.678-5' }, [tieA, tieB]);
  return (
    Boolean(byDate) &&
    byDate.codigo_far === 'FAR-0005' &&
    Boolean(byTie) &&
    byTie.codigo_far === 'FAR-0009'
  );
});

// 7. All six enum states produce distinct, non-empty messages with the code.
check('7. six enum states -> six distinct non-empty messages with #FAR-0001', () => {
  const states = [
    'PENDIENTE_RECETA',
    'RECETA_RECIBIDA',
    'EN_PREPARACION',
    'EN_RUTA',
    'ENTREGADO',
    'CANCELADO_EXPIRADO',
  ];
  const messages = states.map((estado) => {
    const reply = buildTrackingReply(
      { chat_id: '56911111111', codigo_far: '#FAR-0001' },
      [makeOrder({ estado })],
      noDispatches
    );
    return reply ? reply.message : '';
  });
  return (
    messages.every((m) => typeof m === 'string' && m.length > 0 && m.includes('#FAR-0001')) &&
    messages.every((m) => !m.includes('está en revisión')) &&
    new Set(messages).size === 6
  );
});

// 8. Unknown code -> neutral not-found copy with no price, stock or status claim.
check('8. unknown code -> neutral not-found, no price/stock/status leaked', () => {
  const reply = buildTrackingReply({ chat_id: '56911111111', codigo_far: '#FAR-9999' }, catalog, noDispatches);
  if (!reply) return false;
  const message = reply.message;
  return (
    message === NOT_FOUND &&
    !message.includes('$') &&
    !/\d/.test(message) &&
    !message.includes('Pregabalina') &&
    !message.includes('MED-4410') &&
    !message.includes('Rojas') &&
    !message.includes('4990') &&
    !message.includes('stock') &&
    !/esperando|preparación|bodega|en camino|entregado|cancelado|revisión/i.test(message)
  );
});

// 9. EN_RUTA appends ETA only when eta_minutos is a positive number.
check('9. EN_RUTA ETA appended when positive, omitted when null', () => {
  const baseDispatch = {
    codigo_far: 'FAR-0001',
    sector: 'Peñalolén Alto',
    direccion: 'Av. 5 de Abril 1234',
    estado_ruta: 'EN_RUTA',
    fecha_marcado: '2026-10-01T10:00:00.000Z',
  };
  const withEta = buildTrackingReply(
    { chat_id: '56911111111', codigo_far: '#FAR-0001' },
    [makeOrder({ estado: 'EN_RUTA' })],
    [{ ...baseDispatch, eta_minutos: 18 }]
  ).message;
  const withoutEta = buildTrackingReply(
    { chat_id: '56911111111', codigo_far: '#FAR-0001' },
    [makeOrder({ estado: 'EN_RUTA' })],
    [{ ...baseDispatch, eta_minutos: null }]
  ).message;
  return (
    withEta.includes('18 minutos') &&
    withEta.includes('Sector: Peñalolén Alto') &&
    !withoutEta.includes('estimada') &&
    withoutEta.includes('va en camino')
  );
});

// 10. Estado outside the enum falls back without inventing detail.
check('10. estado outside enum -> neutral fallback, no invented detail', () => {
  const reply = buildTrackingReply(
    { chat_id: '56911111111', codigo_far: '#FAR-0001' },
    [makeOrder({ estado: 'DESPACHADO_MAL' })],
    noDispatches
  );
  return Boolean(reply) && reply.message === FALLBACK;
});

// 11. Empty input produces no output at all.
check('11. empty input -> empty output (null reply, no message)', () => {
  return (
    buildTrackingReply(null, catalog, noDispatches) === null &&
    buildTrackingReply(undefined, catalog, noDispatches) === null &&
    buildTrackingReply({}, catalog, noDispatches) === null &&
    buildTrackingReply({ chat_id: '56911111111' }, catalog, noDispatches) === null
  );
});

// 12. Telegram webhook parsing + secret check (transport contract).
const SECRET = 'us06-secret';
const goodHeaders = { 'X-Telegram-Bot-Api-Secret-Token': SECRET };
check('12. isAuthorized accepts correct secret, rejects wrong and missing', () => {
  return (
    parseApi.isAuthorized(goodHeaders, SECRET) === true &&
    parseApi.isAuthorized(goodHeaders, 'wrong') === false &&
    parseApi.isAuthorized({}, SECRET) === false &&
    parseApi.isAuthorized(undefined, SECRET) === false &&
    parseApi.isAuthorized({ 'x-telegram-bot-api-secret-token': SECRET }, SECRET) === true
  );
});

// 13. A valid Telegram update extracts chat_id + codigo_far.
check('13. valid update -> { chat_id, codigo_far }', () => {
  const items = parseApi.parseTelegramUpdate(
    {
      update_id: 600001,
      message: {
        message_id: 31,
        chat: { id: -100777888, type: 'private' },
        date: 1770000000,
        text: 'mi pedido FAR-0001 por favor',
      },
    },
    goodHeaders,
    SECRET
  );
  return (
    items.length === 1 &&
    items[0].chat_id === '-100777888' &&
    items[0].codigo_far === '#FAR-0001'
  );
});

// 14. Update without message and unauthorized requests produce EMPTY results.
check('14. update without message -> EMPTY; unauthorized -> EMPTY', () => {
  const update = {
    update_id: 600002,
    message: {
      message_id: 32,
      chat: { id: -100777888, type: 'private' },
      date: 1770000001,
      text: 'FAR-0001',
    },
  };
  return (
    parseApi.parseTelegramUpdate({ update_id: 1 }, goodHeaders, SECRET).length === 0 &&
    parseApi.parseTelegramUpdate(update, { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' }, SECRET).length === 0 &&
    parseApi.parseTelegramUpdate(update, {}, SECRET).length === 0
  );
});

// 15. Titularidad: un tercero no puede consultar por código; recibe el mismo
// mensaje neutro que un pedido inexistente, sin filtrar datos.
check('15. chat de tercero por código -> no encontrado, sin filtrar datos', () => {
  const reply = buildTrackingReply(
    { chat_id: '56999999999', codigo_far: '#FAR-0001' },
    catalog,
    noDispatches
  );
  return Boolean(reply) && reply.message === NOT_FOUND && reply.chat_id === '56999999999';
});

// 16. Titularidad: un tercero tampoco puede consultar por RUT.
check('16. chat de tercero por RUT -> no encontrado', () => {
  const reply = buildTrackingReply(
    { chat_id: '56999999999', rut: '12.345.678-5' },
    catalog,
    noDispatches
  );
  return Boolean(reply) && reply.message === NOT_FOUND;
});

// 17. El titular por RUT sigue funcionando; un pedido sin teléfono (fila
// legada) no es consultable.
check('17. titular por RUT OK; pedido sin teléfono -> no encontrado', () => {
  const byRut = buildTrackingReply(
    { chat_id: '56911111111', rut: '12.345.678-5' },
    catalog,
    noDispatches
  );
  const legacy = buildTrackingReply(
    { chat_id: '56911111111', codigo_far: '#FAR-0002' },
    [makeOrder({ codigo_far: 'FAR-0002', telefono: '' })],
    noDispatches
  );
  return (
    Boolean(byRut) &&
    byRut.message.includes('#FAR-0001') &&
    Boolean(legacy) &&
    legacy.message === NOT_FOUND
  );
});

// 18. Mismo RUT en chats distintos: cada titular ve solo su pedido más reciente.
check('18. mismo RUT, chats distintos -> cada uno ve el suyo', () => {
  const mine = makeOrder({
    codigo_far: 'FAR-0002',
    telefono: '56911111111',
    fecha_creacion: '2026-10-01T08:00:00.000Z',
  });
  const otherNewer = makeOrder({
    codigo_far: 'FAR-0009',
    telefono: '56999999999',
    fecha_creacion: '2026-10-05T08:00:00.000Z',
  });
  const reply = buildTrackingReply(
    { chat_id: '56911111111', rut: '12.345.678-5' },
    [mine, otherNewer],
    noDispatches
  );
  return (
    Boolean(reply) &&
    reply.message.includes('#FAR-0002') &&
    !reply.message.includes('#FAR-0009')
  );
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const summary = `${failed === 0 ? 'PASS' : 'FAIL'}: ${passed} passed, ${failed} failed`;
console.log(summary);
process.exit(failed === 0 ? 0 : 1);
