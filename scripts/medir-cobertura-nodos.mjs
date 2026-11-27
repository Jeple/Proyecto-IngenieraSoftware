#!/usr/bin/env node
/**
 * scripts/medir-cobertura-nodos.mjs — métrica Q15 (mantenibilidad · capacidad de prueba).
 *
 * Q15 = nodos Code que alguna suite de pruebas carga / nodos Code de los flujos del alcance.
 * Un nodo cuenta como probado si su nombre aparece entre comillas en algún
 * scripts/test-*.mjs (así es como las suites lo buscan dentro del JSON del flujo).
 *
 * Uso: node scripts/medir-cobertura-nodos.mjs [--json]
 * Sale con código 0 siempre: es una medición, no una regla de la CI.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Flujos del alcance firmado (Entrega 2). Quedan fuera US-09-recetas-email
// (postergado, sin publicar) y smoke-test (flujo de diagnóstico).
const FLUJOS_DEL_ALCANCE = [
  'US-04-consulta-stock.json',
  'US-05-reserva.json',
  'US-06-trazabilidad.json',
  'US-09-recetas-telegram.json',
  'US-10-cron-expiracion.json',
  'US-17-router-telegram.json',
  'US-20-aprobacion-recetas.json',
  'US-21-alertas-errores.json',
  'US-22-despacho-personal.json',
];

const suites = readdirSync(join(REPO, 'scripts'))
  .filter((f) => /^test-.*\.mjs$/.test(f))
  .map((f) => ({ archivo: f, texto: readFileSync(join(REPO, 'scripts', f), 'utf8') }));

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const filas = [];
for (const archivo of FLUJOS_DEL_ALCANCE) {
  const flujo = JSON.parse(readFileSync(join(REPO, 'workflows', archivo), 'utf8'));
  for (const nodo of flujo.nodes.filter((n) => n.type === 'n8n-nodes-base.code')) {
    const patron = new RegExp(`['"\`]${escaparRegex(nodo.name)}['"\`]`);
    const cubiertoPor = suites.filter((s) => patron.test(s.texto)).map((s) => s.archivo);
    filas.push({ flujo: archivo.replace(/\.json$/, ''), nodo: nodo.name, cubiertoPor });
  }
}

const probados = filas.filter((f) => f.cubiertoPor.length > 0).length;
const total = filas.length;
const porcentaje = total === 0 ? 0 : Math.round((probados / total) * 1000) / 10;

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ metrica: 'Q15', probados, total, porcentaje, nodos: filas }, null, 2));
} else {
  for (const f of filas) {
    const estado = f.cubiertoPor.length ? 'OK ' : '-- ';
    console.log(`${estado} ${f.flujo} · ${f.nodo}${f.cubiertoPor.length ? `  (${f.cubiertoPor.join(', ')})` : '  (sin prueba)'}`);
  }
  console.log(`\nQ15 · nodos Code con pruebas: ${probados}/${total} (${porcentaje} %) · meta ≥ 90 %`);
}
