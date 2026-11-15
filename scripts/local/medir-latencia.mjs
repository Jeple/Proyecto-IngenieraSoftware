#!/usr/bin/env node
/**
 * medir-latencia.mjs — latencia de PUNTA A PUNTA con la planilla real (meta
 * RNF-01 / SMART: < 2,5 s). Mide desde que llega el update al webhook hasta
 * que n8n llama a sendMessage, para N consultas de stock reales (US-04 con
 * lecturas de Google Sheets).
 *
 * Cómo: recrea n8n con TELEGRAM_API_BASE apuntando a un proxy local que anota
 * la hora y reenvía a Telegram (las respuestas sí llegan a su chat), envía N
 * updates firmados al webhook local y, al terminar, deja n8n como estaba.
 *
 * Uso: node scripts/local/medir-latencia.mjs [--n 20] [--chat <chat_id>]
 * Requiere: levantar.mjs ejecutado con .env completo y catálogo cargado.
 */
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { leerEnv } from './lib/entorno.mjs';
import { esperar } from './lib/n8n.mjs';
import { updateDeTexto, enviarUpdate, iniciarProxyTelegram, reiniciarN8nConBase, percentil } from './lib/medicion.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const N = Number(arg('--n', 20));
const PUERTO = 8090;
const CONSULTAS = ['pregavalina 75', 'losartan 50', 'escitalopram 10', 'melatonina 3', 'celecoxib 200', 'neurogab 75', 'esciprax 20', 'vitalmax', 'hola, ¿hay lexamind 10?', 'paracetamol 500'];

async function main() {
  const env = leerEnv(join(REPO, '.env'));
  const chat = arg('--chat', env.TELEGRAM_ADMIN_CHAT_ID);
  if (!env.TELEGRAM_WEBHOOK_SECRET || !chat) throw new Error('Faltan TELEGRAM_WEBHOOK_SECRET o un chat (--chat o TELEGRAM_ADMIN_CHAT_ID) en .env');
  const { server, registros } = await iniciarProxyTelegram(PUERTO);
  console.log(`Proxy en :${PUERTO}. Recreando n8n para pasar por el proxy...`);
  await reiniciarN8nConBase(REPO, `http://host.docker.internal:${PUERTO}`);
  const muestras = [];
  try {
    for (let i = 0; i < N; i++) {
      const texto = CONSULTAS[i % CONSULTAS.length];
      const antes = registros.length;
      const t0 = await enviarUpdate(env.TELEGRAM_WEBHOOK_SECRET, updateDeTexto(chat, texto));
      let r = null;
      for (let k = 0; k < 200 && !r; k++) {
        r = registros.slice(antes).find((x) => String(x.chat_id) === String(chat) && x.t >= t0);
        if (!r) await esperar(50);
      }
      if (r) muestras.push({ consulta: texto, ms: r.t - t0 });
      console.log(`${String(i + 1).padStart(2)}. «${texto}» → ${r ? r.t - t0 + ' ms' : 'sin respuesta en 10 s'}`);
      await esperar(400);
    }
  } finally {
    console.log('Restaurando n8n con la API real de Telegram...');
    await reiniciarN8nConBase(REPO, null);
    server.close();
  }
  const ms = muestras.map((m) => m.ms);
  const res = { fecha: new Date().toISOString(), n: N, respondidas: ms.length, p50_ms: percentil(ms, 50), p95_ms: percentil(ms, 95), max_ms: Math.max(...ms), meta_ms: 2500, cumple: percentil(ms, 95) < 2500, muestras };
  const dir = join(REPO, 'docs', 'evidencia', 'rendimiento');
  mkdirSync(dir, { recursive: true });
  const archivo = join(dir, `latencia-e2e-${res.fecha.slice(0, 16).replace(/[:T]/g, '-')}.json`);
  writeFileSync(archivo, JSON.stringify(res, null, 2) + '\n');
  console.log(`\np50 ${res.p50_ms} ms · p95 ${res.p95_ms} ms · máx ${res.max_ms} ms (${res.respondidas}/${N}). Meta p95 < 2.500 ms: ${res.cumple ? 'CUMPLE' : 'NO CUMPLE'}`);
  console.log('Evidencia: ' + archivo);
}

main().catch((e) => { console.error('ERROR: ' + e.message); process.exit(1); });
