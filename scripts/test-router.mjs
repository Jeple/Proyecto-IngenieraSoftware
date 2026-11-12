// scripts/test-router.mjs — US-17 router de intenciones (Node >= 18, sin dependencias).
//
// Carga el código de los nodos `clasificar` y `aplicar_llm` desde
// workflows/US-17-router-telegram.json y prueba sus funciones fuera de n8n.
// Incluye pruebas de CONTRATO: la salida del router se pasa a los parsers y al
// buscador reales de US-04, US-05, US-06 y US-20 para comprobar que el
// subflujo entiende lo que el router le entrega.
import { readFileSync } from 'node:fs';

const load = (file) => JSON.parse(readFileSync(new URL('../workflows/' + file, import.meta.url), 'utf8'));
function nodeApi(wf, nodeName, names) {
  const n = wf.nodes.find((x) => x.name === nodeName);
  if (!n || !n.parameters.jsCode) throw new Error('nodo ' + nodeName + ' sin código');
  return new Function(`${n.parameters.jsCode}\n; return { ${names.join(', ')} };`)();
}

const router = load('US-17-router-telegram.json');
const R = nodeApi(router, 'clasificar', ['classifyUpdate', 'limpiarConsulta', 'normalizarReserva', 'esReserva', 'isAuthorized', 'MENSAJES']);
const L = nodeApi(router, 'aplicar_llm', ['etiquetaDesdeGemini', 'aplicarEtiqueta']);
const us04 = load('US-04-consulta-stock.json');
const M04 = nodeApi(us04, 'build_reply', ['matchMedicine', 'buildReplyText']);
const P04 = nodeApi(us04, 'parse_incoming', ['parseTelegramUpdate']);
const us05 = load('US-05-reserva.json');
const P05 = nodeApi(us05, 'parse_reservation', ['parseTelegramUpdate']);
const us06 = load('US-06-trazabilidad.json');
const P06 = nodeApi(us06, 'parse_tracking_request', ['parseTelegramUpdate']);
const us20 = load('US-20-aprobacion-recetas.json');
const P20 = nodeApi(us20, 'parse_pharmacist_command', ['parseTelegramUpdate']);
const us22 = load('US-22-despacho-personal.json');
const P22 = nodeApi(us22, 'parse_staff_command', ['parseTelegramUpdate']);

let passed = 0;
let failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log('PASS  ' + label); }
  else { failed++; console.log('FAIL  ' + label + (detail !== undefined ? ' — ' + JSON.stringify(detail) : '')); }
}

const SECRET = 'secreto-test';
const H = { 'X-Telegram-Bot-Api-Secret-Token': SECRET };
const ENV = { secret: SECRET, pharmacists: '900', staff: '901', geminiKey: '' };
const upd = (chat, text, extra = {}) => ({ update_id: 1, message: { message_id: 1, date: 1794240000, chat: { id: chat }, text, ...extra } });
const cls = (text, chat = 100, env = ENV, extra = {}) => R.classifyUpdate(upd(chat, text, extra), H, env);

// Catálogo sintético mínimo (mismo formato que la hoja `catalogo`).
const catalogo = [
  ['MED-0001', 'Pregalex', 'Pregabalina', '75 mg'], ['MED-0002', 'Neurogab', 'Pregabalina', '75 mg'],
  ['MED-0011', 'Losarmed', 'Losartán', '50 mg'], ['MED-0013', 'Esciprax', 'Escitalopram', '10 mg'],
  ['MED-0005', 'Somnia', 'Melatonina', '3 mg']
].map(([medicamento_id, nombre_comercial, principio_activo, dosis]) => ({ medicamento_id, nombre_comercial, principio_activo, dosis, activo: 'SI', precio_unitario_clp: 1000, bioequivalente_de: '' }));

// 1. Seguridad del transporte
check('1a sin secreto -> null (descarte silencioso)', R.classifyUpdate(upd(1, 'hola'), {}, ENV) === null);
check('1b secreto incorrecto -> null', R.classifyUpdate(upd(1, 'hola'), { 'x-telegram-bot-api-secret-token': 'otro' }, ENV) === null);
check('1c secreto vacío en el entorno -> null', R.classifyUpdate(upd(1, 'hola'), H, { ...ENV, secret: '' }) === null);
check('1d update sin message (edited_message) -> null', R.classifyUpdate({ update_id: 2, edited_message: {} }, H, ENV) === null);
check('1e encabezado sin distinguir mayúsculas', R.isAuthorized({ 'x-telegram-bot-api-secret-token': SECRET }, SECRET) === true);

