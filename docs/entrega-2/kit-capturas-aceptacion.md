# Kit de capturas del plan de aceptación · Entrega 2

| Versión | Fecha | Autor(es) | Cambios |
|---|---|---|---|
| 1.0 | 15-nov-2026 | Equipo del proyecto (Grupo 10) — calidad y gestión ágil | Guía operativa para tomar `cap-01`…`cap-21`, `cap-n8n`, `cap-bitacora` y `cap-ci` sin filtrar datos ni equivocar el nombre |

**Para quién:** la persona que toma las capturas (Antonio + Javier según el [runbook](runbook-cierre-entrega-2.md) §2). **Fuente de los casos:** [`plan-pruebas-aceptacion.md`](../plan-pruebas-aceptacion.md) §2 y §4; **evidencia ya generada:** [`docs/evidencia/e2e/`](../evidencia/e2e/). **Destino de las imágenes:** carpeta del equipo `Entrega 2/capturas/` (fuera del repositorio; las que se citen en el informe se pueden copiar luego a `docs/evidencia/capturas/`).

## 1. Antes de empezar (criterio de entrada)

1. `node scripts/local/levantar.mjs` sin errores y `node scripts/local/doctor.mjs` **sin «FALTA»**. El doctor no imprime secretos.
2. `node scripts/local/cargar-catalogo.mjs --reiniciar` para dejar solo datos sintéticos: catálogo, pedidos vacíos y Pregalex 75 mg (`MED-0001`) sin stock.
3. Dos cuentas de Telegram: **A** (el «vecino» del equipo) y **B** (otro integrante, solo para CA-08). El farmacéutico y el personal usan el `chat_id` configurado en `.env`; el `chat_id` de A se obtiene con `@userinfobot` o de `TELEGRAM_PHARMACIST_CHAT_IDS` (no capturarlo).
4. Navegador limpio (perfil sin pestañas ni marcadores personales), notificaciones del sistema silenciadas y teléfono en modo No molestar.
5. Cronómetro o reloj visible: la fecha de la captura debe poder contrastarse con la tabla de reporte.

## 2. Cómo abrir cada herramienta

**Chat del bot (Telegram).** Ejecutar `node scripts/local/doctor.mjs` y leer la sección 4: imprime `bot @<usuario>`. Buscar ese usuario en Telegram y abrir la conversación (o `https://t.me/<usuario>`). No consultar `getMe` desde la barra del navegador: el token queda en la URL y en el historial. Nunca capturar la pantalla donde se vea el token (BotFather, `.env` o terminal con `echo`).

**Planilla (Google Sheets).** El ID está en `GOOGLE_SHEET_ID` del `.env` (no capturar ese archivo). Abrir `https://docs.google.com/spreadsheets/d/<ID>/edit` con la cuenta dueña y usar las cinco hojas: `catalogo`, `inventario`, `ordenes`, `despachos`, `bitacora` (columnas en [`google-sheets-schema.md`](../google-sheets-schema.md)). Para la captura, mostrar solo la fila del pedido y las columnas que prueban el caso; el resto se recorta.

**Ejecución en n8n.** Abrir <http://localhost:5678> → **Executions**. Filtrar por workflow y por hora; los nombres visibles son «US-17 Router de intenciones de Telegram», «US-04 Consulta de Stock (Fuzzy Search)», «US-05 Reserva con Código Transaccional», «US-06 Trazabilidad por RUT o Codigo», «US-09 Recetas por Telegram», «US-20 Aprobación farmacéutica de recetas», «US-10 Cron de Expiracion 12h», «US-21 Alertas de error» y «US-22 Despacho marcado por el personal». Al abrir una ejecución, la URL termina en `/executions/<id>`: ese número es el **execution id**. En el caso de los comandos del personal, la ejecución padre es la del router US-17 y la hija es el subflujo; anotar la del router y, si se captura, la del subflujo.

**Tabla de reporte.** En [`plan-pruebas-aceptacion.md`](../plan-pruebas-aceptacion.md) §3, columna **Execution id**, escribir el número y la hora; en **Captura**, el nombre de archivo exacto. `scripts/local/e2e.mjs` ya llena las columnas de los casos ⚙ en `docs/evidencia/e2e/`; las capturas se agregan a mano.

## 3. Reglas de privacidad (obligatorias)

