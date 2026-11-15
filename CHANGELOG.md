# Changelog

Cambios relevantes por sprint. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Las versiones corresponden a los tags de cada sprint (líneas base).

## [0.2.0-sprint2] · Entrega 2 (15 de noviembre de 2026)

### Agregado
- **US-17 · Router de intenciones** (`workflows/US-17-router-telegram.json`):
  - Único webhook del bot (`/webhook/telegram-bot`) con validación del secreto.
  - Reglas deterministas y normalización del texto (saludos, muletillas, «2 cajas» → `x2`).
  - Respuestas fijas de seguridad clínica (SAMU 131, línea \*4141, sin consejo médico).
  - Respuesta para preguntas fuera del dominio.
  - Gemini opcional, que solo elige una etiqueta de una lista cerrada.
  - Aviso al vecino si un subflujo falla.
- **US-22 · Despacho marcado por el personal** (`workflows/US-22-despacho-personal.json`):
  - Comandos «en ruta» y «entregado», con lista blanca.
  - El estado de origen como guarda de idempotencia y bitácora con actor.
  - Aviso al vecino y descuento de `stock_real` y `stock_reservado` una sola vez.
- US-09: aviso al químico farmacéutico, con el enlace a la receta y sin el RUT, cuando llega una receta.
- Entorno local en un comando (`scripts/local/`):
  - `levantar` (PowerShell, bash y Node), `doctor`, `cargar-catalogo`.
  - `prueba-integracion`, `e2e`, `medir-latencia` y `prueba-concurrencia`.
- Guía paso a paso `docs/guia-instalacion-local.md` y plan de aceptación `docs/plan-pruebas-aceptacion.md`.
- Pruebas nuevas:
  - `test-router.mjs` (66, incluye las de contrato con US-04, US-05, US-06, US-20 y US-22).
  - `test-despacho.mjs` (38).
  - `test-workflows-n8n.mjs` (35 reglas para n8n 2.44.2).
  - `scripts/correr-pruebas.mjs` (evidencia fechada) y `scripts/medir-busqueda.mjs`.
- CI: paso de `check_secrets`, Node 20 fijado, nuevas suites y job `integracion-n8n` con n8n real.
- Documentación de la Entrega 2 en `docs/entrega-2/`:
  - Diagramas PlantUML.
  - ADR y análisis de cohesión y acoplamiento.
  - ISO 25010, estrategia de pruebas y matriz de riesgos.
  - Backlog reconciliado y control de configuración.

### Cambiado
- Los subflujos (US-04, US-05, US-06, US-09, US-20) ya no tienen webhook propio: los invoca el router con *Execute Workflow*. Los flujos tienen ID fijo y US-21 es su flujo de errores.
- `docker-compose.yml`:
  - n8n 2.44.2 y cloudflared 2026.10.1 fijados (antes `latest`).
  - `$env` habilitado y una ejecución de producción a la vez (RNF-04).
  - Poda de ejecuciones a 7 días.
  - Perfiles `tunel-rapido` y `tunel-nombrado`.
- `.env.example` en español, con `TELEGRAM_STAFF_CHAT_IDS` y sin las variables fuera del alcance (Vapi, IMAP).
- Mensaje de US-09 al recibir la receta: ya no dice «pasa a preparación» (falta la aprobación).
- `check_secrets.sh`: permite referencias a credenciales (`id` y `name`) en los workflows y rechaza cualquier dato.
- Mapa de flujos: incluye el router y el despacho; la PWA figura como prototipo fuera del alcance.

### Corregido
- Los nodos Code usaban `process.env`, que no existe en n8n 2.x: todos los mensajes se descartaban en silencio. Ahora usan `$env`.
- URL y cuerpos de Telegram sin `=`: se enviaban `bot{{$env...}}` y `"={{ $json.chat_id }}"` literales.
- Nodos de Google Sheets sin autenticación ni credencial, y planilla vacía en US-06.
- Nodo de Google Drive con `typeVersion 2.1` inexistente y carpeta `root`.
- URL de descarga de archivos de Telegram (`/file/bot<token>/<ruta>`).
- El farmacéutico no recibía confirmación al aprobar o rechazar.
- La búsqueda no reconocía frases naturales («hola, ¿hay pregavalina 75?»).
- Pruebas `test-mapa` y `test-panel` fallaban en Windows por CRLF (`.gitattributes`).
- Con la planilla real:
  - Las lecturas de Sheets se repetían una vez por fila (consulta de 7,7 s y cuota agotada): ahora usan `executeOnce`, y la consulta tarda unos 3 s.
  - Las escrituras fallaban sin `columns.schema` en n8n 2.44.2.
  - Una hoja vacía cortaba el flujo (`alwaysOutputData`).
  - Se agregaron 3 reintentos ante la cuota de 60 lecturas por minuto.
- Recetas: la cuenta de servicio tiene cuota 0 en Drive. US-09 ahora sube con OAuth2 al Drive del usuario (ADR-13).
- La expiración a demanda ya no usa `n8n execute` (se cuelga): el personal escribe «revisar vencidos» y el router invoca US-10.
- US-06: el estado por RUT o por código nunca encontraba el pedido dentro de n8n (los ítems llegaban como `{ json: fila }`). Venía del Sprint 1; lo detectó el E2E (D-18).

### Seguridad
- Una sola URL pública; doble validación del secreto (router y subflujo); `max_connections=1` en Telegram.
- La credencial de Google se importa por CLI desde `secrets/` y nunca se imprime ni se versiona.

## [0.1.0-sprint1] · 16 de octubre de 2026

### Agregado
- Prototipo sobre Telegram, n8n y Google Sheets:
  - US-04 consulta difusa, US-05 reserva con código `#FAR`, US-06 trazabilidad con titularidad.
  - US-09 recetas por Telegram (correo postergado), US-10 expiración a 12 h.
  - US-20 aprobación farmacéutica, US-21 alertas.
  - PWA del conductor en modo demostración.
- 266 pruebas automáticas, CI en GitHub Actions y `check_secrets.sh`.
- Panel y mapa de flujos para la reunión con la Municipalidad; informes de Inception y Sprint 1.

## [0.0.1-sprint0] · septiembre a octubre de 2026

### Agregado
- US-01: esquema de datos, stock dinámico y datos sintéticos (PR #22).
- US-02: despliegue de n8n con Docker y Cloudflare Tunnel (PR #23).
- US-03: informe de Inception.
