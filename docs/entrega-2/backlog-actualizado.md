# Product Backlog actualizado y priorizado · Entrega 2

> Corte: 9 de noviembre de 2026. Responsable: Product Owner (Juan Pablo Salum). Este documento reconcilia las tres numeraciones que convivían y deja una sola fuente de verdad para el tablero (GitHub Project #6).

## 1. Reconciliación de numeraciones

| Numeración | Origen | Estado |
|---|---|---|
| **US-01 a US-15** (60 SP) | Informe de Inception entregado (PDF, sección 6) | **Vigente.** Es la numeración oficial del backlog |
| US-16 a US-22 | Historias nuevas surgidas en el desarrollo (README del repositorio y esta entrega) | Vigentes; se agregan al backlog con estimación propuesta |
| Issues #1 a #25 | GitHub (tablero) | Se mapean 1:1 a una US cuando corresponde (tabla 2) |
| HU-01 a HU-15 (87 SP) | Borrador del Inception del 4 de septiembre (`.docx`) | **Reemplazada** por la versión entregada; no se usa |

Los nombres de sprint del tablero están corridos en uno respecto del Inception (lo que el Inception llama Sprint 1 aparece como "Sprint 2"). La corrección está en `docs/entrega-2/paquete-final.md` (cambios del tablero).

## 2. Backlog priorizado

Prioridad MoSCoW según el alcance firmado (ver `Entrega 2/Alcance_Proyecto_Grupo10`): **M** Must, **S** Should, **C** Could, **W** Won't (este semestre). SP del Inception; las historias nuevas llevan una **estimación propuesta por el PO** (marcada con \*) que el equipo debe validar en el Sprint Planning del Sprint 3.

| Orden | ID | Historia (resumen) | Issue | Épica | MoSCoW | SP | Sprint | Estado (9-nov) | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| 1 | US-01 | Modelo de datos y catálogo dinámico en Sheets | #3 | EPIC-1 Core | M | 3 | 0→1 | **Done** | PR #22 fusionado; `docs/google-sheets-schema.md`; `scripts/local/cargar-catalogo.mjs` |
| 2 | US-02 | Pipeline CI y despliegue de n8n | #4 | EPIC-1 Core | M | 3 | 0→1 | **Done** | PR #23 fusionado; CI verde; `docker-compose.yml` con versiones fijadas |
| 3 | US-03 | Informe de Inception y arquitectura | #5 | EPIC-5 Calidad | M | 5 | 0 | **Done** | Informe entregado en WebC |
| 4 | US-04 | Consulta de stock y precio con búsqueda difusa | #6 | EPIC-2 Chat | M | 5 | 1 | In Review (E2E aprobado; falta merge) | `scripts/test-fuzzy-match.mjs` (32); INT-11 |
| 5 | US-05 | Reserva con código #FAR y descuento inmediato | #7 | EPIC-2 Chat | M | 5 | 1 | In Review (E2E aprobado; falta merge) | `scripts/test-reserva.mjs` (79); INT-12 |
| 6 | US-06 | Estado del pedido por RUT o código | #8 | EPIC-2 Chat | M | 3 | 1 | In Review (E2E aprobado; falta merge) | `scripts/test-trazabilidad.mjs` (18); INT-10 |
| 7 | US-17\* | Router de intenciones (un solo webhook) | nuevo | EPIC-2 Chat | M | 5\* | 2 | In Review (E2E aprobado; falta merge) | `scripts/test-router.mjs` (70); 14/14 integración |
| 8 | US-09 | Receta por foto (Telegram) + aviso al farmacéutico | #11 | EPIC-2 Chat | M | 5 | 2 | In Review (E2E aprobado; falta merge) | `scripts/test-recetas-telegram.mjs` (28); `test-despacho.mjs` (aviso) |
| 9 | US-20\* | Ciclo de vida y aprobación farmacéutica | #18 | EPIC-1 Core | M | 5\* | 2 | In Review (E2E aprobado; falta merge) | `scripts/test-aprobacion.mjs` (19); INT-13 |
| 10 | US-10 | Liberación automática a las 12 h (cron) | #12 | EPIC-1 Core | M | 3 | 2 | In Review (E2E aprobado; falta merge) | `scripts/test-cron-expiracion.mjs` (13) |
| 11 | US-21\* | Observabilidad y alertas de error | #20 | EPIC-5 Calidad | S | 3\* | 2 | In Review (E2E aprobado; falta merge) | `scripts/test-alertas.mjs` (10); INT-10 a INT-14 |
| 12 | US-22\* | Despacho marcado por el personal (en ruta / entregado) | nuevo | EPIC-4 Logística | S | 3\* | 2 | In Review (E2E aprobado; falta merge) | `scripts/test-despacho.mjs` (38); INT-14 |
| 13 | T-01\* | Modelo de identidad y roles (titularidad) | #19 | EPIC-5 Calidad | M | 2\* | 1 | In Review | `docs/identidad-roles.md`; pruebas de titularidad |
| 14 | T-02\* | Pruebas E2E y gate de release del MVP | #21 | EPIC-5 Calidad | M | 3\* | 2→3 | In Review (E2E 17/17; falta el gate en la CI) | `docs/plan-pruebas-aceptacion.md`; `docs/evidencia/e2e/` |
| 15 | US-07 | Video e informe del Sprint 1 | #9 | EPIC-5 Calidad | M | 2 | 1 | Se fusiona con US-12 | El video de la Entrega 2 cubre ambos sprints |
| 16 | US-12 | Video e informe del Sprint 2 | #14 | EPIC-5 Calidad | M | 2 | 2 | In Progress | `Entrega 2/` (informe y guion) |
| 17 | US-13 | Prueba de reservas concurrentes (0 sobreventas) | #15 | EPIC-5 Calidad | M | 3 | 3 | Ready | Primera medición en `docs/entrega-2/estrategia-pruebas.md` |
| 18 | US-14 | Seguridad clínica y tono (sin consejo médico) | #16 | EPIC-5 Calidad | M | 3 | 3 | In Progress | Reglas en el router; INT-05 a INT-07 |
| 19 | US-15 | Demo final y presentación | #17 | EPIC-5 Calidad | M | 5 | 3 | Backlog | — |
| 20 | — | Adaptador WhatsApp Business | #24 | EPIC-2 Chat | W | — | — | Won't (este semestre) | Requiere número y cuenta verificada de la Municipalidad |
| 21 | US-08 | Agente telefónico de voz | #10 | EPIC-3 Voz | W | 8 | — | Won't (este semestre) | Fuera del alcance firmado |
| 22 | US-11 | App web del conductor con ETA (OSRM) | #13 | EPIC-4 Logística | W | 5 | — | Won't (prototipo en modo demo) | `pwa/` sin backend; reemplazada por US-22 |
| 23 | US-18\* | Backend de la PWA (GET/PATCH despachos) | — | EPIC-4 Logística | W | 5\* | — | Won't | Depende de US-11 |
| 24 | US-19\* | Recetas por correo (IMAP) | — | EPIC-2 Chat | W | 3\* | — | Won't (postergado) | `workflows/US-09-recetas-email.json` sin publicar |
| 25 | US-16\* | Panel de administración web | — | EPIC-5 Calidad | W | 8\* | — | Won't | La planilla y n8n cumplen ese rol |

Issues sin historia: #1 (ejemplo, cerrado como duplicado), #2 (prueba de acceso, cerrado), #22, #23 y #25 son pull requests.

## 3. Definition of Done aplicada

Tomada del Inception (sección 13.4), más el E2E que exige esta entrega. Una historia está **Done** cuando:

1. Cumple sus criterios de aceptación, **verificados por una persona distinta** de quien la desarrolló.
2. Tiene pruebas automatizadas de sus caminos principales y de error, en verde en la CI.
3. Su código se revisó en un pull request y se **integró a la rama principal** sin romper la construcción.
4. Está documentada y **desplegada en el entorno de demostración**, con el **E2E ejecutado** (`docs/plan-pruebas-aceptacion.md`).
5. No introduce incumplimientos de los RNF comprometidos.

Por eso las historias con código completo y pruebas en verde figuran como **In Review**. El punto 4 se cumplió el 9 de noviembre: el E2E pasó 17 de 17 casos automáticos en el entorno local con las cuentas reales, más la receta probada a mano (`docs/plan-pruebas-aceptacion.md`, sección 3). Les falta el punto 3 (el PR #25 y el de la Entrega 2 siguen abiertos) y la verificación del punto 1 por otro integrante.

## 4. Velocidad

Solo se cuentan SP en Done al cierre de cada sprint.

| Sprint | Comprometido (Inception) | Done | Velocidad | Comentario |
|---|---|---|---|---|
| Sprint 0 (28-ago a 4-sep) | 11 SP (US-01, US-02, US-03) | US-03 | **5 SP** | US-01 y US-02 se cerraron recién en el Sprint 1 |
| Sprint 1 (hasta 16-oct) | 15 SP (US-04 a US-07) | US-01, US-02 (arrastre) | **6 SP** | El código de US-04 a US-06, US-09, US-10, US-20 y US-21 se escribió el 15 y 16 de octubre, pero quedó en el PR #25 sin fusionar y sin E2E: según la DoD suma 0 |
| Sprint 2 (17-oct a 15-nov) | 23 SP en el Inception; replanificado al alcance firmado | — | **0 SP al 9-nov** | El E2E ya pasa (17/17, 9-nov). Si antes del domingo se fusionan los PR y otro integrante verifica el incremento, pasan a Done 41 SP: US-04 (5), US-05 (5), US-06 (3), US-17 (5), US-09 (5), US-20 (5), US-10 (3), US-21 (3), US-22 (3), T-01 (2) y US-12 (2). El informe final registra la cifra real |

Lectura honesta: el equipo no tiene todavía una velocidad estable. El trabajo se concentró en dos picos (15-16 de octubre y esta semana) y estuvo detenido entre ambos (el repositorio no tuvo commits del 16 de octubre al 9 de noviembre). Para el Sprint 3 se propone comprometer como máximo lo que efectivamente se cierre en el Sprint 2 y fijar un responsable por historia.

## 5. Trazabilidad HU → requerimiento → workflow → prueba

| Historia | Requerimientos | Workflow | Pruebas automáticas | Caso de aceptación |
|---|---|---|---|---|
| US-04 | RF-01, RF-02, RNF-01, R-02 | `US-04-consulta-stock.json` | `test-fuzzy-match.mjs`, `test-router.mjs` (contrato) | CA-01, CA-02, CA-03 |
| US-05 | RF-03, RF-04, RNF-04 | `US-05-reserva.json` | `test-reserva.mjs`, `test-router.mjs` (contrato) | CA-04, CA-05, CA-06 |
| US-06 | RF-07, RNF-07 (titularidad) | `US-06-trazabilidad.json` | `test-trazabilidad.mjs` | CA-07, CA-08 |
| US-17 | RNF-01, RNF-03, RNF-08, R-02 | `US-17-router-telegram.json` | `test-router.mjs`, `test-workflows-n8n.mjs`, `prueba-integracion.mjs` | CA-09, CA-10, CA-11 |
| US-09 | RF-05, RNF-07 | `US-09-recetas-telegram.json` | `test-recetas-telegram.mjs`, `test-despacho.mjs` (aviso) | CA-12, CA-13 |
| US-20 | RF-05 (validación humana), S-04 | `US-20-aprobacion-recetas.json` | `test-aprobacion.mjs` | CA-14, CA-15 |
| US-10 | RF-06, RNF-04 | `US-10-cron-expiracion.json` | `test-cron-expiracion.mjs` | CA-16 |
| US-22 | RF-07, RF-04 (descuento final) | `US-22-despacho-personal.json` | `test-despacho.mjs` | CA-17, CA-18 |
| US-21 | RNF-03 (operación) | `US-21-alertas-errores.json` | `test-alertas.mjs`, integración INT-10 a INT-14 | CA-19 |
| US-14 | RNF-08 | Reglas en `US-17` (`clasificar`) | `test-router.mjs` (bloque 3) | CA-10 |
| US-13 | RNF-04, meta 0 sobreventas | Todos los que escriben inventario | `docs/entrega-2/estrategia-pruebas.md` (prueba de concurrencia) | CA-20 |