// 2. Intenciones por regla
check('2a foto -> receta', cls(undefined, 100, ENV, { photo: [{ file_id: 'a' }], caption: '#FAR-0003' }).intent === 'receta');
check('2b imagen como documento -> receta', cls(undefined, 100, ENV, { document: { mime_type: 'image/jpeg', file_id: 'b' } }).intent === 'receta');
check('2c sticker sin texto -> respuesta sin_texto', cls(undefined, 100, ENV, { sticker: {} }).motivo === 'sin_texto');
check('2d aprobar desde farmacéutico -> aprobacion', cls('aprobar FAR-0003', 900).intent === 'aprobacion');
check('2e rechazar con motivo -> aprobacion', cls('rechazar #FAR-0003 receta vencida', 900).intent === 'aprobacion');
check('2f aprobar desde chat común NO es aprobacion (va a estado)', cls('aprobar FAR-0003', 100).intent === 'estado');
check('2g "en ruta" desde personal -> despacho', cls('en ruta FAR-0003', 901).intent === 'despacho');
check('2h "entregado" desde personal -> despacho', cls('Entregado FAR-0003', 901).intent === 'despacho');
check('2i sin lista de personal, el farmacéutico puede despachar', cls('en ruta FAR-0003', 900, { ...ENV, staff: '' }).intent === 'despacho');
check('2j "en ruta" desde chat común NO es despacho', cls('en ruta FAR-0003', 100).intent !== 'despacho');
check('2j2 "revisar vencidos" desde el personal -> expiracion (US-10)', cls('revisar vencidos', 901).intent === 'expiracion');
check('2j3 "revisar vencidos" desde un chat común NO ejecuta la expiración', cls('revisar vencidos', 100).intent !== 'expiracion');
check('2k hola -> bienvenida', cls('hola').motivo === 'bienvenida' && cls('hola').reply.includes('asistente virtual'));
check('2l /start -> bienvenida', cls('/start').motivo === 'bienvenida');
check('2m "buenas tardes!" -> bienvenida', cls('buenas tardes!').motivo === 'bienvenida');
check('2n reservar ... -> reserva', cls('reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto').intent === 'reserva');
check('2o "hola, quiero reservar" -> reserva', cls('hola, quiero reservar losarmed 50 x2 rut 11.111.111-1, Calle 1, San Luis').intent === 'reserva');
check('2p "el estado de mi reserva FAR-0002" NO es reserva', cls('el estado de mi reserva FAR-0002').intent === 'estado');
check('2q código FAR -> estado', cls('estado #FAR-0002').intent === 'estado');
check('2r RUT -> estado', cls('mi rut es 11.111.111-1').intent === 'estado');
check('2s "estado de mi pedido" sin dato -> pide código o RUT', cls('quiero saber el estado de mi pedido').motivo === 'estado_sin_dato');
check('2t nombre de remedio -> consulta', cls('pregavalina 75').intent === 'consulta');
check('2u texto largo sin regla -> ambiguo', cls('necesito hablar con alguien de la oficina sobre un tema de mi abuela que vive sola').intent === 'ambiguo');

// 3. Seguridad clínica (RNF-08) antes que la intención comercial
check('3a urgencia -> SAMU 131', cls('me duele el pecho y no puedo respirar').reply.includes('SAMU 131'));
check('3b sobredosis -> SAMU 131', cls('mi papá se tomó una sobredosis de pastillas').reply.includes('SAMU 131'));
check('3c autolesión -> *4141', cls('ya no quiero vivir').reply.includes('*4141'));
check('3d dosis -> sin consejo clínico', cls('¿cuántas pastillas de losartán me tomo?').motivo === 'consejo_clinico');
check('3e "para qué sirve" -> sin consejo clínico', cls('para que sirve la sertralina').motivo === 'consejo_clinico');
check('3f la urgencia gana aunque nombre un remedio', cls('me tome todas las pregabalina, me siento mal').motivo === 'urgencia');
check('3h "me duele el pecho" es urgencia (no consejo)', cls('me duele el pecho').motivo === 'urgencia');
check('3i horario o dirección -> fuera de dominio (no busca un remedio)', cls('a que hora abren mañana en la farmacia').motivo === 'fuera_de_dominio' && cls('cual es la direccion de la farmacia').motivo === 'fuera_de_dominio');
check('3j "a qué hora llega mi pedido" sigue siendo estado', cls('a qué hora llega mi pedido').motivo === 'estado_sin_dato');
check('3g ningún mensaje clínico menciona dosis ni nombres de remedios',
  ['urgencia', 'autolesion', 'consejo', 'fuera_de_dominio'].every((k) => !/\d+\s*mg|pregabalina|losart/i.test(R.MENSAJES[k])));

