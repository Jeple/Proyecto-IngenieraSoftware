#!/usr/bin/env node
// scripts/correr-pruebas.mjs — corre todas las suites automáticas y deja
// evidencia fechada en docs/evidencia/pruebas-unitarias/ (log completo y
// resumen por suite). Uso: node scripts/correr-pruebas.mjs
// Sale con código 1 si alguna suite falla.
import { spawnSync } from 'node:child_process';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suites = [
  ...readdirSync(join(REPO, 'scripts')).filter((f) => /^test-.*\.mjs$/.test(f)).sort().map((f) => 'scripts/' + f),
  'pwa/test/pwa.test.mjs'
];

/** Lee el resumen de cada suite (cada una tiene su formato histórico). */
function conteo(salida) {
  let m;
  if ((m = /SUMMARY: (\d+) passed, (\d+) failed/.exec(salida))) return [Number(m[1]), Number(m[2])];
  if ((m = /PASS: (\d+) passed, (\d+) failed/.exec(salida))) return [Number(m[1]), Number(m[2])];
  if ((m = /Summary: (\d+)\/(\d+) passed, (\d+) failed/.exec(salida))) return [Number(m[1]), Number(m[3])];
  if ((m = /(?:PASS|FAIL) (\d+)\/(\d+)/.exec(salida))) return [Number(m[1]), Number(m[2]) - Number(m[1])];
  return [(salida.match(/^PASS\s/gm) || []).length, (salida.match(/^FAIL\s/gm) || []).length];
}

const inicio = new Date();
const filas = [];
let log = `Pruebas automáticas · ${inicio.toISOString()} · Node ${process.versions.node}\n`;
for (const s of suites) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(REPO, s)], { cwd: REPO, encoding: 'utf8' });
  const salida = (r.stdout || '') + (r.stderr || '');
  const [pasan, fallan] = conteo(salida);
  filas.push({ suite: s, pasan, fallan, salida: r.status, ms: Date.now() - t0 });
  log += `\n===== ${s} (exit ${r.status}, ${Date.now() - t0} ms)\n${salida}`;
}
const total = filas.reduce((a, f) => a + f.pasan + f.fallan, 0);
const pasan = filas.reduce((a, f) => a + f.pasan, 0);
const fallan = filas.reduce((a, f) => a + f.fallan, 0);
const sello = inicio.toISOString().slice(0, 16).replace(/[:T]/g, '-');
const dir = join(REPO, 'docs', 'evidencia', 'pruebas-unitarias');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${sello}-log.txt`), log);
const md = [
  `# Resultado de las pruebas automáticas · ${inicio.toISOString()}`,
  '',
  `Node ${process.versions.node}. Comando: \`node scripts/correr-pruebas.mjs\`. Log completo: \`${sello}-log.txt\`.`,
  '',
  '| Suite | Pasan | Fallan | Código de salida | Tiempo (ms) |',
  '|---|---|---|---|---|',
  ...filas.map((f) => `| \`${f.suite}\` | ${f.pasan} | ${f.fallan} | ${f.salida} | ${f.ms} |`),
  `| **Total** | **${pasan}** | **${fallan}** | | |`,
  ''
].join('\n');
writeFileSync(join(dir, `${sello}-resumen.md`), md);
console.log(md);
console.log(`\nTOTAL: ${pasan}/${total} pruebas pasan en ${filas.length} suites. Evidencia en docs/evidencia/pruebas-unitarias/`);
process.exit(fallan > 0 || filas.some((f) => f.salida !== 0) ? 1 : 0);
