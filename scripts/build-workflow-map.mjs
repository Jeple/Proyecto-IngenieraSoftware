/**
 * build-workflow-map.mjs — genera presentacion/mapa-workflows.html.
 *
 * Dibuja cada flujo de workflows/*.json como un diagrama (cajitas conectadas),
 * con etiquetas en español para la reunión con jefes. Autocontenido y
 * determinista: se abre con doble clic, sin n8n, sin internet.
 *
 * Uso:  node scripts/build-workflow-map.mjs
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ORDEN = [
  'US-04-consulta-stock.json',
  'US-05-reserva.json',
  'US-06-trazabilidad.json',
  'US-09-recetas-telegram.json',
  'US-09-recetas-email.json',
  'US-10-cron-expiracion.json',
  'US-20-aprobacion-recetas.json',
  'US-21-alertas-errores.json'
];

const DESCRIPCIONES = {
  'US-04-consulta-stock.json': {
    titulo: 'Consulta de stock y precios',
    resumen: 'El vecino pregunta por un medicamento (aunque escriba con errores) y recibe disponibilidad y precio reales, sin datos inventados.'
  },
  'US-05-reserva.json': {
    titulo: 'Reserva y despacho',
    resumen: 'Toma el pedido con RUT y dirección, descuenta el stock al instante, crea el despacho y evita duplicados.'
  },
  'US-06-trazabilidad.json': {
    titulo: 'Estado del pedido',
    resumen: 'El titular consulta por código o RUT; cualquier otro chat recibe el mismo mensaje que un pedido inexistente.'
  },
  'US-09-recetas-telegram.json': {
    titulo: 'Recepción de recetas (Telegram)',
    resumen: 'Recibe la foto de la receta desde el chat titular, la guarda en Drive y la asocia al pedido.'
  },
  'US-09-recetas-email.json': {
    titulo: 'Recepción de recetas (correo)',
    resumen: 'Misma lógica por correo; queda postergado a una versión posterior (no se usa en la demo).'
  },
  'US-10-cron-expiracion.json': {
    titulo: 'Expiración a 12 horas',
    resumen: 'Cada hora cancela los pedidos sin receta vencidos, libera el stock y avisa al vecino.'
  },
  'US-20-aprobacion-recetas.json': {
    titulo: 'Aprobación farmacéutica',
    resumen: 'El químico farmacéutico aprueba o rechaza por comando; nada pasa a preparación sin su aprobación y el rechazo libera el stock.'
  },
  'US-21-alertas-errores.json': {
    titulo: 'Alertas de error',
    resumen: 'Si un flujo falla, avisa al equipo con el workflow, el nodo y el enlace a la ejecución.'
  }
};

const TYPE_META = {
  'n8n-nodes-base.webhook': { cat: 'Mensaje', color: '#0969da' },
  'n8n-nodes-base.code': { cat: 'Lógica', color: '#57606a' },
  'n8n-nodes-base.googleSheets': { cat: 'Planilla', color: '#1a7f37' },
  'n8n-nodes-base.httpRequest': { cat: 'Envío', color: '#0969da' },
  'n8n-nodes-base.if': { cat: 'Decisión', color: '#bc4c00' },
  'n8n-nodes-base.scheduleTrigger': { cat: 'Reloj', color: '#8250df' },
  'n8n-nodes-base.errorTrigger': { cat: 'Alerta', color: '#cf222e' },
  'n8n-nodes-base.googleDrive': { cat: 'Drive', color: '#9a6700' }
};

const NODE_LABELS = {
  webhook_reserva: 'Recibe el mensaje',
  webhook_trazabilidad: 'Recibe la consulta',
  webhook_recetas: 'Recibe la foto',
  webhook_aprobacion: 'Recibe el comando',
  webhook_consulta: 'Recibe la consulta',
  webhook_telegram: 'Recibe el mensaje',
  parse_incoming: 'Entiende el mensaje',
  imap_trigger: 'Revisa el correo',
  parse_recipe_email: 'Entiende el correo',
  send_email: 'Responde por correo',
  parse_reservation: 'Entiende el pedido',
  parse_tracking_request: 'Entiende la consulta',
  parse_recipe_message: 'Entiende el mensaje',
  parse_pharmacist_command: 'Entiende el comando',
  read_catalogo: 'Lee el catálogo',
  read_inventario: 'Lee el stock',
  read_ordenes: 'Lee los pedidos',
  read_despachos: 'Lee los despachos',
  evaluate_reservation: 'Decide la reserva',
  evaluate_approval: 'Valida la transición',
  build_reply: 'Arma la respuesta',
  build_action: 'Decide qué hacer',
  build_tracking_reply: 'Arma la respuesta',
  build_alert: 'Arma la alerta',
  if_decision: '¿Es válido?',
  if_commit: '¿Es válido?',
  if_reject: '¿Rechaza?',
  if_upload: '¿Viene con foto?',
  if_any_expired: '¿Hay vencidos?',
  append_orden: 'Crea el pedido',
  append_bitacora: 'Registra el movimiento',
  append_despacho: 'Crea el despacho',
  update_inventario: 'Actualiza el stock',
  update_orden: 'Actualiza el pedido',
  update_ordenes: 'Cancela los pedidos',
  verify_reservation: 'Verifica el stock',
  finalize_reply: 'Prepara la respuesta',
  finalize_success: 'Confirma el término',
  send_telegram: 'Responde por Telegram',
  send_alert: 'Avisa al equipo',
  notify_customer: 'Avisa al cliente',
  reply_pharmacist: 'Responde al farmacéutico',
  cron_hourly: 'Se activa cada hora',
  find_expired: 'Busca los vencidos',
  expand_orders: 'Prepara los cambios',
  expand_inventory: 'Prepara el stock',
  emit_bitacora: 'Prepara la bitácora',
  emit_notifications: 'Prepara los avisos',
  get_telegram_file: 'Obtiene la foto',
  download_telegram_file: 'Descarga la foto',
  upload_to_drive: 'Guarda en Drive',
  error_trigger: 'Se activa con el error'
};

function labelFor(name) {
  if (NODE_LABELS[name]) return { label: NODE_LABELS[name], mapped: true };
  return { label: String(name || '').replace(/_/g, ' '), mapped: false };
}

// --- carga y armado -----------------------------------------------------------
export function buildMapFromDisk() {
  const dir = new URL('../workflows/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'smoke-test.json');
  files.sort((a, b) => {
    const ia = ORDEN.indexOf(a);
    const ib = ORDEN.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
  return files.map((file) => {
    const wf = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    const nodes = (wf.nodes || []).map((n) => ({
      name: n.name,
      type: n.type,
      x: Array.isArray(n.position) ? n.position[0] : 0,
      y: Array.isArray(n.position) ? n.position[1] : 0
    }));
    const edges = [];
    const names = new Set(nodes.map((n) => n.name));
    Object.keys(wf.connections || {}).forEach((source) => {
      const outputs = (wf.connections[source] && wf.connections[source].main) || [];
      outputs.forEach((targets, outputIndex) => {
        (targets || []).forEach((t) => {
          edges.push({ from: source, to: t.node, outputIndex, targetsExist: names.has(t.node) });
        });
      });
    });
    return {
      file,
      titulo: (DESCRIPCIONES[file] && DESCRIPCIONES[file].titulo) || wf.name || file,
      resumen: (DESCRIPCIONES[file] && DESCRIPCIONES[file].resumen) || '',
      nodes,
      edges
    };
  });
}

// --- render -------------------------------------------------------------------
const esc = (v) => String(v === null || v === undefined ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const NW = 210;
const NH = 66;
const PAD = 46;

function renderSvg(wf, idx) {
  const xs = wf.nodes.map((n) => n.x);
  const ys = wf.nodes.map((n) => n.y);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const width = Math.max(...xs) - Math.min(...xs) + NW + PAD * 2;
  const height = Math.max(...ys) - Math.min(...ys) + NH + PAD * 2;
  const pos = {};
  wf.nodes.forEach((n) => { pos[n.name] = n; });

  let edgeSvg = '';
  wf.edges.forEach((e) => {
    const s = pos[e.from];
    const t = pos[e.to];
    if (!s || !t) return;
    const twoOut = wf.edges.some((x) => x.from === e.from && x.outputIndex === 1) || e.outputIndex > 0;
    const sy = s.y + NH / 2 + (twoOut && e.outputIndex === 0 ? -13 : twoOut && e.outputIndex === 1 ? 13 : 0);
    const sx = s.x + NW;
    const ty = t.y + NH / 2;
    const tx = t.x;
    edgeSvg += '<path d="M ' + sx + ' ' + sy + ' C ' + (sx + 46) + ' ' + sy + ', ' + (tx - 46) + ' ' + ty + ', ' + tx + ' ' + ty +
      '" fill="none" stroke="#9aa4ac" stroke-width="1.8" marker-end="url(#arrow-' + idx + ')" />\n';
  });

  let nodeSvg = '';
  wf.nodes.forEach((n) => {
    const meta = TYPE_META[n.type] || { cat: 'Paso', color: '#6e7781' };
    const lab = labelFor(n.name);
    nodeSvg += '<g><rect x="' + n.x + '" y="' + n.y + '" width="' + NW + '" height="' + NH + '" rx="10" fill="#ffffff" stroke="' + meta.color + '" stroke-width="1.6" />' +
      '<text x="' + (n.x + 12) + '" y="' + (n.y + 18) + '" font-size="10" fill="' + meta.color + '" letter-spacing="0.6">' + esc(meta.cat.toUpperCase()) + '</text>' +
      '<text x="' + (n.x + 12) + '" y="' + (n.y + 38) + '" font-size="13" font-weight="600" fill="#1c2126">' + esc(lab.label) + '</text>' +
      '<text x="' + (n.x + 12) + '" y="' + (n.y + 55) + '" font-size="9.5" fill="#98a2aa" font-family="Consolas, Menlo, monospace">' + esc(n.name) + '</text></g>\n';
  });

  return '<svg class="diagram" viewBox="' + minX + ' ' + minY + ' ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagrama de ' + esc(wf.titulo) + '">\n' +
    '<defs><marker id="arrow-' + idx + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#9aa4ac" /></marker></defs>\n' +
    edgeSvg + nodeSvg + '</svg>';
}

export function renderMapHtml(workflows) {
  const tabs = workflows.map((wf, i) =>
    '<button class="tab' + (i === 0 ? ' active' : '') + '" data-target="wf-' + i + '">' + esc(wf.titulo) + '</button>'
  ).join('') + '<button class="tab" data-target="wf-pwa">PWA del conductor</button>';

  const sections = workflows.map((wf, i) =>
    '<section class="wf' + (i === 0 ? ' active' : '') + '" id="wf-' + i + '">\n' +
    '  <h2>' + esc(wf.titulo) + ' <span class="file">' + esc(wf.file) + '</span></h2>\n' +
    '  <p class="resumen">' + esc(wf.resumen) + '</p>\n' +
    '  <div class="diagram-wrap">' + renderSvg(wf, i) + '</div>\n' +
    '</section>\n'
  ).join('');

  const pwa = '<section class="wf" id="wf-pwa">\n' +
    '  <h2>PWA del conductor <span class="file">pwa/ (US-11)</span></h2>\n' +
    '  <p class="resumen">La vista del conductor corre en el navegador del teléfono: muestra los despachos y los tiempos estimados de viaje. Hoy funciona en modo demostración; su conexión definitiva con los flujos está planificada.</p>\n' +
    '  <div class="pwa-note">Esta parte no es un flujo de n8n: es una aplicación web (PWA) que se abre en el teléfono.</div>\n' +
    '</section>\n';

  const leyenda = [
    ['Mensaje', '#0969da'], ['Lógica', '#57606a'], ['Planilla', '#1a7f37'], ['Envío', '#0969da'],
    ['Decisión', '#bc4c00'], ['Reloj', '#8250df'], ['Alerta', '#cf222e'], ['Drive', '#9a6700']
  ].map(([t, c]) => '<span class="lg"><span class="lg-dot" style="background:' + c + '"></span>' + t + '</span>').join('');

  return '<!DOCTYPE html>\n' +
'<html lang="es">\n' +
'<head>\n' +
'<meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'<title>Mapa del sistema — Farmacia Comunitaria de Peñalolén</title>\n' +
'<style>\n' +
'  * { box-sizing: border-box; }\n' +
'  body { margin:0; font-family:"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif; background:#f4f7f5; color:#1c2126; }\n' +
'  header { background:linear-gradient(135deg,#0f5132,#14684a); color:#fff; padding:26px 36px 20px; }\n' +
'  header h1 { margin:6px 0 4px; font-size:24px; }\n' +
'  header p { margin:0; opacity:.92; font-size:14px; max-width:900px; }\n' +
'  .badge { display:inline-block; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.35); border-radius:999px; padding:3px 12px; font-size:12px; }\n' +
'  main { max-width:1180px; margin:0 auto; padding:18px 22px 8px; }\n' +
'  .tabs { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0 16px; }\n' +
'  .tab { border:1px solid #cfd8d3; background:#fff; border-radius:999px; padding:7px 14px; font-size:13px; cursor:pointer; color:#33413a; }\n' +
'  .tab.active { background:#0f5132; border-color:#0f5132; color:#fff; }\n' +
'  .wf { display:none; background:#fff; border:1px solid #e3e9e5; border-radius:14px; padding:18px 20px 8px; margin-bottom:16px; }\n' +
'  .wf.active { display:block; }\n' +
'  .wf h2 { margin:0 0 4px; font-size:17px; color:#0f5132; }\n' +
'  .file { font-size:11px; color:#98a2aa; font-family:Consolas, Menlo, monospace; font-weight:400; margin-left:8px; }\n' +
'  .resumen { margin:2px 0 12px; font-size:13.5px; color:#5b6670; }\n' +
'  .diagram { width:100%; height:auto; display:block; }\n' +
'  .diagram-wrap { overflow-x:auto; }\n' +
'  .leyenda { display:flex; flex-wrap:wrap; gap:12px; margin:4px 0 16px; font-size:12.5px; color:#5b6670; }\n' +
'  .lg { display:flex; align-items:center; gap:6px; }\n' +
'  .lg-dot { width:10px; height:10px; border-radius:3px; display:inline-block; }\n' +
'  .pwa-note { background:#f1f6f3; border:1px dashed #b9cbc2; border-radius:10px; padding:12px 14px; font-size:13.5px; color:#33413a; margin-bottom:10px; }\n' +
'  footer { text-align:center; color:#6b767e; font-size:12.5px; padding:12px 20px 26px; }\n' +
'  @media print { .wf { display:block !important; page-break-inside:avoid; } .tabs { display:none; } }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'<header>\n' +
'  <span class="badge">Vista para la reunión — generada desde los flujos reales</span>\n' +
'  <h1>Mapa del sistema paso a paso</h1>\n' +
'  <p>Cada pestaña muestra un flujo automático completo: las cajitas son los pasos y las flechas el camino de la información. Se abre con doble clic, sin instalar n8n.</p>\n' +
'</header>\n' +
'<main>\n' +
'  <div class="leyenda">' + leyenda + '</div>\n' +
'  <nav class="tabs">' + tabs + '</nav>\n' +
  sections + pwa +
'</main>\n' +
'<footer>Diagramas generados automáticamente desde workflows/*.json · Proyecto Ingeniería de Software · Grupo 10</footer>\n' +
'<script>\n' +
'(function () {\n' +
'  var tabs = document.querySelectorAll(".tab");\n' +
'  var secs = document.querySelectorAll(".wf");\n' +
'  tabs.forEach(function (t) {\n' +
'    t.addEventListener("click", function () {\n' +
'      tabs.forEach(function (x) { x.classList.remove("active"); });\n' +
'      secs.forEach(function (s) { s.classList.remove("active"); });\n' +
'      t.classList.add("active");\n' +
'      var el = document.getElementById(t.dataset.target);\n' +
'      if (el) el.classList.add("active");\n' +
'    });\n' +
'  });\n' +
'})();\n' +
'</script>\n' +
'</body>\n' +
'</html>\n';
}

// --- CLI ----------------------------------------------------------------------
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const workflows = buildMapFromDisk();
  const html = renderMapHtml(workflows);
  mkdirSync(new URL('../presentacion/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../presentacion/mapa-workflows.html', import.meta.url), html, 'utf8');
  const totalNodes = workflows.reduce((a, w) => a + w.nodes.length, 0);
  const totalEdges = workflows.reduce((a, w) => a + w.edges.length, 0);
  console.log('Mapa generado: ' + workflows.length + ' flujos, ' + totalNodes + ' pasos, ' + totalEdges + ' conexiones (' + html.length + ' bytes)');
  const unmapped = [];
  workflows.forEach((w) => w.nodes.forEach((n) => { if (!labelFor(n.name).mapped) unmapped.push(n.name); }));
  if (unmapped.length) console.log('Sin etiqueta en español (usando el nombre tal cual): ' + unmapped.join(', '));
}
