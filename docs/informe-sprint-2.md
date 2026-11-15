# Informe de Sprint 2 — Entrega 2

## Sistema de IA Omnicanal para la Farmacia Comunitaria de Peñalolén

| Versión | Fecha | Autores | Cambios |
|---|---|---|---|
| 1.0 | 15-nov-2026 | Equipo del proyecto (Grupo 10) | Versión inicial del informe de la Entrega 2 |

**Curso:** TICS331 — Ingeniería de Software · Semestre 2-2026 · Grupo 10
**Repositorio:** <https://github.com/Jeple/Proyecto-IngenieraSoftware>
**Tablero:** [GitHub Project #6](https://github.com/users/Jeple/projects/6/views/1)
**Entrega:** WebC, domingo 15 de noviembre de 2026, 23:30

> **Aviso de datos sintéticos.** Todos los datos, mensajes, RUT, direcciones, recetas y capturas de este informe son sintéticos. No se usaron datos reales de vecinos ni de la farmacia (Ley 19.628). Los reportes automáticos enmascaran los `chat_id`.

---

## 1. Resumen ejecutivo

La Farmacia Comunitaria de Peñalolén atiende a **43.089 usuarios inscritos** y emite **39.212 boletas al año**, pero el **81 % de las transacciones sigue siendo presencial**. El vecino debe revisar una planilla estática sin buscador por principio activo, el personal responde a mano consultas repetitivas y las reservas verbales no descuentan stock en tiempo real, lo que produce sobreventas y demoras de 2 a 7 días hábiles en el despacho.

El Sprint 2 convirtió el prototipo del Sprint 1 en un incremento operativo sobre Telegram, n8n 2.44.2 y Google Sheets, con **costo de infraestructura $0 USD (RNF-05)**: un único webhook y router de intenciones, reserva con código `#FAR-XXXX`, receta con aprobación farmacéutica, expiración a las 12 h, estado por RUT o código y despacho marcado por el personal. Se validó con **413/413 pruebas automáticas**, **14/14 casos de integración** con n8n real, **17/17 casos E2E** y **0 sobreventas** en 5 reservas simultáneas sobre stock 3. La consulta de punta a punta cumple la meta de latencia: **p95 2.110 ms < 2.500 ms**. Quedan deudas declaradas: escrituras sin transacción, carga de 20 reservas, capturas de aceptación y CA-08 desde un segundo teléfono.

---

## 2. Objetivo del Sprint 2 y alcance firmado

**Objetivo del sprint:** dejar funcionando en n8n 2.44.2 real el recorrido completo del vecino por Telegram, con el estado operativo en Google Sheets, un solo punto de entrada y las salvaguardas clínicas y de privacidad comprometidas, sin salir de la capa gratuita.

### 2.1 Alcance Must (firmado)

| Historia | Capacidad comprometida | Workflow |
|---|---|---|
| US-04 | Consulta de stock y precio con búsqueda difusa | `workflows/US-04-consulta-stock.json` |
| US-05 | Reserva con código `#FAR-XXXX` y descuento inmediato de stock | `workflows/US-05-reserva.json` |
| US-06 | Estado del pedido por RUT o código, solo para el titular | `workflows/US-06-trazabilidad.json` |
| US-09 | Receta por foto en Telegram y aviso al químico farmacéutico | `workflows/US-09-recetas-telegram.json` |
| US-10 | Liberación automática a las 12 h (cron horario) | `workflows/US-10-cron-expiracion.json` |
| US-17 | Router de intenciones con un único webhook | `workflows/US-17-router-telegram.json` |
| US-20 | Aprobación o rechazo farmacéutico de recetas | `workflows/US-20-aprobacion-recetas.json` |
| US-21 | Observabilidad, alertas y recuperación | `workflows/US-21-alertas-errores.json` |
| US-22 | Despacho marcado por el personal (`en ruta` / `entregado`) | `workflows/US-22-despacho-personal.json` |
| T-01 | Modelo de identidad y titularidad por `chat_id` | `docs/identidad-roles.md` |
| T-02 | E2E y gate de release del MVP | `docs/plan-pruebas-aceptacion.md` |
| US-12 | Informe y video del Sprint 2 | Este informe |

### 2.2 Fuera de alcance (Won't de este semestre)

| Elemento | Estado | Motivo |
|---|---|---|
| Agente telefónico de voz (US-08) | Fuera del alcance firmado | Requiere proveedor de voz y no aporta lógica de negocio propia |
| Canal WhatsApp (issue #24) | Adaptador futuro | Exige cuenta verificada de Meta, número de la Municipalidad y mensajes pagados; rompe RNF-05 |
| PWA del conductor con ETA/OSRM (US-11 y backend US-18) | Prototipo en modo demostración | Sin backend de despachos; la función se cubrió con US-22 |
| Recetas por correo IMAP (US-19) | Postergado | `workflows/US-09-recetas-email.json` existe, pero no se publica ni se configura este semestre |
| Panel de administración web (US-16) | Fuera del alcance | La planilla y el editor de n8n cumplen ese rol en el prototipo |

---

## 3. Historias completadas y pendientes reales

### 3.1 Incremento entregado (con evidencia)

La tabla distingue el estado técnico del estado formal. **No se declara Done lo que sigue en revisión**: la Definition of Done exige, además de código y pruebas, el merge a `main` y la verificación por una persona distinta de quien desarrolló.

| US | Qué quedó funcionando | Evidencia | Estado honesto |
|---|---|---|---|
| US-01 | Esquema de datos, catálogo dinámico y 16 medicamentos sintéticos | PR #22; `docs/google-sheets-schema.md`; `scripts/local/cargar-catalogo.mjs` | **Done** |
| US-02 | CI/CD y despliegue de n8n con Docker y Cloudflare Tunnel | PR #23; CI en verde; versiones fijadas | **Done** |
| US-03 | Informe de Inception y arquitectura | Entregado en WebC | **Done** |
| US-04 | Consulta difusa tolerante a errores, saldo neto y bioequivalentes | `scripts/test-fuzzy-match.mjs` (32); E2E CA-01 a CA-03 (17/17) | In Review (DoD: verificación de otro integrante y capturas) |
| US-05 | Reserva con código, `stock_reservado +cantidad`, despacho y guarda de duplicados | `scripts/test-reserva.mjs` (79); E2E CA-04 a CA-06 y CA-20 | In Review |
| US-06 | Estado por RUT o `#FAR-XXXX`, exclusivamente desde el chat titular | `scripts/test-trazabilidad.mjs` (18); E2E CA-07 y CA-08 | In Review |
| US-09 | Foto de receta a Drive con OAuth2, `ordenes.url_receta` y aviso al farmacéutico sin RUT | `scripts/test-recetas-telegram.mjs` (28); prueba manual real `docs/evidencia/e2e/manual-receta-2026-11-09.md` | In Review |
| US-10 | Expiración a 12 h, liberación de stock y aviso; comando `revisar vencidos` | `scripts/test-cron-expiracion.mjs` (13); E2E CA-16 | In Review |
| US-17 | Un único webhook `/webhook/telegram-bot`, normalización, reglas, derivación y respuestas clínicas | `scripts/test-router.mjs` (70); integración 14/14 | In Review |
| US-20 | Aprobación y rechazo con lista blanca, idempotencia y bitácora con actor | `scripts/test-aprobacion.mjs` (19); E2E CA-14 y CA-15; receta manual | In Review |
| US-21 | Alerta al equipo y aviso al vecino ante fallas; `errorWorkflow` de los 9 flujos | `scripts/test-alertas.mjs` (10); INT-10 a INT-14; E2E CA-19 | In Review |
| US-22 | `en ruta` y `entregado` con guarda por estado y descuento final una sola vez | `scripts/test-despacho.mjs` (38); E2E CA-17 y CA-18 | In Review |
| T-01 | Titularidad por chat, listas blancas y mensajes indistinguibles para terceros | `docs/identidad-roles.md`; `test-trazabilidad` 16–18; CA-08 simulado | In Review (falta segundo teléfono real) |
| T-02 | Plan de aceptación de 21 casos y E2E automatizado de 17 | `docs/plan-pruebas-aceptacion.md`; `docs/evidencia/e2e/e2e-2026-11-09-22-10.md` | In Review (falta el gate E2E en la CI) |
| US-12 | Informe del Sprint 2 y guion de video | Este documento | In Progress |

**Resultado verificable:** 413/413 pruebas automáticas, 14/14 integración, 17/17 E2E y 21/21 casos de aceptación ejecutados el 9-nov-2026. La corrida E2E anterior (15/17) detectó el defecto D-18 (estado por RUT/código), corregido y vuelto a probar.

### 3.2 Deudas y pendientes reales

| Deuda | Qué implica | Mitigación actual | Plan |
|---|---|---|---|
| Escrituras sin transacción (US-05, US-20, US-22) | Si una escritura falla a mitad de camino, la planilla queda en estado parcial; el E2E lo materializó con cuota agotada (pedido ENTREGADO sin descontar stock) | 3 reintentos por nodo de Sheets; alerta US-21; `verify_reservation` en US-05 | Compensación y reconciliación contra la bitácora en el Sprint 3 |
| Carga de 20 reservas (US-13) | La evidencia de concurrencia cubre 5 reservas simultáneas sobre stock 3, no la carga objetivo | Serialización de ejecuciones (ADR-07) y 0 sobreventas medido | Prueba de 20 reservas en el Sprint 3 |
| Capturas de aceptación | La tabla del plan referencia `cap-02` a `cap-19`, `cap-n8n`, `cap-bitacora` y `cap-ci`, que aún no se han tomado | E2E y reportes fechados en `docs/evidencia/` | Capturas con datos sintéticos y *execution id* antes de la entrega |
| CA-08 desde un segundo teléfono | La titularidad está probada con un segundo chat simulado, no con un teléfono real | Regla implementada y probada en `test-trazabilidad` | Repetición manual y captura |
| Buscador difuso duplicado | US-04 y US-05 tienen copias del matcher porque n8n no importa módulos locales | *Drift guard* de `scripts/test-reserva.mjs` | Unificar cuando se habilite la *allowlist* de n8n |
| Tono mixto | Los flujos del Sprint 1 usan «tú» y los nuevos «usted» | Sin impacto funcional | Unificación en US-14 |
| Cobertura de nodos Code (Q15) | 19/23 nodos (83 %), bajo la meta de 90 % | E2E cubre los 4 nodos de mapeo de US-10 | Completar pruebas en el Sprint 3 |

---

## 4. Demostración del incremento: recorrido del vecino

La demo se ejecuta en el entorno local con datos sintéticos, según `docs/guia-instalacion-local.md` y `docs/plan-pruebas-aceptacion.md`. Los tiempos provienen del reporte E2E del 9-nov-2026 (`docs/evidencia/e2e/e2e-2026-11-09-22-10.md`) y de la medición de latencia.

| # | El vecino escribe o hace | Resultado observado | Medición |
|---|---|---|---|
| 1 | `/start` | El bot se presenta como asistente virtual y muestra el menú | 402 ms |
| 2 | `hola, ¿hay pregavalina 75?` | «Pregalex 75 mg — $8.990 c/u. Stock disponible: 0 unidades. Producto agotado temporalmente. Bioequivalentes…» y sugiere Neurogab 75 mg | 1.510 ms |
| 3 | `losartan 50` | «Losarmed 50 mg — $4.990 c/u. Stock disponible: 92 unidades.» | 1.749 ms |
| 4 | `reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto` | Reserva confirmada con `#FAR-0001`, plazo de 12 h, `PENDIENTE_RECETA`, reservado +1, bitácora `RESERVA_ALTA` y fila `PENDIENTE` en despachos | 7.839 ms |
| 5 | Foto «RECETA DE PRUEBA» con pie `#FAR-0001` | Receta en Drive, `url_receta` y `fecha_receta` llenas, estado `RECETA_RECIBIDA`; aviso al farmacéutico con enlace y sin RUT | Manual, camino real |
| 6 | `aprobar FAR-0001` (farmacéutico) | Estado `EN_PREPARACION`; aviso al vecino y confirmación al farmacéutico; bitácora `RECETA_APROBADA` con actor `farmaceutico:` | E2E CA-14 |
| 7 | `estado 11.111.111-1` | «Tu pedido #FAR-0002 está en preparación en bodega. Sector: Peñalolén Alto.» | E2E CA-07 |
| 8 | `revisar vencidos` (personal) | Pedido vencido `#FAR-0900` pasa a `CANCELADO_EXPIRADO` y libera stock | 5.215 ms |
| 9 | `en ruta FAR-0001` | Estado `EN_RUTA`; el vecino recibe «Su pedido #FAR-0001 va en camino…» | E2E CA-17 |
| 10 | `entregado FAR-0001` | Estado `ENTREGADO`; `stock_real` 65→64 y `stock_reservado` 1→0 una sola vez; repetir el comando no cambia nada | E2E CA-18 |
| 11 | `me duele el pecho` | «Si es una urgencia, llame ahora al SAMU 131 o acuda al SAPU más cercano…»; sin consejo médico | 242 ms |
| 12 | Falla simulada de un subflujo | El vecino recibe «Tuvimos un problema…» y el administrador una alerta de US-21 | E2E CA-19 |

**Consulta de punta a punta (CA-21):** 20 consultas en serie con la planilla real, **p50 1.656 ms, p95 2.110 ms, máximo 2.211 ms**, por debajo de la meta de 2.500 ms. Las operaciones que escriben tardan entre 5 y 20 s; es una limitación conocida de la lectura/escritura de Sheets desde n8n y una deuda para el Sprint 3.

## 5. Decisiones de diseño principales

El registro completo está en [`docs/entrega-2/decisiones-diseno.md`](./entrega-2/decisiones-diseno.md). Estas son las decisiones que explican la forma del incremento:

| Decisión | Contenido | Consecuencia principal |
|---|---|---|
| **Telegram como canal** (ADR-02) | Telegram Bot API en lugar de WhatsApp Business | Canal gratuito y sin cuenta verificada; la lógica no depende del canal y WhatsApp queda como adaptador futuro (#24) |
| **Router único** (ADR-05) | Un solo webhook `/webhook/telegram-bot`; el router clasifica y deriva con *Execute Workflow* | Un bot de Telegram admite un solo webhook; se elimina la superficie de cinco URLs públicas y cada subflujo revalida el secreto |
| **Grounding sin LLM en las respuestas** (ADR-03) | Ningún modelo redacta nombres, precios ni stock; todo sale de la planilla; Gemini, si existe, solo elige una etiqueta de una lista cerrada (ADR-06) | Cero alucinaciones por construcción; las frases muy libres dependen de la normalización del router |
| **Idempotencia por estado de origen** (ADR-09 y `docs/ciclo-vida-pedido.md`) | Cada transición valida el estado actual; el comando repetido no vuelve a escribir ni a descontar stock | Sheets no tiene transacciones: la guarda de estado y la bitácora reemplazan parte de esa garantía |
| **OAuth2 para recetas en Drive** (ADR-13) | La cuenta de servicio no puede subir a Drive (cuota 0); US-09 usa OAuth2 a una carpeta privada del responsable | Funciona con Gmail; en producción se usaría una unidad compartida de Workspace; en modo prueba hay que reconectar cada 7 días |
| **Serialización de ejecuciones** (ADR-07) | `N8N_CONCURRENCY_PRODUCTION_LIMIT=1`, router que espera al subflujo y `max_connections=1` en Telegram | Se prioriza la consistencia sobre la latencia; con 10 mensajes simultáneos el p95 sube a 2.788 ms |
| **Configuración por `$env` y credencial con ID fijo** (ADR-08) | n8n 2.x no expone `process.env` en los nodos Code; se usa `$env`, expresiones con `=` y la credencial `farmaciaGoogleSA` | Los JSON no contienen secretos y las reglas estáticas impiden que el defecto vuelva |
| **B-01: seguridad de fórmulas** | La dirección es texto libre del vecino; se neutralizan los prefijos `=`, `+`, `-`, `@`, tab y CR antes de escribir, y `append_despacho` usa `cellFormat: RAW` | Evita inyección de fórmulas en Google Sheets; corregido en el commit `2c7aec8` (PR #26) |

---

## 6. Arquitectura y modelamiento

La arquitectura está documentada en [`docs/arquitectura.md`](./arquitectura.md). En una ejecución típica, Telegram entrega el mensaje por el túnel de Cloudflare al webhook del router; este valida el secreto, atiende urgencias y preguntas clínicas con textos fijos y deriva el resto al subflujo correspondiente. El subflujo vuelve a validar el secreto, lee o escribe Google Sheets y responde por el mismo canal. Las recetas se guardan en Drive y la planilla solo conserva su URL. El cron de expiración se dispara por reloj y no expone webhook.

| Vista | Fuente PlantUML | Exportados |
|---|---|---|
| Componentes | [`componentes.puml`](./entrega-2/diagramas/componentes.puml) | [`componentes.svg`](./entrega-2/diagramas/exportados/componentes.svg) · [`componentes.png`](./entrega-2/diagramas/exportados/componentes.png) |
| Despliegue | [`despliegue.puml`](./entrega-2/diagramas/despliegue.puml) | [`despliegue.svg`](./entrega-2/diagramas/exportados/despliegue.svg) · [`despliegue.png`](./entrega-2/diagramas/exportados/despliegue.png) |
| Estados del pedido | [`estados-pedido.puml`](./entrega-2/diagramas/estados-pedido.puml) | [`estados-pedido.svg`](./entrega-2/diagramas/exportados/estados-pedido.svg) · [`estados-pedido.png`](./entrega-2/diagramas/exportados/estados-pedido.png) |

Las **seis secuencias** del alcance son: consulta, reserva, trazabilidad, receta y aprobación, expiración y despacho.

| Secuencia | Fuente | Exportado |
|---|---|---|
| Consulta de stock | [`secuencia-consulta.puml`](./entrega-2/diagramas/secuencia-consulta.puml) | [`secuencia-consulta.svg`](./entrega-2/diagramas/exportados/secuencia-consulta.svg) |
| Reserva | [`secuencia-reserva.puml`](./entrega-2/diagramas/secuencia-reserva.puml) | [`secuencia-reserva.svg`](./entrega-2/diagramas/exportados/secuencia-reserva.svg) |
| Trazabilidad | [`secuencia-trazabilidad.puml`](./entrega-2/diagramas/secuencia-trazabilidad.puml) | [`secuencia-trazabilidad.svg`](./entrega-2/diagramas/exportados/secuencia-trazabilidad.svg) |
| Receta y aprobación | [`secuencia-receta-aprobacion.puml`](./entrega-2/diagramas/secuencia-receta-aprobacion.puml) | [`secuencia-receta-aprobacion.svg`](./entrega-2/diagramas/exportados/secuencia-receta-aprobacion.svg) |
| Expiración | [`secuencia-expiracion.puml`](./entrega-2/diagramas/secuencia-expiracion.puml) | [`secuencia-expiracion.svg`](./entrega-2/diagramas/exportados/secuencia-expiracion.svg) |
| Despacho | [`secuencia-despacho.puml`](./entrega-2/diagramas/secuencia-despacho.puml) | [`secuencia-despacho.svg`](./entrega-2/diagramas/exportados/secuencia-despacho.svg) |

La máquina de estados tiene **7 estados canónicos** (`PENDIENTE_RECETA`, `RECETA_RECIBIDA`, `EN_PREPARACION`, `EN_RUTA`, `ENTREGADO`, `CANCELADO_EXPIRADO`, `RECHAZADO`) y **8 transiciones autorizadas**, documentadas con actor, precondición, efecto en stock y bitácora en [`docs/ciclo-vida-pedido.md`](./ciclo-vida-pedido.md). Los diagramas no se regeneraron para este informe: se enlazan los .puml y los exportados versionados.

---

## 7. Atributos de calidad ISO/IEC 25010

La ficha completa, con fórmula, herramienta y frecuencia, está en [`docs/entrega-2/calidad-iso25010.md`](./entrega-2/calidad-iso25010.md). Se priorizaron adecuación funcional, seguridad y eficiencia de desempeño, con usabilidad, confiabilidad y mantenibilidad como apoyo.

| # | Característica / métrica | Meta | Medición real (9-nov-2026) | Evidencia |
|---|---|---|---|---|
| Q1 | Exactitud de la búsqueda de medicamentos | ≥ 98 % | **100 % (50/50)** con router; 80 % (40/50) sin normalización | `docs/evidencia/calidad/medicion-busqueda.json` |
| Q2 | Productos inventados en las respuestas | 0 | **0** (5/5 consultas fuera de catálogo respondieron «No encontré») | Diseño ADR-03; E2E CA-03 |
| Q3 | Sobreventas tras reservas simultáneas | 0 | **0** con 5 reservas sobre stock 3; reservado final 3 = suma (2+1); 3 rechazadas | `docs/evidencia/rendimiento/concurrencia-2026-11-09-22-07.json` |
| Q4 | Casos de aceptación Must cumplidos | 100 % | **21/21** casos del plan ejecutados; 17/17 automáticos y la receta a mano | `docs/plan-pruebas-aceptacion.md` |
| Q5 | Mensajes sin secreto válido procesados | 0 | **0** (INT-01, INT-02 y CA-11 los descartan) | `integracion-2026-11-09-22-16.json` |
| Q6 | Fugas de titularidad entre chats | 0 | **0** en pruebas y E2E con segundo chat simulado | `test-trazabilidad` 16–18; CA-08 |
| Q7 | Secretos o datos reales en el repositorio | 0 | **0**; `check_secrets.sh` OK en local y CI | CI; `scripts/check_secrets.sh` |
| Q9 | Latencia del router sin planilla (p95) | < 2.500 ms | **310 ms** en serie (30 mensajes); 2.788 ms con 10 simultáneos | `integracion-2026-11-09-22-16.json` |
| Q10 | Latencia de consulta con planilla real (p95) | < 2.500 ms | **2.110 ms** (p50 1.656 ms; máx. 2.211 ms; 20/20) | `latencia-e2e-2026-11-09-22-06.json` |
| Q14 | Pruebas automáticas en verde | 100 % | **413/413** en 14 suites | `docs/evidencia/pruebas-unitarias/2026-11-09-22-21-resumen.md` |
| Q15 | Nodos Code con pruebas | ≥ 90 % | **83 % (19/23)**, bajo la meta; faltan 4 nodos de mapeo de US-10 | `docs/entrega-2/calidad-iso25010.md` |
| Q16 | Tiempo de puesta en marcha | ≤ 30 min | Arranque sin credenciales desde copia limpia: n8n listo en 57 s, 9/9 flujos publicados; falta cronometrar con cuentas nuevas | `docs/guia-instalacion-local.md` |

**Lectura honesta:** las metas críticas de corrección, seguridad y latencia de consulta se cumplen; Q15 y Q16 quedan parcialmente cumplidas y se declaran como deuda. La medición de Q1 es preliminar porque usa un set sintético de 50 consultas.

---

## 8. Estrategia y evidencia de pruebas

La estrategia combina pruebas ágiles en cada push, priorización por riesgo (salud, sobreventa, privacidad y consejo clínico) y conversión temprana de los criterios BDD en casos de aceptación. El detalle está en [`docs/entrega-2/estrategia-pruebas.md`](./entrega-2/estrategia-pruebas.md).

| Nivel | Alcance | Resultado | Herramienta |
|---|---|---|---|
| Unitarias | Funciones de los nodos Code: búsqueda, reserva, estados, *parsers*, router | **413/413** en 14 suites | `scripts/test-*.mjs` |
| Contrato | Que lo que entrega el router lo entiendan los *parsers* reales | **13** casos | `test-router.mjs`, bloques 5 y 6 |
| Estáticas de plataforma | `$env`, expresiones, credenciales, versiones, webhook único, imagen fijada | **39** reglas | `test-workflows-n8n.mjs` |
| Integración | n8n 2.44.2 real con 9 flujos importados y publicados, Telegram simulado | **14/14** | `scripts/local/prueba-integracion.mjs` |
| Sistema / E2E | Bot, Google Sheets y Drive reales | **17/17** automáticos + receta manual | `scripts/local/e2e.mjs`; `docs/evidencia/e2e/` |
| Rendimiento | p50/p95 del router y de la consulta real | p95 310 ms (router) y 2.110 ms (consulta) | `prueba-integracion.mjs`; `medir-latencia.mjs` |
| Concurrencia | 5 reservas simultáneas sobre stock 3 | **0 sobreventas**, 0 actualizaciones perdidas | `prueba-concurrencia.mjs` |

**Comandos para reproducir** (Node ≥ 18; Docker para integración):

```bash
node scripts/correr-pruebas.mjs                 # 413/413 en 14 suites
bash scripts/check_secrets.sh                   # escaneo de secretos y RUT
node scripts/local/prueba-integracion.mjs       # 14/14 con n8n 2.44.2 real (Docker)
node scripts/local/e2e.mjs                      # 17/17 con cuentas reales y datos sintéticos
node scripts/local/medir-latencia.mjs --n 20    # CA-21: p95 < 2.500 ms
node scripts/local/prueba-concurrencia.mjs      # CA-20: 0 sobreventas
```

Los defectos D-01 a D-18 documentados en la estrategia muestran por qué la integración fue necesaria: las 266 pruebas del Sprint 1 estaban en verde y, aun así, ningún flujo habría funcionado en n8n real. Los defectos D-13 a D-18 solo aparecieron con la planilla y las cuentas reales.

---

## 9. Seguridad y riesgos

La matriz completa, con 18 riesgos STRIDE y evaluación inherente/residual, está en [`docs/entrega-2/matriz-riesgos-seguridad.md`](./entrega-2/matriz-riesgos-seguridad.md) y en [`matriz-riesgos-seguridad.xlsx`](./entrega-2/matriz-riesgos-seguridad.xlsx).

### 9.1 Resumen STRIDE

| Categoría | Riesgos representativos | Controles |
|---|---|---|
| **S** Suplantación | RS-01 (updates falsos al webhook), RS-02 (comandos de personal desde chat ajeno) | Secreto `X-Telegram-Bot-Api-Secret-Token` validado en router y subflujos; una sola URL pública; lista blanca de `chat_id` |
| **T** Manipulación | RS-09 (reservas simultáneas), RS-10 (edición manual de la planilla), RS-16 (cambio malicioso de un flujo) | Serialización de ejecuciones; bitácora reconstruible; PR con revisión, CI y versiones fijadas |
| **R** Repudio | RS-11 (actor niega una aprobación o entrega) | Bitácora de solo inserción con `estado_anterior`, `estado_nuevo` y `actor` |
| **I** Divulgación | RS-03 (pedido ajeno), RS-04 (foto de receta), RS-05 (secretos), RS-06 (historial de n8n), RS-07 (Telegram), RS-08 (Gemini) | Titularidad por chat; Drive privado con OAuth; `.gitignore` y escaneo; historial con poda a 7 días; minimización; Gemini opcional |
| **D** Denegación | RS-12 (ráfaga), RS-13 (túnel caído), RS-14 (cuota de Sheets) | Serialización; re-registro de webhook; `executeOnce`; 3 reintentos; alertas |
| **E** Elevación | RS-15 (acceso al editor de n8n) | n8n solo en `127.0.0.1`; usuario local; credenciales cifradas |

**Niveles:** inherente 6 críticos, 6 altos, 6 medios; residual 0 críticos, 3 altos, 9 medios y 6 bajos. Los residuales altos son RS-04 (fuga de receta), RS-09 (sobreventa con carga alta) y RS-17 (consejo clínico), priorizados en el Sprint 3.

### 9.2 Salvaguardas clínicas y de privacidad

- **Sin consejo médico:** el router responde con textos fijos ante urgencias, autolesión, dosis y diagnósticos; deriva al **SAMU 131** y a la línea **\*4141** (RNF-08).
- **Titularidad:** solo el chat que creó el pedido consulta su estado o adjunta su receta; un tercero recibe exactamente el mismo mensaje que para un pedido inexistente.
- **Secreto de webhook fail-closed:** sin encabezado válido el mensaje se descarta sin respuesta (INT-01, INT-02, CA-11).
- **Recetas:** se guardan en una carpeta privada de Drive con OAuth; la planilla solo registra la URL y el aviso al farmacéutico no incluye el RUT.
- **Alertas:** US-21 nunca incluye credenciales, RUT, direcciones ni recetas.

### 9.3 Hallazgo B-01 corregido

La revisión del PR #26 detectó una **inyección de fórmulas** en `despachos.direccion`: la dirección es texto libre del vecino y, al comenzar con `=`, `+`, `-` o `@`, Google Sheets podía interpretarla como fórmula. La corrección (`commit 2c7aec8`) neutraliza esos prefijos —además de tabulador y retorno de carro— antes de escribir y configura `append_despacho` con `cellFormat: RAW`. La corrección viajó en el PR #26 y su CI quedó en verde: <https://github.com/Jeple/Proyecto-IngenieraSoftware/actions/runs/43741247756>.

---

## 10. Gestión ágil y control de configuración

El detalle está en [`docs/entrega-2/backlog-actualizado.md`](./entrega-2/backlog-actualizado.md) y [`docs/entrega-2/control-configuracion.md`](./entrega-2/control-configuracion.md).

- **Backlog reconciliado:** la numeración oficial es US-01 a US-15 (60 SP del Inception); US-16 a US-22 son historias nuevas con estimación propuesta por el PO. Se mapearon los issues #1 a #25 y se dejó una sola fuente de verdad para el tablero.
- **Definition of Done:** criterios cumplidos y verificados por otra persona, pruebas de caminos principales y de error en verde, PR revisado e integrado a `main`, E2E ejecutado y sin incumplir RNF. Por eso varias historias figuran **In Review** y no Done.
- **Velocidad:** al 9-nov la velocidad registrada era 0 SP porque la DoD exige merge y verificación. Con los PR #25 y #26 fusionados, el equipo puede registrar hasta 41 SP como Done una vez completada la verificación de otro integrante y las capturas; este informe no adelanta esa cifra.
- **Tablero #6:** contiene los issues del proyecto; la evidencia de avance incluye capturas **antes/después** pendientes. El tablero no se actualizó por API en esta sesión; el plan de cambios está en [`docs/entrega-2/paquete-final.md`](./entrega-2/paquete-final.md) §4.
- **Ramas:** al cierre del sprint, el remoto quedó con **solo `main`**; las ramas `feature/*` se eliminaron tras fusionar los PR. Los cambios de documentación de este informe se integran por una rama corta que vuelve a `main` por PR revisado. `develop` nunca se creó y la desviación está documentada.
- **Pull requests fusionados:** **#25** (prototipo de los Sprints 1 y 2), **#26** (router, despacho, entorno local, pruebas y seguridad B-01) y **#27** (documentación de cierre y checklist).
- **Líneas base:** tags **`v0.1-sprint1`** (prototipo del Sprint 1) y **`v0.2-sprint2`** (incremento del Sprint 2) publicados en el remoto.
- **CI en verde:** `main` en <https://github.com/Jeple/Proyecto-IngenieraSoftware/actions/runs/43741739314>; PR #26 en <https://github.com/Jeple/Proyecto-IngenieraSoftware/actions/runs/43741247756>. Jobs `validate-json` e `integracion-n8n`.
- **Reproducibilidad:** n8n 2.44.2, cloudflared 2026.10.1, PlantUML 1.2026.9, Node 20 en CI, runner `ubuntu-24.04` y fin de línea LF. `check_secrets.sh` y las reglas 9a–9c de `test-workflows-n8n.mjs` controlan que no se filtren secretos.

---

## 11. Aprendizajes del sprint

1. **n8n 2.x no es n8n 1.x en los nodos Code.** `process.env` no existe en el *sandbox*: el secreto nunca coincidía y todos los mensajes se descartaban en silencio. La corrección fue `$env` con `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, y una regla estática para que no vuelva.
2. **Un bot de Telegram admite un solo webhook.** El diseño con cinco webhooks era inviable; el router único con *Execute Workflow* simplificó la operación, redujo la superficie pública y permitió probar cada subflujo por separado.
3. **La idempotencia se diseña, no se improvisa.** En una base sin transacciones como Sheets, el estado de origen como guarda y la bitácora de solo inserción son lo que evita descuentos dobles y pérdidas de stock.
4. **La evidencia debe ser reproducible.** Los reportes fechados, los scripts de un solo comando y los datos sintéticos permitieron repetir el E2E y detectar que las 266 pruebas unitarias no garantizaban el funcionamiento en n8n real.
5. **La seguridad también está en los datos de entrada.** B-01 demostró que un campo de texto libre como la dirección puede convertirse en una fórmula; neutralizar prefijos y escribir con `cellFormat: RAW` es parte del diseño seguro de la integración.
6. **Los límites de la capa gratuita condicionan la arquitectura.** Las 60 lecturas por minuto de Sheets, la cuota 0 de Drive para cuentas de servicio y la latencia de 1 a 3 s por nodo obligaron a `executeOnce`, reintentos, OAuth y serialización; son restricciones reales, no detalles de implementación.

## 12. Limitaciones y trabajo futuro (Sprint 3)

| Línea de trabajo | Qué falta | Criterio de cierre |
|---|---|---|
| **US-13** Pruebas de estrés y consistencia | Carga de 20 reservas simultáneas; hoy la evidencia cubre 5 | 0 sobreventas y 0 actualizaciones perdidas con 20 reservas |
| **US-14** Hardening de prompts y seguridad clínica | Revisión de mensajes con un químico farmacéutico; unificar el tono «tú/usted» | Mensajes clínicos validados y sin consejo médico |
| **US-15** Demo final y examen | Guion, ensayo y presentación del incremento | Demo reproducible con datos sintéticos |
| Compensación transaccional | Escrituras sin transacción en US-05, US-20 y US-22 | Escribir el estado al final y reconciliar contra la bitácora; estado parcial detectable |
| Rendimiento de escrituras | Reserva, receta y despacho tardan entre 5 y 20 s | Lecturas en lote (`values:batchGet`), caché de catálogo, escrituras agrupadas y acuse inmediato |
| Evidencia humana | Capturas `cap-02` a `cap-19`, `cap-n8n`, `cap-bitacora` y `cap-ci`; CA-08 desde un teléfono real; *execution id* | Capturas y *execution id* incorporados al plan de aceptación |
| Video de la entrega | Grabación ≤ 5 min del incremento | Video no listado con enlace en WebC |
| Cobertura y calidad | Q15 83 % (meta 90 %); Q16 sin cronometrar con cuentas nuevas; buscador duplicado | Pruebas de los 4 nodos de US-10 y unificación del matcher |
| Riesgos residuales altos | RS-04 (receta), RS-09 (sobreventa con carga), RS-17 (consejo clínico) | Controles del Sprint 3 y revisión de la matriz |

**Limitaciones del prototipo:** funciona en el entorno local del equipo con un túnel rápido cuya URL cambia en cada arranque; la credencial OAuth de Drive en modo prueba exige reconexión cada 7 días; no hay identidad fuerte (contraseñas u OTP) ni límites de uso por chat; la PWA del conductor permanece en modo demostración y sin backend.

---

## 13. Anexos: índice de evidencia

| Evidencia | Ruta en el repositorio |
|---|---|
| Resumen de las 413 pruebas (14 suites) | [`docs/evidencia/pruebas-unitarias/2026-11-09-22-21-resumen.md`](./evidencia/pruebas-unitarias/2026-11-09-22-21-resumen.md) |
| Log completo de pruebas | [`docs/evidencia/pruebas-unitarias/2026-11-09-22-21-log.txt`](./evidencia/pruebas-unitarias/2026-11-09-22-21-log.txt) |
| Integración con n8n 2.44.2 real (14/14) | [`docs/evidencia/integracion/integracion-2026-11-09-22-16.json`](./evidencia/integracion/integracion-2026-11-09-22-16.json) |
| E2E automatizado (17/17) | [`docs/evidencia/e2e/e2e-2026-11-09-22-10.md`](./evidencia/e2e/e2e-2026-11-09-22-10.md) · [`e2e-2026-11-09-22-10.json`](./evidencia/e2e/e2e-2026-11-09-22-10.json) |
| Receta por foto, camino real | [`docs/evidencia/e2e/manual-receta-2026-11-09.md`](./evidencia/e2e/manual-receta-2026-11-09.md) |
| Latencia de consulta (CA-21) | [`docs/evidencia/rendimiento/latencia-e2e-2026-11-09-22-06.json`](./evidencia/rendimiento/latencia-e2e-2026-11-09-22-06.json) |
| Concurrencia (CA-20) | [`docs/evidencia/rendimiento/concurrencia-2026-11-09-22-07.json`](./evidencia/rendimiento/concurrencia-2026-11-09-22-07.json) |
| Calidad de búsqueda (Q1 y Q11) | [`docs/evidencia/calidad/medicion-busqueda.json`](./evidencia/calidad/medicion-busqueda.json) |
| Plan de aceptación (21 casos) | [`docs/plan-pruebas-aceptacion.md`](./plan-pruebas-aceptacion.md) |
| Estrategia de pruebas | [`docs/entrega-2/estrategia-pruebas.md`](./entrega-2/estrategia-pruebas.md) |
| Calidad ISO/IEC 25010 | [`docs/entrega-2/calidad-iso25010.md`](./entrega-2/calidad-iso25010.md) |
| Matriz de riesgos (MD y XLSX) | [`docs/entrega-2/matriz-riesgos-seguridad.md`](./entrega-2/matriz-riesgos-seguridad.md) |
| Decisiones de diseño (ADR) | [`docs/entrega-2/decisiones-diseno.md`](./entrega-2/decisiones-diseno.md) |
| Backlog actualizado | [`docs/entrega-2/backlog-actualizado.md`](./entrega-2/backlog-actualizado.md) |
| Control de configuración | [`docs/entrega-2/control-configuracion.md`](./entrega-2/control-configuracion.md) |
| Checklist de la Entrega 2 | [`docs/entrega-2/checklist-entrega-2.md`](./entrega-2/checklist-entrega-2.md) |
| Arquitectura | [`docs/arquitectura.md`](./arquitectura.md) |
| Ciclo de vida del pedido | [`docs/ciclo-vida-pedido.md`](./ciclo-vida-pedido.md) |
| Identidad y roles | [`docs/identidad-roles.md`](./identidad-roles.md) |
| Guía de instalación local | [`docs/guia-instalacion-local.md`](./guia-instalacion-local.md) |
| Workflows y convenciones | [`workflows/README.md`](../workflows/README.md) |
| Informe del Sprint 1 (formato) | [`docs/informe-sprint-1.md`](./informe-sprint-1.md) |
| CHANGELOG | [`CHANGELOG.md`](../CHANGELOG.md) |

**Enlaces del proyecto:** [repositorio](https://github.com/Jeple/Proyecto-IngenieraSoftware) · [tablero #6](https://github.com/users/Jeple/projects/6/views/1) · [CI de `main`](https://github.com/Jeple/Proyecto-IngenieraSoftware/actions/runs/43741739314) · [CI del PR #26](https://github.com/Jeple/Proyecto-IngenieraSoftware/actions/runs/43741247756).

---

*Fin del informe. Los datos de este documento son sintéticos y las cifras provienen de los archivos de evidencia enlazados.*
