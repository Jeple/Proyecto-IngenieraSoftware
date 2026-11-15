/**
 * Lectura y escritura del archivo .env sin dependencias.
 * Nunca imprime valores: los diagnósticos solo dicen "configurado" o "falta".
 */
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, isAbsolute } from 'node:path';

export function leerEnv(ruta) {
  const env = {};
  if (!existsSync(ruta)) return env;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linea);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

/** Reemplaza (o agrega) claves en .env conservando comentarios y orden. */
export function escribirClaves(ruta, valores) {
  const lineas = existsSync(ruta) ? readFileSync(ruta, 'utf8').split(/\r?\n/) : [];
  const pendientes = { ...valores };
  const out = lineas.map((linea) => {
    const m = /^\s*([A-Z0-9_]+)\s*=/.exec(linea);
    if (m && Object.prototype.hasOwnProperty.call(pendientes, m[1])) {
      const v = pendientes[m[1]];
      delete pendientes[m[1]];
      return `${m[1]}=${v}`;
    }
    return linea;
  });
  for (const [k, v] of Object.entries(pendientes)) out.push(`${k}=${v}`);
  writeFileSync(ruta, out.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 });
}

/**
 * Crea .env desde .env.example si no existe y genera las claves automáticas
 * que estén vacías. Devuelve la lista de claves generadas (sin valores).
 */
export function prepararEnv(repo) {
  const ruta = join(repo, '.env');
  const creado = !existsSync(ruta);
  if (creado) copyFileSync(join(repo, '.env.example'), ruta);
  const env = leerEnv(ruta);
  const generar = {};
  if (!env.N8N_ENCRYPTION_KEY) generar.N8N_ENCRYPTION_KEY = randomBytes(24).toString('hex');
  if (!env.TELEGRAM_WEBHOOK_SECRET) generar.TELEGRAM_WEBHOOK_SECRET = randomBytes(24).toString('hex');
  if (Object.keys(generar).length) escribirClaves(ruta, generar);
  return { ruta, creado, generadas: Object.keys(generar) };
}

export function rutaCuentaServicio(repo, env) {
  const r = env.GOOGLE_SERVICE_ACCOUNT_FILE || 'secrets/service-account.json';
  return isAbsolute(r) ? r : join(repo, r);
}

/** Reglas de forma (no de contenido) para cada clave obligatoria. */
export const REGLAS = {
  TELEGRAM_BOT_TOKEN: { obligatoria: true, forma: /^\d{6,12}:[A-Za-z0-9_-]{30,}$/, ayuda: 'token de @BotFather (números:letras)' },
  TELEGRAM_WEBHOOK_SECRET: { obligatoria: true, forma: /^[A-Za-z0-9_-]{16,256}$/, ayuda: 'se genera solo; letras, números, _ o -' },
  N8N_ENCRYPTION_KEY: { obligatoria: true, forma: /^.{16,}$/, ayuda: 'se genera sola' },
  TELEGRAM_PHARMACIST_CHAT_IDS: { obligatoria: true, forma: /^-?\d+(\s*,\s*-?\d+)*$/, ayuda: 'chat_id numéricos separados por comas (@userinfobot)' },
  TELEGRAM_ADMIN_CHAT_ID: { obligatoria: true, forma: /^-?\d+$/, ayuda: 'un chat_id numérico' },
  TELEGRAM_STAFF_CHAT_IDS: { obligatoria: false, forma: /^(-?\d+(\s*,\s*-?\d+)*)?$/, ayuda: 'opcional; si queda vacío se usa la lista de farmacéuticos' },
  GOOGLE_SHEET_ID: { obligatoria: true, forma: /^[A-Za-z0-9_-]{30,}$/, ayuda: 'ID de la URL de la planilla (entre /d/ y /edit)' },
  GOOGLE_DRIVE_RECETAS_FOLDER_ID: { obligatoria: true, forma: /^[A-Za-z0-9_-]{15,}$/, ayuda: 'ID de la carpeta de recetas en su Drive (guía, paso 6)' },
  GEMINI_API_KEY: { obligatoria: false, forma: /^(.{20,})?$/, ayuda: 'opcional' }
};

export function revisarClaves(env) {
  return Object.entries(REGLAS).map(([clave, r]) => {
    const v = env[clave] || '';
    let estado = 'ok';
    if (!v) estado = r.obligatoria ? 'falta' : 'vacía (opcional)';
    else if (!r.forma.test(v)) estado = 'formato inválido';
    return { clave, estado, obligatoria: r.obligatoria, ayuda: r.ayuda };
  });
}
