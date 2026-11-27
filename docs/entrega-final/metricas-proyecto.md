# Métricas del proyecto

Datos tomados del historial de git, de GitHub (pull requests, issues y GitHub Actions) y de los informes de cada sprint. Corte: 27 de noviembre de 2026, antes de integrar el Sprint 3. La sección 6 se completa al cierre.

## 1. Velocidad

Solo cuentan los puntos de historia (SP) de historias terminadas según la definición de terminado (DoD): integradas a `main`, con pruebas en verde y con la prueba de punta a punta aprobada.

| Sprint | Fechas | Comprometido | Terminado | Lectura |
|---|---|---|---|---|
| Sprint 0 | 28-ago a 4-sep | 11 SP | 5 SP | Solo el Inception. El modelo de datos y n8n se cerraron recién en el Sprint 1 |
| Sprint 1 | 5-sep a 16-oct | 15 SP | 6 SP | El código de las historias del sprint existía, pero quedó en un PR sin integrar ni probar de punta a punta |
| Sprint 2 | 17-oct a 15-nov | Alcance firmado (41 SP) | 41 SP | Todo el alcance firmado quedó integrado en `main` el 15-nov, con la prueba de punta a punta del 9-nov aprobada. El tablero no se actualizó |
| Sprint 3 | 16-nov a 4-dic | 14 SP: US-13 (3), US-14 (3), US-15 (5) y T-02 (3) | Se cuenta el 4-dic | Al 27-nov ninguna cumple la DoD: US-13 espera la carga de 20 reservas, US-14 la revisión de un químico farmacéutico, T-02 el gate en la CI y US-15 es la demo del 4-dic |

La velocidad no fue estable: el trabajo se hizo en dos picos (15 y 16 de octubre, y del 9 al 15 de noviembre) y quedó detenido entre ambos.

## 2. Actividad en el repositorio

| Indicador | Valor |
|---|---|
| Commits (sin contar fusiones) | 43: 28 en el Sprint 1 y 15 en el Sprint 2 |
| Período sin commits | 24 días, del 16-oct al 9-nov |
| Pull requests | 8, todos fusionados |
| Tamaño de los PR más grandes | #25 con 25 commits (Sprints 1 y 2) y #26 con 11 commits (Entrega 2) |
| Tiempo de los PR abiertos | #25: 24 días · #26: 3 días · el resto: minutos |
| PR con aprobación formal de otra persona | 0 de 8 |
| PR revisados con comentarios | 1 (#26) |
| PR fusionados por alguien distinto de su autor | 1 (#26) |

## 3. Integración continua

| Indicador | Valor |
|---|---|
| Ejecuciones de GitHub Actions | 38 hasta la Entrega 2: 36 exitosas, 2 canceladas y ninguna fallida. La #39, sobre la rama `sprint-3/entrega-final`, también pasó (27-nov) |
| Duración | 1,1 minutos en promedio; la más larga, 3,7 minutos |
| Jobs | `validate-json` (escáner de secretos y pruebas) e `integracion-n8n` (n8n real con un Telegram simulado) |

## 4. Pruebas y defectos

| Momento | Pruebas automáticas | Defectos encontrados |
|---|---|---|
| Cierre del Sprint 1 (16-oct) | 266 | — |
| Entrega 2 (15-nov) | 413 | 18 al integrar con n8n y las cuentas reales (D-01 a D-18) y 1 de seguridad en la revisión del PR #26 (B-01) |
| v0.1 (27-nov) | 422 | 3 más en el Sprint 3 (D-19 a D-21), encontrados al revisar los mensajes y al volver a medir la búsqueda |

Ningún defecto de los 22 llegó a un usuario real: todos se encontraron con datos sintéticos, antes de cualquier piloto.

## 5. Aportes al repositorio

| Integrante | Commits | Pull requests | Issues asignados |
|---|---|---|---|
| Julián Epple | 29 (y 7 fusiones) | 5 | 4 |
| Juan Pablo Salum | 10 | 1 | 0 |
| Matilda Vásquez | 4 (y 2 fusiones) | 2 | 2 |
| Álvaro Astudillo | 0 antes del Sprint 3 | 0 | 1 |
| Antonio De Solminihac | 0 | 0 | 2 |
| Javier Del Campo | 0 | 0 | 2 |

El repositorio no muestra todo el trabajo del equipo: el Inception, las presentaciones a la Municipalidad, el documento de alcance y su firma, los videos y los informes se hicieron fuera de GitHub. El aporte individual con esas evidencias está en el informe final.

## 6. Cierre del Sprint 3

Datos al 27-nov, antes de integrar la rama `sprint-3/entrega-final`:

| Indicador | Valor al 27-nov | Qué falta |
|---|---|---|
| Commits del Sprint 3 | 6 de Álvaro Astudillo en la rama de cierre, más los del cierre del informe | Contarlos al fusionar la rama en `main` |
| Pruebas automáticas | 422/422 en 14 suites ([resumen](../evidencia/pruebas-unitarias/2026-11-27-07-34-resumen.md)) | — |
| Cobertura de nodos Code | 23/23 (`node scripts/medir-cobertura-nodos.mjs`) | — |
| Exactitud de la búsqueda | 50/50 con el router (`node scripts/medir-busqueda.mjs`) | — |
| Defectos del Sprint 3 | 3 (D-19 a D-21), todos corregidos con prueba de regresión | — |
| PR con aprobación formal | 0 hasta la Entrega 2 | Que Julián apruebe el PR de la v0.1 en GitHub (*Review → Approve*) antes de fusionarlo |
| Carga de 20 reservas (US-13) | Sin medir | `node scripts/local/prueba-concurrencia.mjs --n 20 --stock 10` en el ambiente preproductivo |
| Latencia en el ambiente preproductivo | Sin medir | `node scripts/local/medir-latencia.mjs --n 20` |
| Velocidad del Sprint 3 | 14 SP comprometidos | Contar los SP en Done el 4-dic |
