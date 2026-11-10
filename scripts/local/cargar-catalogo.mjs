#!/usr/bin/env node
/**
 * cargar-catalogo.mjs — prepara la planilla con el esquema de 5 hojas y el
 * catálogo SINTÉTICO de data/seed/medicamentos.csv (US-01, RNF-06).
 *
 * Uso:
 *   node scripts/local/cargar-catalogo.mjs                 # crea hojas y encabezados; reemplaza catálogo e inventario
 *   node scripts/local/cargar-catalogo.mjs --reiniciar     # además vacía ordenes, despachos y bitacora
 *   node scripts/local/cargar-catalogo.mjs --pedido-vencido <chat_id>
 *        agrega #FAR-0900 en PENDIENTE_RECETA ya vencido, para mostrar la
 *        liberación de 12 h ejecutando US-10 a mano en el video
 *
 * Lee GOOGLE_SHEET_ID y GOOGLE_SERVICE_ACCOUNT_FILE de .env. No usa datos
 * reales: el catálogo, los RUT de ejemplo y las direcciones son ficticios.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerEnv, rutaCuentaServicio } from './lib/entorno.mjs';
import { leerCuentaServicio, tokenDeAcceso, api, SHEETS } from './lib/google.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const REINICIAR = args.includes('--reiniciar');
const iVencido = args.indexOf('--pedido-vencido');
const CHAT_VENCIDO = iVencido !== -1 ? args[iVencido + 1] : null;

// Mismo esquema que scripts/setup-sheets.gs y docs/google-sheets-schema.md.
const ENCABEZADOS = {
  catalogo: ['medicamento_id', 'nombre_comercial', 'principio_activo', 'dosis', 'forma', 'requiere_receta', 'precio_unitario_clp', 'bioequivalente_de', 'activo'],
  inventario: ['medicamento_id', 'stock_real', 'stock_reservado', 'stock_neto', 'ultima_actualizacion'],
  ordenes: ['codigo_far', 'fecha_creacion', 'rut', 'telefono', 'nombre_cliente', 'medicamento_id', 'cantidad', 'precio_total_clp', 'estado', 'url_receta', 'fecha_receta', 'fecha_expiracion', 'notas'],
  despachos: ['codigo_far', 'sector', 'direccion', 'estado_ruta', 'eta_minutos', 'fecha_marcado'],
  bitacora: ['timestamp', 'accion', 'codigo_far', 'medicamento_id', 'delta_reservado', 'detalle', 'estado_anterior', 'estado_nuevo', 'actor']
};
// Columnas que deben quedar como TEXTO: n8n escribe en modo USER_ENTERED y, sin
// esto, Sheets convertiría las fechas ISO a fechas locales (el cron de 12 h
// compara fechas) y los chat_id o RUT a números.
const COLUMNAS_TEXTO = {
  catalogo: ['medicamento_id', 'bioequivalente_de'],
  inventario: ['medicamento_id', 'ultima_actualizacion'],
  ordenes: ['codigo_far', 'fecha_creacion', 'rut', 'telefono', 'fecha_receta', 'fecha_expiracion'],
  despachos: ['codigo_far', 'fecha_marcado'],
  bitacora: ['timestamp', 'codigo_far', 'actor']
};
// Producto agotado a propósito para mostrar la sugerencia de bioequivalentes (RF-02).
const AGOTADO_DEMO = 'MED-0001';

function leerCsv(ruta) {
  const [cab, ...filas] = readFileSync(ruta, 'utf8').trim().split(/\r?\n/);
  const cols = cab.split(',');
  return filas.map((f) => Object.fromEntries(f.split(',').map((v, i) => [cols[i], v.trim()])));
}

const id4 = (id) => id.replace(/^MED-(\d+)$/, (m, n) => 'MED-' + n.padStart(4, '0'));
const letra = (i) => String.fromCharCode(65 + i);

async function main() {
  const env = leerEnv(join(REPO, '.env'));
  if (!env.GOOGLE_SHEET_ID) throw new Error('Falta GOOGLE_SHEET_ID en .env');
  const sa = leerCuentaServicio(rutaCuentaServicio(REPO, env));
  const token = await tokenDeAcceso(sa);
  const base = SHEETS(env.GOOGLE_SHEET_ID);

  let libro;
  try {
    libro = await api(token, 'GET', base + '?fields=properties.title,sheets.properties');
  } catch (e) {
    if (e.status === 403 || e.status === 404) {
      throw new Error('La cuenta de servicio no puede abrir la planilla. Compártala como Editor con ' + sa.client_email);
    }
    throw e;
  }
  const existentes = Object.fromEntries(libro.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
  const faltan = Object.keys(ENCABEZADOS).filter((h) => existentes[h] === undefined);
  if (faltan.length) {
    const r = await api(token, 'POST', base + ':batchUpdate', { requests: faltan.map((title) => ({ addSheet: { properties: { title } } })) });
    for (const rep of r.replies) existentes[rep.addSheet.properties.title] = rep.addSheet.properties.sheetId;
    console.log('Hojas creadas: ' + faltan.join(', '));
  }

  // Formato de texto en columnas sensibles + encabezados en negrita.
  const pedidosFormato = [];
  for (const [hoja, cols] of Object.entries(COLUMNAS_TEXTO)) {
    for (const c of cols) {
      const i = ENCABEZADOS[hoja].indexOf(c);
      pedidosFormato.push({ repeatCell: {
        range: { sheetId: existentes[hoja], startRowIndex: 1, startColumnIndex: i, endColumnIndex: i + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'TEXT' } } }, fields: 'userEnteredFormat.numberFormat' } });
    }
  }
  for (const hoja of Object.keys(ENCABEZADOS)) {
    pedidosFormato.push({ repeatCell: {
      range: { sheetId: existentes[hoja], startRowIndex: 0, endRowIndex: 1 },
      cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } });
    pedidosFormato.push({ updateSheetProperties: { properties: { sheetId: existentes[hoja], gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } });
  }
  await api(token, 'POST', base + ':batchUpdate', { requests: pedidosFormato });

  // Vaciar lo que corresponde.
  const limpiar = ['catalogo', 'inventario', ...(REINICIAR ? ['ordenes', 'despachos', 'bitacora'] : [])];
  await api(token, 'POST', base + '/values:batchClear', { ranges: limpiar.map((h) => `${h}!A2:Z`) });

  // Catálogo e inventario desde el CSV sintético.
  const meds = leerCsv(join(REPO, 'data', 'seed', 'medicamentos.csv'));
  const primeroDeGrupo = {};
  for (const m of meds) if (!primeroDeGrupo[m.Grupo_Bioequivalente]) primeroDeGrupo[m.Grupo_Bioequivalente] = id4(m.ID_Medicamento);
  const catalogo = meds.map((m) => {
    const id = id4(m.ID_Medicamento);
    const ref = primeroDeGrupo[m.Grupo_Bioequivalente];
    return [id, m.Marca, m.Principio_Activo, m.Dosis, m.Forma_Farmaceutica, m.Requiere_Receta, Number(m.Precio_CLP), ref === id ? '' : ref, m.Activo];
  });
  const ahora = new Date().toISOString();
  const inventario = meds.map((m, i) => {
    const id = id4(m.ID_Medicamento);
    return [id, id === AGOTADO_DEMO ? 0 : Number(m.Stock_Real), 0, `=B${i + 2}-C${i + 2}`, ahora];
  });

  const datos = Object.entries(ENCABEZADOS).map(([h, cab]) => ({ range: `${h}!A1:${letra(cab.length - 1)}1`, values: [cab] }));
  datos.push({ range: `catalogo!A2:I${catalogo.length + 1}`, values: catalogo });
  datos.push({ range: `inventario!A2:E${inventario.length + 1}`, values: inventario });

  if (CHAT_VENCIDO) {
    if (!/^-?\d+$/.test(CHAT_VENCIDO)) throw new Error('--pedido-vencido requiere un chat_id numérico');
    const creada = new Date(Date.now() - 13 * 3600 * 1000).toISOString();
    const vence = new Date(Date.now() - 3600 * 1000).toISOString();
    // La reserva vencida aparta 1 unidad (inventario ya está en `datos` por referencia).
    inventario[inventario.findIndex((r) => r[0] === 'MED-0003')][2] = 1;
    const nOrd = ((await api(token, 'GET', base + '/values/ordenes!A2:A')).values || []).length + 2;
    const nDes = ((await api(token, 'GET', base + '/values/despachos!A2:A')).values || []).length + 2;
    const rutFicticio = ['22', '222', '222'].join('.') + '-2';
    datos.push({ range: `ordenes!A${nOrd}:M${nOrd}`, values: [['FAR-0900', creada, rutFicticio, CHAT_VENCIDO, '', 'MED-0003', 1, 12990, 'PENDIENTE_RECETA', '', '', vence, 'Pedido de demostración (datos ficticios)']] });
    datos.push({ range: `despachos!A${nDes}:F${nDes}`, values: [['FAR-0900', 'San Luis', 'Pasaje Ficticio 123', 'PENDIENTE', '', '']] });
  }

  await api(token, 'POST', base + '/values:batchUpdate', { valueInputOption: 'USER_ENTERED', data: datos });
  console.log(`Planilla «${libro.properties.title}» lista: ${catalogo.length} medicamentos sintéticos, ${inventario.length} filas de inventario.`);
  console.log(`  ${AGOTADO_DEMO} (Pregalex 75 mg) quedó sin stock para mostrar los bioequivalentes.`);
  if (REINICIAR) console.log('  ordenes, despachos y bitacora quedaron vacías.');
  if (CHAT_VENCIDO) console.log('  Se agregó #FAR-0900 vencido: ejecute a mano «US-10 Expiración» en n8n para verlo liberarse.');
}

main().catch((e) => { console.error('ERROR: ' + e.message); process.exit(1); });
