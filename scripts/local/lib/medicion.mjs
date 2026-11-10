/**
 * Utilidades para las mediciones con credenciales reales (latencia y
 * concurrencia): updates firmados hacia el webhook local, proxy hacia
 * Telegram que marca la hora de cada respuesta, y reinicio de n8n con otra
 * base de API. Nunca imprime el token.
 */
import http from 'node:http';
import { sh, esperarListo, esperarWebhook, limpiarSalida } from './n8n.mjs';
import { WEBHOOK_PATH } from './flujos.mjs';

export const BASE_LOCAL = 'http://127.0.0.1:5678';

export function updateDeTexto(chatId, texto) {
  return {
    update_id: Math.floor(Math.random() * 1e9),
    message: { message_id: Math.floor(Math.random() * 1e6), date: Math.floor(Date.now() / 1000), chat: { id: Number(chatId), type: 'private' }, text: texto }
  };
}

export async function enviarUpdate(secreto, update) {
  const t0 = Date.now();
  const r = await fetch(`${BASE_LOCAL}/webhook/${WEBHOOK_PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secreto },
    body: JSON.stringify(update)
  });
  await r.text();
  return t0;
}

/**
 * Proxy local: n8n envía a http://host.docker.internal:<puerto>/bot<token>/...,
 * el proxy anota la hora y reenvía a la API real de Telegram.
 */
export function iniciarProxyTelegram(puerto, simulados = new Set()) {
  const registros = [];
  const server = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (c) => (cuerpo += c));
    req.on('end', async () => {
      const t = Date.now();
      let json = null;
      try { json = JSON.parse(cuerpo); } catch (e) { json = null; }
      registros.push({ t, ruta: req.url.replace(/bot[^/]+/, 'bot<token>'), chat_id: json && json.chat_id, texto: json && json.text });
      // Chats ficticios (p. ej. el "otro vecino" de la prueba de titularidad):
      // se responde aquí, sin llamar a Telegram, para no generar errores 400.
      if (json && simulados.has(String(json.chat_id))) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, result: { message_id: registros.length } }));
        return;
      }
      try {
        const r = await fetch('https://api.telegram.org' + req.url, {
          method: req.method, headers: { 'content-type': req.headers['content-type'] || 'application/json' },
          body: req.method === 'GET' ? undefined : cuerpo
        });
        const buf = Buffer.from(await r.arrayBuffer());
        res.writeHead(r.status, { 'content-type': r.headers.get('content-type') || 'application/json' });
        res.end(buf);
      } catch (e) {
        res.writeHead(502); res.end('{"ok":false}');
      }
    });
  });
  return new Promise((resolve) => server.listen(puerto, '0.0.0.0', () => resolve({ server, registros })));
}

/** Recrea el contenedor de n8n con otra TELEGRAM_API_BASE (vacía = la real). */
export async function reiniciarN8nConBase(repo, base) {
  const env = { ...process.env };
  if (base) env.TELEGRAM_API_BASE = base; else delete env.TELEGRAM_API_BASE;
  const r = sh('docker', ['compose', 'up', '-d', '--force-recreate', 'n8n'], { cwd: repo, env });
  if (r.code !== 0) throw new Error('No se pudo recrear n8n: ' + limpiarSalida(r.out));
  await esperarListo(BASE_LOCAL);
  await esperarWebhook(BASE_LOCAL, WEBHOOK_PATH);
}

export function percentil(valores, p) {
  const v = [...valores].sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.max(0, Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1))];
}
