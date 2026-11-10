# Paquete final para el equipo · Entrega 2

Todo lo de este documento lo **ejecuta una persona del equipo**: commits, push, PR, merge, tags y tablero. Ninguna de estas acciones se ejecutó automáticamente.

Corte: lunes 9 de noviembre de 2026. Entrega: **domingo 15 de noviembre a las 23:30** (WebC).

## 1. Plan de commits

Los cambios están en el clon `D:\Descargas\Ing_Software\Proyecto-IngenieraSoftware`, sobre la rama `feature/sprint-1-2` y sin commitear. Se agrupan en 7 commits lógicos, en una rama nueva para no mezclarlos con el PR #25.

> **Antes de empezar:**
> - Corra `bash scripts/check_secrets.sh` y `node scripts/correr-pruebas.mjs`, y revise `git diff`.
> - `.env` y `secrets/` están ignorados y **no** deben aparecer en `git status`.
> - Este clon tiene `core.autocrlf=false` (configuración local) para respetar el nuevo `.gitattributes`.

### 1.1 Crear la rama (conserva los cambios sin commitear)

```
cd D:\Descargas\Ing_Software\Proyecto-IngenieraSoftware
git switch -c feature/sprint-2-entrega
git status
```

### 1.2 Commits

Los comandos son idénticos en PowerShell y bash. Cada mensaje termina con la línea de coautoría, porque el trabajo se hizo con asistencia de IA.

**Commit 1: correcciones de integración con n8n real**
```
git add .gitattributes .env.example docker-compose.yml scripts/check_secrets.sh scripts/test-workflows-n8n.mjs workflows/US-04-consulta-stock.json workflows/US-05-reserva.json workflows/US-06-trazabilidad.json workflows/US-09-recetas-telegram.json workflows/US-10-cron-expiracion.json workflows/US-20-aprobacion-recetas.json workflows/US-21-alertas-errores.json
git commit -m "fix(n8n): hacer funcionar los flujos en n8n 2.44.2 real" -m "- Nodos Code: process.env reemplazado por la variable env de n8n (n8n 2.x no expone process); los mensajes se descartaban en silencio.
- Telegram: URL y cuerpo como expresiones (=) con JSON.stringify; descarga /file/bot<token>/<ruta>; base configurable.
- Sheets: cuenta de servicio con credencial fija farmaciaGoogleSA y planilla desde .env; lecturas una vez por ejecucion (executeOnce), alwaysOutputData, columns.schema en las escrituras y 3 reintentos ante la cuota (D-13 a D-15).
- Drive: v3 con OAuth2 al Drive del responsable, porque la cuenta de servicio tiene cuota 0 (D-16, ADR-13).
- US-06: el estado por RUT o codigo nunca encontraba el pedido en n8n; ahora desenvuelve los items (D-18).
- US-10: entrada manual para que el personal la invoque desde el router.
- Subflujos con Execute Workflow Trigger (sin webhook propio), ID fijos y US-21 como errorWorkflow.
- US-09: aviso al quimico farmaceutico y mensaje honesto; US-20: confirmacion al farmaceutico.
- docker-compose: versiones fijadas, acceso a env habilitado, una ejecucion a la vez (RNF-04), poda a 7 dias.
- .gitattributes (LF), .env.example en espanol, check_secrets admite referencias id/name.
- test-workflows-n8n.mjs: 39 reglas para que estos defectos no vuelvan.

Refs #6 #7 #8 #11 #12 #18 #20

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Commit 2: router de intenciones (US-17)**
```
git add workflows/US-17-router-telegram.json scripts/test-router.mjs scripts/medir-busqueda.mjs docs/evidencia/calidad/medicion-busqueda.json
git commit -m "feat(US-17): router de intenciones con webhook unico" -m "Unico webhook del bot (/webhook/telegram-bot). Valida el secreto, normaliza el texto (saludos y muletillas), responde urgencias (SAMU 131, *4141) y preguntas clinicas sin consejo medico, y deriva a US-04/05/06/09/20/22 con Execute Workflow. Comando del personal 'revisar vencidos' para la expiracion a demanda. Gemini opcional solo elige una etiqueta. 70 pruebas, incluidas las de contrato con los parsers reales y la que ejecuta US-06 con items como los de n8n.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Commit 3: despacho marcado por el personal (US-22)**
```
git add workflows/US-22-despacho-personal.json scripts/test-despacho.mjs docs/ciclo-vida-pedido.md docs/identidad-roles.md
git commit -m "feat(US-22): despacho marcado por el personal" -m "Comandos 'en ruta' y 'entregado' con lista blanca, guarda por estado de origen, bitacora con actor, aviso al vecino y descuento de stock_real y stock_reservado una sola vez. Reemplaza a la app del conductor dentro del alcance firmado. 38 pruebas.

Refs #11 #19

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Commit 4: entorno local en un comando**
```
git add scripts/local/levantar.mjs scripts/local/levantar.ps1 scripts/local/levantar.sh scripts/local/doctor.mjs scripts/local/doctor.ps1 scripts/local/doctor.sh scripts/local/cargar-catalogo.mjs scripts/local/lib/entorno.mjs scripts/local/lib/flujos.mjs scripts/local/lib/google.mjs scripts/local/lib/n8n.mjs scripts/local/lib/medicion.mjs docs/guia-instalacion-local.md
git commit -m "feat(local): levantar el sistema completo con un comando" -m "levantar (PowerShell, bash, Node): crea .env, levanta n8n, importa la credencial y los 9 flujos, los publica, abre el tunel rapido y registra el webhook. doctor diagnostica sin mostrar secretos; cargar-catalogo prepara la planilla con datos sinteticos. Guia paso a paso.

