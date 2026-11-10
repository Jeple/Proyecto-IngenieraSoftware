/**
 * test-mapa.mjs — Mapa de workflows: consistencia con los JSON reales.
 *
 * Verifica que el mapa se arme desde todos los flujos, que cada conexión
 * apunte a un nodo existente y que el archivo versionado coincida con el
 * generador. Si falla la última prueba: node scripts/build-workflow-map.mjs
 */
import { readFileSync } from 'node:fs';
import { buildMapFromDisk, renderMapHtml } from './build-workflow-map.mjs';

let passed = 0;
let failed = 0;
function check(label, cond, detail) {
  if (cond) { passed += 1; console.log('PASS  ' + label); }
  else { failed += 1; console.log('FAIL  ' + label + (detail !== undefined ? ' — ' + String(detail) : '')); }
}

const workflows = buildMapFromDisk();

check('1. el mapa incluye los 8 flujos de negocio', workflows.length === 8, workflows.map((w) => w.file).join(', '));
check('2. no incluye el smoke test de infraestructura', !workflows.some((w) => w.file === 'smoke-test.json'));
check('3. cada flujo tiene título y resumen', workflows.every((w) => w.titulo && w.resumen));
check('4. total de pasos dibujados', workflows.reduce((a, w) => a + w.nodes.length, 0) === 77, workflows.reduce((a, w) => a + w.nodes.length, 0));
check(
  '5. toda conexión apunta a un nodo existente',
  workflows.every((w) => w.edges.every((e) => e.targetsExist)),
  workflows.flatMap((w) => w.edges.filter((e) => !e.targetsExist).map((e) => w.file + ': ' + e.from + ' -> ' + e.to)).join(' | ')
);
check('6. cada flujo tiene al menos una conexión', workflows.every((w) => w.edges.length > 0));
check('7. los flujos clave están presentes', ['US-04-consulta-stock.json', 'US-05-reserva.json', 'US-06-trazabilidad.json', 'US-20-aprobacion-recetas.json', 'US-21-alertas-errores.json'].every((f) => workflows.some((w) => w.file === f)));

const html = renderMapHtml(workflows);
check('8. el HTML incluye una pestaña por flujo y la PWA', html.includes('PWA del conductor') && workflows.every((w) => html.includes(w.titulo)));
check('9. etiquetas en español para la reunión', html.includes('Responde por Telegram') && html.includes('Registra el movimiento') && html.includes('Recibe el mensaje'));
check('10. cada flujo tiene su SVG', (html.match(/<svg/g) || []).length === 8, (html.match(/<svg/g) || []).length);

const committed = readFileSync(new URL('../presentacion/mapa-workflows.html', import.meta.url), 'utf8');
check('11. mapa versionado == generador (regenerar: node scripts/build-workflow-map.mjs)', committed === html);

console.log('----------------------------------------');
console.log('SUMMARY: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