// 4. Normalización del texto
check('4a limpiarConsulta quita saludo y muletillas', R.limpiarConsulta('hola, ¿hay pregavalina 75?') === 'pregavalina 75', R.limpiarConsulta('hola, ¿hay pregavalina 75?'));
check('4b conserva dosis y unidad', R.limpiarConsulta('quiero saber si hay pregabalina de 75 mg') === 'pregabalina 75 mg', R.limpiarConsulta('quiero saber si hay pregabalina de 75 mg'));
check('4c "precio del escitalopram 10"', R.limpiarConsulta('precio del escitalopram 10') === 'escitalopram 10');
check('4d normalizarReserva desde la palabra clave', R.normalizarReserva('hola quiero reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto') === 'reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto', R.normalizarReserva('hola quiero reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto'));
check('4e "2 cajas de" -> x2', R.normalizarReserva('reservar 2 cajas de neurogab 75 rut 11.111.111-1, Calle 1, San Luis').startsWith('reservar x2 neurogab 75'), R.normalizarReserva('reservar 2 cajas de neurogab 75 rut 11.111.111-1, Calle 1, San Luis'));
check('4f "apartar" se normaliza a reservar', R.normalizarReserva('apartar losarmed 50 x1 rut 11.111.111-1, Calle 1, San Luis').startsWith('reservar '));
check('4g la dirección y el sector no se tocan', R.normalizarReserva('reservar neurogab 75 x1 rut 11.111.111-1, Pasaje La Estrella de Mar 12, Peñalolén Nuevo').endsWith(', Pasaje La Estrella de Mar 12, Peñalolén Nuevo'));
check('4h el body reenviado lleva el texto limpio', cls('hola, ¿hay pregavalina 75?').body.message.text === 'pregavalina 75');
check('4i el update original no se modifica', (() => { const u = upd(1, 'hola, hay losartan 50?'); R.classifyUpdate(u, H, ENV); return u.message.text === 'hola, hay losartan 50?'; })());

// 5. Contrato router -> buscador US-04 (el motivo de normalizar)
const frases = ['hola, hay pregavalina 75?', 'tienen losartan 50?', 'precio del escitalopram 10', 'cuanto cuesta la melatonina', 'quiero saber si hay pregabalina de 75 mg'];
for (const f of frases) {
  const sinRouter = M04.matchMedicine(f, catalogo).matched;
  const out = cls(f);
  const conRouter = out.intent === 'consulta' ? M04.matchMedicine(out.body.message.text, catalogo).matched : null;
  check(`5 «${f}»: sin router no calza, con router sí`, !sinRouter && !!conRouter, { sinRouter: !!sinRouter, intent: out.intent, limpio: out.texto_limpio });
}
const p04 = P04.parseTelegramUpdate(cls('hola, hay pregavalina 75?').body, H, SECRET);
check('5f parse_incoming de US-04 acepta el body del router', p04.length === 1 && p04[0].json.text === 'pregavalina 75');

// 6. Contrato router -> US-05 / US-06 / US-20 / US-22
const r05 = cls('Hola! quiero reservar 2 cajas de neurogab 75 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto');
const p05 = P05.parseTelegramUpdate(r05.body, H, SECRET);
check('6a US-05 interpreta la reserva normalizada (cantidad 2, RUT, sector)',
  p05.length === 1 && p05[0].json.quantity === 2 && /11\.?111\.?111-1/.test(p05[0].json.rut) && p05[0].json.sector === 'Peñalolén Alto', p05[0] && p05[0].json);
