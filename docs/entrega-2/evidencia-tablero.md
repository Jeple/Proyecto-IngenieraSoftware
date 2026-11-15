# Evidencia del tablero · GitHub Project #6

| Versión | Fecha | Autor(es) | Cambios |
|---|---|---|---|
| 1.0 | 15-nov-2026 | Equipo del proyecto (Grupo 10) — calidad y gestión ágil | Snapshot de issues, mapeo recomendado de estados, comandos de API y checklist de capturas |

**Tablero:** <https://github.com/users/Jeple/projects/6/views/1> · **Repositorio:** <https://github.com/Jeple/Proyecto-IngenieraSoftware> · **Rama de este documento:** `docs/cierre-entrega-2-completo` · **Snapshot tomado:** domingo 15-nov-2026, 15:39 (America/Santiago), con `main` en `f01e60b` y los PR [#25](https://github.com/Jeple/Proyecto-IngenieraSoftware/pull/25), [#26](https://github.com/Jeple/Proyecto-IngenieraSoftware/pull/26) y [#27](https://github.com/Jeple/Proyecto-IngenieraSoftware/pull/27) fusionados.

## 1. Limitación de acceso verificada (leer antes de intentar)

El token de `gh` de esta sesión corresponde a la cuenta **Jeple** y tiene los scopes `repo`, `workflow`, `gist`, `read:org` y `admin:public_key`. **No tiene `read:project` ni `project`**, así que el tablero no se puede leer ni modificar por API. Comprobación literal: `gh project view 6 --owner Jeple` responde `error: your authentication token is missing required scopes [read:project]`.

- **Sí por API:** issues (crear, cerrar, reabrir, comentar, etiquetar) y consultas de solo lectura (`gh issue list`, `gh pr list`, `gh run list`). Por eso el §2 y el §3 tienen datos verificados.
- **No por API:** columnas del tablero, iteraciones y orden de las tarjetas. Todo eso es **por confirmar en la UI** y se hace según el §6.
- **Habilitar la API del proyecto (opcional):** `gh auth refresh -s project` (abre el navegador con un código; el scope `project` incluye lectura y escritura). Después: `gh project field-list 6 --owner Jeple` y `gh project item-list 6 --owner Jeple`. No es necesario para tomar las capturas «antes» y «después».

> Regla de este documento: la columna «estado del issue» está verificada con la API; la columna «estado del tablero» es una **recomendación** y se marca «por confirmar en la UI» hasta que alguien la vea en pantalla.

## 2. Snapshot de issues (15-nov-2026)

Comando usado (solo lectura): `gh issue list --state all --limit 100 --json number,title,state,createdAt,closedAt,labels`.