- **Solo datos sintéticos:** RUT `11.111.111-1` (chat A) y `22.222.222-2` (chat B); direcciones ficticias `Av. Grecia 8735, Peñalolén Alto` y `Av. Los Aromas 1234, Peñalolén Nuevo`; receta escrita a mano que diga **«RECETA DE PRUEBA»**; sin nombres de personas reales.
- **Nunca** un RUT, dirección, teléfono, receta ni nombre real. Los RUT de `data/seed/` son aleatorios y podrían coincidir con una persona: no se capturan.
- **Difuminar:** el `chat_id` (columna `telefono` de `ordenes` y la columna `actor` de `bitacora`, con formato `farmaceutico:<chat_id>`), nombres y números de teléfono, y cualquier dato del panel de ejecución de n8n. Usar la herramienta de recorte/desenfoque del editor; nunca tapar con texto encima que se pueda leer debajo.
- **No capturar la barra de URLs** cuando tenga tokens, `secret` o `?token=`; en n8n, capturar solo la zona de la lista o del panel, no la barra completa si apunta a un túnel con credenciales.
- Silenciar notificaciones y cerrar el panel de chats de Telegram: la captura debe ser de la conversación, no de la lista de contactos.

## 4. Tabla de casos

Leyenda: **⚙** reproducible por script (`node scripts/local/e2e.mjs`); **✋** se hace a mano en el teléfono y se respalda con captura.

