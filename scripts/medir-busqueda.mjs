// scripts/medir-busqueda.mjs — mide la exactitud de la búsqueda difusa (meta
// SMART del Inception: >= 98 % de medicamentos bien identificados) y la
// cobertura del router con un set SINTÉTICO etiquetado (Node >= 18, sin deps).
//
// Usa el código real de los workflows (US-04 build_reply y US-17 clasificar)
// y el catálogo sintético de data/seed/medicamentos.csv. No es una prueba de
// aprobación/rechazo: es una medición. Guarda la evidencia en
// docs/evidencia/calidad/medicion-busqueda.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const load = (f) => JSON.parse(readFileSync(new URL('../workflows/' + f, import.meta.url), 'utf8'));
const api = (wf, node, names) => new Function(wf.nodes.find((n) => n.name === node).parameters.jsCode + `\n;return {${names}};`)();
const M = api(load('US-04-consulta-stock.json'), 'build_reply', 'matchMedicine');
const R = api(load('US-17-router-telegram.json'), 'clasificar', 'classifyUpdate');

// Catálogo sintético (mismo mapeo que scripts/local/cargar-catalogo.mjs).
const [cab, ...filas] = readFileSync(new URL('../data/seed/medicamentos.csv', import.meta.url), 'utf8').trim().split(/\r?\n/);
const cols = cab.split(',');
const meds = filas.map((f) => Object.fromEntries(f.split(',').map((v, i) => [cols[i], v.trim()])));
const id4 = (id) => id.replace(/^MED-(\d+)$/, (m, n) => 'MED-' + n.padStart(4, '0'));
const catalogo = meds.map((m) => ({ medicamento_id: id4(m.ID_Medicamento), nombre_comercial: m.Marca, principio_activo: m.Principio_Activo, dosis: m.Dosis, activo: m.Activo, precio_unitario_clp: Number(m.Precio_CLP), bioequivalente_de: '' }));
const ids = (pred) => catalogo.filter(pred).map((c) => c.medicamento_id);
const por = (principio, dosis) => ids((c) => c.principio_activo.toLowerCase().startsWith(principio) && (!dosis || c.dosis === dosis));
const marca = (m, dosis) => ids((c) => c.nombre_comercial.toLowerCase() === m && (!dosis || c.dosis === dosis));

// [consulta, ids aceptables] — [] significa "no está en el catálogo: no debe inventar".
const SET = [
  ['pregavalina 75', por('pregabalina', '75 mg')], ['pregabalina 150', por('pregabalina', '150 mg')],
  ['pregabalina 150mg', por('pregabalina', '150 mg')], ['losartan 50', por('losart', '50 mg')],
  ['losartán 50 mg', por('losart', '50 mg')], ['lozartan 50', por('losart', '50 mg')],
  ['escitalopram 10', por('escitalopram', '10 mg')], ['escitalopran 20', por('escitalopram', '20 mg')],
  ['esitalopram 10mg', por('escitalopram', '10 mg')], ['melatonina 3', por('melatonina', '3 mg')],
  ['melatonina 3mg', por('melatonina', '3 mg')], ['melatonin 3 mg', por('melatonina', '3 mg')],
  ['celecoxib 200', por('celecoxib', '200 mg')], ['selecoxib 200', por('celecoxib', '200 mg')],
  ['celecoxib 200 mg', por('celecoxib', '200 mg')], ['multivitaminico', por('multivit')],
  ['multivitamínico adultos', por('multivit')], ['pregabalina', por('pregabalina')], ['escitalopram', por('escitalopram')],
  ['pregalex 75', marca('pregalex', '75 mg')], ['pregalex 150', marca('pregalex', '150 mg')],
  ['neurogab 75', marca('neurogab', '75 mg')], ['neurogap 150', marca('neurogab', '150 mg')],
  ['somnia', marca('somnia')], ['melaton', marca('melaton')], ['vitalmax', marca('vitalmax')],
  ['multivit plus', marca('multivit plus')], ['celoxib', marca('celoxib')], ['artrocel', marca('artrocel')],
  ['losarmed', marca('losarmed')], ['cardiosar 50', marca('cardiosar')], ['esciprax 10', marca('esciprax', '10 mg')],
  ['esciprax 20', marca('esciprax', '20 mg')], ['lexamind 10', marca('lexamind', '10 mg')], ['lexamind 20 mg', marca('lexamind', '20 mg')],
  // Frases naturales (las que motivaron la normalización del router)
  ['hola, hay pregavalina 75?', por('pregabalina', '75 mg')], ['tienen losartan 50?', por('losart', '50 mg')],
  ['precio del escitalopram 10', por('escitalopram', '10 mg')], ['cuanto cuesta la melatonina', por('melatonina')],
  ['quiero saber si hay pregabalina de 75 mg', por('pregabalina', '75 mg')], ['buenas tardes, tendrán celecoxib 200?', por('celecoxib', '200 mg')],
  ['necesito neurogab 75 por favor', marca('neurogab', '75 mg')], ['hay stock de cardiosar', marca('cardiosar')],
  ['disculpe, ¿venden somnia?', marca('somnia')], ['valor del lexamind 20', marca('lexamind', '20 mg')],
  // Fuera del catálogo: lo correcto es NO responder con otro producto
  ['paracetamol 500', []], ['ibuprofeno 400', []], ['amoxicilina 500', []], ['insulina', []], ['omeprazol 20', []]
];

