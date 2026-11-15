#!/usr/bin/env node
/**
 * e2e.mjs — ejecuta los casos automatizables (⚙) del plan de aceptación contra
 * el entorno REAL: n8n local, Google Sheets y Telegram.
 *
 * Cómo funciona:
 *  - Recrea n8n con TELEGRAM_API_BASE apuntando a un proxy local que anota cada
 *    respuesta y la reenvía a Telegram (los mensajes SÍ llegan a su chat).
 *  - Envía updates firmados (con el secreto) al webhook local, como si los
 *    escribiera usted en Telegram, y verifica la respuesta y la planilla.
 *  - Lo que no se puede automatizar (foto real de la receta, segundo teléfono,
 *    capturas) queda marcado en el plan como ✋.
 *  - Al terminar deja n8n con la API real y escribe el reporte en
 *    docs/evidencia/e2e/.
 *
 * Uso: node scripts/local/e2e.mjs [--chat <chat_id>]
 * ATENCIÓN: reinicia la planilla (cargar-catalogo --reiniciar). Datos ficticios.
 */
import { spawnSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { leerEnv, rutaCuentaServicio } from './lib/entorno.mjs';
import { leerCuentaServicio, tokenDeAcceso, api, SHEETS, leerTabla, escribirRango } from './lib/google.mjs';
import { sh, esperar, limpiarSalida } from './lib/n8n.mjs';
import { updateDeTexto, enviarUpdate, iniciarProxyTelegram, reiniciarN8nConBase, BASE_LOCAL } from './lib/medicion.mjs';
import { WEBHOOK_PATH } from './lib/flujos.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const PUERTO = 8090;
const CHAT_B = '1000000001'; // vecino ficticio para la titularidad (no existe en Telegram)
const RUT = '11.111.111-1';
const DIR = 'Av. Grecia 8735, Peñalolén Alto';

const env = leerEnv(join(REPO, '.env'));
const A = args.includes('--chat') ? args[args.indexOf('--chat') + 1] : (env.TELEGRAM_ADMIN_CHAT_ID || '');
const resultados = [];
let token;
let registros;

async function respuestas(chat, t0, n = 1, timeoutMs = 25000) {
  const fin = Date.now() + timeoutMs;
  let r = [];
  while (Date.now() < fin) {
    r = registros.filter((x) => x.t >= t0 && String(x.chat_id) === String(chat));
    if (r.length >= n) break;
    await esperar(150);
  }
  return r;
}

async function caso(id, nombre, fn) {
  const t = Date.now();
  let ok = false;
  let detalle = '';
  try {
    const r = await fn();
    ok = r.ok;
    detalle = r.detalle;
  } catch (e) {
    detalle = 'error: ' + e.message;
  }
  // El reporte se versiona: los chat_id reales (identifican a una persona) se enmascaran.
  detalle = String(detalle).replace(/\b\d{8,}\b/g, '<chat_id>');
  resultados.push({ id, caso: nombre, resultado: ok ? 'Pasa' : 'Falla', detalle, ms: Date.now() - t, fecha: new Date().toISOString() });
  console.log(`${ok ? 'PASA ' : 'FALLA'} ${id} ${nombre} — ${detalle}`);
  // Deja recuperar la cuota de la API de Sheets (60 lecturas/minuto), que
  // comparten los flujos y las verificaciones de este script.
  await esperar(8000);
}

/**
 * Envía un texto desde un chat, espera n respuestas a ese chat y luego espera a
 * que el bot quede en silencio (3 s sin mensajes nuevos), para que una
 * respuesta lenta no se atribuya al caso siguiente.
 */
async function decir(chat, texto, n = 1) {
  const t0 = await enviarUpdate(env.TELEGRAM_WEBHOOK_SECRET, updateDeTexto(chat, texto));
  const r = await respuestas(chat, t0, n, 60000);
  let ultimo = registros.length;
  const limite = Date.now() + 30000;
  let quieto = Date.now();
  while (Date.now() < limite && Date.now() - quieto < 3000) {
    await esperar(250);
    if (registros.length !== ultimo) { ultimo = registros.length; quieto = Date.now(); }
  }
  const todas = registros.filter((x) => x.t >= t0 && String(x.chat_id) === String(chat));
  return { t0, textos: todas.map((x) => String(x.texto || '')), ms: r.length ? r[0].t - t0 : null };
}

const contiene = (textos, ...partes) => textos.some((t) => partes.every((p) => t.includes(p)));
const tabla = (hoja) => leerTabla(token, env.GOOGLE_SHEET_ID, hoja);
const orden = async (codigo) => (await tabla('ordenes')).find((r) => r.codigo_far === codigo);
const inv = async (med) => (await tabla('inventario')).find((r) => r.medicamento_id === med);
const bit = async (codigo, accion) => (await tabla('bitacora')).filter((r) => r.codigo_far === codigo && r.accion === accion);
async function fijarEstado(codigo, estado, urlReceta) {
  const o = await orden(codigo);
  await escribirRango(token, env.GOOGLE_SHEET_ID, `ordenes!I${o.fila}:J${o.fila}`, [[estado, urlReceta || o.url_receta || '']]);
}

async function main() {
  for (const k of ['TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_BOT_TOKEN', 'GOOGLE_SHEET_ID']) if (!env[k]) throw new Error('Falta ' + k + ' en .env');
  if (!/^-?\d+$/.test(A)) throw new Error('Indique su chat_id con --chat o en TELEGRAM_ADMIN_CHAT_ID');
  const farmaceuticos = String(env.TELEGRAM_PHARMACIST_CHAT_IDS || '').split(',').map((s) => s.trim());
  const personal = String(env.TELEGRAM_STAFF_CHAT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!farmaceuticos.includes(A) || (personal.length && !personal.includes(A))) {
    throw new Error('Para el E2E automatizado su chat debe estar en TELEGRAM_PHARMACIST_CHAT_IDS (y en TELEGRAM_STAFF_CHAT_IDS si la usa).');
  }
  token = await tokenDeAcceso(leerCuentaServicio(rutaCuentaServicio(REPO, env)));

  console.log('Reiniciando la planilla con el catálogo sintético...');
  let r = spawnSync(process.execPath, [join(REPO, 'scripts', 'local', 'cargar-catalogo.mjs'), '--reiniciar'], { cwd: REPO, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('cargar-catalogo falló: ' + r.stderr + r.stdout);

  const proxy = await iniciarProxyTelegram(PUERTO, new Set([CHAT_B]));
  registros = proxy.registros;
  console.log('Recreando n8n para pasar por el proxy (las respuestas siguen llegando a su Telegram)...');
  await reiniciarN8nConBase(REPO, `http://host.docker.internal:${PUERTO}`);
  const inicio = new Date();
  try {
    await caso('CA-09', 'Bienvenida /start', async () => {
      const x = await decir(A, '/start');
      return { ok: contiene(x.textos, 'asistente virtual', 'Puede escribirme'), detalle: `${x.ms} ms` };
    });
    await caso('CA-01', 'Consulta con stock (losartan 50)', async () => {
      const x = await decir(A, 'losartan 50');
      return { ok: contiene(x.textos, 'Losarmed 50 mg', '$4.990', 'Stock disponible: 92'), detalle: `${x.ms} ms · «${(x.textos[0] || '').slice(0, 80)}»` };
    });
    await caso('CA-02', 'Agotado con error de escritura → bioequivalente', async () => {
      const x = await decir(A, 'hola, ¿hay pregavalina 75?');
      return { ok: contiene(x.textos, 'Pregalex 75 mg', 'Neurogab 75 mg'), detalle: `${x.ms} ms · «${(x.textos[0] || '').replace(/\n/g, ' ').slice(0, 110)}»` };
    });
    await caso('CA-03', 'Fuera de catálogo: no inventa', async () => {
      const x = await decir(A, 'paracetamol 500');
      return { ok: contiene(x.textos, 'No encontré'), detalle: `${x.ms} ms` };
    });
    await caso('CA-10', 'Urgencia y pregunta clínica', async () => {
      const u = await decir(A, 'me duele el pecho');
      const c = await decir(A, '¿cuántas pastillas me tomo?');
      return { ok: contiene(u.textos, 'SAMU 131') && contiene(c.textos, 'No puedo dar indicaciones'), detalle: `${u.ms} ms / ${c.ms} ms` };
    });
    await caso('CA-11', 'Sin secreto: se descarta', async () => {
      const t0 = Date.now();
      await fetch(`${BASE_LOCAL}/webhook/${WEBHOOK_PATH}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(updateDeTexto(A, 'hola')) });
      await esperar(4000);
      const n = registros.filter((x) => x.t >= t0).length;
      return { ok: n === 0, detalle: n === 0 ? 'sin respuesta (correcto)' : n + ' respuestas' };
    });
    await caso('CA-04', 'Reserva con receta → #FAR-0001 PENDIENTE_RECETA, +1 reservado, 12 h', async () => {
      const x = await decir(A, `reservar neurogab 75 x1 rut ${RUT}, ${DIR}`);
      await esperar(1500);
      const o = await orden('FAR-0001');
      const i = await inv('MED-0002');
      const b = await bit('FAR-0001', 'RESERVA_ALTA');
      const d = (await tabla('despachos')).find((z) => z.codigo_far === 'FAR-0001');
      const horas = o ? (new Date(o.fecha_expiracion) - new Date(o.fecha_creacion)) / 3600000 : 0;
      const ok = contiene(x.textos, '#FAR-0001') && o && o.estado === 'PENDIENTE_RECETA' && Math.abs(horas - 12) < 0.05 &&
        Number(i.stock_reservado) === 1 && b.length === 1 && d && d.estado_ruta === 'PENDIENTE';
      return { ok, detalle: `${x.ms} ms · estado=${o && o.estado} · expira en ${horas.toFixed(2)} h · reservado=${i && i.stock_reservado} · bitácora=${b.length} · despacho=${d && d.estado_ruta}` };
    });
    await caso('CA-05', 'Reserva sin receta → EN_PREPARACION', async () => {
      const x = await decir(A, `reservar somnia x2 rut ${RUT}, ${DIR}`);
      await esperar(1500);
      const o = await orden('FAR-0002');
      return { ok: contiene(x.textos, '#FAR-0002') && o && o.estado === 'EN_PREPARACION' && !o.fecha_expiracion, detalle: `estado=${o && o.estado}` };
    });
    await caso('CA-06', 'Fuera de cobertura y sin stock: rechazo sin escribir', async () => {
      const antes = (await tabla('ordenes')).length;
      // Otro producto: con Neurogab x1 respondería la guarda de duplicados de US-05
      // (mismo chat, producto y cantidad dentro de 2 minutos), que es lo correcto.
      const a = await decir(A, `reservar losarmed 50 x1 rut ${RUT}, Av. Grecia 100, Ñuñoa`);
      const b = await decir(A, `reservar pregalex 75 x1 rut ${RUT}, Av. Grecia 8735, San Luis`);
      await esperar(1000);
      const despues = (await tabla('ordenes')).length;
      return { ok: antes === despues && contiene(a.textos, 'cubre solo los sectores') && contiene(b.textos, 'Stock disponible: 0'), detalle: `filas ${antes}→${despues} · «${(a.textos[0] || '').slice(0, 60)}» · «${(b.textos[0] || '').slice(0, 60)}»` };
    });
    await caso('CA-07', 'Estado por RUT del titular', async () => {
      const x = await decir(A, `estado ${RUT}`);
      return { ok: contiene(x.textos, 'Tu pedido #FAR-'), detalle: `«${(x.textos[0] || '').slice(0, 90)}»` };
    });
    await caso('CA-08', 'Titularidad: otro chat no ve el pedido', async () => {
      const x = await decir(CHAT_B, 'estado #FAR-0001');
      return { ok: contiene(x.textos, 'No encontré ese pedido'), detalle: `«${(x.textos[0] || '').slice(0, 80)}»` };
    });
    await caso('CA-14', 'Aprobación farmacéutica (receta simulada en la planilla)', async () => {
      await fijarEstado('FAR-0001', 'RECETA_RECIBIDA', 'simulada-por-e2e (la foto real se prueba en CA-12)');
      const x = await decir(A, 'aprobar FAR-0001', 2);
      await esperar(1000);
      const o = await orden('FAR-0001');
      const b = await bit('FAR-0001', 'RECETA_APROBADA');
      return { ok: o.estado === 'EN_PREPARACION' && b.length === 1 && /farmaceutico:/.test(b[0].actor) && contiene(x.textos, 'aprobado'), detalle: `estado=${o.estado} · actor=${b[0] && b[0].actor} · respuestas=${x.textos.length}` };
    });
    await caso('CA-15', 'Rechazo libera el stock una sola vez', async () => {
      await decir(A, `reservar celoxib 200 x1 rut ${RUT}, ${DIR}`);
      await esperar(1500);
      const codigo = (await tabla('ordenes')).filter((z) => z.medicamento_id === 'MED-0009').pop().codigo_far;
      await fijarEstado(codigo, 'RECETA_RECIBIDA', 'simulada-por-e2e');
      const antes = Number((await inv('MED-0009')).stock_reservado);
      await decir(A, `rechazar ${codigo} receta ilegible`, 2);
      await esperar(1000);
      const medio = Number((await inv('MED-0009')).stock_reservado);
      const rep = await decir(A, `rechazar ${codigo} receta ilegible`);
      await esperar(1000);
      const despues = Number((await inv('MED-0009')).stock_reservado);
      const o = await orden(codigo);
      return { ok: o.estado === 'RECHAZADO' && antes === 1 && medio === 0 && despues === 0 && contiene(rep.textos, 'ya estaba rechazado'), detalle: `${codigo}: reservado ${antes}→${medio}→${despues}` };
    });
    await caso('CA-17', 'En ruta: aviso al vecino y estado actualizado', async () => {
      const x = await decir(A, 'en ruta FAR-0001', 2);
      await esperar(1000);
      const o = await orden('FAR-0001');
      const d = (await tabla('despachos')).find((z) => z.codigo_far === 'FAR-0001');
      const e = await decir(A, 'estado #FAR-0001');
      return { ok: o.estado === 'EN_RUTA' && d.estado_ruta === 'EN_RUTA' && contiene(x.textos, 'va en camino') && contiene(e.textos, 'va en camino'), detalle: `orden=${o.estado} · despacho=${d.estado_ruta}` };
    });
    await caso('CA-18', 'Entregado: descuenta real y reservado una sola vez', async () => {
      const antes = await inv('MED-0002');
      await decir(A, 'entregado FAR-0001', 2);
      await esperar(1000);
      const medio = await inv('MED-0002');
      const rep = await decir(A, 'entregado FAR-0001');
      await esperar(1000);
      const despues = await inv('MED-0002');
      const o = await orden('FAR-0001');
      const ok = o.estado === 'ENTREGADO' && Number(medio.stock_real) === Number(antes.stock_real) - 1 && Number(medio.stock_reservado) === Number(antes.stock_reservado) - 1 &&
        despues.stock_real === medio.stock_real && despues.stock_reservado === medio.stock_reservado && contiene(rep.textos, 'ya estaba ENTREGADO');
      return { ok, detalle: `real ${antes.stock_real}→${medio.stock_real}→${despues.stock_real} · reservado ${antes.stock_reservado}→${medio.stock_reservado}→${despues.stock_reservado}` };
    });
    await caso('CA-16', 'Expiración a 12 h (cron ejecutado a demanda)', async () => {
      r = spawnSync(process.execPath, [join(REPO, 'scripts', 'local', 'cargar-catalogo.mjs'), '--pedido-vencido', A], { cwd: REPO, encoding: 'utf8' });
      if (r.status !== 0) throw new Error('no se pudo crear #FAR-0900');
      // El personal ejecuta la revisión a demanda (router → US-10). La CLI
      // «n8n execute» se queda colgada en n8n 2.44.2, por eso no se usa.
      const x = await decir(A, 'revisar vencidos');
      await esperar(1500);
      const o = await orden('FAR-0900');
      const i = await inv('MED-0003');
      return { ok: o && o.estado === 'CANCELADO_EXPIRADO' && Number(i.stock_reservado) === 0 && contiene(x.textos, 'cancelado por falta de receta'),
        detalle: `estado=${o && o.estado} · reservado=${i && i.stock_reservado} · ${x.ms} ms` };
    });
    await caso('CA-19', 'Falla de un subflujo → alerta y aviso al vecino', async () => {
      const libro = await api(token, 'GET', SHEETS(env.GOOGLE_SHEET_ID) + '?fields=sheets.properties');
      const hoja = libro.sheets.find((s) => s.properties.title === 'catalogo').properties.sheetId;
      const renombrar = (title) => api(token, 'POST', SHEETS(env.GOOGLE_SHEET_ID) + ':batchUpdate', { requests: [{ updateSheetProperties: { properties: { sheetId: hoja, title }, fields: 'title' } }] });
      await renombrar('catalogo_e2e');
      try {
        const x = await decir(A, 'losartan 50', 2);
        return { ok: contiene(x.textos, 'ALERTA n8n', 'US-04') && contiene(x.textos, 'Tuvimos un problema'), detalle: `${x.textos.length} mensajes` };
      } finally {
        await renombrar('catalogo');
      }
    });
  } finally {
    console.log('Restaurando n8n con la API real de Telegram...');
    await reiniciarN8nConBase(REPO, null);
    proxy.server.close();
  }

  const pasan = resultados.filter((x) => x.resultado === 'Pasa').length;
  const dir = join(REPO, 'docs', 'evidencia', 'e2e');
  mkdirSync(dir, { recursive: true });
  const sello = inicio.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  writeFileSync(join(dir, `e2e-${sello}.json`), JSON.stringify({ fecha: inicio.toISOString(), resumen: `${pasan}/${resultados.length}`, resultados }, null, 2) + '\n');
  const md = [`# Reporte E2E automatizado · ${inicio.toISOString()}`, '', `Resultado: **${pasan}/${resultados.length} casos pasan.** Los casos ✋ (foto real, segundo teléfono, capturas) se registran a mano en \`docs/plan-pruebas-aceptacion.md\`.`, '',
    '| ID | Caso | Resultado | Detalle | Fecha |', '|---|---|---|---|---|',
    ...resultados.map((x) => `| ${x.id} | ${x.caso} | ${x.resultado} | ${String(x.detalle).replace(/\|/g, '/')} | ${x.fecha} |`), ''].join('\n');
  writeFileSync(join(dir, `e2e-${sello}.md`), md);
  console.log(`\nRESUMEN: ${pasan}/${resultados.length} casos pasan. Reporte: docs/evidencia/e2e/e2e-${sello}.md`);
  process.exit(pasan === resultados.length ? 0 : 1);
}

main().catch((e) => { console.error('ERROR: ' + e.message); process.exit(2); });
