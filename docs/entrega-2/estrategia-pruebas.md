# Estrategia de pruebas · Entrega 2

Siguiendo la clase 11, una estrategia de pruebas define **qué** se prueba, **cuándo** y **cómo**: niveles, tipos, herramientas, entornos, responsables y criterios de entrada y salida.

Combinamos tres enfoques:
- **Ágil/continua:** pruebas en cada push, en la CI.
- **Basada en riesgo:** el dominio es salud, así que se prioriza lo que puede dañar al vecino: datos inventados, sobreventas, fugas de privacidad y consejo clínico.
- **Proactiva:** los criterios BDD del Inception se convierten en casos de aceptación antes del E2E.

## 1. Niveles (pirámide de Cohn, adaptada)

| Nivel | Qué cubre | Herramienta | Cantidad al 9 de noviembre | Quién y cuándo |
|---|---|---|---|---|
| **Unitarias** | Funciones de los nodos Code: búsqueda difusa, reglas de reserva, transiciones de estado, *parsers*, clasificación del router | Scripts Node sin dependencias (`scripts/test-*.mjs`), que cargan el código desde el JSON versionado | 413 pruebas en 14 suites (incluye las de contrato y las estáticas) | Desarrollador, en cada cambio y en la CI |
| **Contrato** (integración lógica) | Que lo que entrega el router lo entiendan los *parsers* reales de US-04, US-05, US-06, US-20 y US-22 | `test-router.mjs`, bloques 5 y 6 | 13 | CI |
| **Estáticas de plataforma** | Reglas para que un flujo funcione en n8n 2.44.2 real: `$env`, expresiones, credenciales, versiones de nodo, webhook único, imagen fijada | `test-workflows-n8n.mjs` | 39 | CI |
| **Integración** | n8n real con los 9 flujos importados y publicados, y Telegram simulado: secreto, respuestas, derivación a subflujos, alertas US-21, degradación | `scripts/local/prueba-integracion.mjs` (Docker) | 14 casos (14/14) más la medición de latencia | CI (job `integracion-n8n`) y en local |
| **Sistema / E2E** | El recorrido completo con Telegram, Google Sheets y Drive reales | `docs/plan-pruebas-aceptacion.md` y `scripts/local/e2e.mjs` (17 casos automáticos) | 21 casos (CA-01 a CA-21): 21/21 el 9-nov | Equipo, antes de cada Sprint Review |
| **Aceptación** | Validación del negocio por el stakeholder | Demo y prueba con un funcionario (S-05) | Sprint 3 | PO y contraparte de la farmacia |

La base ancha es intencional: las pruebas unitarias son rápidas (en conjunto tardan alrededor de 1 s) y atrapan la mayoría de los defectos de lógica. Los defectos de **integración** que encontramos en esta entrega (ver la sección 6) muestran por qué hacía falta la capa media.

## 2. Tipos de prueba

| Tipo | Cómo se aplica | Evidencia |
|---|---|---|
| **Funcional** | Criterios BDD de cada historia convertidos en casos CA | Plan de aceptación |
| **Regresión** | Toda la suite corre en cada push; `test-mapa` y `test-panel` comparan byte a byte los HTML generados; el *drift guard* de `test-reserva` detecta si se separan las dos copias del buscador | CI |
| **Seguridad** | Validación del secreto (INT-01, INT-02; `test-router` 1a a 1e), titularidad (`test-trazabilidad` 16 a 18), lista blanca de comandos (`test-despacho` 1f a 1j), `check_secrets.sh` y la regla de credenciales sin datos | CI y E2E (CA-08, CA-11) |
| **Seguridad clínica** | Urgencias, autolesión, dosis y diagnósticos derivan a SAMU 131 o \*4141 sin consejo médico (RNF-08) | `test-router` bloque 3; INT-05 a INT-07 |
| **Rendimiento** | Latencia p50 y p95 del router en serie y con 10 mensajes simultáneos | `prueba-integracion.mjs` (sección 4) |
| **Concurrencia** | 0 sobreventas con reservas simultáneas (US-13) | Procedimiento en la sección 5 |
| **Humo** (*smoke test*) | `doctor.mjs` y el paso 7 de `levantar.mjs` | Salida del arranque |
| **Exploratoria** | Mensajes libres en el bot durante el E2E; los hallazgos se registran como issues | Plan de aceptación, sección 4 |

