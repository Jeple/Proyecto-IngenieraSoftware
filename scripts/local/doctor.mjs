#!/usr/bin/env node
/**
 * doctor.mjs — dice qué falta configurar, sin mostrar ningún secreto.
 *
 * Uso: node scripts/local/doctor.mjs        (o scripts/local/doctor.ps1 / doctor.sh)
 * Revisa: Node y Docker, .env, cuenta de servicio, planilla y carpeta de
 * recetas en Google, bot de Telegram y su webhook, y n8n (flujos publicados,
 * credencial, variables de la plataforma) y el túnel.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerEnv, revisarClaves, rutaCuentaServicio } from './lib/entorno.mjs';
import { leerCuentaServicio, tokenDeAcceso, api, SHEETS, DRIVE_FILE } from './lib/google.mjs';
import { sh, limpiarSalida } from './lib/n8n.mjs';
import { FLUJOS, WEBHOOK_PATH, CREDENCIAL_GOOGLE, CREDENCIAL_DRIVE_OAUTH } from './lib/flujos.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOJAS = ['catalogo', 'inventario', 'ordenes', 'despachos', 'bitacora'];
let errores = 0;
let avisos = 0;
const ok = (m) => console.log('  [OK]    ' + m);
const mal = (m, ayuda) => { errores++; console.log('  [FALTA] ' + m + (ayuda ? '\n          → ' + ayuda : '')); };
const ojo = (m, ayuda) => { avisos++; console.log('  [AVISO] ' + m + (ayuda ? '\n          → ' + ayuda : '')); };
const titulo = (t) => console.log('\n' + t);

async function main() {
  console.log('Diagnóstico del entorno local · Farmacia Comunitaria (Grupo 10)');

  titulo('1. Herramientas');
  const mayor = Number(process.versions.node.split('.')[0]);
  mayor >= 18 ? ok('Node ' + process.versions.node) : mal('Node ' + process.versions.node + ' (se requiere 18 o superior)', 'instale Node LTS desde nodejs.org');
  const dk = sh('docker', ['info', '--format', '{{.ServerVersion}}']);
  const dockerOk = dk.code === 0;
  dockerOk ? ok('Docker ' + dk.out.trim()) : mal('Docker no responde', 'abra Docker Desktop y espere a que diga "Engine running"');
  if (dockerOk) {
    const dc = sh('docker', ['compose', 'version', '--short']);
    dc.code === 0 ? ok('Docker Compose ' + dc.out.trim()) : mal('Docker Compose v2 no está disponible');
  }

  // Host ACTUAL del túnel rápido: el contenedor conserva los logs de arranques anteriores,
  // así que vale la última URL, no la primera.
  let hostTunel = null;
  if (dockerOk) {
    const lg = sh('docker', ['logs', 'farmacia-tunel-rapido']);
    const todas = lg.code === 0 ? lg.out.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g) : null;
    if (todas) hostTunel = new URL(todas[todas.length - 1]).host;
  }

  titulo('2. Archivo .env');
  const rutaEnv = join(REPO, '.env');
  if (!existsSync(rutaEnv)) {
    mal('no existe .env', 'ejecute scripts/local/levantar (lo crea desde .env.example)');
    return;
  }
  const env = leerEnv(rutaEnv);
  for (const r of revisarClaves(env)) {
    if (r.estado === 'ok') ok(r.clave + ' configurada');
    else if (!r.obligatoria) console.log('  [—]     ' + r.clave + ' ' + r.estado);
    else mal(r.clave + ': ' + r.estado, r.ayuda);
  }

  titulo('3. Google (cuenta de servicio, planilla y carpeta de recetas)');
  const rutaSa = rutaCuentaServicio(REPO, env);
  let token = null;
  if (!existsSync(rutaSa)) {
    mal('no existe el JSON de la cuenta de servicio en ' + (env.GOOGLE_SERVICE_ACCOUNT_FILE || 'secrets/service-account.json'),
      'Google Cloud → IAM → Cuentas de servicio → Claves → Agregar clave → JSON; guárdelo en secrets/');
  } else {
    try {
      const sa = leerCuentaServicio(rutaSa);
      ok('JSON de cuenta de servicio válido (proyecto ' + (sa.project_id || '¿?') + ')');
      token = await tokenDeAcceso(sa);
      ok('Google acepta la cuenta de servicio');
      if (env.GOOGLE_SHEET_ID) {
        try {
          const libro = await api(token, 'GET', SHEETS(env.GOOGLE_SHEET_ID) + '?fields=properties.title,sheets.properties.title');
          const titulos = libro.sheets.map((s) => s.properties.title);
          ok('planilla accesible: «' + libro.properties.title + '»');
          const faltan = HOJAS.filter((h) => !titulos.includes(h));
          faltan.length ? mal('faltan hojas: ' + faltan.join(', '), 'node scripts/local/cargar-catalogo.mjs') : ok('las 5 hojas existen');
          if (!faltan.length) {
            const v = await api(token, 'GET', SHEETS(env.GOOGLE_SHEET_ID) + '/values/catalogo!A2:A');
            const n = (v.values || []).length;
            n > 0 ? ok(n + ' medicamentos en el catálogo') : mal('el catálogo está vacío', 'node scripts/local/cargar-catalogo.mjs');
          }
        } catch (e) {
          mal('no se puede abrir la planilla (' + e.message + ')', 'compártala como Editor con el client_email del JSON');
        }
      }
      // Recetas: se suben con OAuth2 al Drive del usuario (la cuenta de servicio
      // tiene cuota 0). Si la carpeta está compartida con la cuenta de servicio,
      // se verifica que exista; si no, se avisa sin bloquear.
      if (env.GOOGLE_DRIVE_RECETAS_FOLDER_ID) {
        try {
          const f = await api(token, 'GET', DRIVE_FILE(env.GOOGLE_DRIVE_RECETAS_FOLDER_ID, 'id,name,mimeType'));
          f.mimeType === 'application/vnd.google-apps.folder' ? ok('carpeta de recetas encontrada: «' + f.name + '»') : mal('el ID de recetas no es una carpeta');
        } catch (e) {
          ojo('la cuenta de servicio no ve la carpeta de recetas', 'normal si no la compartió con ella; la subida usa OAuth. Para que doctor la verifique, compártala como Lector con el client_email');
        }
      }
    } catch (e) {
      mal(e.message);
    }
  }
  if (!existsSync(join(REPO, 'secrets', 'oauth-client.json'))) {
    mal('falta secrets/oauth-client.json (cliente OAuth para subir recetas)', 'guía de instalación, paso 6');
  } else {
    ok('cliente OAuth para recetas presente');
  }

  titulo('4. Telegram');
  if (env.TELEGRAM_BOT_TOKEN) {
    try {
      const me = await (await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`)).json();
      me.ok ? ok('bot @' + me.result.username) : mal('Telegram rechaza el token', 'revise TELEGRAM_BOT_TOKEN (@BotFather → /mybots)');
      const wh = await (await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`)).json();
      if (wh.ok) {
        const url = wh.result.url || '';
        if (!url) mal('el bot no tiene webhook', 'ejecute scripts/local/levantar');
        else if (!url.endsWith('/webhook/' + WEBHOOK_PATH)) mal('el webhook no apunta al router (' + new URL(url).pathname + ')', 'ejecute scripts/local/levantar');
        else {
          const host = new URL(url).host;
          if (host.endsWith('.trycloudflare.com') && hostTunel && host !== hostTunel) {
            mal('el webhook apunta a un túnel que ya no existe (' + host + '); el actual es ' + hostTunel,
              'ejecute scripts/local/levantar para volver a registrar el webhook');
          } else ok('webhook registrado en ' + host);
        }
        if (wh.result.last_error_message) ojo('último error de entrega de Telegram: ' + wh.result.last_error_message, 'si el túnel cambió, vuelva a ejecutar levantar');
        if (wh.result.pending_update_count > 0) ojo(wh.result.pending_update_count + ' mensajes pendientes de entregar');
      }
    } catch (e) {
      mal('sin conexión con api.telegram.org (' + e.message + ')');
    }
  }

  titulo('5. n8n y túnel');
  if (dockerOk) {
    const estado = sh('docker', ['inspect', '-f', '{{.State.Status}}', 'farmacia-n8n']);
    if (estado.code !== 0) {
      mal('el contenedor farmacia-n8n no existe', 'ejecute scripts/local/levantar');
    } else {
      estado.out.trim() === 'running' ? ok('contenedor farmacia-n8n en ejecución') : mal('farmacia-n8n está ' + estado.out.trim());
      try {
        const r = await fetch('http://127.0.0.1:5678/healthz/readiness');
        r.status === 200 ? ok('n8n listo en http://localhost:5678') : mal('n8n responde ' + r.status);
      } catch (e) { mal('n8n no responde en localhost:5678'); }
      const vars = sh('docker', ['exec', 'farmacia-n8n', 'printenv', 'N8N_BLOCK_ENV_ACCESS_IN_NODE', 'N8N_CONCURRENCY_PRODUCTION_LIMIT']).out.trim().split(/\r?\n/);
      vars[0] === 'false' ? ok('$env habilitado en los nodos') : mal('N8N_BLOCK_ENV_ACCESS_IN_NODE no es false', 'use el docker-compose.yml del repositorio');
      vars[1] === '1' ? ok('ejecuciones serializadas (límite 1)') : ojo('N8N_CONCURRENCY_PRODUCTION_LIMIT no es 1 (riesgo de sobreventa)');
      const activos = limpiarSalida(sh('docker', ['exec', 'farmacia-n8n', 'n8n', 'list:workflow', '--active=true', '--onlyId']).out).split(/\r?\n/).map((s) => s.trim());
      const sinPublicar = FLUJOS.filter((f) => !activos.includes(f.id));
      sinPublicar.length ? mal('flujos sin publicar: ' + sinPublicar.map((f) => f.nombre).join(', '), 'ejecute scripts/local/levantar') : ok('los ' + FLUJOS.length + ' flujos están publicados');
      const cred = sh('docker', ['exec', 'farmacia-n8n', 'n8n', 'export:credentials', '--id=' + CREDENCIAL_GOOGLE.id]);
      cred.code === 0 && /farmaciaGoogleSA/.test(cred.out) ? ok('credencial de Google importada en n8n') : mal('falta la credencial de Google en n8n', 'ejecute scripts/local/levantar con el JSON en secrets/');
      // Credencial OAuth de Drive: existe y está conectada (tiene token). Se lee
      // descifrada SOLO para revisar la presencia del token; nunca se imprime.
      const oa = sh('docker', ['exec', 'farmacia-n8n', 'n8n', 'export:credentials', '--id=' + CREDENCIAL_DRIVE_OAUTH.id, '--decrypted']);
      if (oa.code !== 0 || !oa.out.includes(CREDENCIAL_DRIVE_OAUTH.id)) {
        mal('falta la credencial «Google Drive (OAuth)» en n8n', 'guarde secrets/oauth-client.json y ejecute levantar');
      } else {
        let conectada = false;
        try {
          const json = JSON.parse(oa.out.slice(oa.out.indexOf('[')));
          conectada = !!(json[0] && json[0].data && json[0].data.oauthTokenData);
        } catch (e) { conectada = false; }
        conectada ? ok('credencial «Google Drive (OAuth)» conectada')
          : mal('la credencial «Google Drive (OAuth)» no está conectada', 'http://localhost:5678 → Overview → Credentials → «Google Drive (OAuth)» → Sign in with Google');
      }
    }
    if (hostTunel) ok('túnel rápido activo: https://' + hostTunel);
    else ojo('no hay túnel rápido activo', 'sin túnel, Telegram no puede entregar mensajes; ejecute levantar');
  }

  console.log('\n' + (errores ? `Resultado: ${errores} punto(s) por resolver y ${avisos} aviso(s).` : `Resultado: todo listo (${avisos} aviso(s)).`));
}

main()
  .then(() => process.exit(errores ? 1 : 0))
  .catch((e) => { console.error('ERROR: ' + e.message); process.exit(2); });