| # | Título | Estado verificado | Historia | Iteración (Inception) |
|---|---|---|---|---|
| 1 | Modelado de Esquema de Datos y Stock Dinámico EJEMPLO | CLOSED (16-oct) | — (ejemplo/duplicado) | — |
| 2 | `__CHATGPT_ACCESS_PROBE_DO_NOT_CREATE__` | CLOSED (1-sep) | — (prueba de acceso) | — |
| 3 | Modelado de Esquema de Datos y Stock Dinámico | CLOSED (16-oct) | US-01 | Sprint 0 |
| 4 | Despliegue de Orquestador n8n y Pipeline de Webhooks | CLOSED (16-oct) | US-02 | Sprint 0 |
| 5 | Redacción y Formalización del Informe de Inception | CLOSED (16-oct) | US-03 | Sprint 0 |
| 6 | Consulta Inteligente de Stock y Precios (Fuzzy Search) | CLOSED (16-oct) | US-04 | Sprint 1 |
| 7 | Creación de Pedido con Descuento Inmediato de Stock | OPEN | US-05 | Sprint 1 |
| 8 | Consulta de Estado de Pedido por RUT / ID de Orden | OPEN | US-06 | Sprint 1 |
| 9 | Video Demostrativo e Informe de Sprint 1 | CLOSED 15-nov (no planificado) | US-07 | Sprint 1 |
| 10 | Integración de Agente Telefónico de Voz (Vapi / Retell) | CLOSED 15-nov + `fuera-de-alcance` | US-08 | — (Won't) |
| 11 | Ingesta Asíncrona de Recetas Médicas (WhatsApp & Email) | OPEN | US-09 | Sprint 2 |
| 12 | Cron Job de Expiración de Reservas de 12 Horas | OPEN | US-10 | Sprint 2 |
| 13 | Módulo Conductor Web/PWA y Cálculo de Tiempos OSRM | CLOSED 15-nov + `fuera-de-alcance` | US-11 | — (Won't) |
| 14 | Video Demostrativo e Informe de Sprint 2 | OPEN | US-12 | Sprint 2 |
| 15 | Testing de Concurrencia y Robustez de Reservas | OPEN | US-13 | Sprint 3 |
| 16 | Evaluación de Calidad Conversacional y Prompt Hardening | OPEN | US-14 | Sprint 3 |
| 17 | Demo Final, Pitch Deck y Cierre de Proyecto | OPEN | US-15 | Sprint 3 |
| 18 | Definición del Ciclo de Vida del Pedido y Validación Farmacéutica | CLOSED (16-oct) | US-20 | Sprint 2 |
| 19 | Modelo de Identidad, Autenticación y Autorización por Rol | CLOSED (16-oct) | T-01 | Sprint 1 |
| 20 | Observabilidad, Alertas y Recuperación de Workflows Críticos | OPEN | US-21 | Sprint 2 |
| 21 | Pruebas End-to-End y Gate de Release del MVP | OPEN | T-02 | Sprint 2→3 |
| 24 | Adaptador WhatsApp Business (Meta Cloud API) | OPEN + `wont-este-semestre` | — (Won't) | — |
| 28 | US-17 Router de intenciones de Telegram (webhook unico) | OPEN (creado 15-nov) | US-17 | Sprint 2 |
| 29 | US-22 Despacho marcado por el personal (en ruta / entregado) | OPEN (creado 15-nov) | US-22 | Sprint 2 |

No son issues: #22, #23, #25, #26 y #27 son pull requests fusionados. Fuente de la correspondencia issue → historia: [`backlog-actualizado.md`](backlog-actualizado.md) §2.

## 3. Mapeo recomendado issue → estado del tablero

Criterio: el estado «Done» exige DoD completa: PR fusionado, verificación por una persona distinta de quien desarrolló y evidencia (capturas, *execution id*). Al 15-nov los PR #25/#26 están fusionados y la verificación técnica está hecha (413/413 el 15-nov a las 17:27 — [resumen](../evidencia/pruebas-unitarias/2026-11-15-17-27-resumen.md) —, integración 14/14 y E2E 17/17 el 9-nov — [reporte](../evidencia/e2e/e2e-2026-11-09-22-10.md) —), pero **la verificación formal de otro integrante y las capturas siguen pendientes**. Recomendación: mantener las tarjetas en **In Review** hasta cerrar ese paso y pasarlas a Done después. La columna **Destino final** de la tabla es el estado a alcanzar al cerrar la verificación, **no** el estado actual; mientras falten capturas o verificación, la captura «después» puede mostrar In Review y eso se anota al pie.

| Issue | Historia | SP | Estado del issue (verificado) | Destino final (tras capturas y verificación) | Acción | Respaldo |
|---|---|---|---|---|---|---|
| #6 | US-04 | 5 | CLOSED 16-oct (comentario del merge 15-nov) | **Done** | Verificar tarjeta; no reabrir | PR #26; CA-01 a CA-03 |
| #7 | US-05 | 5 | OPEN | **Done** → cerrar | Mover tarjeta y cerrar | 79 pruebas; CA-04 a CA-06, CA-20 |
| #8 | US-06 | 3 | OPEN | **Done** → cerrar | Mover tarjeta y cerrar | 18 pruebas + D-18; CA-07/CA-08 |
| #11 | US-09 | 5 | OPEN | **Done** → cerrar | Mover tarjeta y cerrar | 28 pruebas; CA-12/CA-13 |
| #12 | US-10 | 3 | OPEN | **Done** → cerrar | Mover tarjeta y cerrar | 13 pruebas; CA-16 |
| #18 | US-20 | 5 | CLOSED 16-oct (comentario del merge 15-nov) | **Done** | Verificar tarjeta | 19 pruebas; CA-14/CA-15 |
| #19 | T-01 | 2 | CLOSED 16-oct (comentario del merge 15-nov) | **Done** | Verificar tarjeta | CA-08 simulado (salvedad: segundo teléfono) |
| #20 | US-21 | 3 | OPEN | **Done** → cerrar | Mover tarjeta y cerrar | 10 pruebas; CA-19 |
| #21 | T-02 | 3 | OPEN | **Done** (recomendado) | Mover y cerrar; si el equipo prefiere esperar el gate en CI, dejar **In Review** y anotarlo | E2E 17/17; plan 21/21 |
| #28 | US-17 | 5 | OPEN (creado 15-nov) | **Done** → cerrar | Añadir al proyecto, Sprint 2, Done | 70 pruebas; CA-09 a CA-11 |
| #29 | US-22 | 3 | OPEN (creado 15-nov) | **Done** → cerrar | Añadir al proyecto, Sprint 2, Done | 38 pruebas; CA-17/CA-18 |
| #14 | US-12 | 2 | OPEN | **In Progress** | Dejar; Done solo al subir el video y pegar el enlace | `docs/informe-sprint-2.md`; video pendiente |
| #15 | US-13 | 3 | OPEN | **Ready** | Iteración Sprint 3 | CA-20; falta la carga de 20 |
| #16 | US-14 | 3 | OPEN | **In Progress** | Iteración Sprint 3 | Reglas clínicas en el router |
| #17 | US-15 | 5 | OPEN | **Backlog** | Iteración Sprint 3 | — |
| #9 | US-07 | 2 | CLOSED 15-nov (no planificado) | Done / tarjeta archivada | Ninguna; el video de la Entrega 2 cubre ambos sprints | Cierre con comentario aplicado |
| #10 | US-08 | 8 | CLOSED 15-nov (no planificado) + `fuera-de-alcance` | Done / tarjeta archivada | Ninguna | Alcance firmado |
| #13 | US-11 | 5 | CLOSED 15-nov (no planificado) + `fuera-de-alcance` | Done / tarjeta archivada | Ninguna; reemplazada por US-22 | Alcance firmado |
| #24 | WhatsApp | — | OPEN + `wont-este-semestre` | **Backlog** | Sin iteración | Alcance firmado |
| #3, #4, #5 | US-01 a US-03 | 3/3/5 | CLOSED | **Done** | Sin cambio | PR #22/#23; Inception entregado |
| #1, #2 | — | — | CLOSED | Fuera del tablero | Si aparecen como tarjetas, eliminarlas del proyecto | Son ruido de septiembre |

Notas de discrepancias (para no inventar estado):

1. El plan original pedía **reabrir** #6, #18 y #19 antes de cerrarlos; el estado real es que **siguen cerrados** y el 15-nov se les agregó el comentario de cierre con el PR y la verificación. No hace falta reabrirlos: basta comprobar que la tarjeta esté en Done.
2. `paquete-final.md` §4 dejaba #21 (T-02) en In Review; el [runbook de cierre](runbook-cierre-entrega-2.md) §4 lo manda a Done. Se recomienda Done porque el plan de aceptación y el E2E están fusionados; la deuda (gate E2E en la CI) queda declarada en el informe.
3. `paquete-final.md` §4 mueve #14 a In Progress y este documento lo mantiene ahí: el informe del Sprint 2 ya existe en `main`, el **video** no.
4. **Ninguna** columna actual del tablero está verificada: se marca «por confirmar en la UI» al ejecutar el §6.

## 4. Issues nuevos US-17 y US-22 (ya creados: #28 y #29)

El 15-nov a las 15:38 (America/Santiago) se crearon por API con el cuerpo que estaba previsto en `paquete-final.md` §4, ajustado a la evidencia final. **No volver a crearlos**: verificar primero con `gh issue list --search "US-17" --state all`.

| Issue | Título | SP | Etiqueta | Cuerpo verificado |
|---|---|---|---|---|
| [#28](https://github.com/Jeple/Proyecto-IngenieraSoftware/issues/28) | US-17 Router de intenciones de Telegram (webhook unico) | 5 | `enhancement` | «Como vecino, quiero hacer todo en un solo chat. Criterio: un unico webhook valida el secreto y deriva a consulta, reserva, estado, receta, aprobacion o despacho; comandos del personal solo desde chats autorizados; mensaje no entendido recibe menu. SP: 5. Evidencia: scripts/test-router.mjs (70), scripts/local/prueba-integracion.mjs (14/14), docs/evidencia/e2e/. Implementado en la Entrega 2 (PR #26)» |
| [#29](https://github.com/Jeple/Proyecto-IngenieraSoftware/issues/29) | US-22 Despacho marcado por el personal (en ruta / entregado) | 3 | `enhancement` | «Como funcionario, quiero marcar un pedido en ruta o entregado. Criterio: solo EN_PREPARACION->EN_RUTA->ENTREGADO; bitacora con actor; aviso al vecino; al entregar descuenta stock_real y stock_reservado una sola vez. SP: 3. Evidencia: scripts/test-despacho.mjs (38), docs/evidencia/e2e/. Implementado en la Entrega 2 (PR #26).» |

Comandos de referencia (ya ejecutados; sirven solo si hubiera que recrearlos en otro repositorio): `gh issue create --repo Jeple/Proyecto-IngenieraSoftware --title "<título de la tabla>" --body "<cuerpo de la tabla>" --label enhancement`. Verificar antes con `gh issue list --repo Jeple/Proyecto-IngenieraSoftware --search "US-17 OR US-22" --state all`.

Para agregarlos al tablero (requiere el scope `project`): `gh project item-add 6 --owner Jeple --url https://github.com/Jeple/Proyecto-IngenieraSoftware/issues/28` (repetir con `/29`). Si el scope no está, se hace con **Add items** en la UI (§6).

## 5. Comandos de API permitidos hoy (sin scope de proyecto)

```bash
# Snapshot reproducible de la tabla §2
gh issue list --repo Jeple/Proyecto-IngenieraSoftware --state all --limit 100 \
  --json number,title,state,createdAt,closedAt,labels

# Cerrar los Done que siguen abiertos SOLO si el equipo asume la verificacion formal; si no, dejar In Review
for n in 7 8 11 12 20 21 28 29; do gh issue close "$n" --repo Jeple/Proyecto-IngenieraSoftware --reason completed --comment "Done: PR #26 fusionado en main y verificado el 15-nov (413/413, integracion 14/14, E2E 17/17)."; done

# Cierres no planificados (ya aplicados; dejan constancia si hubiera que repetirlos)
gh issue close 9  --repo Jeple/Proyecto-IngenieraSoftware --reason "not planned" --comment "El video del Sprint 1 se integra al de la Entrega 2 (#14)"
gh issue close 10 --repo Jeple/Proyecto-IngenieraSoftware --reason "not planned" --comment "Fuera del alcance firmado (documento de alcance, Entrega 2)"
gh issue close 13 --repo Jeple/Proyecto-IngenieraSoftware --reason "not planned" --comment "Fuera del alcance firmado; reemplazada por US-22 (despacho marcado por el personal)"

# Etiquetas (gh issue close no acepta --label: se agregan aparte)
gh issue edit 10 --repo Jeple/Proyecto-IngenieraSoftware --add-label "fuera-de-alcance"
gh issue edit 13 --repo Jeple/Proyecto-IngenieraSoftware --add-label "fuera-de-alcance"
gh issue edit 24 --repo Jeple/Proyecto-IngenieraSoftware --add-label "wont-este-semestre"

# Comentario de evidencia en un cerrado (los de #6, #18 y #19 ya lo tienen)
gh issue comment 6 --repo Jeple/Proyecto-IngenieraSoftware --body "PR #26 fusionado en main y verificado con 413/413 pruebas + integracion 14/14. Se mantiene cerrado."

# Verificación posterior
gh issue list --repo Jeple/Proyecto-IngenieraSoftware --state open --limit 30
```

## 6. Pasos en la UI del tablero (capturas «antes» y «después»)

1. Abrir <https://github.com/users/Jeple/projects/6/views/1> y **capturar la vista actual** (`tablero-antes.png`) sin mover nada: es la prueba de que la evidencia no se reconstruyó después.
2. **Renombrar las iteraciones** para que coincidan con el Inception: *Project → Settings → Iteration* → Sprint 0 (Inception), Sprint 1 (hasta 16-oct), Sprint 2 (hasta 15-nov), Sprint 3 (hasta el examen). El tablero numeraba corrido un sprint más; corregirlo es parte de la evidencia.
3. **Traer #28 y #29:** `+ Add items` → buscar `US-17` y `US-22` → agregarlos; asignar iteración **Sprint 2** y estado **Done**.
4. **Filtrar por iteración Sprint 2** (vista de tabla y vista de board) y mover las tarjetas según el §3: Done para #6, #7, #8, #11, #12, #18, #19, #20, #21, #28 y #29; In Progress para #14. Cada tarjeta que se mueva queda «por confirmar en la UI» hasta que se vea en pantalla.
5. Revisar Sprint 1 (#6, #7, #8, #19), Sprint 0 (#3, #4, #5) y Sprint 3 (#15, #16, #17): cada tarjeta en su iteración, sin huérfanas.
6. **#9, #10 y #13** ya están cerrados como no planificados; si el tablero los muestra en Done, es correcto. #24 queda en Backlog con `wont-este-semestre`. #1 y #2: eliminarlos del proyecto si aparecen como tarjetas.
7. **Capturar la vista final** (`tablero-despues.png`) con el mismo filtro, la misma vista y el mismo tamaño de ventana que la captura «antes». Si se puede, agregar una tercera captura de *Settings → Iteration* donde se lean los nombres Sprint 0/1/2/3.
8. Guardar las tres imágenes en la carpeta del equipo `Entrega 2/capturas/` y adjuntarlas al informe (sección de gestión ágil) y al [checklist](checklist-entrega-2.md).

## 7. Checklist de capturas del tablero

| Captura | Qué debe verse | Qué NO debe verse | Nombre sugerido |
|---|---|---|---|
| Tablero antes | Vista de tabla o board con las columnas Backlog/Ready/In Progress/In Review/Done y las tarjetas aún sin mover; fecha visible (reloj del sistema) | Correo/avatar de la cuenta, notificaciones, marcadores, pestañas personales, tokens | `tablero-antes.png` |
| Tablero después | Misma vista y filtro, con las 11 historias en Done y #14 en In Progress | Lo mismo que arriba | `tablero-despues.png` |
| Iteraciones | *Settings → Iteration* con Sprint 0/1/2/3 renombrados y sus fechas | Nombres o correos de integrantes en la lista de miembros | `tablero-iteraciones.png` |
| Detalle de una tarjeta | Una tarjeta Done (#28 o #29) con su iteración Sprint 2 y su enlace al issue | Datos de la cuenta y menús abiertos | `tablero-tarjeta-us17.png` |

**Cómo evitar datos personales:** usar una ventana limpia (perfil de navegador sin extensiones ni sesiones personales), ocultar la barra de marcadores y las notificaciones del sistema, no capturar la barra de direcciones si incluye parámetros de sesión, y no abrir *Settings → Secrets* ni el perfil de la cuenta. El tablero solo contiene títulos de issues: no hay RUT, direcciones ni `chat_id` que difuminar, pero sí correos/avatares en la esquina superior derecha (recortarlos).

## 8. Criterio de aceptación de la evidencia

- [ ] Las **11 historias fusionadas están en Done una vez adjuntas las capturas y registrada la verificación**: US-04 (#6), US-05 (#7), US-06 (#8), US-09 (#11), US-10 (#12), US-20 (#18), T-01 (#19), US-21 (#20), T-02 (#21), US-17 (#28) y US-22 (#29). Si falta alguna captura, la tarjeta puede quedar en In Review y se anota la razón.
- [ ] **#28 y #29 creados**, agregados al proyecto y en la iteración Sprint 2.
- [ ] **#9, #10 y #13 cerrados como no planificados**; #10 y #13 con `fuera-de-alcance`; #24 con `wont-este-semestre`.
- [ ] Iteraciones renombradas **Sprint 0/1/2/3** y cada tarjeta en su iteración (sin tarjetas huérfanas ni duplicadas).
- [ ] **`tablero-antes.png` y `tablero-despues.png`** adjuntas, misma vista y mismo filtro, sin datos personales.
- [ ] #14 queda **In Progress** con nota de que solo falta el video; #15/#16/#17 en Sprint 3.
- [ ] La captura «después» coincide con el §3; cualquier diferencia se anota al pie («por confirmar en la UI»).

## 9. Referencias

- Plan y trazabilidad: [`paquete-final.md`](paquete-final.md) §4 · [`backlog-actualizado.md`](backlog-actualizado.md) · [`checklist-entrega-2.md`](checklist-entrega-2.md) · [`runbook-cierre-entrega-2.md`](runbook-cierre-entrega-2.md) §4 · Evidencia de la verificación: [`2026-11-15-17-27-resumen.md`](../evidencia/pruebas-unitarias/2026-11-15-17-27-resumen.md) (413/413) · [`e2e-2026-11-09-22-10.md`](../evidencia/e2e/e2e-2026-11-09-22-10.md) (17/17) · [`ci-2026-11-15.md`](../evidencia/integracion/ci-2026-11-15.md) (CI en verde).
