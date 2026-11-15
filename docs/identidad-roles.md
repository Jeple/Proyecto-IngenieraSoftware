# Modelo de identidad, autenticación y autorización (GitHub #19)

El prototipo no maneja cuentas con contraseña: cada actor se identifica con la evidencia que el canal ya provee. Este documento define esa evidencia, qué puede hacer cada actor y qué datos nunca deben filtrarse.

## Actores y evidencia de identidad

| Actor | Canal | Evidencia de identidad | Verificación |
|---|---|---|---|
| Cliente | Telegram (bot) | `chat_id` de Telegram + RUT declarado | El `chat_id` es la identidad operativa: la titularidad es ser **el mismo chat que creó el pedido** (`ordenes.telefono`) |
| Farmacéutico | Telegram (comandos) | `chat_id` incluido en `TELEGRAM_PHARMACIST_CHAT_IDS` | Lista blanca por variable de entorno; cualquier otro chat se descarta en silencio |
| Personal de despacho | Telegram (comandos) | `chat_id` incluido en `TELEGRAM_STAFF_CHAT_IDS` (si está vacía, la lista de farmacéuticos) | Lista blanca por variable de entorno; cualquier otro chat se descarta en silencio (US-22) |
| Conductor (app propia) | PWA del repartidor (US-11) | Fuera del alcance firmado; modo demostración sin autenticación | No se expone ningún endpoint de despachos |
| Sistema | Cron y workflows internos | No expuesto a usuarios | Sin webhook público; solo disparadores internos |

## Reglas de titularidad

- **Consulta de estado (US-06):** solo el chat que creó el pedido, por código `#FAR-XXXX` o RUT propio. Un tercero recibe exactamente el mismo texto que un pedido inexistente.
- **Ingesta de recetas (US-09):** la receta solo se asocia desde el chat que creó el pedido; código inexistente y chat ajeno producen el mismo mensaje.
- **Aprobación de recetas (US-20):** solo chats de la lista blanca; el resto se descarta en silencio.
- **Despacho (US-22):** solo chats de la lista del personal; un comando desde otro chat se trata como un mensaje común y nunca cambia un pedido.
- **Reserva (US-05):** crea la identidad (`chat_id` + RUT) que habilita todas las reglas anteriores.

## Superficie de datos

- Nunca se envía por chat: estados de pedidos ajenos, precios de otros pedidos, datos clínicos de la receta ni stock interno por lote.
- Los mensajes de "no encontrado" son idénticos para un identificador inexistente y para un intento no autorizado: no revelan si el pedido existe.
- La receta vive en Google Drive con permisos restringidos (RNF-07); la planilla solo guarda su URL.
- La bitácora no incluye RUT, dirección ni datos clínicos; las referencias son por código `#FAR-XXXX`.

## Autenticación de transporte

- El bot expone **un único webhook** (`/webhook/telegram-bot`, router US-17), que valida `X-Telegram-Bot-Api-Secret-Token` contra `TELEGRAM_WEBHOOK_SECRET` antes de procesar cualquier mensaje. Los subflujos (US-04, US-05, US-06, US-09, US-20 y US-22) ya no tienen webhook propio: solo los invoca el router, y cada uno vuelve a validar el secreto (defensa en profundidad).
- El webhook se registra con `secret_token` y `max_connections=1` (scripts/local/levantar.mjs).
- Los workflows internos (cron de expiración) no exponen webhooks.

## Brechas y pendientes

- La PWA del conductor no tiene autenticación (modo demostración) y está fuera del alcance firmado; no existe backend que pueda modificar despachos desde ella.
- Identidad fuerte (contraseñas, OTP), rotación de secretos y límites de uso por chat quedan fuera del alcance del prototipo (RNF-05: capa gratuita).
