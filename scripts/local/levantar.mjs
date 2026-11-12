#!/usr/bin/env node
/**
 * levantar.mjs — levanta todo el prototipo en local con un solo comando.
 *
 *   1. Verifica Node >= 18 y Docker.
 *   2. Crea .env desde .env.example (si falta) y genera las claves automáticas.
 *   3. Levanta n8n (versión fijada) y espera a que termine sus migraciones.
 *   4. Importa la credencial de Google (desde secrets/) y los 9 flujos, y los publica.
 *   5. Abre un túnel rápido de Cloudflare (sin cuenta) hacia n8n.
 *   6. Registra el único webhook del bot (setWebhook + secret_token).
 *   7. Corre un chequeo de salud.
 *
 * Uso:  node scripts/local/levantar.mjs [--sin-tunel] [--detener]
 *       (o scripts/local/levantar.ps1 en Windows, scripts/local/levantar.sh en macOS/Linux)
 * Nunca imprime tokens, claves ni el contenido de la cuenta de servicio.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepararEnv, leerEnv, revisarClaves, rutaCuentaServicio } from './lib/entorno.mjs';
import { sh, limpiarSalida, esperar, esperarListo, esperarWebhook, importarYPublicar, credencialDesdeCuentaServicio, credencialExiste, credencialDriveOAuth } from './lib/n8n.mjs';
import { FLUJOS, WEBHOOK_PATH, CREDENCIAL_DRIVE_OAUTH } from './lib/flujos.mjs';
import { leerCuentaServicio } from './lib/google.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const SIN_TUNEL = args.includes('--sin-tunel');
const BASE = 'http://127.0.0.1:5678';
const paso = (n, t) => console.log(`\n[${n}/7] ${t}`);
const compose = (...a) => sh('docker', ['compose', ...a], { cwd: REPO });

async function detener() {
  const r = compose('--profile', 'tunel-rapido', '--profile', 'tunel-nombrado', 'stop');
  console.log(r.code === 0 ? 'Contenedores detenidos (los datos de n8n se conservan en el volumen n8n_data).' : limpiarSalida(r.out));
}

async function main() {
  if (args.includes('--detener')) return detener();
  console.log('Farmacia Comunitaria · arranque local (Grupo 10)');

  paso(1, 'Requisitos');
  const mayor = Number(process.versions.node.split('.')[0]);
  if (mayor < 18) throw new Error('Se requiere Node 18 o superior (tiene ' + process.versions.node + ').');
  const dk = sh('docker', ['info', '--format', '{{.ServerVersion}}']);
  if (dk.code !== 0) throw new Error('Docker no está en ejecución. Abra Docker Desktop, espere "Engine running" y reintente.');
  if (compose('version').code !== 0) throw new Error('Falta Docker Compose v2 (viene con Docker Desktop).');
  console.log('  Node ' + process.versions.node + ' · Docker ' + dk.out.trim());

  paso(2, 'Archivo .env');
  const pre = prepararEnv(REPO);
  console.log(pre.creado ? '  .env creado desde .env.example.' : '  .env existente.');
  if (pre.generadas.length) console.log('  Generadas automáticamente: ' + pre.generadas.join(', ') + '.');
  const env = leerEnv(pre.ruta);
  const pendientes = revisarClaves(env).filter((r) => r.obligatoria && r.estado !== 'ok');
  if (pendientes.length) {
    console.log('  Faltan datos en .env (el sistema se levanta igual, pero el bot no atenderá hasta completarlos):');
    for (const p of pendientes) console.log(`   - ${p.clave}: ${p.estado} (${p.ayuda})`);
  }
  const rutaSa = rutaCuentaServicio(REPO, env);
  const haySa = existsSync(rutaSa);
  if (!haySa) console.log('  No está el JSON de la cuenta de servicio (' + (env.GOOGLE_SERVICE_ACCOUNT_FILE || 'secrets/service-account.json') + ').');

  paso(3, 'n8n');
  let r = compose('up', '-d', 'n8n');
  if (r.code !== 0) throw new Error('docker compose up falló:\n' + limpiarSalida(r.out));
  const ms = await esperarListo(BASE);
  console.log(`  n8n listo en ${Math.round(ms / 1000)} s.`);

  paso(4, 'Credencial y flujos');
  let cred = haySa ? credencialDesdeCuentaServicio(leerCuentaServicio(rutaSa)) : [];
  // Recetas: credencial OAuth2 de Drive. Solo se crea si no existe, para no
  // borrar la conexión (token) que el usuario hizo en el editor.
  const rutaOAuth = join(REPO, 'secrets', 'oauth-client.json');
  let estadoOAuth = 'falta secrets/oauth-client.json (recetas: ver la guía, paso 6)';
  if (credencialExiste('farmacia-n8n', CREDENCIAL_DRIVE_OAUTH.id)) estadoOAuth = 'ya existe (se conserva su conexión)';
  else if (existsSync(rutaOAuth)) {
    cred = cred.concat([credencialDriveOAuth(JSON.parse(readFileSync(rutaOAuth, 'utf8')))]);
    estadoOAuth = 'creada; falta conectarla en el editor (Credentials → «Google Drive (OAuth)» → Sign in with Google)';
  }
  const imp = importarYPublicar('farmacia-n8n', REPO, cred.length ? cred : null);
  console.log(`  Credenciales: ${imp.credencial}. Flujos importados: ${imp.importados}/${FLUJOS.length}; publicados: ${imp.publicados.length}/${FLUJOS.length}.`);
  console.log('  Drive (recetas): ' + estadoOAuth);
  for (const e of imp.errores) console.log('  ! ' + e);
  r = sh('docker', ['restart', 'farmacia-n8n']);
  await esperarListo(BASE);
  await esperarWebhook(BASE, WEBHOOK_PATH);
  console.log('  n8n reiniciado con los flujos publicados.');

  let urlPublica = null;
  const token = env.TELEGRAM_BOT_TOKEN;
  paso(5, 'Túnel de Cloudflare');
  if (SIN_TUNEL || !token) {
    console.log(SIN_TUNEL ? '  Omitido (--sin-tunel).' : '  Omitido: falta TELEGRAM_BOT_TOKEN en .env.');
  } else {
    compose('--profile', 'tunel-rapido', 'rm', '-sf', 'cloudflared-rapido');
    r = compose('--profile', 'tunel-rapido', 'up', '-d', 'cloudflared-rapido');
    if (r.code !== 0) throw new Error('No se pudo abrir el túnel:\n' + limpiarSalida(r.out));
    for (let i = 0; i < 60 && !urlPublica; i++) {
      const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(sh('docker', ['logs', 'farmacia-tunel-rapido']).out);
      if (m) urlPublica = m[0];
      else await esperar(1000);
    }
    if (!urlPublica) throw new Error('El túnel no entregó una URL en 60 s (revise: docker logs farmacia-tunel-rapido).');
    let alcanzable = false;
    for (let i = 0; i < 45 && !alcanzable; i++) {
      try { alcanzable = (await fetch(urlPublica + '/healthz')).status === 200; } catch (e) { /* DNS en propagación */ }
      if (!alcanzable) await esperar(2000);
    }
    console.log('  Túnel: ' + urlPublica + (alcanzable ? ' (responde)' : ' (aún no responde; Telegram reintentará)'));
  }

  paso(6, 'Webhook del bot');
  if (!urlPublica) {
    console.log('  Omitido (sin túnel).');
  } else {
    const resp = await (await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: `${urlPublica}/webhook/${WEBHOOK_PATH}`,
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ['message'],
        drop_pending_updates: true,
        max_connections: 1
      })
    })).json();
    if (!resp.ok) throw new Error('Telegram rechazó setWebhook: ' + (resp.description || 'sin detalle'));
    const me = await (await fetch(`https://api.telegram.org/bot${token}/getMe`)).json();
    console.log('  Webhook registrado para @' + (me.ok ? me.result.username : '¿bot?') + ' → /webhook/' + WEBHOOK_PATH);
  }

  paso(7, 'Chequeo de salud');
  const d = sh('node', [join(REPO, 'scripts', 'local', 'doctor.mjs')], { cwd: REPO });
  const resumen = d.out.split(/\r?\n/).filter((l) => /\[(FALTA|AVISO)\]|→|Resultado:/.test(l));
  console.log(resumen.length ? resumen.map((l) => '  ' + l.trim()).join('\n') : '  (sin observaciones)');

  console.log('\nListo.');
  console.log('  Editor de n8n: http://localhost:5678 (la primera vez pide crear un usuario local).');
  if (urlPublica) console.log('  Escriba "hola" a su bot en Telegram para probar.');
  console.log('  Cargar el catálogo sintético: node scripts/local/cargar-catalogo.mjs --reiniciar');
  console.log('  Diagnóstico completo: node scripts/local/doctor.mjs · Detener: node scripts/local/levantar.mjs --detener');
}

main().catch((e) => { console.error('\nERROR: ' + e.message); process.exit(1); });