Refs #4 #21

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Commit 5: integración, E2E, mediciones y CI**
```
git add scripts/local/prueba-integracion.mjs scripts/local/e2e.mjs scripts/local/medir-latencia.mjs scripts/local/prueba-concurrencia.mjs scripts/correr-pruebas.mjs .github/workflows/validate-workflows.yml docs/plan-pruebas-aceptacion.md docs/evidencia/integracion docs/evidencia/pruebas-unitarias docs/evidencia/e2e docs/evidencia/rendimiento
git commit -m "test(e2e): integracion con n8n real, E2E y mediciones" -m "prueba-integracion: n8n real + Telegram simulado (14/14). e2e: 17 casos automatizables del plan de aceptacion contra el bot, la planilla y el Drive reales (17/17 el 9-nov; la corrida anterior, 15/17, detecto D-18). Receta probada a mano de punta a punta. medir-latencia: p95 2110 ms en 20 consultas (CA-21). prueba-concurrencia: 5 reservas simultaneas sobre stock 3, sobreventa 0 (CA-20). El reporte enmascara los chat_id. CI: check_secrets, Node 20, nuevas suites y job integracion-n8n.

Refs #21

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Commit 6: artefactos de demostración regenerados**
```
git add scripts/build-workflow-map.mjs scripts/test-mapa.mjs scripts/build-demo-panel.mjs presentacion/mapa-workflows.html presentacion/panel-demo.html
git commit -m "chore(demo): regenerar mapa y panel con el router y el despacho" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Commit 7: documentación de la Entrega 2**
```
git add docs/entrega-2 docs/arquitectura.md README.md workflows/README.md CHANGELOG.md
git commit -m "docs(entrega-2): diseno, calidad, pruebas, riesgos y control de configuracion" -m "Diagramas PlantUML (componentes, despliegue, estados y 6 secuencias), ADR, ISO 25010, estrategia de pruebas, matriz de riesgos (md y xlsx), backlog reconciliado, control de configuracion, paquete final y CHANGELOG.

Refs #14

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Verificación y push**
```
git status
git log --oneline -8
git push -u origin feature/sprint-2-entrega
```
`git status` debe quedar limpio, salvo `.env` y `secrets/`, que no aparecen porque están ignorados.

## 2. Pull request

Abrir en GitHub: **base `main` ← compare `feature/sprint-2-entrega`**.

**Título:** `feat(entrega-2): router, despacho, entorno local y documentación del Sprint 2`

**Descripción:**

```
## Resumen
Deja el alcance firmado funcionando en n8n 2.44.2 real.

