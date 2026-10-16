// scripts/test-fuzzy-match.mjs — US-04 fuzzy stock/price lookup tests (Node >= 18, zero deps).
//
// Loads build_reply's jsCode from workflows/US-04-consulta-stock.json so its named
// functions can be called outside n8n; the n8n-only data assembly stays inert
// because `$` / `$input` are undefined here.
import { readFileSync } from 'node:fs';

// Fixture — keep in sync with scripts/setup-sheets.gs (EXAMPLE_CATALOG_ROWS /
// EXAMPLE_INVENTORY_ROWS). MED-0006 is an extra row NOT present in setup-sheets.gs.
const catalogo = [
  { medicamento_id: 'MED-0001', nombre_comercial: 'Pregabalina', principio_activo: 'Pregabalina', dosis: '75 mg', forma: 'Cápsula', requiere_receta: 'SI', precio_unitario_clp: 1890, bioequivalente_de: '', activo: 'SI' },
  { medicamento_id: 'MED-0002', nombre_comercial: 'Losartán', principio_activo: 'Losartán', dosis: '50 mg', forma: 'Comprimido', requiere_receta: 'SI', precio_unitario_clp: 640, bioequivalente_de: 'MED-0001', activo: 'SI' },
  { medicamento_id: 'MED-0003', nombre_comercial: 'Metformina', principio_activo: 'Metformina', dosis: '850 mg', forma: 'Comprimido', requiere_receta: 'SI', precio_unitario_clp: 520, bioequivalente_de: '', activo: 'SI' },
  { medicamento_id: 'MED-0004', nombre_comercial: 'Sertralina', principio_activo: 'Sertralina', dosis: '50 mg', forma: 'Comprimido', requiere_receta: 'SI', precio_unitario_clp: 1150, bioequivalente_de: '', activo: 'SI' },
  { medicamento_id: 'MED-0005', nombre_comercial: 'Omeprazol', principio_activo: 'Omeprazol', dosis: '20 mg', forma: 'Cápsula', requiere_receta: 'NO', precio_unitario_clp: 780, bioequivalente_de: '', activo: 'SI' },
  // Extra row with activo = "NO": must never be returned by any lookup.
  { medicamento_id: 'MED-0006', nombre_comercial: 'Ibuprofeno', principio_activo: 'Ibuprofeno', dosis: '400 mg', forma: 'Comprimido', requiere_receta: 'NO', precio_unitario_clp: 990, bioequivalente_de: '', activo: 'NO' }
];