| ID | Archivo | Qué capturar exactamente | Entrada | Esperado | No debe verse | Modo |
|---|---|---|---|---|---|---|
| CA-01 | `cap-01-consulta.png` | Chat A con la consulta y la respuesta con precio y stock | `losartan 50` | «Losarmed 50 mg — $4.990 c/u. Stock disponible: 92 unidades.» | — | ⚙ |
| CA-02 | `cap-02-consulta.png` | Chat A con la respuesta de agotado y bioequivalentes | `hola, ¿hay pregavalina 75?` | Pregalex 75 mg agotado; «Neurogab 75 mg — $7.490 c/u.» | — | ⚙ ✋ |
| CA-03 | `cap-03-fuera-catalogo.png` | Chat A con el rechazo honesto, sin precio inventado | `paracetamol 500` | «No encontré "paracetamol 500" en nuestro catálogo…» | — | ⚙ |
| CA-04 | `cap-04-reserva.png` + `cap-04b-planilla.png` | Confirmación con código y plazo de 12 h; fila de `ordenes` (PENDIENTE_RECETA) y `inventario` de `MED-0002` con reservado actualizado; `despachos` PENDIENTE | `reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto` | `#FAR-0001`; `fecha_expiracion` = creación + 12 h; reservado +1; bitácora `RESERVA_ALTA` | Columna `telefono` (chat_id) y RUT real | ⚙ ✋ |
| CA-05 | `cap-05-sin-receta.png` | Fila de `ordenes` con estado y sin `fecha_expiracion` | `reservar somnia x2 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto` | `EN_PREPARACION`, sin expiración | Igual que CA-04 | ⚙ |
| CA-06 | `cap-06-rechazo.png` | Chat con los dos rechazos y la hoja `ordenes` sin filas nuevas | `reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 100, Ñuñoa` · `reservar pregalex 75 x1 rut 11.111.111-1, Av. Grecia 8735, San Luis` | Guía de cobertura y de stock; `ordenes` no cambia | — | ⚙ |
| CA-07 | `cap-07-estado.png` | Chat A con el estado vigente del pedido | `estado 11.111.111-1` | «Su pedido #FAR-… está …» (estado real del pedido) | — | ⚙ ✋ |
| CA-08 | `cap-08-titularidad.png` | **Chat B** preguntando por el pedido de A; el mensaje debe ser idéntico al de un pedido inexistente | `estado #FAR-0001` desde B | «No encontré ese pedido. Revise el código #FAR-XXXX o su RUT e inténtelo de nuevo» | Número/nombre de B; cualquier dato del pedido de A | ⚙ ✋ |
| CA-09 | `cap-09-bienvenida.png` | Chat A con la presentación y el menú | `/start` | Bienvenida que dice «asistente virtual» y muestra las opciones | — | ⚙ ✋ |
| CA-10 | `cap-10-urgencia.png` | Las dos respuestas: urgencia y pregunta clínica | `me duele el pecho` · `¿cuántas pastillas me tomo?` | SAMU 131 · «No puedo dar indicaciones…» | — | ⚙ ✋ |
| CA-11 | `cap-11-webhook.png` | Terminal con el `POST` al webhook sin el encabezado secreto y el código HTTP; el chat A **sin** mensaje nuevo | Ver comando en §5 | Sin respuesta del bot (ejecución del router sin ítems) | Secretos, token, URL con `?token=` | ⚙ |
| CA-12 | `cap-12-receta.png` | Foto «RECETA DE PRUEBA» enviada con pie `#FAR-0001` y la respuesta del bot | Foto con pie `#FAR-0001` | «Recibimos la receta… un químico farmacéutico la revisará» | Nombre del paciente, datos clínicos | ✋ |
| CA-13 | `cap-13-aviso-farmaceutico.png` | Aviso al farmacéutico con el enlace y **sin** RUT | (consecuencia de CA-12) | «Nueva receta recibida para #FAR-0001 (MED-0002 x1)…» sin RUT | Chat_id del farmacéutico | ✋ |
| CA-14 | `cap-14-aprobacion.png` | Comando de aprobación, aviso al vecino y confirmación al farmacéutico | `aprobar FAR-0001` | `EN_PREPARACION`; bitácora `RECETA_APROBADA` con `actor` | Chat_id en `actor` | ⚙ ✋ |
| CA-15 | `cap-15-rechazo-receta.png` | Rechazo, liberación del stock y segundo intento sin efecto | `rechazar FAR-0002 receta ilegible` (repetir) | `RECHAZADO`; reservado −1 una sola vez; aviso con motivo | — | ⚙ |
| CA-16 | `cap-16-expiracion.png` | Chat con el aviso de cancelación y la fila `#FAR-0900` en `CANCELADO_EXPIRADO` | `node scripts/local/cargar-catalogo.mjs --pedido-vencido <chat A>` y luego `revisar vencidos` | `CANCELADO_EXPIRADO`; reservado de `MED-0003` 1→0 | Chat_id en el comando | ⚙ ✋ |
| CA-17 | `cap-17-en-ruta.png` | Chat del vecino con «va en camino» y `despachos` en `EN_RUTA` | `en ruta FAR-0001` y luego `estado 11.111.111-1` | «Su pedido #FAR-0001 va en camino…»; bitácora `DESPACHO_EN_RUTA` | Chat_id del personal | ⚙ ✋ |
| CA-18 | `cap-18-entregado.png` | Aviso de entrega y hoja `inventario` con real y reservado descontados una vez | `entregado FAR-0001` (dos veces) | `ENTREGADO`; real −1 y reservado −1; el segundo comando dice «ya estaba ENTREGADO» | — | ⚙ ✋ |
| CA-19 | `cap-19-alerta.png` | Mensaje de alerta en el chat admin y aviso al vecino | Renombrar la hoja `catalogo` y consultar `losartan 50`; **restaurar la hoja después** | «ALERTA n8n: el workflow "US-04…" falló… Nodo: read_catalogo» y «Tuvimos un problema…» | Chat_id del admin; ruta del túnel | ⚙ |
| CA-20 | `cap-20-concurrencia.png` | Terminal con el resultado y el JSON de evidencia abierto al lado | `node scripts/local/prueba-concurrencia.mjs` | reservado ≤ 3, igual a la suma de reservas; una fila de bitácora por reserva | — | ⚙ |
| CA-21 | `cap-21-latencia.png` | Terminal con p50/p95/máx. y la meta | `node scripts/local/medir-latencia.mjs --n 20` | p95 < 2.500 ms (referencia 9-nov: 2.110 ms) | — | ⚙ |

**Capturas complementarias** (no son casos, las pide el plan §4): `cap-n8n.png` = lista de *Executions* con el router y los subflujos en éxito; `cap-bitacora.png` = hoja `bitacora` con las transiciones y la columna `actor`; `cap-ci.png` = GitHub → *Actions*, último run de `main` en verde (`validate-json` e `integracion-n8n`); `cap-12b` = carpeta privada de Drive con `receta-FAR-….jpg`; `cap-12-14-receta-real.png` = nombre que ya usa el plan para la conversación completa de CA-12/13/14 del 9-nov (se conserva por trazabilidad).

