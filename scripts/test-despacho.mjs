// scripts/test-despacho.mjs — US-22 despacho marcado por el personal y aviso al
// farmacéutico de US-09 (Node >= 18, sin dependencias).
//
// Carga el código de los nodos desde los JSON versionados y prueba sus
// funciones fuera de n8n (el ensamblaje de n8n queda inerte sin `$`).
import { readFileSync } from 'node:fs';

const load = (file) => JSON.parse(readFileSync(new URL('../workflows/' + file, import.meta.url), 'utf8'));
function nodeApi(wf, nodeName, names) {
  const n = wf.nodes.find((x) => x.name === nodeName);
  if (!n || !n.parameters.jsCode) throw new Error('nodo ' + nodeName + ' sin código');
  return new Function(`${n.parameters.jsCode}\n; return { ${names.join(', ')} };`)();
}
const wf = load('US-22-despacho-personal.json');
const P = nodeApi(wf, 'parse_staff_command', ['parseTelegramUpdate', 'parseStaffCommand', 'isStaff', 'isAuthorized']);
const E = nodeApi(wf, 'evaluate_dispatch', ['evaluateDispatch', 'decideDispatch', 'buildInventoryUpdate']);
const wf09 = load('US-09-recetas-telegram.json');
const A = nodeApi(wf09, 'aviso_farmaceutico', ['buildPharmacistAlerts', 'driveLink']);

let passed = 0;
let failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log('PASS  ' + label); }
  else { failed++; console.log('FAIL  ' + label + (detail !== undefined ? ' — ' + JSON.stringify(detail) : '')); }
}

const SECRET = 's3cr3t';
const H = { 'x-telegram-bot-api-secret-token': SECRET };
const upd = (chat, text) => ({ update_id: 1, message: { chat: { id: chat }, text } });
const NOW = '2026-11-09T15:00:00.000Z';
const orden = (codigo, estado, cantidad = 2) => ({ json: { codigo_far: codigo, estado, cantidad, medicamento_id: 'MED-0002', telefono: '1234', rut: '11111111-1' } });
const inv = [{ json: { medicamento_id: 'MED-0002', stock_real: 65, stock_reservado: 3 } }];

// 1. Parser y autorización
check('1a "en ruta FAR-0007" -> ruta', JSON.stringify(P.parseStaffCommand('en ruta FAR-0007')) === JSON.stringify({ command: 'ruta', codigo_far: '#FAR-0007' }));
check('1b "/despachar #FAR-0007" -> ruta', P.parseStaffCommand('/despachar #FAR-0007').command === 'ruta');
check('1c "Entregado FAR-0007" -> entregado', P.parseStaffCommand('Entregado FAR-0007').command === 'entregado');
check('1d "entregar far0007" -> entregado', P.parseStaffCommand('entregar far0007').command === 'entregado');
check('1e texto común -> null', P.parseStaffCommand('hola') === null && P.parseStaffCommand('ruta sin codigo') === null);
check('1f chat del personal autorizado', P.parseTelegramUpdate(upd(901, 'en ruta FAR-0007'), H, SECRET, '901', '900').length === 1);
check('1g chat ajeno se descarta en silencio', P.parseTelegramUpdate(upd(555, 'en ruta FAR-0007'), H, SECRET, '901', '900').length === 0);
check('1h sin lista de personal, vale la de farmacéuticos', P.parseTelegramUpdate(upd(900, 'entregado FAR-0007'), H, SECRET, '', '900').length === 1);
check('1i listas vacías -> nadie autorizado', P.parseTelegramUpdate(upd(900, 'entregado FAR-0007'), H, SECRET, '', '').length === 0);
check('1j secreto incorrecto -> []', P.parseTelegramUpdate(upd(901, 'en ruta FAR-0007'), { 'x-telegram-bot-api-secret-token': 'x' }, SECRET, '901', '900').length === 0);

// 2. Transiciones válidas
const parsedRuta = { chat_id: '901', command: 'ruta', codigo_far: '#FAR-0007' };
const parsedEntrega = { chat_id: '901', command: 'entregado', codigo_far: '#FAR-0007' };
const r1 = E.evaluateDispatch(parsedRuta, [orden('FAR-0007', 'EN_PREPARACION')], inv, NOW);
check('2a EN_PREPARACION + ruta -> EN_RUTA', r1.decision === 'EN_RUTA' && r1.estado_anterior === 'EN_PREPARACION' && r1.estado_nuevo === 'EN_RUTA');
check('2b ruta no toca el stock', r1.update_stock === 'NO' && r1.inventory_update === null && r1.bitacora_row.delta_reservado === 0);
check('2c ruta avisa al vecino por su chat', r1.telefono === '1234' && /va en camino/.test(r1.message_customer));
check('2d bitácora con auditoría (actor personal:<chat>)', r1.bitacora_row.accion === 'DESPACHO_EN_RUTA' && r1.bitacora_row.actor === 'personal:901' && r1.bitacora_row.codigo_far === 'FAR-0007');
check('2e estado_ruta del despacho = EN_RUTA', r1.estado_ruta === 'EN_RUTA' && r1.fecha_marcado === NOW);
const r2 = E.evaluateDispatch(parsedEntrega, [orden('FAR-0007', 'EN_RUTA')], inv, NOW);
check('2f EN_RUTA + entregado -> ENTREGADO', r2.decision === 'ENTREGADO' && r2.estado_nuevo === 'ENTREGADO');
check('2g al entregar baja stock_real y stock_reservado en la cantidad', r2.update_stock === 'SI' && r2.inventory_update.stock_real === 63 && r2.inventory_update.stock_reservado === 1);
check('2h bitácora de entrega con delta negativo', r2.bitacora_row.accion === 'PEDIDO_ENTREGADO' && r2.bitacora_row.delta_reservado === -2);