- Corrige 18 defectos de integración. El más grave: los nodos usaban process.env, así que ningún mensaje se procesaba. Seis aparecieron solo con la planilla y las cuentas reales (D-13 a D-18).
- US-17 router con webhook único y US-22 despacho marcado por el personal.
- Aviso al químico farmacéutico al llegar una receta; recetas al Drive con OAuth2 (ADR-13).
- Entorno local en un comando y documentación de la Entrega 2.

## Evidencia
- 413 pruebas automáticas en verde (node scripts/correr-pruebas.mjs).
- Integración con n8n real y Telegram simulado: 14/14 (node scripts/local/prueba-integracion.mjs).
- E2E con el bot, la planilla y el Drive reales: 17/17 casos automáticos y la receta probada a mano (docs/evidencia/e2e/).
- Con la planilla real: p95 de 2,1 s en consultas (CA-21) y 0 sobreventas con 5 reservas simultáneas (CA-20).
- check_secrets OK. Sin datos reales; los reportes enmascaran los chat_id.

## Cómo probar
1. node scripts/local/prueba-integracion.mjs (solo Docker, sin credenciales).
2. Con cuentas propias: docs/guia-instalacion-local.md y luego node scripts/local/e2e.mjs.

## Pendiente
- Revisión de otro integrante (DoD) y capturas del plan de aceptación.
- CA-08 desde un segundo teléfono real.
- Sprint 3: carga de 20 reservas (US-13) y acelerar las operaciones que escriben (5 a 20 s).

Refs #6 #7 #8 #11 #12 #14 #18 #19 #20 #21

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**Orden de fusión recomendado:**
1. **PR #25** (`feature/sprint-1-2` → `main`) con *Create a merge commit*. Conserva el historial del Sprint 1 y permite etiquetarlo.
2. **PR de la Entrega 2.** Tras fusionar el #25, su diff muestra solo los 7 commits nuevos. Requiere la revisión de **otro integrante** (DoD) y la CI en verde (jobs `validate-json` e `integracion-n8n`). Fusionar también con *merge commit*.

## 3. Tags (líneas base)

Después de fusionar ambos PR y con el E2E aprobado:

```
git switch main
git pull
git tag -a v0.1-sprint1 d216bfa -m "Sprint 1: prototipo Telegram (consulta, reserva, estado) tal como se presento el 16-oct"
git tag -a v0.2-sprint2 HEAD -m "Sprint 2 / Entrega 2: router, recetas y aprobacion, 12 h, despacho, entorno local"
git push origin v0.1-sprint1 v0.2-sprint2
```

Antes de crear `v0.2-sprint2`, confirme con `git log --oneline -1` que `HEAD` es el commit de fusión del PR de la Entrega 2.

**Protección de rama** (dueño del repositorio, Julián): *Settings → Branches → Add rule* para `main`, con PR obligatorio, 1 aprobación y los checks `validate-json` e `integracion-n8n` en verde.

## 4. Cambios del tablero (GitHub Project #6)

**Antes:** tome una captura del tablero tal como está hoy (Figura «Tablero antes»). **Después:** tome otra al terminar (Figura «Tablero después»). Pegue ambas en la sección 5.2 del informe.