const q05 = p05.length ? M04.matchMedicine(p05[0].json.query, catalogo).matched : null;
check('6b el producto de la reserva calza con Neurogab', !!q05 && q05.medicamento_id === 'MED-0002', p05[0] && p05[0].json.query);
const p06 = P06.parseTelegramUpdate(cls('estado #FAR-0002').body, H, SECRET);
check('6c US-06 recibe el código', p06.length === 1 && (p06[0].json || p06[0]).codigo_far === '#FAR-0002', p06);
// 6c2. Ensamblaje real de US-06 con ítems como los entrega n8n ({ json: fila }).
// Defecto D-18: el bloque de n8n pasaba los ítems sin desenvolver y nunca
// encontraba el pedido (las pruebas unitarias usaban filas planas).
{
  const code = us06.nodes.find((n) => n.name === 'build_tracking_reply').parameters.jsCode;
  const filas = {
    parse_tracking_request: [{ json: { chat_id: '555', rut: '11111111-1' } }],
    read_ordenes: [{ json: { codigo_far: 'FAR-0007', rut: '11.111.111-1', telefono: '555', estado: 'EN_RUTA', fecha_creacion: '2026-11-09T10:00:00Z' } },
      { json: { codigo_far: 'FAR-0008', rut: '11.111.111-1', telefono: '999', estado: 'ENTREGADO', fecha_creacion: '2026-11-09T11:00:00Z' } }],
    read_despachos: [{ json: { codigo_far: 'FAR-0007', sector: 'San Luis', estado_ruta: 'EN_RUTA' } }]
  };
  const $ = (nombre) => ({ first: () => filas[nombre][0], all: () => filas[nombre] });
  const salida = new Function('$', '$input', code)($, { all: () => filas.read_despachos, first: () => filas.read_despachos[0] });
  const msg = salida && salida[0] ? (salida[0].json || salida[0]).message : '';
  check('6c2 US-06 en n8n: el titular ve su pedido por RUT (ítems { json })', /FAR-0007/.test(msg) && /camino/.test(msg), msg);
  filas.parse_tracking_request = [{ json: { chat_id: '555', codigo_far: '#FAR-0008' } }];
  const ajeno = new Function('$', '$input', code)($, { all: () => [], first: () => null });
  check('6c3 US-06 en n8n: un pedido de otro chat sigue oculto', /No encontré/.test((ajeno[0].json || ajeno[0]).message));
}
check('6d US-20 acepta el comando que el router deriva', P20.parseTelegramUpdate(cls('aprobar FAR-0003', 900).body, H, SECRET, '900').length === 1);
check('6e US-22 acepta el comando que el router deriva', P22.parseTelegramUpdate(cls('entregado FAR-0003', 901).body, H, SECRET, '901', '900').length === 1);

// 7. Respaldo opcional con Gemini (solo etiqueta de lista cerrada)
const gem = (t) => ({ candidates: [{ content: { parts: [{ text: t }] } }] });
check('7a etiqueta válida', L.etiquetaDesdeGemini(gem('consulta')) === 'consulta');
check('7b etiqueta con mayúsculas y punto', L.etiquetaDesdeGemini(gem('Estado.')) === 'estado');
check('7c texto libre del modelo -> null', L.etiquetaDesdeGemini(gem('El usuario quiere saber del Pregalex a $8.990')) === null);
check('7d respuesta vacía o error -> null', L.etiquetaDesdeGemini({}) === null && L.etiquetaDesdeGemini(null) === null);
const amb = cls('necesito hablar con alguien de la oficina sobre un tema de mi abuela que vive sola');
check('7e sin etiqueta se mantiene el menú', L.aplicarEtiqueta(amb, null).intent === 'respuesta' && L.aplicarEtiqueta(amb, null).reply === amb.reply);
check('7f etiqueta urgencia -> texto fijo con SAMU', L.aplicarEtiqueta(amb, 'urgencia').reply.includes('SAMU 131'));
check('7g etiqueta consulta -> deriva a US-04', L.aplicarEtiqueta(amb, 'consulta').intent === 'consulta');
check('7h llm_disponible solo con clave', cls('hola').llm_disponible === false && cls('hola', 100, { ...ENV, geminiKey: 'x' }).llm_disponible === true);
const gNode = router.nodes.find((n) => n.name === 'gemini_clasificar');
check('7i la llamada a Gemini no detiene el flujo si falla', gNode && gNode.onError === 'continueRegularOutput');
check('7j la clave de Gemini viaja en encabezado, no en la URL', gNode && !/key=/.test(gNode.parameters.url) && JSON.stringify(gNode.parameters.headerParameters).includes('x-goog-api-key'));

console.log('----------------------------------------');
console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
