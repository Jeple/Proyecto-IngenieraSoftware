#!/usr/bin/env node
/**
 * prueba-integracion.mjs — integración con n8n REAL y Telegram SIMULADO.
 *
 * Levanta un contenedor desechable de n8n (misma versión fijada que el
 * docker-compose), importa y publica los flujos, y envía updates de Telegram
 * al único webhook (/webhook/telegram-bot). Un servidor local hace de API de
 * Telegram (TELEGRAM_API_BASE) y registra cada respuesta del bot.
 *
 * No necesita credenciales: la credencial de Google es falsa a propósito, de
 * modo que los subflujos que leen la planilla fallan en el nodo de Sheets y
 * eso permite verificar que (a) el router derivó al subflujo correcto y (b) el
 * flujo de errores US-21 avisa al administrador.
 *
 * Uso:  node scripts/local/prueba-integracion.mjs [--n 30] [--sin-borrar]
 * Requisitos: Docker en ejecución y Node >= 18. Deja evidencia en
 * docs/evidencia/integracion/.
 */
import http from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sh, esperar, esperarListo, esperarWebhook, importarYPublicar, limpiarSalida } from './lib/n8n.mjs';
import { FLUJOS, WEBHOOK_PATH, N8N_IMAGEN } from './lib/flujos.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const N = Number(args[args.indexOf('--n') + 1]) || 30;
const BORRAR = !args.includes('--sin-borrar');
const CONTENEDOR = 'farmacia-n8n-integracion';
const PUERTO_N8N = 5690;
const PUERTO_MOCK = 8089;
const BASE = `http://127.0.0.1:${PUERTO_N8N}`;
const SECRETO = 'secreto-de-prueba-integracion';
const ADMIN = '999000';
const FARMACEUTICO = '900100';

// --- Telegram simulado -------------------------------------------------------
const recibidos = [];
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    let json = null;
    try { json = JSON.parse(body); } catch (e) { json = null; }
    recibidos.push({ t: Date.now(), url: req.url.replace(/bot[^/]+/, 'bot<token>'), body: json });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, result: { message_id: recibidos.length } }));
  });
});

function update(chatId, texto, extra = {}) {
  return {
    update_id: Math.floor(Math.random() * 1e9),
    message: { message_id: 1, date: Math.floor(Date.now() / 1000), chat: { id: Number(chatId), type: 'private' }, text: texto, ...extra }
  };
}

async function enviar(upd, secreto = SECRETO) {
  const headers = { 'content-type': 'application/json' };
  if (secreto !== null) headers['X-Telegram-Bot-Api-Secret-Token'] = secreto;
  const t0 = Date.now();
  const r = await fetch(`${BASE}/webhook/${WEBHOOK_PATH}`, { method: 'POST', headers, body: JSON.stringify(upd) });
  await r.text();
  return t0;
}

/** Espera un mensaje del bot hacia chatId posterior a t0. */
async function esperarMensaje(chatId, t0, timeoutMs = 8000) {
  const fin = Date.now() + timeoutMs;
  while (Date.now() < fin) {
    const m = recibidos.find((x) => x.t >= t0 && x.body && String(x.body.chat_id) === String(chatId));
    if (m) return m;
    await esperar(100);
  }
  return null;
}

function percentil(valores, p) {
  const v = [...valores].sort((a, b) => a - b);
  if (!v.length) return null;
  const idx = Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1);
  return v[Math.max(0, idx)];
}