| Issue | Historia | Estado nuevo | Acción | Evidencia que lo respalda |
|---|---|---|---|---|
| #3 | US-01 | Done | Sin cambio | PR #22 fusionado |
| #4 | US-02 | Done | Sin cambio | PR #23 fusionado; túnel verificado (`doctor`) |
| #5 | US-03 | Done | Sin cambio | Inception entregado |
| #6 | US-04 | In Review / QA | **Reabrir** (se cerró sin E2E ni merge) | 32 pruebas; INT-11; CA-01 a CA-03 pasan (9-nov) |
| #7 | US-05 | In Review / QA | Mover | 79 pruebas; INT-12; CA-04 a CA-06 y CA-20 pasan |
| #8 | US-06 | In Review / QA | Mover | 18 pruebas + 6c2/6c3; CA-07 y CA-08 pasan (tras corregir D-18) |
| #9 | US-07 | Cerrado (no planificado) | Cerrar con un comentario | Se integra al video de la Entrega 2 (#14) |
| #10 | US-08 | Cerrado (no planificado) | Cerrar; etiqueta `fuera-de-alcance` | Alcance firmado |
| #11 | US-09 | In Review / QA | Mover desde Backlog | 28 pruebas y aviso; CA-12 y CA-13 pasan a mano con el camino real |
| #12 | US-10 | In Review / QA | Mover desde Backlog | 13 pruebas; CA-16 pasa («revisar vencidos») |
| #13 | US-11 | Cerrado (no planificado) | Cerrar; etiqueta `fuera-de-alcance` | Reemplazada por US-22 |
| #14 | US-12 | In Progress | Mover | Informe y guion en `Entrega 2/` |
| #15 | US-13 | Ready for Dev (Sprint 3) | Mover | CA-20 pasa con 5 reservas; falta la carga de 20 |
| #16 | US-14 | In Progress (Sprint 3) | Mover | Reglas clínicas en el router |
| #17 | US-15 | Backlog (Sprint 3) | Sin cambio | — |
| #18 | US-20 | In Review / QA | **Reabrir** (se cerró sin merge) | 19 pruebas; INT-13; CA-14 y CA-15 pasan |
| #19 | T-01 | In Review / QA | **Reabrir** (se cerró sin merge) | `identidad-roles.md`; CA-08 pasa con un chat simulado; falta un segundo teléfono |
| #20 | US-21 | In Review / QA | Sin cambio | 10 pruebas; INT-10 a INT-14; CA-19 pasa |
| #21 | T-02 | In Review / QA | Mover | E2E 17/17 y plan en 21/21 (`docs/evidencia/e2e/`) |
| #24 | WhatsApp | Backlog, etiqueta `wont-este-semestre` | Etiquetar | Alcance firmado |
| nuevo | US-17 | In Review / QA (Sprint 2, 5 SP) | **Crear** | 70 pruebas; integración 14/14; CA-09 a CA-11 pasan |
| nuevo | US-22 | In Review / QA (Sprint 2, 3 SP) | **Crear** | 38 pruebas; INT-14; CA-17 y CA-18 pasan |

**El E2E ya pasó (9-nov).** Cuando el PR esté fusionado y otro integrante haya verificado el incremento, mueva a **Done**: #6, #7, #8, #11, #12, #18, #19, #20 y las nuevas US-17 y US-22.

**Nombres de los sprints:** el tablero numera las iteraciones corridas en uno respecto del Inception (lo que el Inception llama Sprint 1 aparece como «Sprint 2»). En *Settings → Iteration*, renombre cada iteración para que coincida con el Inception:
- Sprint 0: Inception;
- Sprint 1: hasta el 16-oct;
- Sprint 2: hasta el 15-nov;
- Sprint 3: hasta el examen.

Revise que cada issue quede en la iteración de la tabla anterior.

