#!/usr/bin/env node
/**
 * scripts/test-cron-expiracion.mjs — US-10 (RF-06) 12h expiry cron test.
 *
 * Extracts the named functions from find_expired's jsCode inside
 * workflows/US-10-cron-expiracion.json (the `typeof $ !== 'undefined'` guard
 * keeps the n8n data assembly inert outside the editor) and runs 10
 * behavioral assertions. Zero dependencies, Node >= 18, exit 1 on failure.
 *
 * Fixture = EXAMPLE rows parsed from scripts/setup-sheets.gs + synthetic orders.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WORKFLOW_URL = new URL('../workflows/US-10-cron-expiracion.json', import.meta.url);
const SETUP_URL = new URL('../scripts/setup-sheets.gs', import.meta.url);
const NOW = new Date('2026-03-10T12:00:00.000Z');

// ---------------------------------------------------------------------------
// 1. Load the workflow and extract the named functions from find_expired.
// ---------------------------------------------------------------------------
const workflow = JSON.parse(readFileSync(WORKFLOW_URL, 'utf8'));
const findExpiredNode = workflow.nodes.find((n) => n.name === 'find_expired');
if (!findExpiredNode) failHard('find_expired node not found in workflow');
const jsCode = findExpiredNode.parameters.jsCode;

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`function ${name} not found in find_expired jsCode`);
  let depth = 0;
  let quote = null;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error(`unbalanced braces extracting ${name}`);
}

const fnNames = [...jsCode.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]);
for (const required of ['isExpired', 'selectExpiredOrders', 'aggregateInventoryUpdates', 'buildExpiryMessage']) {
  if (!fnNames.includes(required)) failHard(`required function ${required} missing from jsCode`);
}
const declarations = fnNames.map((name) => extractFunction(jsCode, name));
const fns = new Function(`${declarations.join('\n')}\nreturn { ${fnNames.join(', ')} };`)();

// ---------------------------------------------------------------------------
// 2. Fixture: EXAMPLE rows from setup-sheets.gs + synthetic orders.
// ---------------------------------------------------------------------------
const setupSource = readFileSync(SETUP_URL, 'utf8');

function evalLiteral(pattern, label) {
  const match = setupSource.match(pattern);
  if (!match) failHard(`could not extract ${label} from scripts/setup-sheets.gs`);
  return new Function(`return ${match[1]};`)(); // eslint-disable-line no-new-func
}

const HEADERS = evalLiteral(/var HEADERS = (\{[\s\S]*?\});/, 'HEADERS');
const catalogRows = evalLiteral(/var EXAMPLE_CATALOG_ROWS = (\[[\s\S]*?\]);/, 'EXAMPLE_CATALOG_ROWS');
const inventoryRows = evalLiteral(/var EXAMPLE_INVENTORY_ROWS = (\[[\s\S]*?\]);/, 'EXAMPLE_INVENTORY_ROWS');

const CATALOG = catalogRows.map((row) => Object.fromEntries(HEADERS.catalogo.map((h, i) => [h, row[i]])));
const INVENTORY = inventoryRows.map((row) => ({
  medicamento_id: row[0],
  stock_real: row[1],
  stock_reservado: row[2],
  ultima_actualizacion: row[3],
}));

function makeOrder(overrides) {
  return Object.assign(
    {
      codigo_far: 'FAR-0000',
      fecha_creacion: '2026-03-10T00:00:00.000Z',
      rut: '12345678-9',
      telefono: '+56911223344',
      nombre_cliente: 'Maria Soto',
      medicamento_id: 'MED-0001',
      cantidad: 2,
      precio_total_clp: 3780,
      estado: 'PENDIENTE_RECETA',
      url_receta: '',
      fecha_receta: '',
      fecha_expiracion: '2026-03-10T11:00:00.000Z',
      notas: '',
    },
    overrides || {}
  );
}

function planFor(orders, inventory, catalog) {
  const selected = fns.selectExpiredOrders(orders, NOW);
  return { selected, plan: fns.buildExpiryPlan(selected, inventory || INVENTORY, catalog || CATALOG, NOW) };
}

// ---------------------------------------------------------------------------
// 3. Assertions.
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
function check(label, condition, detail) {
  if (condition) {
    passed++;
    console.log(`PASS  ${label}`);
  } else {
    failed++;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// 1. Past fecha_expiracion in PENDIENTE_RECETA -> selected.
{
  const order = makeOrder({ codigo_far: 'FAR-0001' });
  check('1. expired past order is selected', fns.selectExpiredOrders([order], NOW).length === 1);
}

// 2. Boundary: fecha_expiracion exactly == now -> selected (inclusive).
{
  const order = makeOrder({ codigo_far: 'FAR-0002', fecha_expiracion: NOW.toISOString() });
  check('2. boundary (equal to now) is selected', fns.selectExpiredOrders([order], NOW).length === 1);
}

// 3. Future fecha_expiracion -> not selected.
{
  const order = makeOrder({ codigo_far: 'FAR-0003', fecha_expiracion: '2026-03-10T13:00:00.000Z' });
  check('3. future expiry is not selected', fns.selectExpiredOrders([order], NOW).length === 0);
}

// 4. Any estado other than PENDIENTE_RECETA (incl. EN_PREPARACION, D-01) -> never.
{
  const estados = ['EN_PREPARACION', 'RECETA_RECIBIDA', 'EN_RUTA', 'ENTREGADO', 'CANCELADO_EXPIRADO'];
  const orders = estados.map((estado, i) =>
    makeOrder({ codigo_far: `FAR-10${i}`, estado, fecha_expiracion: '2026-03-10T00:00:00.000Z' })
  );
  check('4. non-PENDIENTE_RECETA estados are never selected', fns.selectExpiredOrders(orders, NOW).length === 0);
}

// 5. Missing or unparseable fecha_expiracion -> never selected, never throws.
{
  let threw = false;
  let selected = -1;
  try {
    const orders = [
      makeOrder({ codigo_far: 'FAR-0005a', fecha_expiracion: '' }),
      makeOrder({ codigo_far: 'FAR-0005b', fecha_expiracion: null }),
      makeOrder({ codigo_far: 'FAR-0005c', fecha_expiracion: 'not-a-date' }),
      makeOrder({ codigo_far: 'FAR-0005d', fecha_expiracion: undefined }),
    ];
    selected = fns.selectExpiredOrders(orders, NOW).length;
  } catch {
    threw = true;
  }
  check('5. missing/unparseable fecha_expiracion never selected and never throws', !threw && selected === 0, threw ? 'threw' : `selected=${selected}`);
}

// 6. Aggregation: same medicamento_id -> ONE update with summed delta; two meds -> two updates.
{
  const orders = [
    makeOrder({ codigo_far: 'FAR-0006a', medicamento_id: 'MED-0002', cantidad: 3 }),
    makeOrder({ codigo_far: 'FAR-0006b', medicamento_id: 'MED-0002', cantidad: 2 }),
  ];
  const { plan } = planFor(orders);
  const sameMed = plan.inventoryUpdates;
  const expectedReserved = INVENTORY.find((r) => r.medicamento_id === 'MED-0002').stock_reservado - 5;
  check(
    '6a. same medication aggregates to ONE update with summed delta',
    sameMed.length === 1 && sameMed[0].stock_reservado === expectedReserved && sameMed[0].delta_reservado === -5,
    `updates=${JSON.stringify(sameMed)}`
  );

  const orders2 = [
    makeOrder({ codigo_far: 'FAR-0006c', medicamento_id: 'MED-0003', cantidad: 2 }),
    makeOrder({ codigo_far: 'FAR-0006d', medicamento_id: 'MED-0004', cantidad: 1 }),
  ];
  const { plan: plan2 } = planFor(orders2);
  check('6b. two different medications produce two updates', plan2.inventoryUpdates.length === 2, `updates=${plan2.inventoryUpdates.length}`);
}

// 7. Clamp: stock_reservado 5, cancelling 8 -> 0, delta_reservado -5, detalle has CLAMP.
{
  const inventory = INVENTORY.map((row) =>
    row.medicamento_id === 'MED-0002' ? Object.assign({}, row, { stock_reservado: 5 }) : row
  );
  const order = makeOrder({ codigo_far: 'FAR-0007', medicamento_id: 'MED-0002', cantidad: 8 });
  const { plan } = planFor([order], inventory);
  const update = plan.inventoryUpdates[0];
  const bitacora = plan.bitacoraRows[0];
  check(
    '7. clamp releases only what exists',
    update.stock_reservado === 0 &&
      bitacora.delta_reservado === -5 &&
      String(bitacora.detalle).includes('CLAMP'),
    `stock_reservado=${update && update.stock_reservado} delta=${bitacora && bitacora.delta_reservado} detalle=${bitacora && bitacora.detalle}`
  );
}

// 8. Message: has #FAR-0001 + catalog product name, no prices.
{
  const order = makeOrder({ codigo_far: 'FAR-0001', medicamento_id: 'MED-0001', cantidad: 2, precio_total_clp: 3780 });
  const { plan } = planFor([order]);
  const message = plan.notifications[0].message;
  const product = CATALOG.find((r) => r.medicamento_id === 'MED-0001').nombre_comercial;
  check(
    '8. message has order code and product name, no price',
    message.includes('#FAR-0001') &&
      message.includes(product) &&
      !message.includes('$') &&
      !message.includes('3780') &&
      !message.includes('1890'),
    message
  );
}

// 9. Unknown medicamento_id -> no product clause, no throw.
{
  let threw = false;
  let message = '';
  try {
    const order = makeOrder({ codigo_far: 'FAR-0099', medicamento_id: 'MED-9999', cantidad: 3 });
    const { plan } = planFor([order]);
    message = plan.notifications[0].message;
  } catch (err) {
    threw = true;
    message = String(err);
  }
  check(
    '9. unknown medicamento_id omits product clause and does not throw',
    !threw && message.includes('#FAR-0099') && !message.includes('Liberamos') && !message.includes('undefined'),
    message
  );
}

// 10. bitacora row shape: accion EXPIRACION, negative delta, non-empty codigo_far.
{
  const order = makeOrder({ codigo_far: 'FAR-0010', medicamento_id: 'MED-0001', cantidad: 2 });
  const { plan } = planFor([order]);
  const row = plan.bitacoraRows[0];
  check(
    '10. bitacora row shape (EXPIRACION, negative delta, codigo_far)',
    row.accion === 'EXPIRACION' &&
      typeof row.delta_reservado === 'number' &&
      row.delta_reservado < 0 &&
      typeof row.codigo_far === 'string' &&
      row.codigo_far.length > 0 &&
      !Number.isNaN(Date.parse(row.timestamp)),
    JSON.stringify(row)
  );
}

// 11. Notifications carry chat_id (Telegram contract); the value is still read
//     from the order's telefono column, which now stores Telegram chat ids.
{
  const order = makeOrder({ codigo_far: 'FAR-0011', telefono: '-1005550001' });
  const { plan } = planFor([order]);
  const notification = plan.notifications[0];
  check(
    '11. notification carries chat_id sourced from the telefono column',
    notification.chat_id === '-1005550001' && !('phone' in notification),
    JSON.stringify(notification)
  );
}

// 12. bitacora audit fields (estado_anterior/estado_nuevo/actor).
{
  const order = makeOrder({ codigo_far: 'FAR-0012', medicamento_id: 'MED-0001', cantidad: 2 });
  const { plan } = planFor([order]);
  const row = plan.bitacoraRows[0];
  check(
    '12. bitacora carries audit fields (PENDIENTE_RECETA -> CANCELADO_EXPIRADO, sistema:cron)',
    row.estado_anterior === 'PENDIENTE_RECETA' && row.estado_nuevo === 'CANCELADO_EXPIRADO' && row.actor === 'sistema:cron',
    JSON.stringify(row)
  );
}

// ---------------------------------------------------------------------------
// 4. Summary.
// ---------------------------------------------------------------------------
const total = passed + failed;
if (failed > 0) {
  console.log(`FAIL ${failed}/${total} — US-10 cron expiry tests failed`);
  process.exit(1);
}
console.log(`PASS ${passed}/${total} — US-10 cron expiry tests passed`);
process.exit(0);

function failHard(message) {
  console.error(`FAIL  harness — ${message}`);
  process.exit(1);
}
