# Workflows de n8n

Esta carpeta versiona los exportes JSON de los workflows de n8n. Ya contiene los workflows implementados (ver tabla más abajo); el resto se crea a medida que se implementan las historias de usuario. La estructura está preparada para que la CI valide el JSON y ejecute las pruebas de todos los workflows y de la PWA en cada Push y Pull Request.

## Convención de nombres

```text
US-XX-<slug>.json
```

- `US-XX`: historia de usuario que origina el workflow (ej. `US-04`).
- `<slug>`: nombre del workflow dentro de n8n, en minúsculas y con guiones (ej. `consulta-stock`).
- Ejemplo completo: `US-04-consulta-stock.json`.

El prefijo corresponde a la historia que **origina** el flujo. Si una historia posterior amplía exactamente el mismo flujo, modifica el mismo archivo en lugar de crear otro. Si el flujo es independiente — con su propio disparador y su propio webhook — crea el suyo propio: así nacieron `US-05-reserva.json`, `US-06-trazabilidad.json` y `US-10-cron-expiracion.json`. El *router de intenciones* de Telegram (todavía pendiente, US-17) será quien despache cada mensaje al webhook correcto.

## Exportar un workflow desde n8n

1. Abrir el workflow en el editor de n8n.
2. Menú superior derecho → **Download JSON**.
3. Guardar el archivo en esta carpeta respetando la convención de nombres.
4. Confirmar que la CI pasa (el JSON debe ser válido, sin BOM de Windows).

## Importar un workflow en n8n

1. En el editor de n8n: **Workflows → Import from File** (o pegar el JSON con *Import from Clipboard*).
2. Revisar que los nodos de credenciales queden enlazados (aparecen en rojo hasta configurarlos).
3. Activar el workflow solo después de verificar las credenciales y el webhook.

## Credenciales

**Los exportes de n8n nunca incluyen credenciales.** Cada desarrollador configura las suyas propias (Google Sheets/Drive, Telegram Bot API, Gemini, Vapi) en su instancia local de n8n, siguiendo el [Quickstart del README](../README.md). Los identificadores compartidos (por ejemplo `GOOGLE_SHEET_ID`) se toman del archivo `.env` local; los secretos nunca se commitean.

Toda la mensajería del sistema pasa hoy por **Telegram Bot API**: los webhooks de los workflows usan el prefijo `telegram-` y el destinatario de cada respuesta es el `chat_id` del usuario.

## Mapa de historias → workflow

| Historia | Archivo | Workflow n8n | Requerimientos | Estado |
|---|---|---|---|---|
| US-04 | [`US-04-consulta-stock.json`](./US-04-consulta-stock.json) | `consulta-stock` | RF-01, RF-02 | **implementado** |
| US-05 | [`US-05-reserva.json`](./US-05-reserva.json) | `reserva` | RF-03, RF-04 | **implementado** |
| US-06 | [`US-06-trazabilidad.json`](./US-06-trazabilidad.json) | `trazabilidad` | RF-07 | **implementado** |
| US-08 | Sin archivo propio: Vapi invoca por HTTP los webhooks existentes | `consulta-stock`, `reserva` | RNF-02 | pendiente |
| US-09 | [`US-09-recetas-telegram.json`](./US-09-recetas-telegram.json) | `recetas-telegram` | RF-05 | **implementado** |
| US-09 | [`US-09-recetas-email.json`](./US-09-recetas-email.json) | `recetas-email` | RF-05 | **implementado (postergado)** |
| US-10 | [`US-10-cron-expiracion.json`](./US-10-cron-expiracion.json) | `cron-expiracion` | RF-06 | **implementado** |
| US-11 | Sin workflow: PWA estática en [`../pwa/`](../pwa/) | endpoint backend pendiente | RF-08 | **PWA implementada**, endpoint pendiente |
| US-20 | [`US-20-aprobacion-recetas.json`](./US-20-aprobacion-recetas.json) | `aprobacion-recetas` | US-20 / GitHub #18 | **implementado** |

Historias de calidad sin workflow propio (US-01, US-02, US-03, US-07, US-12, US-13, US-14, US-15) no aparecen en esta tabla. El detalle de qué flujo cubre cada requerimiento está en [`docs/arquitectura.md`](../docs/arquitectura.md).