// --- casos -------------------------------------------------------------------
const CASOS = [
  { id: 'INT-01', nombre: 'Sin encabezado secreto: se descarta', chat: '1001', texto: 'hola', secreto: null, espera: 'nada' },
  { id: 'INT-02', nombre: 'Secreto incorrecto: se descarta', chat: '1002', texto: 'hola', secreto: 'otro', espera: 'nada' },
  { id: 'INT-03', nombre: 'Saludo: bienvenida con menú y aviso de bot', chat: '1003', texto: 'hola', contiene: ['asistente virtual', 'no doy indicaciones médicas'] },
  { id: 'INT-04', nombre: '/start: bienvenida', chat: '1004', texto: '/start', contiene: ['Puede escribirme'] },
  { id: 'INT-05', nombre: 'Urgencia: deriva a SAMU 131', chat: '1005', texto: 'me duele el pecho y no puedo respirar', contiene: ['SAMU 131'] },
  { id: 'INT-06', nombre: 'Autolesión: línea *4141', chat: '1006', texto: 'ya no quiero vivir', contiene: ['*4141'] },
  { id: 'INT-07', nombre: 'Pregunta de dosis: sin consejo clínico', chat: '1007', texto: '¿cuántas pastillas de losartán me tomo al día?', contiene: ['No puedo dar indicaciones'] },
  { id: 'INT-08', nombre: 'Estado sin código ni RUT: pide el dato', chat: '1008', texto: 'quiero saber el estado de mi pedido', contiene: ['#FAR-0001'] },
  { id: 'INT-09', nombre: 'Sticker (sin texto): explica qué entiende', chat: '1009', texto: undefined, extra: { sticker: { file_id: 'x' } }, contiene: ['solo puedo leer'] },
  { id: 'INT-10', nombre: 'Comando de farmacéutico desde chat no autorizado: no llega a US-20', chat: '1010', texto: 'aprobar FAR-0001', espera: 'admin', flujo: 'US-06' },
  { id: 'INT-11', nombre: 'Consulta con muletillas: el router deriva a US-04 (falla Sheets → alerta US-21)', chat: '1011', texto: 'hola, ¿hay pregavalina 75?', espera: 'admin', flujo: 'US-04' },
  { id: 'INT-12', nombre: 'Reserva: el router deriva a US-05', chat: '1012', texto: 'quiero reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto', espera: 'admin', flujo: 'US-05' },
  { id: 'INT-13', nombre: 'Comando del farmacéutico autorizado: deriva a US-20', chat: FARMACEUTICO, texto: 'aprobar FAR-0001', espera: 'admin', flujo: 'US-20' },
  { id: 'INT-14', nombre: 'Comando del personal: deriva a US-22', chat: FARMACEUTICO, texto: 'en ruta FAR-0001', espera: 'admin', flujo: 'US-22' }
];

