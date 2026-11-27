#!/usr/bin/env node
/**
 * prueba-concurrencia.mjs — primera prueba de reservas simultáneas contra la
 * planilla REAL (US-13, meta SMART: 0 sobreventas).
 *
 * 1. Deja Celoxib 200 mg (MED-0009) con stock_real = STOCK y stock_reservado = 0.
 * 2. Envía a la vez N reservas firmadas desde su chat, con cantidades 1 a N
 *    (cantidades distintas para que la guarda de duplicados no las fusione).
 * 3. Espera a que n8n las procese (la cola es serial: ADR-07) y verifica en la planilla:
 *      - stock_reservado <= stock_real (sin sobreventa)
 *      - stock_reservado == suma de las cantidades de las reservas creadas
 *        (sin actualizaciones perdidas)
 *      - una fila RESERVA_ALTA en bitacora por cada reserva creada
 *
 * Uso: node scripts/local/prueba-concurrencia.mjs [--chat <chat_id>] [--n 5] [--stock 3]
 *   Entrega 2 (CA-20): 5 reservas sobre stock 3 (valores por defecto).
 *   Sprint 3 (US-13):  --n 20 --stock 10.
 * Las respuestas del bot llegan a su chat (N mensajes). Datos ficticios.
 */
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { leerEnv, rutaCuentaServicio } from './lib/entorno.mjs';
import { leerCuentaServicio, tokenDeAcceso, api, SHEETS } from './lib/google.mjs';
import { esperar } from './lib/n8n.mjs';
import { updateDeTexto, enviarUpdate } from './lib/medicion.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const MED = 'MED-0009';

function argumentoEntero(nombre, porDefecto, min, max) {
  const i = args.indexOf(nombre);
  if (i === -1) return porDefecto;
  const valor = Number(args[i + 1]);
  if (!Number.isInteger(valor) || valor < min || valor > max) {
    console.error(`ERROR: ${nombre} debe ser un entero entre ${min} y ${max}.`);
    process.exit(2);
  }
  return valor;
}

// Cantidades 1..N: N más de 50 pasaría la cuota de Google Sheets (60 lecturas/minuto).
const N = argumentoEntero('--n', 5, 2, 50);
const STOCK = argumentoEntero('--stock', 3, 1, 500);

async function leerTabla(token, base, hoja) {
  const v = await api(token, 'GET', `${base}/values/${hoja}!A1:Z`);
  const [cab, ...filas] = v.values || [[]];
  return filas.map((f, i) => ({ fila: i + 2, ...Object.fromEntries(cab.map((c, j) => [c, f[j] === undefined ? '' : f[j]])) }));
}

async function main() {
  const env = leerEnv(join(REPO, '.env'));
  const chat = args.includes('--chat') ? args[args.indexOf('--chat') + 1] : env.TELEGRAM_ADMIN_CHAT_ID;
  const token = await tokenDeAcceso(leerCuentaServicio(rutaCuentaServicio(REPO, env)));
  const base = SHEETS(env.GOOGLE_SHEET_ID);

  const inv = await leerTabla(token, base, 'inventario');
  const fila = inv.find((r) => r.medicamento_id === MED);
  if (!fila) throw new Error(MED + ' no está en inventario: ejecute cargar-catalogo.mjs --reiniciar');
  await api(token, 'PUT', `${base}/values/inventario!B${fila.fila}:C${fila.fila}?valueInputOption=USER_ENTERED`, { values: [[STOCK, 0]] });
  const ordenesAntes = new Set((await leerTabla(token, base, 'ordenes')).map((r) => r.codigo_far));
  const bitAntes = (await leerTabla(token, base, 'bitacora')).length;

  const cantidades = Array.from({ length: N }, (_, i) => i + 1);
  console.log(`${MED} con stock ${STOCK}. Enviando ${cantidades.length} reservas simultáneas (cantidades ${cantidades.join(', ')})...`);
  const t0 = Date.now();
  await Promise.all(cantidades.map((q) => enviarUpdate(env.TELEGRAM_WEBHOOK_SECRET,
    updateDeTexto(chat, `reservar celoxib 200 x${q} rut 22.222.222-2, Pasaje Ficticio 123, San Luis`))));

  // Espera a que la cola se vacíe. n8n atiende una reserva a la vez (ADR-07), así que
  // se espera al menos 4 s por solicitud y luego 24 s sin filas nuevas en ordenes
  // (un rechazo no crea fila, pero una cantidad chica posterior todavía podría caber).
  const MIN_MS = N * 4000;
  const MAX_MS = N * 20000 + 60000;
  const ESTABLE_MS = 24000;
  let nuevas = [];
  let ultimoCambio = Date.now();
  while (Date.now() - t0 < MAX_MS) {
    await esperar(4000);
    const ahora = (await leerTabla(token, base, 'ordenes')).filter((r) => !ordenesAntes.has(r.codigo_far) && r.medicamento_id === MED);
    if (ahora.length !== nuevas.length) ultimoCambio = Date.now();
    nuevas = ahora;
    if (Date.now() - t0 >= MIN_MS && Date.now() - ultimoCambio >= ESTABLE_MS) break;
  }
  const invFinal = (await leerTabla(token, base, 'inventario')).find((r) => r.medicamento_id === MED);
  const reservado = Number(invFinal.stock_reservado);
  const real = Number(invFinal.stock_real);
  const suma = nuevas.reduce((a, r) => a + Number(r.cantidad), 0);
  const bit = (await leerTabla(token, base, 'bitacora')).slice(bitAntes).filter((r) => r.accion === 'RESERVA_ALTA' && r.medicamento_id === MED);
  const res = {
    fecha: new Date().toISOString(), medicamento: MED, stock_real: real, stock_inicial: STOCK, n_solicitudes: N, solicitudes: cantidades,
    reservas_creadas: nuevas.map((r) => ({ codigo: r.codigo_far, cantidad: Number(r.cantidad), estado: r.estado })),
    stock_reservado_final: reservado, suma_reservada: suma, filas_bitacora: bit.length,
    sobreventa: Math.max(0, reservado - real), actualizaciones_perdidas: suma !== reservado,
    duracion_s: Math.round((Date.now() - t0) / 1000)
  };
  res.cumple = res.sobreventa === 0 && !res.actualizaciones_perdidas && suma <= real && bit.length === nuevas.length;
  const dir = join(REPO, 'docs', 'evidencia', 'rendimiento');
  mkdirSync(dir, { recursive: true });
  const archivo = join(dir, `concurrencia-${res.fecha.slice(0, 16).replace(/[:T]/g, '-')}.json`);
  writeFileSync(archivo, JSON.stringify(res, null, 2) + '\n');
  console.log(JSON.stringify(res, null, 2));
  console.log(`\n${res.cumple ? 'CUMPLE' : 'NO CUMPLE'}: sobreventa ${res.sobreventa}, reservado ${reservado} de ${real}, suma de reservas ${suma}. Evidencia: ${archivo}`);
  process.exit(res.cumple ? 0 : 1);
}

main().catch((e) => { console.error('ERROR: ' + e.message); process.exit(2); });