const inventario = [
  // stock_neto column deliberately wrong (999): build_reply must recompute
  // stock_real - stock_reservado and never trust the sheet formula (40-40 = 0).
  { medicamento_id: 'MED-0001', stock_real: 40, stock_reservado: 40, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' },
  { medicamento_id: 'MED-0002', stock_real: 120, stock_reservado: 12, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' },
  { medicamento_id: 'MED-0003', stock_real: 300, stock_reservado: 25, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' },
  { medicamento_id: 'MED-0004', stock_real: 75, stock_reservado: 8, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' },
  { medicamento_id: 'MED-0005', stock_real: 150, stock_reservado: 0, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' },
  { medicamento_id: 'MED-0006', stock_real: 50, stock_reservado: 0, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' }
];

// --- load build_reply jsCode outside n8n ------------------------------------
const workflowPath = new URL('../workflows/US-04-consulta-stock.json', import.meta.url);
const workflow = JSON.parse(readFileSync(workflowPath, 'utf8'));
const buildReplyNode = workflow.nodes.find((n) => n.name === 'build_reply');
if (!buildReplyNode || !buildReplyNode.parameters.jsCode) {
  console.error('FAIL  build_reply node or jsCode not found in workflow JSON');
  process.exit(1);
}
const load = new Function(
  `${buildReplyNode.parameters.jsCode}\n; return { normalize, tokenize, levenshteinDistance, levenshteinSimilarity, isDoseToken, scoreCandidate, matchMedicine, formatClp, buildReplyText, COVERAGE_TOKEN_MIN, MATCH_THRESHOLD, MAX_SUGGESTIONS };`
);
const api = load();

// --- load parse_incoming jsCode (Telegram transport contract) outside n8n ---
const parseNode = workflow.nodes.find((n) => n.name === 'parse_incoming');
if (!parseNode || !parseNode.parameters.jsCode) {
  console.error('FAIL  parse_incoming node or jsCode not found in workflow JSON');
  process.exit(1);
}
const parseApi = new Function(
  `${parseNode.parameters.jsCode}\n; return { isAuthorized, parseTelegramUpdate };`
)();

let passed = 0;
let failed = 0;
function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${label}${detail !== undefined ? ' — ' + String(detail) : ''}`);
  }
}

// 1. "pregabalina 75" matches Pregabalina's row; reply has formatted price and computed stock_neto.
const m1 = api.matchMedicine('pregabalina 75', catalogo);
check(
  '1a "pregabalina 75" matches MED-0001',
  !!m1.matched && m1.matched.medicamento_id === 'MED-0001',
  `matched=${m1.matched ? m1.matched.medicamento_id : 'null'} score=${m1.score.toFixed(4)}`
);
const r1 = api.buildReplyText('pregabalina 75', catalogo, inventario);
const computedNet1 = 40 - 40; // stock_real - stock_reservado for MED-0001
check('1b reply contains formatted price', r1.includes(api.formatClp(1890)), r1);
check(
  '1c reply contains computed stock_neto',
  r1.includes(`Stock disponible: ${computedNet1} unidades`),
  r1
);

// 2. Typo / casing / spacing variants all match the same row.
for (const query of ['pregabalain 75mg', 'PREGABALINA', 'pregabalina 75 mg']) {
  const m = api.matchMedicine(query, catalogo);
  check(
    `2 "${query}" matches MED-0001`,
    !!m.matched && m.matched.medicamento_id === 'MED-0001',
    `matched=${m.matched ? m.matched.medicamento_id : 'null'} score=${m.score.toFixed(4)}`
  );
}

// 3. Losartán matching; the dose token selects the right dosis.
const m3a = api.matchMedicine('LOSARTÁN', catalogo);
check(
  '3a "LOSARTÁN" matches MED-0002',
  !!m3a.matched && m3a.matched.medicamento_id === 'MED-0002',
  `score=${m3a.score.toFixed(4)}`
);
const m3b = api.matchMedicine('losartan 50', catalogo);
check(
  '3b "losartan 50" matches MED-0002 (dose token picks 50 mg over other rows)',
  !!m3b.matched && m3b.matched.medicamento_id === 'MED-0002' && m3b.matched.dosis === '50 mg',
  `matched=${m3b.matched ? m3b.matched.medicamento_id : 'null'} score=${m3b.score.toFixed(4)}`
);
const r3 = api.buildReplyText('losartan 50', catalogo, inventario);
check('3c reply carries the selected dosis', r3.includes('50 mg'), r3);
check(
  '3d reply has price and computed stock (120 - 12 = 108)',
  r3.includes(api.formatClp(640)) && r3.includes('Stock disponible: 108 unidades'),
  r3
);

// 4. stock_neto <= 0 → agotamiento + available bioequivalent with price;
//    a second case with no available bioequivalent says so without naming a product.
const r4a = api.buildReplyText('pregabalina 75', catalogo, inventario);
check('4a agotamiento announced', r4a.includes('agotado'), r4a);
check(
  '4a available bioequivalent listed with its price',
  r4a.includes('Losartán') && r4a.includes(api.formatClp(640)),
  r4a
);
const inventarioSinBioequivalente = inventario.map((row) =>
  row.medicamento_id === 'MED-0002' ? { ...row, stock_reservado: 120 } : row
);
const r4b = api.buildReplyText('pregabalina 75', catalogo, inventarioSinBioequivalente);
check('4b states plainly there is no alternative', r4b.includes('no contamos con bioequivalentes'), r4b);
check(
  '4b names no product and no price',
  !r4b.includes('Pregabalina') && !r4b.includes('Losartán') && !r4b.includes('$'),
  r4b
);

// 5. No match: grounded reply (R-02) without price, stock or product names.
const query5 = 'vitamina z para dormir';
const m5 = api.matchMedicine(query5, catalogo);
const r5 = api.buildReplyText(query5, catalogo, inventario);
check(
  '5a low-similarity query stays below MATCH_THRESHOLD',
  m5.matched === null && m5.score < api.MATCH_THRESHOLD,
  `score=${m5.score.toFixed(4)} threshold=${api.MATCH_THRESHOLD}`
);
check('5b reply echoes the original query', r5.includes(`No encontré "${query5}"`), r5);
check('5c reply has no price ($)', !r5.includes('$'), r5);
check('5d reply has no stock number (digits)', !/\d/.test(r5), r5);
const namedProducts = catalogo
  .map((row) => row.nombre_comercial)
  .filter((name) => r5.includes(name));
check('5e reply mentions no fixture product', namedProducts.length === 0, namedProducts.join(', '));

// 6. The activo = "NO" row is never returned.
const onlyInactive = catalogo.filter((row) => row.activo === 'NO');
const m6a = api.matchMedicine('ibuprofeno 400', onlyInactive);
check('6a activo=NO row never matched (even alone)', m6a.matched === null, JSON.stringify(m6a));
const r6 = api.buildReplyText('ibuprofeno 400', catalogo, inventario);
check('6b reply never names the inactive row', !r6.includes('Ibuprofeno'), r6);
const anyInactive = catalogo
  .map((row) => row.nombre_comercial)
  .filter((name, i) => r1.includes(name) || r3.includes(name) || r4a.includes(name) || r4b.includes(name) || r5.includes(name) || r6.includes(name));
check(
  '6c inactive row absent from every reply',
  !anyInactive.includes('Ibuprofeno'),
  anyInactive.join(', ')
);

// 7. Primitives.
check('7a formatClp(4500) === "$4.500"', api.formatClp(4500) === '$4.500', api.formatClp(4500));
check(
  '7b normalize("Losartán 50 mg") === "losartan 50 mg"',
  api.normalize('Losartán 50 mg') === 'losartan 50 mg',
  api.normalize('Losartán 50 mg')
);
check(
  '7c low-similarity query score < MATCH_THRESHOLD',
  api.matchMedicine('vitamina z para dormir', catalogo).score < api.MATCH_THRESHOLD
);

// 8. Telegram webhook parsing + secret check (transport contract).
const SECRET = 'us04-secret';
const goodHeaders = { 'X-Telegram-Bot-Api-Secret-Token': SECRET };
check('8a isAuthorized accepts the correct secret', parseApi.isAuthorized(goodHeaders, SECRET) === true);
check('8b isAuthorized rejects a wrong secret', parseApi.isAuthorized(goodHeaders, 'not-the-secret') === false);
check('8c isAuthorized rejects a missing header', parseApi.isAuthorized({}, SECRET) === false && parseApi.isAuthorized(undefined, SECRET) === false);
check(
  '8d isAuthorized header lookup is case-insensitive',
  parseApi.isAuthorized({ 'x-telegram-bot-api-secret-token': SECRET }, SECRET) === true
);
const tgUpdate = {
  update_id: 700001,
  message: {
    message_id: 11,
    from: { id: 555, is_bot: false },
    chat: { id: -100998877, type: 'supergroup' },
    date: 1770000000,
    text: 'pregabalina 75'
  }
};
const parsedItems = parseApi.parseTelegramUpdate(tgUpdate, goodHeaders, SECRET);
check(
  '8e valid update -> one item { chat_id, text, received_at }',
  parsedItems.length === 1 &&
    parsedItems[0].json.chat_id === '-100998877' &&
    parsedItems[0].json.text === 'pregabalina 75' &&
    typeof parsedItems[0].json.received_at === 'string',
  JSON.stringify(parsedItems)
);
check(
  '8f update without message -> EMPTY result',
  parseApi.parseTelegramUpdate({ update_id: 1 }, goodHeaders, SECRET).length === 0
);
check(
  '8g unauthorized request -> EMPTY result (wrong or missing secret)',
  parseApi.parseTelegramUpdate(tgUpdate, { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' }, SECRET).length === 0 &&
    parseApi.parseTelegramUpdate(tgUpdate, {}, SECRET).length === 0
);

console.log('----------------------------------------');
console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
