// scripts/test-workflows-n8n.mjs — reglas estáticas que un workflow debe cumplir
// para funcionar en n8n 2.44.2 real (Node >= 18, sin dependencias).
//
// Cada regla nace de un defecto que se encontró al importar los flujos en n8n
// real (Entrega 2, ver docs/entrega-2/decisiones-diseno.md):
//   - `process` no existe en el sandbox de los nodos Code: hay que usar $env.
//   - Un parámetro solo es expresión si empieza con "=": la URL y el cuerpo
//     de Telegram se enviaban literalmente.
//   - Google Sheets necesita authentication=serviceAccount y una credencial.
//   - El nodo Google Drive v2.1 no existe.
//   - Un bot de Telegram admite un solo webhook: solo el router lo expone.
import { readFileSync, readdirSync } from 'node:fs';
import { FLUJOS, WEBHOOK_PATH, CREDENCIAL_GOOGLE, CREDENCIAL_DRIVE_OAUTH } from './local/lib/flujos.mjs';

const dir = new URL('../workflows/', import.meta.url);
const EXCLUIDOS = new Set(['smoke-test.json', 'US-09-recetas-email.json']); // email: postergado (US-19)
const archivos = readdirSync(dir).filter((f) => f.endsWith('.json') && !EXCLUIDOS.has(f)).sort();
const wfs = Object.fromEntries(archivos.map((f) => [f, JSON.parse(readFileSync(new URL(f, dir), 'utf8'))]));

// Versiones de nodo disponibles en n8n 2.44.2 (n8n export:nodes).
const VERSIONES = {
  'n8n-nodes-base.googleSheets': [3, 4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7],
  'n8n-nodes-base.googleDrive': [1, 2, 3],
  'n8n-nodes-base.httpRequest': [1, 2, 3, 4, 4.1, 4.2, 4.3, 4.4, 4.5],
  'n8n-nodes-base.code': [1, 2],
  'n8n-nodes-base.if': [1, 2, 2.1, 2.2, 2.3, 2.4],
  'n8n-nodes-base.switch': [1, 2, 3, 3.1, 3.2, 3.3, 3.4, 3.5],
  'n8n-nodes-base.webhook': [1, 1.1, 2, 2.1, 2.2],
  'n8n-nodes-base.executeWorkflow': [1, 1.1, 1.2, 1.3, 1.4],
  'n8n-nodes-base.executeWorkflowTrigger': [1, 1.1, 1.2, 1.3],
  'n8n-nodes-base.scheduleTrigger': [1, 1.1, 1.2, 1.3, 1.4],
  'n8n-nodes-base.errorTrigger': [1]
};

let passed = 0;
let failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log('PASS  ' + label); }
  else { failed++; console.log('FAIL  ' + label + (detail !== undefined ? ' — ' + JSON.stringify(detail) : '')); }
}
const todos = (pred) => archivos.flatMap((f) => wfs[f].nodes.filter(pred).map((n) => ({ f, n })));
const malos = (lista, bad) => lista.filter(({ n }) => bad(n)).map(({ f, n }) => f + ':' + n.name);

// 1. Catálogo de flujos
check('1a cada flujo del catálogo existe en workflows/', FLUJOS.every((x) => wfs[x.archivo]), FLUJOS.filter((x) => !wfs[x.archivo]).map((x) => x.archivo));
check('1b cada workflow versionado está en el catálogo', archivos.every((f) => FLUJOS.some((x) => x.archivo === f)), archivos.filter((f) => !FLUJOS.some((x) => x.archivo === f)));
check('1c el id del JSON coincide con el catálogo', FLUJOS.every((x) => wfs[x.archivo] && wfs[x.archivo].id === x.id));
check('1d ids únicos', new Set(FLUJOS.map((x) => x.id)).size === FLUJOS.length);

// 2. Versiones de nodo válidas
const nodos = todos(() => true);
check('2a toda versión de nodo existe en n8n 2.44.2', malos(nodos, (n) => VERSIONES[n.type] && !VERSIONES[n.type].includes(n.typeVersion)).length === 0,
  malos(nodos, (n) => VERSIONES[n.type] && !VERSIONES[n.type].includes(n.typeVersion)));
check('2b no hay tipos de nodo fuera de la lista revisada', malos(nodos, (n) => !VERSIONES[n.type]).length === 0, malos(nodos, (n) => !VERSIONES[n.type]));