## 3. Entornos y datos

| Entorno | Para qué | Datos |
|---|---|---|
| Local, sin credenciales | Unitarias, contrato, estáticas | Fixtures dentro de cada suite |
| Contenedor desechable de n8n con Telegram simulado | Integración y latencia del router | Credencial falsa a propósito |
| Local con credenciales del integrante (túnel rápido) | E2E, latencia real y concurrencia | Planilla con el catálogo sintético (`cargar-catalogo.mjs`); RUT de prueba 11.111.111-1 y 22.222.222-2; dirección ficticia |
| CI (GitHub Actions) | Todo lo automatizable | Igual que en local, sin credenciales |

**Datos sintéticos siempre** (Ley 19.628): nada de RUT, teléfonos, direcciones ni recetas reales. La foto de «receta» es una hoja escrita que dice *RECETA DE PRUEBA*.

## 4. Criterios de entrada y salida

| Momento | Criterio de entrada | Criterio de salida |
|---|---|---|
| Push o PR | — | Suites unitarias, de contrato y estáticas al 100 %; `check_secrets` OK; integración 14/14 |
| E2E (antes del Sprint Review) | PR fusionado o rama congelada; `doctor` sin «FALTA»; catálogo cargado con `--reiniciar` | Todos los casos Must del plan en «Pasa» o con un defecto registrado y la decisión del PO; sin defectos críticos abiertos (datos inventados, sobreventa, fuga de datos, consejo clínico) |
| Release de sprint (tag) | E2E aprobado; el video grabado sobre esa versión | Historias en Done según la DoD; tag `v0.x-sprintN` |

**Severidad de los defectos:**
- **Crítico:** sobreventa, dato inventado, fuga de datos o consejo clínico. Bloquea el release.
- **Alto:** un flujo Must no funciona.
- **Medio:** un mensaje confuso o un caso borde.
- **Bajo:** un detalle de texto.

## 5. Prueba de concurrencia (US-13, primera iteración)

**Objetivo:** 0 sobreventas con reservas simultáneas.

**Control de diseño (ADR-07):** `N8N_CONCURRENCY_PRODUCTION_LIMIT=1`, un router que espera a cada subflujo y `max_connections=1` en Telegram.

**Evidencia disponible (9 de noviembre):**
- Sondeo de plataforma en n8n 2.44.2: 3 ejecuciones de producción enviadas a la vez se procesaron en serie, sin solaparse. Las respuestas HTTP llegaron a los 0,46 s, 2,35 s y 4,04 s.
- Integración: con 10 mensajes simultáneos, todos se atendieron (10/10), con p95 de 2.645 ms.

**Procedimiento con la planilla real** (`node scripts/local/prueba-concurrencia.mjs`, CA-20):
1. Deje Celoxib 200 mg (`MED-0009`) con `stock_real = 3` y `stock_reservado = 0`.
2. Envíe a la vez **5 reservas de 1, 2, 3, 4 y 5 unidades** desde chats distintos, como *updates* firmados al webhook.
3. **Resultado esperado:** solo se confirman las reservas que caben en el stock; `stock_reservado` nunca supera 3 y es igual a la suma de las reservas creadas; una fila `RESERVA_ALTA` por reserva.

