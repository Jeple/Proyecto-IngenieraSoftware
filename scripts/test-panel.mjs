/**
 * test-panel.mjs — Panel de demostración: consistencia con los datos sintéticos.
 *
 * Verifica que los KPIs calculados coincidan con data/seed/ y que el archivo
 * versionado (presentacion/panel-demo.html) sea exactamente el que produce el
 * generador. Si falla la última prueba: node scripts/build-demo-panel.mjs
 */
import { readFileSync } from 'node:fs';
import { buildFromDisk, renderHtml, formatClp, formatFecha } from './build-demo-panel.mjs';

let passed = 0;
let failed = 0;
function check(label, cond, detail) {
  if (cond) { passed += 1; console.log('PASS  ' + label); }
  else { failed += 1; console.log('FAIL  ' + label + (detail !== undefined ? ' — ' + String(detail) : '')); }
}

const data = buildFromDisk();

check('1. 13 pedidos procesados', data.kpis.pedidos === 13, data.kpis.pedidos);
check('2. total $193.750 CLP', data.kpis.totalClp === 193750, data.kpis.totalClp);
check('3. 16 medicamentos en catálogo', data.kpis.medicamentos === 16, data.kpis.medicamentos);
check('4. 29 movimientos auditados', data.kpis.movimientos === 29, data.kpis.movimientos);
check(
  '5. pedidos por estado (6 estados del dataset)',
  data.byEstado.ENTREGADO === 4 &&
    data.byEstado.EN_RUTA === 2 &&
    data.byEstado.EN_PREPARACION === 1 &&
    data.byEstado.RECETA_RECIBIDA === 2 &&
    data.byEstado.PENDIENTE_RECETA === 2 &&
    data.byEstado.CANCELADO_EXPIRADO === 2,
  JSON.stringify(data.byEstado)
);
check(
  '6. eventos por tipo',
  data.byEvento.RESERVA === 20 &&
    data.byEvento.CONFIRMACION_ENTREGA === 6 &&
    data.byEvento.LIBERACION_EXPIRACION === 1 &&
    data.byEvento.LIBERACION_CANCELACION === 2,
  JSON.stringify(data.byEvento)
);
check('7. formato CLP es-CL determinista', formatClp(193750) === '$193.750' && formatClp(8990) === '$8.990', formatClp(193750));
check('8. formato de fecha determinista', formatFecha('2026-10-03T09:00:00-03:00') === '03 oct 09:00', formatFecha('2026-10-03T09:00:00-03:00'));
check('9. catálogo sin disponible negativo', data.catalogo.length === 16 && data.catalogo.every((m) => m.disponible >= 0));
check('10. últimos movimientos con nombre y fecha', data.latest.length === 8 && data.latest.every((e) => e.medicamento.length > 0 && e.fecha.length > 0));

const html = renderHtml(data);
check('11. el HTML contiene los KPIs y el título', html.includes('$193.750') && html.includes('29') && html.includes('Farmacia Comunitaria de Peñalolén'));
check('12. tabla del catálogo con 16 filas', (html.match(/<tr>/g) || []).length === 17, (html.match(/<tr>/g) || []).length);

const committed = readFileSync(new URL('../presentacion/panel-demo.html', import.meta.url), 'utf8');
check('13. panel versionado == generador (regenerar: node scripts/build-demo-panel.mjs)', committed === html);

console.log('----------------------------------------');
console.log('SUMMARY: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