const H = { 'x-telegram-bot-api-secret-token': 's' };
const ENV = { secret: 's', pharmacists: '', staff: '', geminiKey: '' };
function evaluar(conRouter) {
  let ok = 0;
  const fallos = [];
  for (const [q, esperados] of SET) {
    let texto = q;
    if (conRouter) {
      const out = R.classifyUpdate({ message: { chat: { id: 1 }, text: q } }, H, ENV);
      texto = out && out.intent === 'consulta' ? out.body.message.text : null;
    }
    const match = texto === null ? null : M.matchMedicine(texto, catalogo).matched;
    const acierto = esperados.length ? !!match && esperados.includes(match.medicamento_id) : !match;
    if (acierto) ok++; else fallos.push({ consulta: q, obtenido: match ? match.medicamento_id : null, esperado: esperados });
  }
  return { total: SET.length, aciertos: ok, exactitud: Math.round((ok / SET.length) * 1000) / 10, fallos };
}

// Clasificación del router: mensajes sintéticos variados con la intención
// esperada. "Correcto" = el router da la respuesta automática adecuada.
const MENSAJES = [
  ['hola', 'bienvenida'], ['/start', 'bienvenida'], ['gracias', 'bienvenida'], ['buenas tardes', 'bienvenida'],
  ['pregavalina 75', 'consulta'], ['tienen losartan 50?', 'consulta'], ['hay melatonina?', 'consulta'],
  ['precio de la celecoxib 200', 'consulta'], ['esciprax 10', 'consulta'],
  ['estado #FAR-0003', 'estado'], ['mi rut es 11.111.111-1', 'estado'],
  ['quiero saber el estado de mi pedido', 'estado_sin_dato'], ['cuando llega mi pedido', 'estado_sin_dato'],
  ['reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto', 'reserva'], ['quiero reservar losarmed 50', 'reserva'],
  ['me duele el pecho', 'urgencia'], ['ya no quiero vivir', 'autolesion'], ['cuantas pastillas me tomo', 'consejo_clinico'],
  ['a que hora abren mañana en la farmacia de grecia', 'fuera_de_dominio'],
  ['necesito hablar con alguien de la oficina sobre un tema de mi abuela que vive sola', 'ambiguo']
];
let correctos = 0;
const errores = [];
const porMotivo = {};
for (const [t, esperado] of MENSAJES) {
  const out = R.classifyUpdate({ message: { chat: { id: 1 }, text: t } }, H, ENV);
  const obtenido = out.intent === 'respuesta' ? out.motivo : out.intent;
  porMotivo[obtenido] = (porMotivo[obtenido] || 0) + 1;
  if (obtenido === esperado) correctos++; else errores.push({ mensaje: t, esperado, obtenido });
}
const resueltos = correctos;

const resultado = {
  fecha: new Date().toISOString(),
  catalogo: catalogo.length + ' medicamentos sintéticos (data/seed/medicamentos.csv)',
  busqueda_sin_router: evaluar(false),
  busqueda_con_router: evaluar(true),
  router: { mensajes: MENSAJES.length, clasificados_correctamente: correctos, exactitud_pct: Math.round((correctos / MENSAJES.length) * 1000) / 10, por_intencion: porMotivo, errores }
};
mkdirSync(new URL('../docs/evidencia/calidad/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/evidencia/calidad/medicion-busqueda.json', import.meta.url), JSON.stringify(resultado, null, 2) + '\n');
console.log(`Exactitud sin router: ${resultado.busqueda_sin_router.aciertos}/${SET.length} (${resultado.busqueda_sin_router.exactitud} %)`);
console.log(`Exactitud con router: ${resultado.busqueda_con_router.aciertos}/${SET.length} (${resultado.busqueda_con_router.exactitud} %)`);
for (const f of resultado.busqueda_con_router.fallos) console.log('  fallo con router:', JSON.stringify(f));
console.log(`Clasificación del router: ${correctos}/${MENSAJES.length} (${resultado.router.exactitud_pct} %)`);
for (const e of errores) console.log('  error de clasificación:', JSON.stringify(e));
