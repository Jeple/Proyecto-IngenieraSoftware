#!/usr/bin/env node
/**
 * test-recetas-telegram.mjs — unit tests for US-09 (Telegram recipe ingestion).
 *
 * Extracts the named functions from the jsCode of workflows/US-09-recetas-telegram.json
 * and runs deterministic assertions outside n8n. Node >= 18, zero dependencies.
 * Exit code 0 = all PASS, 1 = at least one FAIL.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.join(__dirname, '..', 'workflows', 'US-09-recetas-telegram.json');
const workflow = JSON.parse(readFileSync(workflowPath, 'utf8'));

const EXPORT_NAMES = [
  'isAuthorized',
  'extractCode',
  'selectPhotoFileId',
  'parseUpdate',
  'classifyAction',
  'buildRecipeMessage',
  'buildDriveName'
];

function loadNodeExports(name) {
  const node = (workflow.nodes || []).find((n) => n.name === name);
  if (!node) throw new Error(`node not found: ${name}`);
  const code = node.parameters && node.parameters.jsCode;
  if (!code) throw new Error(`missing jsCode on node: ${name}`);
  const returned = EXPORT_NAMES.map(
    (fn) => `${fn}: (typeof ${fn} === 'function' ? ${fn} : undefined)`
  ).join(', ');
  // The n8n data assembly is guarded with typeof $ !== 'undefined', so the code
  // loads cleanly here: $ is not defined outside n8n and the guard never runs.
  return new Function(`${code}\nreturn { ${returned} };`)();
}

const parseFns = loadNodeExports('parse_recipe_message');
const actionFns = loadNodeExports('build_action');
const finalizeFns = loadNodeExports('finalize_success');

let passed = 0;
let failed = 0;
function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

// --- 1. extractCode normalizes case and optional '#' prefix -----------------
{
  const a = parseFns.extractCode('#FAR-0001');
  const b = parseFns.extractCode('far-0001');
  const c = parseFns.extractCode('FAR-0001');
  check(
    '1 extractCode normalizes #FAR-0001 / far-0001 / FAR-0001',
    a === 'FAR-0001' && a === b && b === c,
    JSON.stringify([a, b, c])
  );
  check('1b extractCode("sin codigo") -> ""', parseFns.extractCode('sin codigo') === '');
}

// --- 2. selectPhotoFileId keeps the LAST (largest) photo --------------------
{
  const three = [
    { file_id: 'small', file_unique_id: 'u1', width: 90, height: 90 },
    { file_id: 'medium', file_unique_id: 'u2', width: 320, height: 320 },
    { file_id: 'large', file_unique_id: 'u3', width: 800, height: 800 }
  ];
  check('2 three-entry photo -> last file_id', parseFns.selectPhotoFileId(three) === 'large');
  check('2b empty photo array -> null', parseFns.selectPhotoFileId([]) === null);
  check('2c missing photo -> null', parseFns.selectPhotoFileId(undefined) === null);
}

const pendingOrder = { codigo_far: 'FAR-0001', estado: 'PENDIENTE_RECETA' };
const routedOrder = { codigo_far: 'FAR-0001', estado: 'EN_RUTA' };

// --- 3. classifyAction -> ASK_CODE when the code is absent ------------------
{
  const action = actionFns.classifyAction({ codigo_far: '', file_id: 'photo', order: null });
  check('3 empty code -> ASK_CODE', action === 'ASK_CODE', action);
}

// --- 4. classifyAction -> NOT_PENDING (unknown code / wrong estado) ----------
{
  const unknown = actionFns.classifyAction({ codigo_far: 'FAR-0001', file_id: 'photo', order: null });
  const wrongEstado = actionFns.classifyAction({
    codigo_far: 'FAR-0001',
    file_id: 'photo',
    order: routedOrder
  });
  check('4 no matching order -> NOT_PENDING', unknown === 'NOT_PENDING', unknown);
  check('4b order in another estado -> NOT_PENDING', wrongEstado === 'NOT_PENDING', wrongEstado);
}

// --- 5. classifyAction -> ASK_PHOTO (pending, no photo) ---------------------
{
  const action = actionFns.classifyAction({
    codigo_far: 'FAR-0001',
    file_id: null,
    order: pendingOrder
  });
  check('5 pending order + no photo -> ASK_PHOTO', action === 'ASK_PHOTO', action);
}

// --- 6. classifyAction -> UPLOAD (pending + photo) --------------------------
{
  const action = actionFns.classifyAction({
    codigo_far: 'FAR-0001',
    file_id: 'photo-id',
    order: pendingOrder
  });
  check('6 pending order + photo -> UPLOAD', action === 'UPLOAD', action);
}

// --- 7. messages: non-empty neutral Spanish, no '$', no product names -------
{
  const askCode = actionFns.buildRecipeMessage('ASK_CODE', '');
  const askPhoto = actionFns.buildRecipeMessage('ASK_PHOTO', 'FAR-0001');
  const notPending = actionFns.buildRecipeMessage('NOT_PENDING', 'FAR-0001');
  const success = actionFns.buildRecipeMessage('UPLOAD', 'FAR-0001');
  const all = { ASK_CODE: askCode, ASK_PHOTO: askPhoto, NOT_PENDING: notPending, UPLOAD: success };

  const nonEmpty = Object.values(all).every((m) => typeof m === 'string' && m.trim().length > 0);
  check('7 all four messages are non-empty', nonEmpty, JSON.stringify(all));
  check(
    '7b no message contains "$"',
    Object.values(all).every((m) => !m.includes('$')),
    JSON.stringify(Object.values(all).filter((m) => m.includes('$')))
  );
  check('7c NOT_PENDING contains #FAR-0001', notPending.includes('#FAR-0001'), notPending);
  check('7d success contains #FAR-0001', success.includes('#FAR-0001'), success);
  check('7e success copy in finalize_success matches', finalizeFns.buildRecipeMessage('UPLOAD', 'FAR-0001') === success);
  check('7f ASK_CODE carries no product name', !/(pregabalina|losart|metformina|sertralina|omeprazol)/i.test(askCode), askCode);
  const spanishMarkers = ['pedido', 'receta', 'farmacia'];
  check(
    '7g messages read as Spanish copy',
    [askCode, askPhoto, notPending, success].every((m) => spanishMarkers.some((w) => m.toLowerCase().includes(w)))
  );
}

// --- 8. buildDriveName exact format and determinism -------------------------
{
  const first = actionFns.buildDriveName('FAR-0001', 1700000000000, 'jpg');
  const second = actionFns.buildDriveName('FAR-0001', 1700000000000, 'jpg');
  check('8 buildDriveName exact value', first === 'FAR-0001/receta-1700000000000.jpg', first);
  check('8b buildDriveName is deterministic', first === second, `${first} vs ${second}`);
}

// --- 9. isAuthorized secret handling ----------------------------------------
{
  const SECRET = 'tg-secret-123';
  check(
    '9 correct secret accepted (mixed-case header)',
    parseFns.isAuthorized({ 'X-Telegram-Bot-Api-Secret-Token': SECRET }, SECRET) === true
  );
  check('9b wrong secret rejected', parseFns.isAuthorized({ 'x-telegram-bot-api-secret-token': 'nope' }, SECRET) === false);
  check('9c missing header rejected', parseFns.isAuthorized({}, SECRET) === false);
  check(
    '9d header name lookup is case-insensitive',
    parseFns.isAuthorized({ 'X-TELEGRAM-BOT-API-SECRET-TOKEN': SECRET }, SECRET) === true
  );
}

// --- 10. parseUpdate-level behavior (never throws) --------------------------
{
  const SECRET = 'tg-secret-123';
  const update = {
    update_id: 77,
    message: {
      message_id: 5,
      from: { id: 99, is_bot: false, first_name: 'Ana' },
      chat: { id: 424242, type: 'private' },
      date: 1700000000,
      caption: 'foto receta #far-0001',
      photo: [
        { file_id: 's', file_unique_id: 'u1', width: 90, height: 90 },
        { file_id: 'm', file_unique_id: 'u2', width: 320, height: 320 },
        { file_id: 'L', file_unique_id: 'u3', width: 1280, height: 1280 }
      ]
    }
  };
  let noMessage;
  let unauthorized;
  let authorized;
  let threw = false;
  try {
    noMessage = parseFns.parseUpdate({ update_id: 78 }, { 'x-telegram-bot-api-secret-token': SECRET }, SECRET);
    unauthorized = parseFns.parseUpdate(update, {}, SECRET);
    authorized = parseFns.parseUpdate(update, { 'x-telegram-bot-api-secret-token': SECRET }, SECRET);
  } catch (err) {
    threw = true;
    console.log('      unexpected throw:', err && err.message);
  }
  check('10 update without message -> [] and no throw', !threw && Array.isArray(noMessage) && noMessage.length === 0);
  check('10b unauthorized -> [] and no throw', !threw && Array.isArray(unauthorized) && unauthorized.length === 0);
  const item = Array.isArray(authorized) && authorized[0] ? authorized[0].json : null;
  check(
    '10c authorized update extracts chat_id/codigo_far/file_id/source',
    !!item &&
      item.chat_id === 424242 &&
      item.codigo_far === 'FAR-0001' &&
      item.file_id === 'L' &&
      item.source === 'telegram',
    JSON.stringify(item)
  );
}

// --- summary ----------------------------------------------------------------
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
process.exit(0);
