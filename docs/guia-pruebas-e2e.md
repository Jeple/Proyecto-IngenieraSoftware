# Guía de pruebas de punta a punta (E2E)

Prueba manual del prototipo completo con el entorno real (n8n + Google Sheets + bot de Telegram). Cubre la evidencia pendiente de los issues de consulta, reserva, trazabilidad, recetas y aprobación. **Todo con datos sintéticos.**

## 1. Preparación del entorno

1. `.env` completo: `GOOGLE_SHEET_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_PHARMACIST_CHAT_IDS`, `TELEGRAM_ADMIN_CHAT_ID`.
2. Planilla creada con `scripts/setup-sheets.gs` (borrar las filas de ejemplo) y catálogo sintético cargado (mínimo: un producto con stock, uno con stock 0 y un bioequivalente con stock).
3. Workflows importados y **activos**: `consulta-stock`, `reserva`, `trazabilidad`, `recetas-telegram`, `aprobacion-recetas`, `cron-expiracion`, `alertas-errores` (configurado como Error Workflow).
4. Webhook de Telegram apuntando al túnel (`setWebhook`), un chat de prueba (vecino) y otro chat de prueba (farmacéutico, incluido en `TELEGRAM_PHARMACIST_CHAT_IDS`).

## 2. Matriz de pruebas

### Consulta de stock (US-04)

| # | Acción | Resultado esperado | Evidencia |
|---|---|---|---|
| C1 | Enviar `pregavalina 75` (con typo) | Producto correcto con precio y stock reales | Captura + execution id |
| C2 | Enviar `hola` sin producto | Pide el nombre del medicamento, sin inventar nada | Captura |
| C3 | Consultar producto con stock 0 | Informa quiebre y sugiere bioequivalentes disponibles | Captura |

### Reserva (US-05)

| # | Acción | Resultado esperado | Evidencia |
|---|---|---|---|
| R1 | `reservar {producto} x2 rut 12.345.678-5, Av. Los Aromas 1234, Peñalolén Alto` | Reserva `#FAR-XXXX`, stock incrementado, fila en `despachos` PENDIENTE | Captura + filas de la planilla |
| R2 | Reenviar el mismo mensaje dentro de 2 minutos | "Ya quedó registrado" con el mismo código; sin filas nuevas | Captura + conteo de filas |
| R3 | Reservar con `... Ñuñoa` | Rechazo por cobertura; sin escrituras | Captura |
| R4 | Reservar sin RUT | Pide el RUT; sin escrituras | Captura |
| R5 | Reservar más unidades que el stock | Mensaje con el stock exacto disponible; sin reserva parcial | Captura |

### Trazabilidad (US-06)

| # | Acción | Resultado esperado | Evidencia |
|---|---|---|---|
| T1 | Desde el chat titular: `mi pedido FAR-XXXX` | Estado correcto | Captura |
| T2 | Desde OTRO chat: el mismo código | Mismo mensaje que "no encontrado"; sin filtrar datos | Captura |
| T3 | Código inexistente | Mensaje neutro | Captura |

### Receta + aprobación (US-09 / US-20)

| # | Acción | Resultado esperado | Evidencia |
|---|---|---|---|
| A1 | Chat titular: foto de receta con pie `#FAR-XXXX` (pedido PENDIENTE_RECETA) | `RECETA_RECIBIDA`, URL en la fila, bitácora | Captura + fila |
| A2 | Farmacéutico: `aprobar FAR-XXXX` | Pasa a `EN_PREPARACION`; aviso al cliente | Captura (ambos chats) |
| A3 | Farmacéutico: `rechazar FAR-XXXX foto ilegible` (otro pedido) | Estado `RECHAZADO`, stock liberado una vez, aviso con motivo | Captura + fila inventario |
| A4 | Repetir `rechazar` sobre el mismo pedido | "Ya estaba rechazado"; sin segunda liberación | Captura + inventario igual |
| A5 | Foto desde un chat ajeno con código válido | Mismo mensaje que código inexistente; sin asociación | Captura |

### Expiración (US-10)

| # | Acción | Resultado esperado | Evidencia |
|---|---|---|---|
| E1 | Crear un pedido PENDIENTE_RECETA con `fecha_expiracion` pasada y ejecutar el cron manualmente | `CANCELADO_EXPIRADO`, stock liberado, aviso | Captura + fila |

### Observabilidad (US-21)

| # | Acción | Resultado esperado | Evidencia |
|---|---|---|---|
| O1 | Forzar un error (por ejemplo, `GOOGLE_SHEET_ID` inválido) y ejecutar `consulta-stock` | Alerta CRITICAL en el chat admin con workflow, nodo y enlace | Captura |
| O2 | Reintentar la ejecución fallida tras corregir | Éxito, sin duplicados en la bitácora | Captura |

## 3. Registro de la prueba

Anotar para cada caso: fecha, responsable, resultado (OK / falla), execution id y captura. Al terminar, adjuntar el registro al cierre del sprint correspondiente y limpiar los datos sintéticos usados (o marcarlos como demo).

## 4. Privacidad

- Nunca usar RUT, direcciones, teléfonos ni recetas reales; los fixtures de ejemplo son ficticios.
- Silenciar notificaciones personales antes de capturar pantallas; ocultar tokens si se muestran URLs.