// 3. Idempotencia y transiciones inválidas: nunca escriben
const inval = (estado, parsed) => E.evaluateDispatch(parsed, [orden('FAR-0007', estado)], inv, NOW);
check('3a entregado repetido no descuenta de nuevo', inval('ENTREGADO', parsedEntrega).decision === 'INVALID' && inval('ENTREGADO', parsedEntrega).update_stock === 'NO');
check('3b entregado sin pasar por ruta -> INVALID', inval('EN_PREPARACION', parsedEntrega).decision === 'INVALID');
check('3c ruta sobre pedido con receta pendiente -> INVALID', inval('PENDIENTE_RECETA', parsedRuta).decision === 'INVALID');
check('3d ruta sobre RECHAZADO o CANCELADO_EXPIRADO -> INVALID', inval('RECHAZADO', parsedRuta).decision === 'INVALID' && inval('CANCELADO_EXPIRADO', parsedRuta).decision === 'INVALID');
check('3e ruta repetida -> INVALID con mensaje claro', /ya estaba EN_RUTA/.test(inval('EN_RUTA', parsedRuta).message_staff));
check('3f INVALID no genera bitácora ni aviso al vecino', inval('ENTREGADO', parsedEntrega).bitacora_row === null && inval('ENTREGADO', parsedEntrega).message_customer === '');
const nf = E.evaluateDispatch(parsedRuta, [orden('FAR-0001', 'EN_PREPARACION')], inv, NOW);
check('3g pedido inexistente -> INVALID "No encontré"', nf.decision === 'INVALID' && /No encontré el pedido #FAR-0007/.test(nf.message_staff));

// 4. Bordes del inventario
check('4a stock con piso 0 (nunca negativo)', (() => { const u = E.buildInventoryUpdate({ cantidad: 5, medicamento_id: 'X' }, { stock_real: 2, stock_reservado: 1 }, NOW); return u.stock_real === 0 && u.stock_reservado === 0; })());
const sinInv = E.evaluateDispatch(parsedEntrega, [orden('FAR-0007', 'EN_RUTA')], [], NOW);
check('4b sin fila de inventario: no escribe stock y advierte', sinInv.update_stock === 'NO' && /Advertencia/.test(sinInv.message_staff));
check('4c código con o sin # y minúsculas', E.evaluateDispatch({ ...parsedRuta, codigo_far: 'far-0007' }, [orden('#FAR-0007', 'EN_PREPARACION')], inv, NOW).decision === 'EN_RUTA');

// 5. Grafo del workflow: el stock solo se toca en la rama de entrega
const c = wf.connections;
check('5a if_commit: válido -> update_orden; inválido -> reply_staff', c.if_commit.main[0][0].node === 'update_orden' && c.if_commit.main[1][0].node === 'reply_staff');
check('5b if_entrega: SI -> update_inventario; NO -> append_bitacora', c.if_entrega.main[0][0].node === 'update_inventario' && c.if_entrega.main[1][0].node === 'append_bitacora');
check('5c el disparador es interno (Execute Workflow Trigger)', wf.nodes.some((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger') && !wf.nodes.some((n) => n.type === 'n8n-nodes-base.webhook'));

// 6. US-09 aviso al farmacéutico
const alerts = A.buildPharmacistAlerts('#FAR-0003', { medicamento_id: 'MED-0002', cantidad: 1, rut: '11111111-1' }, { id: 'abc123' }, '900, 901');
check('6a un aviso por farmacéutico', alerts.length === 2 && alerts[0].json.chat_id === '900' && alerts[1].json.chat_id === '901');
check('6b el aviso trae el comando para decidir', /aprobar FAR-0003/.test(alerts[0].json.message) && /rechazar FAR-0003/.test(alerts[0].json.message));
check('6c el aviso trae el enlace a la receta', alerts[0].json.message.includes('https://drive.google.com/file/d/abc123/view'));
check('6d el aviso NO incluye el RUT (Ley 19.628)', !alerts[0].json.message.includes('11111111'));
check('6e sin farmacéuticos configurados -> sin avisos', A.buildPharmacistAlerts('FAR-0003', null, null, '').length === 0);
check('6f webViewLink tiene prioridad', A.driveLink({ id: 'x', webViewLink: 'https://drive.google.com/x' }) === 'https://drive.google.com/x');
check('6g US-09 conecta el aviso después de confirmar', JSON.stringify(wf09.connections.finalize_success).includes('aviso_farmaceutico'));

console.log('----------------------------------------');
console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