**Resultado del 9 de noviembre:** se crearon 2 reservas (#FAR-0901 con 2 unidades y #FAR-0902 con 1) y se rechazaron las otras 3. `stock_reservado` quedó en 3, igual a la suma, con 2 filas en la bitácora: **sobreventa 0 y ninguna actualización perdida**. Tardó 47 s porque las ejecuciones se atienden en fila (`docs/evidencia/rendimiento/concurrencia-2026-11-09-22-07.json`).

La meta se alcanzó; US-13 se cierra en el Sprint 3 con una carga mayor, de 20 reservas.

## 6. Defectos encontrados en esta entrega (por qué importó la integración)

Las 266 pruebas unitarias del Sprint 1 estaban en verde y aun así **ningún flujo habría funcionado en n8n real**:

| # | Defecto | Dónde se detectó | Corrección | Prueba que evita la regresión |
|---|---|---|---|---|
| D-01 | `process.env` no existe en los nodos Code de n8n 2.x: el secreto nunca coincidía y se descartaban **todos** los mensajes | Sondeo en n8n 2.44.2 | `$env` + `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` | `test-workflows-n8n` 3a, 10c |
| D-02 | URL y cuerpo de Telegram sin `=`: se enviaban literalmente `bot{{$env…}}` y `"={{ $json.chat_id }}"` | Sondeo con Telegram simulado | Expresiones con `=` y `JSON.stringify` | 4a, 4b |
| D-03 | Cinco webhooks para un bot que admite uno | Revisión de diseño y API de Telegram | Router US-17 | 6a a 6f |
| D-04 | Nodos de Sheets sin autenticación ni credencial; ID de planilla vacío en US-06 | Importación en n8n | Cuenta de servicio + `GOOGLE_SHEET_ID` | 5a a 5c |
| D-05 | Google Drive `typeVersion 2.1` inexistente; carpeta `root` | `n8n export:nodes` | Drive v3 con carpeta desde `.env` | 2a, 5d |
| D-06 | URL de descarga de archivos de Telegram mal formada | Revisión contra la API | `/file/bot<token>/<ruta>` | 4d |
| D-07 | La búsqueda no reconocía frases naturales («hola, ¿hay pregavalina 75?»: 0,457 < 0,72) | Prueba con el ejemplo de la presentación | Normalización en el router | `test-router` bloque 5 |
| D-08 | Nadie avisaba al farmacéutico cuando llegaba una receta | Revisión del flujo de punta a punta | Nodo `aviso_farmaceutico` en US-09 | `test-despacho` bloque 6 |
| D-09 | El farmacéutico no recibía confirmación al aprobar | Revisión del grafo de US-20 | Conexión `notify_customer → reply_pharmacist` | E2E CA-14 |
| D-10 | El mensaje «Ya pasa a preparación» era falso (falta la aprobación) | Revisión contra la máquina de estados | Texto corregido | E2E CA-12 |
| D-11 | En Windows fallaban 2 pruebas por saltos de línea CRLF | Ejecución en Windows | `.gitattributes` con `eol=lf` | `test-mapa`, `test-panel` |
| D-12 | «me duele el pecho» se trataba como consulta clínica y no como urgencia | `medir-busqueda.mjs` | Frase agregada a urgencias | `test-router` 3h |
| D-13 | Cada lectura de la planilla se repetía **una vez por fila recibida** (n8n ejecuta un nodo por ítem). Una consulta tardaba 7,7 s y se agotaba la cuota de Google | E2E con la planilla real (tiempos por nodo en la base de n8n) | `executeOnce` en todas las lecturas: la consulta bajó a 2,5–4,5 s | `test-workflows-n8n` 5e |
| D-14 | n8n 2.44.2 rechazaba **todas las escrituras** («Provide a columns.schema array…»): ninguna reserva llegaba a la planilla | E2E con la planilla real | `columns.schema` en las 16 escrituras | 5g |
| D-15 | Una hoja vacía devolvía 0 ítems y cortaba el flujo; y con la cuota agotada (HTTP 429) una entrega quedaba ENTREGADO **sin descontar el stock** | E2E con la planilla real | `alwaysOutputData` en las lecturas; 3 reintentos de 5 s en todo nodo de Sheets; la compensación queda como deuda (Sprint 3) | 5f, 5h |
| D-16 | La cuenta de servicio tiene **cuota 0 en Drive**: la receta no se podía guardar con una cuenta Gmail (sin unidades compartidas) | Prueba directa con la API de Drive | Subida con OAuth al Drive del usuario (ADR-13) | 5d |
| D-17 | `n8n execute` (CLI) se cuelga con un flujo de reloj en n8n 2.44.2 | E2E (CA-16) | Comando del personal «revisar vencidos» que invoca US-10 desde el router | `test-router` 2j2, 2j3 |
| D-18 | El estado por RUT o por código **nunca encontraba el pedido** en n8n: el bloque que arma la respuesta pasaba los ítems `{ json: fila }` sin desenvolver, y las pruebas unitarias usaban filas planas. Venía del Sprint 1 | E2E (CA-07 y CA-17) | Se desenvuelven los ítems antes de buscar | `test-router` 6c2, 6c3 (ejecutan el código del nodo con ítems como los de n8n) |

Los defectos D-13 a D-18 **solo aparecieron con la planilla y las cuentas reales**: ni las 266 pruebas originales ni la integración con credenciales falsas podían detectarlos. Es el argumento principal para que el E2E sea un criterio de salida de cada sprint.