async function main() {
  const inicio = new Date();
  const docker = sh('docker', ['info', '--format', '{{.ServerVersion}}']);
  if (docker.code !== 0) throw new Error('Docker no está en ejecución. Abra Docker Desktop y reintente.');
  await new Promise((r) => mock.listen(PUERTO_MOCK, '0.0.0.0', r));
  console.log(`Telegram simulado en :${PUERTO_MOCK}. Levantando ${N8N_IMAGEN} ...`);

  sh('docker', ['rm', '-f', CONTENEDOR]);
  const run = sh('docker', ['run', '-d', '--name', CONTENEDOR, '-p', `127.0.0.1:${PUERTO_N8N}:5678`,
    '--add-host=host.docker.internal:host-gateway',
    '-e', 'N8N_ENCRYPTION_KEY=clave-de-prueba-integracion-0123456789',
    '-e', 'N8N_BLOCK_ENV_ACCESS_IN_NODE=false',
    '-e', 'N8N_CONCURRENCY_PRODUCTION_LIMIT=1',
    '-e', 'N8N_DIAGNOSTICS_ENABLED=false',
    '-e', 'N8N_VERSION_NOTIFICATIONS_ENABLED=false',
    '-e', 'GENERIC_TIMEZONE=America/Santiago', '-e', 'TZ=America/Santiago',
    '-e', `TELEGRAM_API_BASE=http://host.docker.internal:${PUERTO_MOCK}`,
    '-e', 'TELEGRAM_BOT_TOKEN=000000:TOKEN-FALSO-PRUEBA',
    '-e', `TELEGRAM_WEBHOOK_SECRET=${SECRETO}`,
    '-e', `TELEGRAM_PHARMACIST_CHAT_IDS=${FARMACEUTICO}`,
    '-e', 'TELEGRAM_STAFF_CHAT_IDS=',
    '-e', `TELEGRAM_ADMIN_CHAT_ID=${ADMIN}`,
    '-e', 'GOOGLE_SHEET_ID=planilla-falsa',
    '-e', 'GOOGLE_DRIVE_RECETAS_FOLDER_ID=carpeta-falsa',
    N8N_IMAGEN]);
  if (run.code !== 0) throw new Error('No se pudo iniciar n8n: ' + limpiarSalida(run.out));

  const tListo = await esperarListo(BASE);
  // Credencial falsa a propósito: no es una clave (el nodo de Sheets falla al firmar).
  const credFalsa = [{ id: 'farmaciaGoogleSA', name: 'Google (cuenta de servicio)', type: 'googleApi',
    data: { email: 'prueba@proyecto-falso.iam.gserviceaccount.com', privateKey: 'NO-ES-UNA-CLAVE-PRIVADA' } },
  { id: 'farmaciaGoogleDriveOAuth', name: 'Google Drive (OAuth)', type: 'googleDriveOAuth2Api',
    data: { clientId: 'cliente-falso.apps.googleusercontent.com', clientSecret: 'NO-ES-UN-SECRETO' } }];
  const imp = importarYPublicar(CONTENEDOR, REPO, credFalsa);
  console.log(`Importados: ${imp.importados}/${FLUJOS.length}; publicados: ${imp.publicados.length}/${FLUJOS.length}`);
  if (imp.errores.length) console.log('Errores de importación:\n  ' + imp.errores.join('\n  '));
  sh('docker', ['restart', CONTENEDOR]);
  await esperarListo(BASE);
  await esperarWebhook(BASE, WEBHOOK_PATH);
  const version = limpiarSalida(sh('docker', ['exec', CONTENEDOR, 'n8n', '--version']).out).trim();

  // Casos funcionales
  const resultados = [];
  for (const c of CASOS) {
    const upd = update(c.chat, c.texto, c.extra || {});
    if (c.texto === undefined) delete upd.message.text;
    const t0 = await enviar(upd, c.secreto === undefined ? SECRETO : c.secreto);
    let ok = false;
    let detalle = '';
    if (c.espera === 'nada') {
      await esperar(3000);
      const llegó = recibidos.some((x) => x.t >= t0);
      ok = !llegó;
      detalle = llegó ? 'el bot respondió y no debía' : 'sin respuesta (correcto)';
    } else if (c.espera === 'admin') {
      // El subflujo falla en Sheets (credencial falsa): debe llegar UNA alerta
      // US-21 que nombre el subflujo y el vecino debe recibir el aviso de falla.
      const m = await esperarMensaje(ADMIN, t0, 20000);
      const aviso = await esperarMensaje(c.chat, t0, 8000);
      await esperar(1500);
      const texto = m && m.body ? String(m.body.text || '') : '';
      const alertas = recibidos.filter((x) => x.t >= t0 && x.body && String(x.body.chat_id) === ADMIN).length;
      const avisoOk = !!aviso && String(aviso.body.text || '').includes('Tuvimos un problema');
      ok = !!m && texto.includes(c.flujo) && avisoOk && alertas === 1;
      detalle = (m ? 'alerta US-21: «' + texto.split('\n')[0].slice(0, 70) + '»' : 'sin alerta') +
        `; alertas=${alertas}; aviso al vecino=${avisoOk ? 'sí' : 'no'}`;
    } else {
      const m = await esperarMensaje(c.chat, t0);
      const texto = m && m.body ? String(m.body.text || '') : '';
      ok = !!m && c.contiene.every((s) => texto.includes(s));
      detalle = m ? `${m.t - t0} ms; «${texto.split('\n')[0].slice(0, 80)}»` : 'sin respuesta';
    }
    resultados.push({ id: c.id, caso: c.nombre, resultado: ok ? 'PASA' : 'FALLA', detalle });
    console.log(`${ok ? 'PASA ' : 'FALLA'} ${c.id} ${c.nombre} — ${detalle}`);
    await esperar(300);
  }

  // Latencia del router (respuesta directa, sin planilla), secuencial y concurrente
  const lat = [];
  for (let i = 0; i < N; i++) {
    const chat = String(5000 + i);
    const t0 = await enviar(update(chat, 'hola'));
    const m = await esperarMensaje(chat, t0);
    if (m) lat.push(m.t - t0);
  }
  const conc = [];
  const tandas = await Promise.all(Array.from({ length: 10 }, async (_, i) => {
    const chat = String(7000 + i);
    const t0 = await enviar(update(chat, 'ayuda'));
    const m = await esperarMensaje(chat, t0, 30000);
    return m ? m.t - t0 : null;
  }));
  for (const v of tandas) if (v !== null) conc.push(v);
  const latencia = {
    secuencial: { n: N, recibidas: lat.length, p50_ms: percentil(lat, 50), p95_ms: percentil(lat, 95), max_ms: Math.max(...lat) },
    concurrente_10: { recibidas: conc.length, p50_ms: percentil(conc, 50), p95_ms: percentil(conc, 95), max_ms: Math.max(...conc) }
  };
  console.log('Latencia router (mensaje → respuesta en Telegram simulado):', JSON.stringify(latencia));

  const pasan = resultados.filter((r) => r.resultado === 'PASA').length;
  const evidencia = {
    fecha: inicio.toISOString(), n8n: version, imagen: N8N_IMAGEN, importacion: imp,
    arranque_ms: tListo, casos: resultados, resumen: `${pasan}/${resultados.length} casos pasan`, latencia
  };
  const dir = join(REPO, 'docs', 'evidencia', 'integracion');
  mkdirSync(dir, { recursive: true });
  const sello = inicio.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  writeFileSync(join(dir, `integracion-${sello}.json`), JSON.stringify(evidencia, null, 2) + '\n');
  console.log(`\nRESUMEN: ${pasan}/${resultados.length} casos pasan. Evidencia: docs/evidencia/integracion/integracion-${sello}.json`);
  return pasan === resultados.length;
}

main()
  .then((ok) => { cerrar(); process.exit(ok ? 0 : 1); })
  .catch((e) => { console.error('ERROR:', e.message); cerrar(); process.exit(2); });

function cerrar() {
  mock.close();
  if (BORRAR) sh('docker', ['rm', '-f', CONTENEDOR]);
}