// 3. Nodos Code
const codes = todos((n) => n.type === 'n8n-nodes-base.code');
check('3a ningún Code usa process.env (no existe en el sandbox)', malos(codes, (n) => /process\.env/.test(n.parameters.jsCode)).length === 0, malos(codes, (n) => /process\.env/.test(n.parameters.jsCode)));
check('3b ningún Code usa require ni fetch', malos(codes, (n) => /\brequire\(|\bfetch\(/.test(n.parameters.jsCode)).length === 0);

// 4. HTTP Request
const https = todos((n) => n.type === 'n8n-nodes-base.httpRequest');
check('4a toda URL con {{ }} es expresión (empieza con =)', malos(https, (n) => String(n.parameters.url).includes('{{') && !String(n.parameters.url).startsWith('=')).length === 0,
  malos(https, (n) => String(n.parameters.url).includes('{{') && !String(n.parameters.url).startsWith('=')));
check('4b ningún cuerpo JSON lleva "={{" dentro de un literal', malos(https, (n) => typeof n.parameters.jsonBody === 'string' && n.parameters.jsonBody.includes('"={{')).length === 0,
  malos(https, (n) => typeof n.parameters.jsonBody === 'string' && n.parameters.jsonBody.includes('"={{')));
const tg = https.filter(({ n }) => /TELEGRAM_BOT_TOKEN/.test(String(n.parameters.url)));
check('4c Telegram con base configurable (TELEGRAM_API_BASE)', tg.length > 0 && malos(tg, (n) => !/TELEGRAM_API_BASE/.test(n.parameters.url)).length === 0);
check('4d descarga de archivos de Telegram con /file/bot<token>/', malos(tg, (n) => /\/file\b/.test(n.parameters.url) && !/\/file\/bot/.test(n.parameters.url)).length === 0);
check('4e todo envío a Telegram reintenta (retryOnFail)', malos(tg.filter(({ n }) => /sendMessage/.test(n.parameters.url)), (n) => !n.retryOnFail).length === 0,
  malos(tg.filter(({ n }) => /sendMessage/.test(n.parameters.url)), (n) => !n.retryOnFail));

// 5. Google Sheets y Drive
const sheets = todos((n) => n.type === 'n8n-nodes-base.googleSheets');
check('5a Sheets con cuenta de servicio', malos(sheets, (n) => n.parameters.authentication !== 'serviceAccount').length === 0, malos(sheets, (n) => n.parameters.authentication !== 'serviceAccount'));
check('5b Sheets con la credencial fija del proyecto', malos(sheets, (n) => !n.credentials || !n.credentials.googleApi || n.credentials.googleApi.id !== CREDENCIAL_GOOGLE.id).length === 0);
check('5c planilla desde GOOGLE_SHEET_ID (sin IDs en el repo)', malos(sheets, (n) => !n.parameters.documentId || n.parameters.documentId.value !== '={{ $env.GOOGLE_SHEET_ID }}').length === 0,
  malos(sheets, (n) => !n.parameters.documentId || n.parameters.documentId.value !== '={{ $env.GOOGLE_SHEET_ID }}'));
// En n8n un nodo se ejecuta una vez POR ÍTEM de entrada: una lectura después de
// otra lectura (16 filas) leía la planilla 16 veces (6 s y cuota agotada). Y una
// hoja vacía devuelve 0 ítems y corta el flujo en silencio.
const lecturas = sheets.filter(({ n }) => n.parameters.operation === 'read');
check('5e toda lectura de Sheets se ejecuta una sola vez (executeOnce)', malos(lecturas, (n) => n.executeOnce !== true).length === 0, malos(lecturas, (n) => n.executeOnce !== true));
check('5f toda lectura entrega salida aunque la hoja esté vacía (alwaysOutputData)', malos(lecturas, (n) => n.alwaysOutputData !== true).length === 0, malos(lecturas, (n) => n.alwaysOutputData !== true));
// La API de Sheets limita a 60 lecturas por minuto por usuario (HTTP 429): sin
// reintento, una escritura podía fallar a medias (estado ENTREGADO sin
// descontar el stock, visto en el E2E con la planilla real).
check('5h todo nodo de Sheets reintenta (3 intentos, 5 s)', malos(sheets, (n) => !n.retryOnFail || n.maxTries < 3 || n.waitBetweenTries < 5000).length === 0,
  malos(sheets, (n) => !n.retryOnFail || n.maxTries < 3 || n.waitBetweenTries < 5000));
// n8n 2.44.2 rechaza las escrituras «defineBelow» sin columns.schema
// («Provide a columns.schema array…»): ninguna reserva llegaba a la planilla.
const escrituras = sheets.filter(({ n }) => n.parameters.operation !== 'read');
const sinSchema = (n) => {
  const c = n.parameters.columns || {};
  if (c.mappingMode !== 'defineBelow') return false;
  const ids = new Set((c.schema || []).map((s) => s.id));
  return [...Object.keys(c.value || {}), ...(c.matchingColumns || [])].some((k) => !ids.has(k));
};
check('5g toda escritura describe sus columnas (columns.schema)', escrituras.length > 0 && malos(escrituras, sinSchema).length === 0, malos(escrituras, sinSchema));
const drive = todos((n) => n.type === 'n8n-nodes-base.googleDrive');
// Las cuentas de servicio no tienen cuota en Drive: la receta se sube con OAuth2
// (Drive del usuario) y la credencial fija farmaciaGoogleDriveOAuth.
check('5d Drive con OAuth2, credencial fija y carpeta desde .env', drive.length > 0 && malos(drive, (n) =>
  n.parameters.authentication !== 'oAuth2' ||
  !n.credentials || !n.credentials.googleDriveOAuth2Api || n.credentials.googleDriveOAuth2Api.id !== CREDENCIAL_DRIVE_OAUTH.id ||
  !/GOOGLE_DRIVE_RECETAS_FOLDER_ID/.test(JSON.stringify(n.parameters.folderId))).length === 0);

// 6. Entradas: un solo webhook público
const webhooks = todos((n) => n.type === 'n8n-nodes-base.webhook');
check('6a un único webhook público', webhooks.length === 1 && webhooks[0].n.parameters.path === WEBHOOK_PATH, webhooks.map(({ f, n }) => f + ':' + n.parameters.path));
check('6b el webhook responde de inmediato (onReceived)', webhooks.every(({ n }) => n.parameters.responseMode === 'onReceived'));
const router = wfs['US-17-router-telegram.json'];
const destinos = router.nodes.filter((n) => n.type === 'n8n-nodes-base.executeWorkflow').map((n) => n.parameters.workflowId.value);
check('6c el router deriva a 7 subflujos', destinos.length === 7, destinos);
check('6d cada destino del router existe y tiene entrada interna', destinos.every((id) => {
  const x = FLUJOS.find((y) => y.id === id);
  return x && wfs[x.archivo].nodes.some((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger');
}));
check('6e los subflujos espera a que terminen (serializa la escritura)', router.nodes.filter((n) => n.type === 'n8n-nodes-base.executeWorkflow').every((n) => n.parameters.options && n.parameters.options.waitForSubWorkflow === true));
check('6f si un subflujo falla, el vecino recibe un aviso', router.nodes.filter((n) => n.type === 'n8n-nodes-base.executeWorkflow').every((n) => n.onError === 'continueErrorOutput' && JSON.stringify(router.connections[n.name]).includes('responder_falla')));

// 7. Configuración del flujo
check('7a todos apuntan a US-21 como flujo de errores', archivos.filter((f) => !f.startsWith('US-21')).every((f) => wfs[f].settings && wfs[f].settings.errorWorkflow === 'farmaciaUS21aler'));
check('7b executionOrder v1 en todos', archivos.every((f) => wfs[f].settings && wfs[f].settings.executionOrder === 'v1'));
check('7c los workflows se importan inactivos (se publican por CLI)', archivos.every((f) => wfs[f].active === false));

// 8. Integridad del grafo
const rotas = archivos.flatMap((f) => {
  const names = new Set(wfs[f].nodes.map((n) => n.name));
  return Object.entries(wfs[f].connections).flatMap(([from, v]) => [
    ...(names.has(from) ? [] : [f + ': origen ' + from]),
    ...(v.main || []).flat().filter((c) => c && !names.has(c.node)).map((c) => f + ': ' + from + ' -> ' + c.node)
  ]);
});
check('8a toda conexión apunta a nodos existentes', rotas.length === 0, rotas);
check('8b nombres de nodo únicos por flujo', archivos.every((f) => new Set(wfs[f].nodes.map((n) => n.name)).size === wfs[f].nodes.length));

// 9. Secretos fuera de los JSON
const crudo = archivos.map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
check('9a sin tokens de bot de Telegram', !/\b\d{8,10}:[A-Za-z0-9_-]{35}\b/.test(crudo));
check('9b sin claves privadas', !/BEGIN (RSA )?PRIVATE KEY|private_key/.test(crudo));
check('9c sin IDs de planilla reales (44 caracteres)', !/\b1[A-Za-z0-9_-]{43}\b/.test(crudo));

// 10. Configuración de la plataforma (docker-compose.yml)
const compose = readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8');
check('10a imagen de n8n fijada (sin latest)', /n8n:\$\{N8N_VERSION:-\d+\.\d+\.\d+\}/.test(compose) && !/n8n:latest/.test(compose));
check('10b cloudflared fijado (sin latest)', !/cloudflared:latest/.test(compose));
check('10c $env habilitado en los nodos', /N8N_BLOCK_ENV_ACCESS_IN_NODE=false/.test(compose));
check('10d ejecuciones serializadas (RNF-04)', /N8N_CONCURRENCY_PRODUCTION_LIMIT=1/.test(compose));

console.log('----------------------------------------');
console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
