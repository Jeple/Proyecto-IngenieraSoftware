/**
 * Utilidades compartidas para levantar n8n en Docker e importar los flujos.
 * Sin dependencias: solo Node >= 18 y la CLI de Docker.
 *
 * Se invoca `docker` directamente (sin shell) para que las rutas funcionen
 * igual en PowerShell, Git Bash, macOS y Linux.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FLUJOS, CREDENCIAL_GOOGLE, CREDENCIAL_DRIVE_OAUTH } from './flujos.mjs';

export function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  let out = (r.stdout || '') + (r.stderr || '');
  if (r.error && r.error.code === 'ETIMEDOUT') {
    out += `\n[tiempo agotado: «${cmd} ${args.slice(0, 4).join(' ')}» no terminó en ${Math.round(opts.timeout / 1000)} s]`;
  }
  return { code: r.status === null ? -1 : r.status, out, error: r.error };
}

/** Límite para cada comando de la CLI de n8n: si uno se cuelga, falla con un mensaje claro. */
const LIMITE_CLI = { timeout: 240000 };

/** Quita líneas de ruido de la CLI de n8n (licencia, trazas). */
export function limpiarSalida(texto) {
  return String(texto || '')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !/license SDK|^\s+at |ExperimentalWarning|trace-warnings/.test(l))
    .join('\n');
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Límite de cada intento HTTP: una conexión que no responde no bloquea la espera. */
const LIMITE_INTENTO_MS = 5000;

/** Motivo breve de un intento fallido (sin URLs ni cuerpos). */
const motivo = (e) => (e && e.cause && e.cause.code) || (e && e.name) || 'error';

/**
 * Espera a que n8n termine las migraciones (readiness = 200).
 * `avisar` recibe un mensaje de avance cada 15 s con el resultado del último intento.
 */
export async function esperarListo(baseUrl, timeoutMs = 180000, avisar = () => {}) {
  const t0 = Date.now();
  let ultimo = 'sin intentos';
  let proximoAviso = 15000;
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(baseUrl + '/healthz/readiness', { signal: AbortSignal.timeout(LIMITE_INTENTO_MS) });
      if (r.status === 200) return Date.now() - t0;
      ultimo = 'HTTP ' + r.status;
    } catch (e) { ultimo = motivo(e); }
    if (Date.now() - t0 >= proximoAviso) {
      avisar(`esperando a n8n: ${Math.round((Date.now() - t0) / 1000)} s (último intento: ${ultimo})`);
      proximoAviso += 15000;
    }
    await esperar(1500);
  }
  throw new Error(`n8n no quedó listo en ${Math.round(timeoutMs / 1000)} s (${baseUrl}; último intento: ${ultimo})`);
}

/** Espera a que el webhook público quede registrado (deja de responder 404). */
export async function esperarWebhook(baseUrl, path, timeoutMs = 60000) {
  const t0 = Date.now();
  let ultimo = 'sin intentos';
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(baseUrl + '/webhook/' + path, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
        signal: AbortSignal.timeout(LIMITE_INTENTO_MS)
      });
      if (r.status !== 404) return Date.now() - t0;
      ultimo = 'HTTP 404';
    } catch (e) { ultimo = motivo(e); }
    await esperar(1000);
  }
  throw new Error(`El webhook /webhook/${path} no quedó registrado (último intento: ${ultimo})`);
}

/**
 * Credencial googleApi a partir del JSON de la cuenta de servicio.
 * El JSON nunca se imprime; el archivo temporal se borra al terminar.
 */
export function credencialDesdeCuentaServicio(sa) {
  return [{
    id: CREDENCIAL_GOOGLE.id,
    name: CREDENCIAL_GOOGLE.name,
    type: CREDENCIAL_GOOGLE.type,
    data: { email: sa.client_email, privateKey: sa.private_key }
  }];
}

/** true si la credencial ya existe en n8n (no imprime su contenido). */
export function credencialExiste(contenedor, id) {
  const r = sh('docker', ['exec', contenedor, 'n8n', 'export:credentials', `--id=${id}`]);
  return r.code === 0 && r.out.includes(`"id":"${id}"`);
}