### Notas sobre US-04 (`US-04-consulta-stock.json`)

- **US-04 es deliberadamente sin LLM:** no contiene nodos Gemini ni otros modelos de lenguaje. Como la respuesta se arma solo con datos leídos de las hojas `catalogo`/`inventario`, el grounding de RF-01 (nunca inventar nombres, precios ni stock) es **estructural**, no depende de un prompt.
- **Webhook propio:** `POST telegram-consulta`. El router de intenciones de Telegram (US-17) enviará aquí las consultas de stock y precios; hasta que exista, el webhook recibe las peticiones directamente.
- **Prueba local:** `node scripts/test-fuzzy-match.mjs` (Node ≥ 18, sin dependencias); la CI la ejecuta tras validar el JSON.

### Notas sobre US-05 (`US-05-reserva.json`)

- **Router de Telegram:** el router de intenciones de Telegram despachará los mensajes de tipo *reserva* al webhook de este workflow (`POST telegram-reserva`). Hasta que ese router exista, el webhook recibe las peticiones directamente.
- **Matcher difuso duplicado a propósito:** n8n no puede importar JavaScript local sin habilitar la *allowlist* de carpetas, por lo que `US-04-consulta-stock.json` y `US-05-reserva.json` cada uno lleva su propia copia del matcher. `node scripts/test-reserva.mjs` actúa como *drift guard*: ejecuta la misma lista de consultas en ambas copias y falla si cambia un veredicto o el `medicamento_id` matcheado.
- **Entrega (GitHub #7):** la reserva exige el bloque de entrega separado por comas — `[producto], [dirección], [sector]` — con sector tolerante a acentos (Peñalolén Alto, Peñalolén Nuevo o San Luis). Sin datos o fuera de cobertura se rechaza con mensaje guía; con datos válidos, `append_despacho` crea la fila `PENDIENTE` en `despachos`.
- **Duplicados:** un reenvío idéntico del mismo chat (mismo medicamento y cantidad dentro de 2 minutos) devuelve la reserva existente y no escribe nada.
- **Auditoría:** la bitácora de la reserva incluye `estado_anterior`, `estado_nuevo` y `actor` (`cliente:<chat_id>`).
- **Prueba local:** `node scripts/test-reserva.mjs` (Node ≥ 18, sin dependencias); la CI la ejecuta junto a las pruebas de US-04.

### Notas sobre US-06 (`US-06-trazabilidad.json`)

- **Webhook propio:** `POST telegram-trazabilidad`. El router de intenciones enviará aquí las consultas de estado (RUT o `#FAR-XXXX`); RF-07 vive en este flujo en lugar de dentro de `consulta-stock` para no arrastrar la lógica de catálogo a una consulta que no necesita catálogo.
- **Precedencia de identificador:** si el mensaje trae código, se busca solo por código; si no, por RUT tomando el pedido más reciente. Nunca se inventa estado, precio ni stock.
- **Prueba local:** `node scripts/test-trazabilidad.mjs` (Node ≥ 18, sin dependencias).

### Notas sobre US-09 (`recetas-telegram` y `recetas-email`)

- **Alcance de esta versión:** el canal activo es la foto por Telegram (`recetas-telegram`). La ruta por correo IMAP (`recetas-email`) queda **postergada a una versión posterior**: el workflow y su suite (`node scripts/test-recetas-email.mjs`) siguen en el repositorio y se ejecutan en la CI, pero están fuera del alcance actual y **no requieren configuración ahora**.
- **Dos puntos de entrada, una misma rutina:** la foto llega por Telegram (`US-09-recetas-telegram.json`, webhook `POST telegram-recetas`) y el adjunto por correo IMAP (`US-09-recetas-email.json`); ambos flujos convergen en la misma rutina: subir a Google Drive → escribir `ordenes.url_receta` → pasar la orden a `RECETA_RECIBIDA` → registrar el movimiento en `bitacora`.
- **Código de orden obligatorio:** la ruta por foto exige `#FAR-XXXX` en el pie de la foto (*caption*); la ruta por correo lo exige en el asunto. Sin código, la receta no se enlaza.
- **Credenciales IMAP:** el usuario y la contraseña del buzón se configuran como credencial de n8n en cada instancia de desarrollador; nunca viajan en los exportes JSON. Las variables `IMAP_*` y `GOOGLE_DRIVE_RECETAS_FOLDER_ID` sí se toman del `.env`.
- **Prueba local:** `node scripts/test-recetas-telegram.mjs` y `node scripts/test-recetas-email.mjs` (Node ≥ 18, sin dependencias).

### Notas sobre US-10 (`US-10-cron-expiracion.json`)

- **Disparador horario:** evalúa solo órdenes en `PENDIENTE_RECETA` cuya `fecha_expiracion` ya venció (comparación de fechas reales, no de cadenas). Pasa a `CANCELADO_EXPIRADO`, libera el `stock_reservado` (agregado por medicamento, nunca negativo), registra en `bitacora` y avisa por Telegram.
- **Prueba local:** `node scripts/test-cron-expiracion.mjs` (Node ≥ 18, sin dependencias).

### Notas sobre US-11 (PWA del repartidor)

- La PWA vive en [`../pwa/`](../pwa/) y hoy corre en **modo demostración** porque el endpoint que entrega y actualiza los despachos todavía no existe. El contrato esperado (`GET`/`PATCH` de despachos) está documentado en [`../pwa/README.md`](../pwa/README.md).
- **Prueba local:** `node pwa/test/pwa.test.mjs` (Node ≥ 18, sin dependencias).

### Notas sobre US-20 (`US-20-aprobacion-recetas.json`)

- **Comandos de aprobación:** el farmacéutico autorizado responde a la notificación con `aprobar FAR-XXXX` o `rechazar FAR-XXXX [motivo]`. El chat debe estar en `TELEGRAM_PHARMACIST_CHAT_IDS`; cualquier otro chat se descarta en silencio (no hay respuesta a terceros).
- **Webhook propio:** `POST telegram-aprobacion`. El router de intenciones (US-17) despachará aquí los comandos; hasta que exista, el webhook recibe las peticiones directamente.
- **Idempotencia:** el estado de origen manda. Repetir `aprobar` o `rechazar` sobre una orden que ya salió de `RECETA_RECIBIDA` no escribe nada y nunca libera stock dos veces.
- **Prueba local:** `node scripts/test-aprobacion.mjs` (Node ≥ 18, sin dependencias).

## Validación por CI

El workflow [`.github/workflows/validate-workflows.yml`](../.github/workflows/validate-workflows.yml) se ejecuta en cada Push o Pull Request que toque `workflows/**`, `scripts/**` o `pwa/**`:

- **Falla** si algún `workflows/*.json` no es JSON válido (el mensaje indica el archivo con error).
- **Falla** si `node scripts/test-fuzzy-match.mjs` falla (fuzzy match de US-04).
- **Falla** si `node scripts/test-reserva.mjs` falla (reserva de US-05 y drift guard del matcher).
- **Falla** si `node scripts/test-trazabilidad.mjs` falla (trazabilidad de US-06).
- **Falla** si `node scripts/test-cron-expiracion.mjs` falla (expiración de US-10).
- **Falla** si `node scripts/test-aprobacion.mjs` falla (aprobación farmacéutica, US-20).
- **Falla** si `node scripts/test-recetas-telegram.mjs` falla (ingesta de recetas por Telegram, US-09 / RF-05).
- **Falla** si `node scripts/test-recetas-email.mjs` falla (ingesta de recetas por correo IMAP, US-09 / RF-05).
- **Falla** si `node pwa/test/pwa.test.mjs` falla (funciones puras de la PWA de US-11).
- **Advierte** (sin fallar) si la carpeta aún no contiene archivos JSON, como ocurre en el Sprint 0.

La validación no requiere dependencias: usa el Node.js ya instalado en `ubuntu-latest`.

## Checklist antes de commitear un workflow

- [ ] El archivo sigue la convención `US-XX-<slug>.json`.
- [ ] El JSON fue exportado desde n8n y abre sin errores al reimportarlo.
- [ ] El archivo no contiene credenciales ni tokens.
- [ ] La CI `validate-workflows` quedó en verde.
