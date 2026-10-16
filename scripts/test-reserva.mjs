// scripts/test-reserva.mjs — US-05 reservation tests (Node >= 18, zero deps).
//
// Loads the jsCode of evaluate_reservation / finalize_reply / parse_reservation
// from workflows/US-05-reserva.json so their named functions can be called
// outside n8n; the n8n-only data assembly stays inert because `$` / `$input`
// are undefined here.
//
// DRIFT GUARD: the fuzzy matcher is intentionally duplicated in US-04 and US-05
// (n8n cannot import local JS without allowlisting). This file runs the SAME
// query list through both extracted copies and fails if any verdict or matched
// medicamento_id differs — that is the invariant keeping both copies honest.
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
  // stock_neto deliberately wrong (999): reservation must recompute
  // stock_real - stock_reservado and never trust the sheet formula (40-40 = 0).
  { medicamento_id: 'MED-0001', stock_real: 40, stock_reservado: 40, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' },
  { medicamento_id: 'MED-0002', stock_real: 120, stock_reservado: 12, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' },
  { medicamento_id: 'MED-0003', stock_real: 300, stock_reservado: 25, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' },
  { medicamento_id: 'MED-0004', stock_real: 75, stock_reservado: 8, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' },
  { medicamento_id: 'MED-0005', stock_real: 150, stock_reservado: 0, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' },
  { medicamento_id: 'MED-0006', stock_real: 50, stock_reservado: 0, stock_neto: 999, ultima_actualizacion: '2026-01-01T00:00:00Z' }
];

const byId = (id) => catalogo.find((r) => r.medicamento_id === id);
const invById = (id) => inventario.find((r) => r.medicamento_id === id);

// --- load jsCode outside n8n -------------------------------------------------
function loadNode(workflow, nodeName, exportNames) {
  const node = workflow.nodes.find((n) => n.name === nodeName);
  if (!node || !node.parameters.jsCode) {
    console.error(`FAIL  node "${nodeName}" or its jsCode not found in workflow JSON`);
    process.exit(1);
  }
  try {
    const factory = new Function(
      `${node.parameters.jsCode}\n; return { ${exportNames.join(', ')} };`
    );
    return factory();
  } catch (err) {
    console.error(`FAIL  loading jsCode of "${nodeName}": ${err.message}`);
    process.exit(1);
  }
}

const wf5 = JSON.parse(readFileSync(new URL('../workflows/US-05-reserva.json', import.meta.url), 'utf8'));
const wf4 = JSON.parse(readFileSync(new URL('../workflows/US-04-consulta-stock.json', import.meta.url), 'utf8'));

const api = loadNode(wf5, 'evaluate_reservation', [
  'normalize', 'levenshteinDistance', 'levenshteinSimilarity', 'scoreCandidate',
  'matchMedicine', 'formatClp', 'buildReplyText', 'parseReservationText',
  'nextOrderCode', 'validateStock', 'initialStateFor', 'buildReservationReply',
  'buildCommitPayload', 'evaluateReservation', 'verifyReservation',
  'COVERAGE_TOKEN_MIN', 'MATCH_THRESHOLD'
]);
const finalizeApi = loadNode(wf5, 'finalize_reply', ['verifyReservation', 'normalize']);
const parseApi = loadNode(wf5, 'parse_reservation', [
  'parseReservationText', 'extractQuantity', 'isAuthorized', 'parseTelegramUpdate'
]);
const us04Api = loadNode(wf4, 'build_reply', [
  'matchMedicine', 'formatClp', 'buildReplyText', 'COVERAGE_TOKEN_MIN', 'MATCH_THRESHOLD'
]);

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

// --- DRIFT GUARD: US-04 vs US-05 fuzzy matcher -------------------------------
const driftQueries = ['pregabalina 75', 'pregabalain 75mg', 'LOSARTÁN', 'losartan 50', 'vitamina z para dormir'];
for (const q of driftQueries) {
  const a = api.matchMedicine(q, catalogo);
  const b = us04Api.matchMedicine(q, catalogo);
  const idA = a.matched ? a.matched.medicamento_id : null;
  const idB = b.matched ? b.matched.medicamento_id : null;
  const verdictA = !!a.matched;
  const verdictB = !!b.matched;
  check(
    `drift "${q}": same verdict and medicamento_id`,
    verdictA === verdictB && idA === idB,
    `US-05=${verdictA}/${idA} US-04=${verdictB}/${idB}`
  );
}
check('drift constants equal (threshold 0.72 / coverage 0.799)', api.MATCH_THRESHOLD === us04Api.MATCH_THRESHOLD && api.COVERAGE_TOKEN_MIN === us04Api.COVERAGE_TOKEN_MIN && api.COVERAGE_TOKEN_MIN === 0.799);

// 1. nextOrderCode ----------------------------------------------------------------
check('1a empty list -> FAR-0001', api.nextOrderCode([]) === 'FAR-0001', api.nextOrderCode([]));
check('1b ["FAR-0003","FAR-0007"] -> FAR-0008', api.nextOrderCode(['FAR-0003', 'FAR-0007']) === 'FAR-0008', api.nextOrderCode(['FAR-0003', 'FAR-0007']));
check('1c malformed entries ignored, no crash', api.nextOrderCode(['FAR-0002', 'abc', '', null, undefined, 'FAR-XYZ']) === 'FAR-0003', api.nextOrderCode(['FAR-0002', 'abc', '', null, undefined, 'FAR-XYZ']));
check('1d all-unparseable -> FAR-0001', api.nextOrderCode(['abc', 'FAR-XYZ', '--']) === 'FAR-0001', api.nextOrderCode(['abc', 'FAR-XYZ', '--']));
const padded = api.nextOrderCode(['FAR-0010']);
check('1e padding is 4 digits', padded === 'FAR-0011' && /^FAR-\d{4}$/.test(padded), padded);

// 2. validateStock ---------------------------------------------------------------
const invLosartan = invById('MED-0002'); // 120 - 12 = 108 available
const rejected = api.validateStock(500, invLosartan, 'Losartán 50 mg');
check('2a rejects when quantity > available', rejected.ok === false && rejected.reason === 'INSUFICIENTE' && rejected.available === 108, JSON.stringify(rejected));
check('2b message states the exact remaining count', rejected.message.includes('108'), rejected.message);
const accepted = api.validateStock(108, invLosartan, 'Losartán 50 mg');
check('2c accepts when quantity == available', accepted.ok === true && accepted.available === 108, JSON.stringify(accepted));
check('2d recomputed available ignores stock_neto column (999)', api.validateStock(109, invLosartan, '').available === 108, api.validateStock(109, invLosartan, '').available);
const agotado = api.validateStock(1, invById('MED-0001'), 'Pregabalina 75 mg'); // 40 - 40 = 0
check('2e available <= 0 -> AGOTADO', agotado.ok === false && agotado.reason === 'AGOTADO', JSON.stringify(agotado));

// 3. initialStateFor (D-01 provisional) ------------------------------------------
const created = '2026-03-10T12:00:00.000Z';
const stateSi = api.initialStateFor('SI', created);
check('3a requiere_receta SI -> PENDIENTE_RECETA', stateSi.estado === 'PENDIENTE_RECETA', JSON.stringify(stateSi));
check('3b fecha_expiracion = fecha_creacion + 12h exactly', Date.parse(stateSi.fecha_expiracion) - Date.parse(created) === 12 * 60 * 60 * 1000, stateSi.fecha_expiracion);
const stateNo = api.initialStateFor('NO', created);
check('3c requiere_receta NO -> EN_PREPARACION with no expiry', stateNo.estado === 'EN_PREPARACION' && !stateNo.fecha_expiracion, JSON.stringify(stateNo));
const stateDefault = api.initialStateFor('SI');
check('3d default fecha_creacion is now + 12h', Math.abs(Date.parse(stateDefault.fecha_expiracion) - (Date.now() + 12 * 60 * 60 * 1000)) < 5000, stateDefault.fecha_expiracion);
check('3e only enum states are produced', ['PENDIENTE_RECETA', 'EN_PREPARACION'].includes(stateSi.estado) && ['PENDIENTE_RECETA', 'EN_PREPARACION'].includes(stateNo.estado));

// 4. order payload: stock increment + total price ---------------------------------
const commit = api.evaluateReservation(
  { chat_id: '56987654321', query: 'losartan 50', quantity: 3, rut: '12.345.678-5' },
  catalogo, inventario, []
);
check('4a decision COMMIT', commit.decision === 'COMMIT', JSON.stringify(commit).slice(0, 200));
check('4b stock_reservado incremented by cantidad (12 + 3 = 15)', commit.inventory_row && commit.inventory_row.stock_reservado === 15, commit.inventory_row && commit.inventory_row.stock_reservado);
check('4c precio_total_clp = unit * cantidad (640 * 3 = 1920)', commit.order_row && commit.order_row.precio_total_clp === 1920, commit.order_row && commit.order_row.precio_total_clp);
check('4d bitacora row RESERVA_ALTA with delta_reservado = cantidad', commit.bitacora_row && commit.bitacora_row.accion === 'RESERVA_ALTA' && commit.bitacora_row.delta_reservado === 3, JSON.stringify(commit.bitacora_row));
check('4e order row carries phone and RUT (RF-03)', commit.order_row && commit.order_row.telefono === '56987654321' && commit.order_row.rut === '12.345.678-5', JSON.stringify(commit.order_row));
check('4f bitacora/orden share the same codigo_far', commit.bitacora_row.codigo_far === commit.order_row.codigo_far && commit.code === 'FAR-0001', commit.code);
check('4g result carries chat_id (Telegram recipient)', commit.chat_id === '56987654321', commit.chat_id);

// 5. reply copy --------------------------------------------------------------------
const paySi = api.buildCommitPayload(
  { chat_id: '56911111111', query: 'sertralina 50', quantity: 4, rut: '' },
  byId('MED-0004'), invById('MED-0004'), [], created
); // 1150 * 4 = 4600
check('5a reply contains #FAR-0001', paySi.message.includes('#FAR-0001'), paySi.message);
check('5b reply contains a $4.500-style total ($4.600)', paySi.message.includes('$4.600') && api.formatClp(4500) === '$4.500', paySi.message);
check('5c 12-hour recipe instruction present when requiere_receta = SI', paySi.message.includes('12 horas') && paySi.message.includes('receta médica'), paySi.message);
const payNo = api.buildCommitPayload(
  { chat_id: '56911111111', query: 'omeprazol 20', quantity: 1, rut: '' },
  byId('MED-0005'), invById('MED-0005'), [], created
); // 780 * 1 = 780
check('5d NO recipe: no 12-hour sentence, born in EN_PREPARACION', !payNo.message.includes('12 horas') && !payNo.message.includes('Envíe la foto') && payNo.message.includes('No requiere receta') && payNo.order_row.estado === 'EN_PREPARACION' && !payNo.order_row.fecha_expiracion, payNo.message);
check('5e SI recipe order born in PENDIENTE_RECETA with expiry', paySi.order_row.estado === 'PENDIENTE_RECETA' && !!paySi.order_row.fecha_expiracion, JSON.stringify({ estado: paySi.order_row.estado, exp: paySi.order_row.fecha_expiracion }));

// 6. insufficient stock: no code, no write payload, exact remaining ---------------
const tooMany = api.evaluateReservation(
  { chat_id: '56987654321', query: 'losartan 50', quantity: 500, rut: '' },
  catalogo, inventario, []
);
check('6a decision REJECT', tooMany.decision === 'REJECT', JSON.stringify(tooMany).slice(0, 160));
check('6b no code and no write payload', tooMany.code === '' && tooMany.order_row === null && tooMany.inventory_row === null && tooMany.bitacora_row === null && tooMany.expected_reservado === null, JSON.stringify(tooMany).slice(0, 200));
check('6c message states the remaining units (108)', tooMany.message.includes('108'), tooMany.message);
const agotadoReply = api.evaluateReservation(
  { chat_id: '56987654321', query: 'pregabalina 75', quantity: 1, rut: '' },
  catalogo, inventario, []
);
check('6d available <= 0 uses US-04 agotamiento + bioequivalentes wording', agotadoReply.decision === 'REJECT' && agotadoReply.message.includes('agotado') && agotadoReply.message.includes('Bioequivalentes disponibles con stock') && agotadoReply.code === '', agotadoReply.message);

// 7. no match: grounded reply (R-02) -----------------------------------------------
const noMatch = api.evaluateReservation(
  { chat_id: '56987654321', query: 'vitamina z para dormir', quantity: 1, rut: '' },
  catalogo, inventario, []
);
check('7a no-match decision REJECT', noMatch.decision === 'REJECT', JSON.stringify(noMatch).slice(0, 160));
check('7b reply has no price ($)', !noMatch.message.includes('$'), noMatch.message);
check('7c reply has no stock number (digits)', !/\d/.test(noMatch.message), noMatch.message);
const named = catalogo.map((r) => r.nombre_comercial).filter((n) => noMatch.message.includes(n));
check('7d reply names no fixture product', named.length === 0, named.join(', '));
const emptyQuery = api.evaluateReservation(
  { chat_id: '56987654321', query: '   ', quantity: 1, rut: '' },
  catalogo, inventario, []
);
const emptyNamed = catalogo.map((r) => r.nombre_comercial).filter((n) => emptyQuery.message.includes(n));
check('7e empty query asks for the medicine with no product name and no $', emptyQuery.decision === 'REJECT' && emptyNamed.length === 0 && !emptyQuery.message.includes('$'), emptyQuery.message);

// 8. parseReservationText (both copies) --------------------------------------------
const sample = 'reservar pregabalina 75 x2 rut 12.345.678-5';
const parsed = api.parseReservationText(sample);
check('8a quantity = 2', parsed.quantity === 2, JSON.stringify(parsed));
check('8b RUT extracted', parsed.rut === '12.345.678-5', JSON.stringify(parsed));
check('8c query free of the RUT', !parsed.query.includes('12.345.678-5'), parsed.query);
check('8d query free of the intent keyword', !/\breservar\b/i.test(parsed.query) && parsed.query === 'pregabalina 75', parsed.query);
const parsedParseNode = parseApi.parseReservationText(sample);
check('8e parse_reservation copy agrees with evaluate_reservation copy', JSON.stringify(parsed) === JSON.stringify(parsedParseNode), JSON.stringify(parsedParseNode));
const parsed2 = api.parseReservationText('comprar omeprazol 20');
check('8f intent stripped, quantity defaults to 1', parsed2.query === 'omeprazol 20' && parsed2.quantity === 1, JSON.stringify(parsed2));
const parsed3 = api.parseReservationText('encargar metformina 850 u');
check('8g "u" suffix quantity form', parsed3.quantity === 850 && parsed3.query === 'metformina', JSON.stringify(parsed3));

// 9. conflict detector ---------------------------------------------------------------
const expected = 15;
const rereadOk = [{ medicamento_id: 'MED-0002', stock_real: 120, stock_reservado: 15, stock_neto: 105, ultima_actualizacion: created }];
const rereadBad = [{ medicamento_id: 'MED-0002', stock_real: 120, stock_reservado: 12, stock_neto: 108, ultima_actualizacion: created }];
const okCheck = api.verifyReservation(expected, rereadOk, 'MED-0002');
check('9a matching re-read passes', okCheck.ok === true && okCheck.conflict === false, JSON.stringify(okCheck));
const badCheck = api.verifyReservation(expected, rereadBad, 'MED-0002');
check('9b mismatched re-read flagged as conflict', badCheck.ok === false && badCheck.conflict === true && badCheck.actual === 12, JSON.stringify(badCheck));
const missingCheck = api.verifyReservation(expected, [{ medicamento_id: 'MED-0003', stock_reservado: 25 }], 'MED-0002');
check('9c missing row counts as conflict', missingCheck.ok === false && missingCheck.conflict === true, JSON.stringify(missingCheck));
const finOk = finalizeApi.verifyReservation(expected, rereadOk, 'MED-0002');
const finBad = finalizeApi.verifyReservation(expected, rereadBad, 'MED-0002');
check('9d finalize_reply copy agrees', JSON.stringify(finOk) === JSON.stringify(okCheck) && JSON.stringify(finBad) === JSON.stringify(badCheck));

// 10. Telegram webhook parsing + secret check (transport contract) ----------------
const SECRET = 'us05-secret';
const goodHeaders = { 'X-Telegram-Bot-Api-Secret-Token': SECRET };
check('10a isAuthorized accepts the correct secret', parseApi.isAuthorized(goodHeaders, SECRET) === true);
check('10b isAuthorized rejects a wrong secret', parseApi.isAuthorized(goodHeaders, 'nope') === false);
check('10c isAuthorized rejects a missing header', parseApi.isAuthorized({}, SECRET) === false && parseApi.isAuthorized(null, SECRET) === false);
check(
  '10d isAuthorized header lookup is case-insensitive',
  parseApi.isAuthorized({ 'x-telegram-bot-api-secret-token': SECRET }, SECRET) === true
);
const tgUpdate = {
  update_id: 500001,
  message: {
    message_id: 21,
    chat: { id: -100123456, type: 'supergroup' },
    date: 1770000000,
    text: sample
  }
};
const tgItems = parseApi.parseTelegramUpdate(tgUpdate, goodHeaders, SECRET);
check(
  '10e valid update -> chat_id + parsed reservation text',
  tgItems.length === 1 &&
    tgItems[0].json.chat_id === '-100123456' &&
    tgItems[0].json.quantity === 2 &&
    tgItems[0].json.rut === '12.345.678-5' &&
    tgItems[0].json.query === 'pregabalina 75',
  JSON.stringify(tgItems)
);
check(
  '10f update without message -> EMPTY result',
  parseApi.parseTelegramUpdate({ update_id: 9 }, goodHeaders, SECRET).length === 0
);
check(
  '10g unauthorized request -> EMPTY result (wrong or missing secret)',
  parseApi.parseTelegramUpdate(tgUpdate, { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' }, SECRET).length === 0 &&
    parseApi.parseTelegramUpdate(tgUpdate, {}, SECRET).length === 0
);

console.log('----------------------------------------');
console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