**Comandos opcionales con `gh`** (reabren, cierran o crean issues; el estado del tablero se cambia en la interfaz):
```
gh issue reopen 6 --repo Jeple/Proyecto-IngenieraSoftware --comment "Se reabre hasta fusionar el PR y la verificacion de otro integrante (DoD). E2E aprobado: docs/plan-pruebas-aceptacion.md"
gh issue reopen 18 --repo Jeple/Proyecto-IngenieraSoftware --comment "Se reabre hasta fusionar el PR (DoD). CA-14 y CA-15 ya pasan"
gh issue reopen 19 --repo Jeple/Proyecto-IngenieraSoftware --comment "Se reabre hasta fusionar el PR y repetir CA-08 desde un segundo telefono"
gh issue close 9 --repo Jeple/Proyecto-IngenieraSoftware --reason "not planned" --comment "El video del Sprint 1 se integra al de la Entrega 2 (#14)"
gh issue close 10 --repo Jeple/Proyecto-IngenieraSoftware --reason "not planned" --comment "Fuera del alcance firmado (documento de alcance, Entrega 2)"
gh issue close 13 --repo Jeple/Proyecto-IngenieraSoftware --reason "not planned" --comment "Fuera del alcance firmado; reemplazada por US-22 (despacho por el personal)"
gh issue create --repo Jeple/Proyecto-IngenieraSoftware --title "US-17 Router de intenciones de Telegram (webhook unico)" --body "Como vecino, quiero hacer todo en un solo chat. Criterio: un unico webhook valida el secreto y deriva a consulta, reserva, estado, receta, aprobacion o despacho; comandos del personal solo desde chats autorizados; mensaje no entendido recibe menu. SP: 5. Evidencia: scripts/test-router.mjs, scripts/local/prueba-integracion.mjs, docs/evidencia/e2e/"
gh issue create --repo Jeple/Proyecto-IngenieraSoftware --title "US-22 Despacho marcado por el personal (en ruta / entregado)" --body "Como funcionario, quiero marcar un pedido en ruta o entregado. Criterio: solo EN_PREPARACION->EN_RUTA->ENTREGADO; bitacora con actor; aviso al vecino; al entregar descuenta stock_real y stock_reservado una sola vez. SP: 3. Evidencia: scripts/test-despacho.mjs"
```

## 5. Checklist final de entrega

| Cuándo | Qué | Quién |
|---|---|---|
| **Lun 9** | Confirmar en Discord quién es el Scrum Master y quién sale en el video | Equipo |
| **Mar 10, mañana** | Enviar el correo de alcance (`Entrega 2/Correo_Alcance_Stakeholder.md`) con el PDF | Juan Pablo |
| **Mar 10** | ✅ Cuentas creadas (bot, cuenta de servicio, planilla, carpeta y OAuth) y `.env` completo | Juan Pablo |
| **Lun 9** | ✅ `e2e.mjs` (17/17), `prueba-concurrencia.mjs`, `medir-latencia.mjs` y la receta por foto a mano | Juan Pablo |
| **Mar 10 – Mié 11** | Titularidad (CA-08) desde un segundo teléfono, con captura | Antonio |
| **Mié 11** | Seguir la guía de instalación en otro computador, con cuentas propias, y cronometrar (meta: ≤ 30 min, Q16) | Matilda |
| **Mié 11** | Revisar y fusionar el PR #25; commits y PR de la Entrega 2 (sección 1); revisión de otro integrante | Julián + revisor |
| **Jue 12** | Tablero: aplicar los cambios de la sección 4, con capturas antes y después | Javier |
| **Jue 12, 18:00** | Si la contraparte no ha respondido, enviar el recordatorio | Juan Pablo |
| **Jue 12** | Capturas del plan de aceptación (cap-02 a cap-19, cap-n8n, cap-bitacora, cap-ci) | Antonio + Javier |
| **Vie 13** | Ensayo con cronómetro y grabación del video (`Guion_Video_Sprint2.md`); subirlo como no listado | Todos (maneja Julián) |
| **Vie 13** | Completar los marcadores amarillos del informe (firma, video, velocidad, capturas) y revisar la ortografía | Álvaro + Juan Pablo |
| **Sáb 14** | Mover a Done lo fusionado y verificado; crear los tags `v0.1-sprint1` y `v0.2-sprint2` | Julián |
| **Sáb 14** | Regenerar el PDF del informe (Word → Guardar como PDF) y revisarlo página por página | Juan Pablo |
| **Sáb 14, noche** | **Subir a WebC:** informe (PDF), enlace al video, enlace al repositorio y documento de alcance firmado | Juan Pablo |
| **Dom 15, 23:30** | Plazo final (margen de un día) | — |