/**
 * Credencial OAuth2 de Google Drive desde el JSON del cliente OAuth (tipo «web»).
 * Queda sin token: el usuario la conecta una vez en el editor de n8n.
 */
export function credencialDriveOAuth(cliente) {
  const c = cliente.web || cliente.installed || {};
  if (!c.client_id || !c.client_secret) throw new Error('El JSON del cliente OAuth no trae client_id/client_secret');
  return {
    id: CREDENCIAL_DRIVE_OAUTH.id, name: CREDENCIAL_DRIVE_OAUTH.name, type: CREDENCIAL_DRIVE_OAUTH.type,
    data: { clientId: c.client_id, clientSecret: c.client_secret }
  };
}

/**
 * Copia los flujos (y opcionalmente la credencial) al contenedor, los importa
 * con la CLI de n8n, los publica y borra los temporales.
 * Devuelve un resumen sin secretos.
 */
export function importarYPublicar(contenedor, repoDir, credenciales, avisar = () => {}) {
  const t0 = Date.now();
  const seg = () => Math.round((Date.now() - t0) / 1000) + ' s';
  // Un comando de la CLI que se cuelga corta la importación en vez de bloquear los siguientes.
  const cli = (args) => {
    const res = sh('docker', ['exec', contenedor, 'n8n', ...args], LIMITE_CLI);
    if (res.error && res.error.code === 'ETIMEDOUT') throw new Error(limpiarSalida(res.out).split('\n').slice(-1)[0]);
    return res;
  };
  const tmp = mkdtempSync(join(tmpdir(), 'farmacia-n8n-'));
  const destino = '/tmp/farmacia-import';
  const resumen = { credencial: 'omitida', importados: 0, publicados: [], errores: [] };
  try {
    const dirFlujos = join(tmp, 'flujos');
    mkdirSync(dirFlujos, { recursive: true });
    for (const f of FLUJOS) copyFileSync(join(repoDir, 'workflows', f.archivo), join(dirFlujos, f.archivo));
    if (credenciales) writeFileSync(join(tmp, 'credenciales.json'), JSON.stringify(credenciales), { mode: 0o600 });

    sh('docker', ['exec', '-u', 'root', contenedor, 'rm', '-rf', destino]);
    let r = sh('docker', ['cp', tmp, `${contenedor}:${destino}`]);
    if (r.code !== 0) throw new Error('docker cp falló: ' + limpiarSalida(r.out));
    sh('docker', ['exec', '-u', 'root', contenedor, 'chown', '-R', 'node:node', destino]);

    if (credenciales) {
      r = cli(['import:credentials', `--input=${destino}/credenciales.json`]);
      if (r.code !== 0) resumen.errores.push('credenciales: ' + limpiarSalida(r.out).split('\n').slice(-1)[0]);
      else resumen.credencial = 'importada';
      avisar(`credenciales: ${resumen.credencial} (${seg()})`);
    }
    r = cli(['import:workflow', '--separate', `--input=${destino}/flujos`]);
    const salida = limpiarSalida(r.out);
    const m = /Successfully imported (\d+)/.exec(salida);
    resumen.importados = m ? Number(m[1]) : 0;
    if (r.code !== 0 || !m) resumen.errores.push('workflows: ' + salida.split('\n').slice(-1)[0]);
    avisar(`flujos importados: ${resumen.importados}/${FLUJOS.length} (${seg()})`);

    for (const f of FLUJOS) {
      r = cli(['publish:workflow', `--id=${f.id}`]);
      if (r.code === 0 && !/not found|error/i.test(limpiarSalida(r.out))) resumen.publicados.push(f.id);
      else resumen.errores.push(`publicar ${f.id}: ` + limpiarSalida(r.out).split('\n').slice(-1)[0]);
      avisar(`publicado ${f.id}: ${resumen.publicados.includes(f.id) ? 'sí' : 'no'} (${seg()})`);
    }
  } finally {
    sh('docker', ['exec', '-u', 'root', contenedor, 'rm', '-rf', destino]);
    rmSync(tmp, { recursive: true, force: true });
  }
  return resumen;
}