## 5. Checklist final de capturas

- [ ] **⚙** CA-01, CA-03, CA-11, CA-15, CA-20 y CA-21 no necesitan teléfono: alcanza el chat simulado + terminal + planilla.
- [ ] **✋** CA-02, 04, 07, 08, 09, 10, 12, 13, 14, 16, 17 y 18 requieren una captura real del chat A (o B en CA-08).
- [ ] **CA-08 exige un segundo teléfono**: lo envía B, otro integrante, no el mismo A. Es la única captura con dos dispositivos; su ausencia debe declararse en el informe.
- [ ] Cada archivo se llama igual que la tabla (`cap-02-consulta.png`, …) y está en `Entrega 2/capturas/`.
- [ ] Cada archivo se abrió después de guardarlo y se verificó que no muestra token, `chat_id`, RUT real ni nombre de persona.
- [ ] La tabla de reporte del plan §3 tiene fecha, execution id y nombre de archivo por caso.
- [ ] Las capturas se adjuntaron al informe (sección 9) y al [checklist](checklist-entrega-2.md).

Comando para CA-11 (envía el update **sin** el encabezado secreto; el router debe descartarlo y no debe aparecer ningún mensaje nuevo en el chat A):

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5678/webhook/telegram-bot \
  -H "Content-Type: application/json" \
  -d '{"update_id":1,"message":{"message_id":1,"date":1,"chat":{"id":111111111},"text":"losartan 50"}}'
```

Ese `chat.id` es ficticio a propósito: si se usa el real del chat A, el update igual se descarta, pero conviene no escribirlo en la terminal que se va a capturar.

## 6. Si un caso falla

1. **No reintentar en caliente ni "arreglar" la planilla**: la captura del fallo es evidencia válida y más valiosa que una pasada forzada.
2. **Registrar el defecto** con el siguiente ID libre (`D-19`, porque el último documentado es `D-18` en [`estrategia-pruebas.md`](estrategia-pruebas.md) §6) y estos campos: ID, fecha, caso, severidad, esperado, real, execution id, captura, hoja afectada y responsable.
3. **Severidad** (misma escala del plan): *Crítico* = sobreventa, dato inventado, fuga de datos o consejo clínico (bloquea el release) · *Alto* = un flujo Must no funciona · *Medio* = mensaje confuso o caso borde · *Bajo* = detalle de texto.
4. **Abrir el issue**: `gh issue create --repo Jeple/Proyecto-IngenieraSoftware --title "D-19: <síntoma>" --body "<paso, esperado, real, execution id, captura, hoja>" --label bug`.
5. **Avisar:** a Javier (tablero y evidencias), a Antonio (capturas y CA-08), a Julián (repositorio/CI/PR) y a Álvaro (informe); si es crítico, a todo el equipo y a Juan Pablo (PO) para la decisión de alcance. Si la hoja `catalogo` quedó renombrada por CA-19, restaurarla antes de seguir.
6. Al cierre, anotar en la tabla de reporte del plan si el caso quedó «Pasa», «Falla» (con el ID del defecto) o «Pendiente» (con el motivo), y no declarar 21/21 si queda alguna captura o caso sin ejecutar.

## 7. Referencias

- Casos y criterios: [`plan-pruebas-aceptacion.md`](../plan-pruebas-aceptacion.md) §2–§5 · Guía manual complementaria: [`guia-pruebas-e2e.md`](../guia-pruebas-e2e.md) · Esquema de hojas y columnas: [`google-sheets-schema.md`](../google-sheets-schema.md) · Roles del personal y titularidad: [`identidad-roles.md`](../identidad-roles.md) · n8n y túnel: [`n8n-despliegue.md`](../n8n-despliegue.md).
- Evidencia ya generada: [`e2e-2026-11-09-22-10.md`](../evidencia/e2e/e2e-2026-11-09-22-10.md) · [`manual-receta-2026-11-09.md`](../evidencia/e2e/manual-receta-2026-11-09.md) · [`latencia-e2e-2026-11-09-22-06.json`](../evidencia/rendimiento/latencia-e2e-2026-11-09-22-06.json) · [`concurrencia-2026-11-09-22-07.json`](../evidencia/rendimiento/concurrencia-2026-11-09-22-07.json).
