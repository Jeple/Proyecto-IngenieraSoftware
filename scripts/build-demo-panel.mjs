/**
 * build-demo-panel.mjs — genera presentacion/panel-demo.html desde data/seed/.
 *
 * El panel es la vista gerencial para la demo: resume la operación simulada
 * (pedidos por estado, catálogo con stock, últimos movimientos) con los MISMOS
 * datos sintéticos versionados en el repositorio. Determinista: sin fecha de
 * generación, sin dependencias y sin servicios externos.
 *
 * Uso:  node scripts/build-demo-panel.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// --- CSV (parser mínimo, sin dependencias) -----------------------------------
export function parseCsv(text) {
  const clean = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  const header = rows.shift() || [];
  return rows
    .filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''))
    .map((r) => {
      const obj = {};
      header.forEach((h, idx) => { obj[h] = r[idx] !== undefined ? r[idx] : ''; });
      return obj;
    });
}

// --- formato determinista (sin ICU) ------------------------------------------
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatClp(value) {
  return '$' + String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatFecha(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso || ''));
  if (!m) return String(iso || '');
  return m[3] + ' ' + MESES[Number(m[2]) - 1] + ' ' + m[4] + ':' + m[5];
}

// --- datos del panel ----------------------------------------------------------
const ORDEN_ESTADOS = ['PENDIENTE_RECETA', 'RECETA_RECIBIDA', 'EN_PREPARACION', 'EN_RUTA', 'ENTREGADO', 'RECHAZADO', 'CANCELADO_EXPIRADO'];
const ESTADO_COLOR = {
  PENDIENTE_RECETA: '#bc4c00',
  RECETA_RECIBIDA: '#8250df',
  EN_PREPARACION: '#9a6700',
  EN_RUTA: '#0969da',
  ENTREGADO: '#1a7f37',
  RECHAZADO: '#cf222e',
  CANCELADO_EXPIRADO: '#6e7781'
};
const EVENTO_META = {
  RESERVA: { label: 'Reserva confirmada', color: '#1a7f37' },
  CONFIRMACION_ENTREGA: { label: 'Entrega confirmada', color: '#0969da' },
  LIBERACION_EXPIRACION: { label: 'Liberación por expiración', color: '#6e7781' },
  LIBERACION_CANCELACION: { label: 'Liberación por cancelación', color: '#bc4c00' }
};

// Constantes de avance: actualizar al regenerar cuando cambien.
const SUITES_VERDE = 266;

export function buildPanelData({ medicamentos, pedidos, log }) {
  const totalClp = pedidos.reduce((acc, p) => acc + Math.round(Number(p.Total_CLP) || 0), 0);

  const byEstado = {};
  pedidos.forEach((p) => { byEstado[p.Estado] = (byEstado[p.Estado] || 0) + 1; });

  const byEvento = {};
  log.forEach((l) => { byEvento[l.Tipo_Evento] = (byEvento[l.Tipo_Evento] || 0) + 1; });

  const medById = {};
  medicamentos.forEach((m) => { medById[m.ID_Medicamento] = m; });

  const catalogo = medicamentos.map((m) => ({
    id: m.ID_Medicamento,
    nombre: String(m.Marca || '') + ' ' + String(m.Dosis || ''),
    principio: m.Principio_Activo,
    receta: m.Requiere_Receta === 'SI',
    precio: Math.round(Number(m.Precio_CLP) || 0),
    disponible: Math.max(0, Math.round(Number(m.Stock_Real) || 0) - Math.round(Number(m.Stock_Reservado) || 0))
  }));

  const latest = log
    .slice()
    .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
    .slice(0, 8)
    .map((l) => {
      const med = medById[l.ID_Medicamento];
      return {
        tipo: l.Tipo_Evento,
        pedido: String(l.ID_Pedido || '').replace(/^#/, ''),
        cantidad: Math.round(Number(l.Cantidad) || 0),
        medicamento: med ? String(med.Marca || '') + ' ' + String(med.Dosis || '') : String(l.ID_Medicamento || ''),
        fecha: formatFecha(l.Timestamp)
      };
    });

  return {
    kpis: {
      pedidos: pedidos.length,
      totalClp,
      medicamentos: medicamentos.length,
      movimientos: log.length,
      pruebas: SUITES_VERDE
    },
    byEstado,
    byEvento,
    catalogo,
    latest
  };
}

export function buildFromDisk() {
  const load = (name) => parseCsv(readFileSync(new URL('../data/seed/' + name, import.meta.url), 'utf8'));
  return buildPanelData({
    medicamentos: load('medicamentos.csv'),
    pedidos: load('pedidos.csv'),
    log: load('log_reservas.csv')
  });
}

// --- render -------------------------------------------------------------------
function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderHtml(data) {
  const k = data.kpis;
  const estados = ORDEN_ESTADOS.filter((e) => data.byEstado[e]).map((e) => {
    const color = ESTADO_COLOR[e] || '#6e7781';
    return (
      '        <li class="chip"><span class="dot" style="background:' + color + '"></span>' +
      '<span class="chip-name">' + esc(e) + '</span><span class="chip-count">' + data.byEstado[e] + '</span></li>\n'
    );
  }).join('');

  const timeline = data.latest.map((ev) => {
    const meta = EVENTO_META[ev.tipo] || { label: ev.tipo, color: '#6e7781' };
    return (
      '        <li class="tl-item"><span class="tl-dot" style="background:' + meta.color + '"></span>' +
      '<div class="tl-body"><b>' + esc(meta.label) + '</b> — ' + esc(ev.medicamento) + ' × ' + ev.cantidad + ' · ' +
      '<span class="mono">' + esc(ev.pedido) + '</span><span class="tl-date">' + esc(ev.fecha) + '</span></div></li>\n'
    );
  }).join('');

  const filas = data.catalogo.map((m) =>
    '          <tr><td><b>' + esc(m.nombre) + '</b><div class="pinc">' + esc(m.principio) + '</div></td>' +
    '<td>' + (m.receta ? 'Sí' : '—') + '</td>' +
    '<td class="num">' + formatClp(m.precio) + '</td>' +
    '<td class="num"><b>' + m.disponible + '</b></td></tr>\n'
  ).join('');

  return '<!DOCTYPE html>\n' +
'<html lang="es">\n' +
'<head>\n' +
'<meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'<title>Panel de demostración — Farmacia Comunitaria de Peñalolén</title>\n' +
'<style>\n' +
'  :root { --green:#0f5132; --green2:#1a7f37; --bg:#f4f7f5; --card:#ffffff; --ink:#1c2126; --muted:#5b6670; --line:#e3e9e5; }\n' +
'  * { box-sizing: border-box; }\n' +
'  body { margin:0; font-family: "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif; background:var(--bg); color:var(--ink); }\n' +
'  header { background:linear-gradient(135deg, #0f5132, #14684a); color:#fff; padding:28px 36px 22px; }\n' +
'  header h1 { margin:6px 0 4px; font-size:26px; letter-spacing:.2px; }\n' +
'  header p { margin:0; opacity:.9; font-size:14.5px; }\n' +
'  .badge { display:inline-block; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.35); border-radius:999px; padding:3px 12px; font-size:12px; letter-spacing:.4px; }\n' +
'  main { max-width:1080px; margin:0 auto; padding:22px 24px 10px; }\n' +
'  .kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:14px; margin-bottom:18px; }\n' +
'  .kpi { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px 18px; }\n' +
'  .kpi-num { display:block; font-size:26px; font-weight:700; color:var(--green); line-height:1.15; }\n' +
'  .kpi-label { display:block; margin-top:4px; font-size:13px; color:var(--muted); }\n' +
'  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:18px; }\n' +
'  @media (max-width: 860px) { .grid2 { grid-template-columns:1fr; } }\n' +
'  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px 20px; margin-bottom:18px; }\n' +
'  .card h2 { margin:0 0 12px; font-size:16.5px; color:var(--green); }\n' +
'  .states { list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; gap:9px; }\n' +
'  .chip { display:flex; align-items:center; gap:8px; border:1px solid var(--line); border-radius:999px; padding:6px 12px; font-size:13.5px; background:#fbfdfc; }\n' +
'  .chip .dot { width:9px; height:9px; border-radius:50%; display:inline-block; }\n' +
'  .chip-count { font-weight:700; }\n' +
'  .flow { margin:0; padding-left:20px; font-size:14px; line-height:1.55; color:#2a3238; }\n' +
'  .flow li { margin-bottom:7px; }\n' +
'  .timeline { list-style:none; margin:0; padding:0; }\n' +
'  .tl-item { display:flex; gap:10px; align-items:flex-start; padding:7px 0; border-bottom:1px dashed var(--line); font-size:14px; }\n' +
'  .tl-item:last-child { border-bottom:0; }\n' +
'  .tl-dot { width:9px; height:9px; border-radius:50%; margin-top:5px; flex:0 0 auto; }\n' +
'  .tl-date { color:var(--muted); margin-left:9px; font-size:12.5px; }\n' +
'  .mono { font-family:Consolas, Menlo, monospace; font-size:12.5px; color:#444f57; }\n' +
'  table { width:100%; border-collapse:collapse; font-size:14px; }\n' +
'  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); }\n' +
'  th { color:var(--muted); font-weight:600; font-size:12.5px; text-transform:uppercase; letter-spacing:.4px; }\n' +
'  td.num, th.num { text-align:right; }\n' +
'  .pinc { color:var(--muted); font-size:12.5px; }\n' +
'  .note p { margin:0 0 8px; font-size:14px; line-height:1.55; }\n' +
'  footer { text-align:center; color:var(--muted); font-size:12.5px; padding:14px 20px 26px; }\n' +
'  @media print { body { background:#fff; } .card, .kpi { box-shadow:none; } }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'<header>\n' +
'  <span class="badge">Demostración con datos sintéticos</span>\n' +
'  <h1>Farmacia Comunitaria de Peñalolén</h1>\n' +
'  <p>Panel gerencial del sistema de atención omnicanal — resumen de la operación simulada (consulta, reserva, seguimiento y recetas).</p>\n' +
'</header>\n' +
'<main>\n' +
'  <section class="kpis">\n' +
'    <div class="kpi"><span class="kpi-num">' + k.pedidos + '</span><span class="kpi-label">pedidos procesados</span></div>\n' +
'    <div class="kpi"><span class="kpi-num">' + formatClp(k.totalClp) + '</span><span class="kpi-label">en pedidos (CLP)</span></div>\n' +
'    <div class="kpi"><span class="kpi-num">' + k.medicamentos + '</span><span class="kpi-label">medicamentos en catálogo</span></div>\n' +
'    <div class="kpi"><span class="kpi-num">' + k.movimientos + '</span><span class="kpi-label">movimientos auditados</span></div>\n' +
'    <div class="kpi"><span class="kpi-num">' + k.pruebas + '</span><span class="kpi-label">pruebas automáticas en verde</span></div>\n' +
'  </section>\n' +
'  <section class="grid2">\n' +
'    <div class="card">\n' +
'      <h2>Pedidos por estado</h2>\n' +
'      <ul class="states">\n' + estados + '      </ul>\n' +
'    </div>\n' +
'    <div class="card">\n' +
'      <h2>Cómo funciona</h2>\n' +
'      <ol class="flow">\n' +
'        <li><b>El vecino escribe</b> por mensajería (Telegram en el prototipo; WhatsApp en la siguiente fase).</li>\n' +
'        <li><b>El sistema entiende</b> aunque haya errores de escritura y datos siempre de la planilla oficial.</li>\n' +
'        <li><b>Consulta o reserva:</b> descuenta stock al instante y entrega un código <span class="mono">#FAR-XXXX</span>.</li>\n' +
'        <li><b>Responde y registra:</b> cada movimiento y cambio de estado queda auditado.</li>\n' +
'      </ol>\n' +
'    </div>\n' +
'  </section>\n' +
'  <section class="card">\n' +
'    <h2>Últimos movimientos (bitácora)</h2>\n' +
'    <ul class="timeline">\n' + timeline + '    </ul>\n' +
'  </section>\n' +
'  <section class="card">\n' +
'    <h2>Catálogo y stock disponible</h2>\n' +
'    <table>\n' +
'      <thead><tr><th>Medicamento</th><th>Requiere receta</th><th class="num">Precio</th><th class="num">Disponible</th></tr></thead>\n' +
'      <tbody>\n' + filas + '      </tbody>\n' +
'    </table>\n' +
'  </section>\n' +
'  <section class="card note">\n' +
'    <h2>Qué mirar</h2>\n' +
'    <p>Los números de arriba salen de los datos sintéticos versionados en el repositorio: son los mismos con los que se prueban los flujos, para que nadie vea información de pacientes reales.</p>\n' +
'    <p>En operación, esta información vive en la planilla conectada al bot: el stock baja al reservar, cada receta espera la validación del químico farmacéutico y todo movimiento queda auditado.</p>\n' +
'    <p>Para ver el sistema por dentro: abrir <b>presentacion/mapa-workflows.html</b> — cada flujo dibujado paso a paso, caja por caja. ¿La app real de n8n? Instrucciones en <b>presentacion/n8n-demo/LEEME.md</b> (Docker o Node).</p>\n' +
'    <p>Avance del proyecto: 8 flujos de n8n y la PWA del conductor, con <b>' + k.pruebas + ' pruebas automáticas</b> en verde en cada cambio. En cierre: validación final en el entorno real y documentos de entrega.</p>\n' +
'  </section>\n' +
'</main>\n' +
'<footer>Datos sintéticos generados desde data/seed · Proyecto Ingeniería de Software · Grupo 10</footer>\n' +
'</body>\n' +
'</html>\n';
}

// --- CLI ----------------------------------------------------------------------
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const data = buildFromDisk();
  const html = renderHtml(data);
  const target = new URL('../presentacion/panel-demo.html', import.meta.url);
  mkdirSync(new URL('../presentacion/', import.meta.url), { recursive: true });
  writeFileSync(target, html, 'utf8');
  console.log('Panel generado: ' + data.kpis.pedidos + ' pedidos, ' + formatClp(data.kpis.totalClp) +
    ', ' + data.kpis.movimientos + ' movimientos (' + html.length + ' bytes)');
}
