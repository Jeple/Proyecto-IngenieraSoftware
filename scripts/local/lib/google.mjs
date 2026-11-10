/**
 * Acceso mínimo a Google Sheets y Drive con una cuenta de servicio, sin
 * dependencias (JWT RS256 firmado con node:crypto). Nunca imprime la clave.
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive';

export function leerCuentaServicio(ruta) {
  const sa = JSON.parse(readFileSync(ruta, 'utf8'));
  if (sa.type !== 'service_account' || !sa.client_email || !sa.private_key) {
    throw new Error('El archivo no es un JSON de cuenta de servicio válido (falta client_email o private_key).');
  }
  return sa;
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export async function tokenDeAcceso(sa) {
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const carga = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: 'https://oauth2.googleapis.com/token', iat: ahora, exp: ahora + 3600 }));
  const firma = createSign('RSA-SHA256').update(cabecera + '.' + carga).sign(sa.private_key);
  const jwt = cabecera + '.' + carga + '.' + b64url(firma);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error('Google rechazó la cuenta de servicio: ' + (j.error_description || j.error || r.status));
  return j.access_token;
}

export async function api(token, metodo, url, cuerpo, intento = 0) {
  const r = await fetch(url, {
    method: metodo,
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch (e) { json = { raw: texto }; }
  // Cuota de la API (60 lecturas por minuto por usuario): espera y reintenta.
  if (r.status === 429 && intento < 3) {
    await new Promise((ok) => setTimeout(ok, 20000 * (intento + 1)));
    return api(token, metodo, url, cuerpo, intento + 1);
  }
  if (!r.ok) {
    const msg = json && json.error ? (json.error.message || json.error.status || JSON.stringify(json.error)) : String(r.status);
    const e = new Error(msg);
    e.status = r.status;
    throw e;
  }
  return json;
}

export const SHEETS = (id) => 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id);

/** Lee una hoja como objetos {fila, columna: valor}. */
export async function leerTabla(token, sheetId, hoja) {
  const v = await api(token, 'GET', `${SHEETS(sheetId)}/values/${encodeURIComponent(hoja + '!A1:Z')}`);
  const [cab = [], ...filas] = v.values || [];
  return filas.map((f, i) => ({ fila: i + 2, ...Object.fromEntries(cab.map((c, j) => [c, f[j] === undefined ? '' : f[j]])) }));
}

/** Escribe valores en una fila a partir de la columna indicada (A, B, ...). */
export async function escribirRango(token, sheetId, rango, valores) {
  return api(token, 'PUT', `${SHEETS(sheetId)}/values/${encodeURIComponent(rango)}?valueInputOption=USER_ENTERED`, { values: valores });
}
export const DRIVE_FILE = (id, campos) =>
  'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?supportsAllDrives=true&fields=' + encodeURIComponent(campos);
