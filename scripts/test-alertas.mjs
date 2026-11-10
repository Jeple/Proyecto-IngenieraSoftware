/**
 * test-alertas.mjs — US-21 workflow failure alerts test suite (Node >= 18, zero deps).
 * Extracts the named functions from build_alert's jsCode in
 * workflows/US-21-alertas-errores.json and asserts the alert content contract:
 * actionable, single-line, truncated, and free of personal data by construction.
 */
import { readFileSync } from 'node:fs';

const workflowUrl = new URL('../workflows/US-21-alertas-errores.json', import.meta.url);
const workflow = JSON.parse(readFileSync(workflowUrl, 'utf8'));

const node = workflow.nodes.find((n) => n.name === 'build_alert');
if (!node || !node.parameters || !node.parameters.jsCode) {
  console.error('FAIL could not locate build_alert jsCode in workflow JSON');
  process.exit(1);
}
const api = new Function(
  node.parameters.jsCode + '\n;return { truncateText, collapseWhitespace, buildErrorAlert, buildAlertItem };'
)();

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

const payload = {
  workflow: { id: 'wf-reserva', name: 'reserva' },
  execution: {
    id: 12345,
    url: 'https://n8n.example.com/execution/12345',
    error: { message: 'connect ETIMEDOUT 142.250.0.1', node: { name: 'read_ordenes' } }
  }
};

// 1. Full payload -> alert with workflow, execution, node, message and URL.
check('1. alerta completa incluye workflow, ejecución, nodo, error y enlace', () => {
  const text = api.buildErrorAlert(payload);
  return (
    text.includes('"reserva"') &&
    text.includes('12345') &&
    text.includes('read_ordenes') &&
    text.includes('connect ETIMEDOUT') &&
    text.includes('https://n8n.example.com/execution/12345')
  );
});

// 2. Single line: newlines and tabs collapsed.
check('2. el mensaje es de una sola línea', () => {
  const text = api.buildErrorAlert({
    ...payload,
    execution: { ...payload.execution, error: { message: 'boom\nlinea2\t x', node: { name: 'n' } } }
  });
  return !text.includes('\n') && !text.includes('\t') && text.includes('boom linea2 x');
});

// 3. Long messages truncate at 300 chars with an ellipsis.
check('3. mensajes largos se truncan con puntos suspensivos', () => {
  const long = 'e'.repeat(500);
  const text = api.buildErrorAlert({
    ...payload,
    execution: { ...payload.execution, error: { message: long, node: { name: 'n' } } }
  });
  return text.includes('...') && !text.includes('e'.repeat(301));
});

// 4. Empty payload -> safe defaults, never throws.
check('4. payload vacío produce aviso seguro', () => {
  const text = api.buildErrorAlert({});
  return text.includes('workflow desconocido') && text.includes('sin id') && text.includes('sin mensaje');
});

// 5. Error as plain string is handled.
check('5. error como texto plano se maneja', () => {
  const text = api.buildErrorAlert({ workflow: { name: 'w' }, execution: { id: 1, error: 'falló algo' } });
  return text.includes('falló algo');
});

// 6. No URL -> no "Revisar" clause.
check('6. sin enlace no agrega la cláusula Revisar', () => {
  const text = api.buildErrorAlert({ workflow: { name: 'w' }, execution: { id: 1, error: { message: 'x', node: { name: 'n' } } } });
  return !text.includes('Revisar:');
});

// 7. No node -> no "Nodo" clause.
check('7. sin nodo no agrega la cláusula Nodo', () => {
  const text = api.buildErrorAlert({ workflow: { name: 'w' }, execution: { id: 1, error: { message: 'x' } } });
  return !text.includes('Nodo:') && text.includes('Error: x');
});

// 8. buildAlertItem carries chat_id + CRITICAL severity.
check('8. item de alerta con chat_id y severidad CRITICAL', () => {
  const item = api.buildAlertItem(payload, '555777');
  return Boolean(item) && item.chat_id === '555777' && item.severity === 'CRITICAL' && item.message.includes('"reserva"');
});

// 9. Missing or blank admin chat -> null (no item, no send).
check('9. sin chat de admin no hay item', () => {
  return api.buildAlertItem(payload, '') === null && api.buildAlertItem(payload, undefined) === null && api.buildAlertItem(payload, '   ') === null;
});

// 10. truncateText exact boundary behavior.
check('10. truncateText respeta el límite exacto', () => {
  const exact = api.truncateText('abc', 3);
  const short = api.truncateText('ab', 3);
  const long = api.truncateText('abcdef', 6);
  return exact === 'abc' && short === 'ab' && long === 'abcdef' && api.truncateText('abcdefg', 6) === 'abc...';
});

// ---------------------------------------------------------------------------
const summary = `${failed === 0 ? 'PASS' : 'FAIL'}: ${passed} passed, ${failed} failed`;
console.log(summary);
process.exit(failed === 0 ? 0 : 1);
