#!/usr/bin/env node
// test-recetas-email.mjs — unit tests for the US-09 email half.
// Zero dependencies (Node >= 18). Extracts the named functions from the
// workflow jsCode and asserts the RF-05 email contract.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, 'workflows', 'US-09-recetas-email.json');

let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    passed += 1;
    console.log('PASS ' + label);
  } else {
    failed += 1;
    console.log('FAIL ' + label);
  }
}

const workflow = JSON.parse(readFileSync(workflowPath, 'utf8'));
const codeSources = workflow.nodes
  .filter((node) => node.type === 'n8n-nodes-base.code')
  .map((node) => node.parameters.jsCode);

// Extract `function name(...) { ... }` from a jsCode string via brace matching
// that skips quoted strings, template literals and escapes.
function extractFunction(source, name) {
  const token = 'function ' + name + '(';
  const start = source.indexOf(token);
  if (start === -1) {
    throw new Error('function not found: ' + name);
  }
  let i = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('unbalanced braces in function: ' + name);
}

function loadFunction(name) {
  for (const source of codeSources) {
    if (source.indexOf('function ' + name + '(') !== -1) {
      const snippet = extractFunction(source, name);
      return new Function(snippet + '\nreturn ' + name + ';')();
    }
  }
  throw new Error('function not found in workflow: ' + name);
}

const extractCodeFromSubject = loadFunction('extractCodeFromSubject');
const extractReplyAddress = loadFunction('extractReplyAddress');
const sanitizeFilename = loadFunction('sanitizeFilename');
const classifyAction = loadFunction('classifyAction');
const buildRecipeMessage = loadFunction('buildRecipeMessage');
const buildDriveName = loadFunction('buildDriveName');

// 1 — extractCodeFromSubject
check(
  '1 extractCodeFromSubject("Re: Receta #FAR-0002 urgente") -> FAR-0002',
  extractCodeFromSubject('Re: Receta #FAR-0002 urgente') === 'FAR-0002'
);
check(
  '1 extractCodeFromSubject("Consulta FAR-0009") -> FAR-0009',
  extractCodeFromSubject('Consulta FAR-0009') === 'FAR-0009'
);
check(
  '1 extractCodeFromSubject("sin codigo") -> ""',
  extractCodeFromSubject('sin codigo') === ''
);

// 2 — extractReplyAddress
check(
  '2 extractReplyAddress("Ana Pérez <ana@correo.cl>") -> ana@correo.cl',
  extractReplyAddress('Ana Pérez <ana@correo.cl>') === 'ana@correo.cl'
);
check(
  '2 extractReplyAddress("ana@correo.cl") -> ana@correo.cl',
  extractReplyAddress('ana@correo.cl') === 'ana@correo.cl'
);
check('2 extractReplyAddress("") -> ""', extractReplyAddress('') === '');

// 3 — sanitizeFilename
const traversal = sanitizeFilename('../../etc/passwd');
check(
  '3 sanitizeFilename("../../etc/passwd") has no "/" and no ".." (got "' + traversal + '")',
  !traversal.includes('/') && !traversal.includes('..')
);
check(
  '3 sanitizeFilename("mi receta final.pdf") -> mi_receta_final.pdf',
  sanitizeFilename('mi receta final.pdf') === 'mi_receta_final.pdf'
);
check('3 sanitizeFilename("") -> receta-adjunta', sanitizeFilename('') === 'receta-adjunta');

// 4 — classifyAction: no code in the subject
check(
  '4 classifyAction -> ASK_CODE when the subject has no code',
  classifyAction({ codigo_far: '', hasAttachment: true, order: undefined }) === 'ASK_CODE'
);

// 5 — classifyAction: unknown code / other estado
check(
  '5 classifyAction -> NOT_PENDING for an unknown code',
  classifyAction({ codigo_far: 'FAR-9999', hasAttachment: true, order: undefined }) === 'NOT_PENDING'
);
check(
  '5 classifyAction -> NOT_PENDING for an order in another estado',
  classifyAction({
    codigo_far: 'FAR-0001',
    hasAttachment: true,
    order: { codigo_far: 'FAR-0001', estado: 'EN_PREPARACION' }
  }) === 'NOT_PENDING'
);

// 6 — classifyAction: pending order, no attachment
check(
  '6 classifyAction -> ASK_ATTACHMENT when pending and no attachment',
  classifyAction({
    codigo_far: 'FAR-0001',
    hasAttachment: false,
    order: { codigo_far: 'FAR-0001', estado: 'PENDIENTE_RECETA' }
  }) === 'ASK_ATTACHMENT'
);

// 7 — classifyAction: pending order with attachment
check(
  '7 classifyAction -> UPLOAD when pending and attachment exists',
  classifyAction({
    codigo_far: 'FAR-0001',
    hasAttachment: true,
    order: { codigo_far: 'FAR-0001', estado: 'PENDIENTE_RECETA' }
  }) === 'UPLOAD'
);

// 8 — messages: non-empty Spanish, no $, codes where known, no product in ASK_CODE
const askCodeMsg = buildRecipeMessage('ASK_CODE', 'FAR-0001');
const askAttachmentMsg = buildRecipeMessage('ASK_ATTACHMENT', 'FAR-0001');
const notPendingMsg = buildRecipeMessage('NOT_PENDING', 'FAR-0001');
const successMsg = buildRecipeMessage('SUCCESS', 'FAR-0001');
const allMessages = [askCodeMsg, askAttachmentMsg, notPendingMsg, successMsg];
check('8 all four messages are non-empty', allMessages.every((m) => typeof m === 'string' && m.trim().length > 0));
check('8 no message contains "$"', allMessages.every((m) => !m.includes('$')));
check(
  '8 all four messages are Spanish (accents present)',
  allMessages.every((m) => /[áéíóúñÁÉÍÓÚÑ]/.test(m))
);
check('8 NOT_PENDING contains #FAR-0001', notPendingMsg.includes('#FAR-0001'));
check('8 success contains #FAR-0001', successMsg.includes('#FAR-0001'));
check('8 ASK_CODE names no product/order (no #FAR-XXXX digits)', !/#FAR-\d{4}/.test(askCodeMsg));

// 9 — buildDriveName
const driveName = buildDriveName('FAR-0001', 1700000000000, 'receta.jpg');
check(
  '9 buildDriveName("FAR-0001", 1700000000000, "receta.jpg") -> FAR-0001/1700000000000-receta.jpg',
  driveName === 'FAR-0001/1700000000000-receta.jpg'
);
check(
  '9 buildDriveName is deterministic across repeated calls',
  buildDriveName('FAR-0001', 1700000000000, 'receta.jpg') === driveName
);

// 10 — running the jsCode outside n8n (no message / no $) yields an empty
// result and never throws.
codeSources.forEach((source, index) => {
  let result;
  let threw = false;
  try {
    result = new Function(source)();
  } catch (error) {
    threw = true;
    result = undefined;
  }
  check(
    '10 code node #' + (index + 1) + ' outside n8n -> no throw, empty result',
    !threw && Array.isArray(result) && result.length === 0
  );
});

const summary = 'SUMMARY: ' + passed + ' passed, ' + failed + ' failed';
console.log(summary);
process.exit(failed > 0 ? 1 : 0);
