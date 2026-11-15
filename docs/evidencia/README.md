# Evidencia de pruebas

| Carpeta | Contenido | Se genera con |
|---|---|---|
| `pruebas-unitarias/` | Resumen y log de las 14 suites | `node scripts/correr-pruebas.mjs` |
| `integracion/` | 14 casos con n8n real y Telegram simulado, más la latencia del router | `node scripts/local/prueba-integracion.mjs` || `e2e/` | Casos automáticos con cuentas reales | `node scripts/local/e2e.mjs` |
| `rendimiento/` | Latencia de consultas y reservas concurrentes | `medir-latencia.mjs`, `prueba-concurrencia.mjs` |
| `calidad/` | Medición de la búsqueda difusa | `node scripts/medir-busqueda.mjs` |

**Las horas de los nombres y de los reportes están en UTC.** Chile está en UTC−3 en noviembre: un archivo `…-21-01` se generó a las 18:01 hora local. Al citar una hora en el informe, indique cuál usa.

Cada corrida crea archivos nuevos: versione solo la que sirve de evidencia y descarte el resto.

**Corrida posterior a la corrección B-01 (15-nov-2026):** `pruebas-unitarias/2026-11-15-17-27-*` (413/413) e `integracion/ci-2026-11-15.md` (job `integracion-n8n` en verde sobre `2c7aec8`, `main` `d42b6b2` y el tag `v0.2-sprint2`). La corrida local de integración del 15-nov a las 17:09 quedó como `integracion-2026-11-15-17-09.json`, previa al fix.
