# Ciclo de vida del pedido y validación farmacéutica (US-20 · GitHub #18)

Este documento es la fuente única de la máquina de estados del pedido: estados canónicos, matriz de transiciones autorizadas, actores, efectos sobre el stock y trazabilidad mínima. Todo workflow que cambie `ordenes.estado` debe respetar esta matriz.

## Estados canónicos

Exactamente la enumeración de `ordenes.estado` definida en [`google-sheets-schema.md`](./google-sheets-schema.md) y aplicada por `scripts/setup-sheets.gs`:

| Estado | Significado | Terminal |
|---|---|---|
| `PENDIENTE_RECETA` | Orden con receta confirmada; aguarda la fotografía de la receta | No |
| `RECETA_RECIBIDA` | Receta almacenada en Drive y enlazada en `url_receta`; aguarda aprobación farmacéutica | No |
| `EN_PREPARACION` | Bodega prepara el pedido | No |
| `EN_RUTA` | Pedido en despacho | No |
| `ENTREGADO` | Pedido entregado al vecino | Sí |
| `CANCELADO_EXPIRADO` | Expiró sin receta (cron de 12 horas, US-10) | Sí |
| `RECHAZADO` | Receta rechazada por el farmacéutico (US-20) | Sí |

## Actores

| Actor | Identificación | Capacidades |
|---|---|---|
| Cliente (bot) | `chat_id` de Telegram (columna `telefono` de `ordenes`) | Consultar stock, reservar, enviar su receta, consultar el estado de sus pedidos |
| Farmacéutico | `chat_id` incluido en `TELEGRAM_PHARMACIST_CHAT_IDS` | Aprobar o rechazar recetas por Telegram (US-20) |
| Operador / conductor | PWA del repartidor (US-11) | Marcar `EN_RUTA` y `ENTREGADO` en `despachos.estado_ruta` |
| Sistema | Cron horario (US-10) | Expirar reservas vencidas sin receta |

## Matriz de transiciones autorizadas

| # | Transición | Actor | Precondición | Efecto en stock | Auditoría (bitacora) |
|---|---|---|---|---|---|
| 1 | Alta → `PENDIENTE_RECETA` | Cliente (US-05) | `requiere_receta = SI`; RUT, dirección y sector válidos; sin duplicado reciente | +`cantidad` reservada | `RESERVA_ALTA` |
| 2 | Alta → `EN_PREPARACION` | Cliente (US-05) | `requiere_receta = NO`; RUT, dirección y sector válidos; sin duplicado reciente | +`cantidad` reservada | `RESERVA_ALTA` |
| 3 | `PENDIENTE_RECETA` → `RECETA_RECIBIDA` | Cliente (US-09, foto por Telegram) | Código `#FAR-XXXX` válido; archivo en Google Drive | Sin cambio | `RECETA_RECIBIDA` |
| 4 | `RECETA_RECIBIDA` → `EN_PREPARACION` | Farmacéutico (US-20) | Chat autorizado + comando `aprobar FAR-XXXX` | Sin cambio | `RECETA_APROBADA` |
| 5 | `RECETA_RECIBIDA` → `RECHAZADO` | Farmacéutico (US-20) | Chat autorizado + comando `rechazar FAR-XXXX [motivo]` | −`cantidad` (una sola vez) | `RECETA_RECHAZADA` |
| 6 | `PENDIENTE_RECETA` → `CANCELADO_EXPIRADO` | Sistema (US-10) | `fecha_expiracion` vencida sin receta | −`cantidad` (una sola vez) | `EXPIRACION` |
| 7 | `EN_PREPARACION` → `EN_RUTA` | Operador / conductor (US-11) | Pedido despachado | Sin cambio | Pendiente (ver brechas) |
| 8 | `EN_RUTA` → `ENTREGADO` | Conductor (US-11) | Entrega confirmada | Sin cambio | Pendiente (ver brechas) |

Transiciones **prohibidas** (se rechazan sin tocar el pedido ni el stock):

- `PENDIENTE_RECETA` → `EN_PREPARACION` directo: falta la receta y su aprobación.
- `RECETA_RECIBIDA` → `EN_PREPARACION` sin aprobación explícita del farmacéutico.
- Cualquier transición que salga de un estado terminal (`ENTREGADO`, `CANCELADO_EXPIRADO`, `RECHAZADO`).

## Reglas de idempotencia

- **El estado de origen es la guarda:** cada transición valida primero el estado actual del pedido (US-20 y US-10). Un comando repetido, un reintento o una reentrega de Telegram no produce escrituras ni libera stock dos veces.
- **El stock nunca queda negativo:** las liberaciones aplican `max(0, stock_reservado − cantidad)`.
- **Duplicados recientes:** un reenvío idéntico del mismo chat (mismo medicamento y cantidad dentro de 2 minutos) devuelve la reserva existente y no escribe nada (US-05).
- **Una operación, una fila:** cada cambio de estado con efecto en stock escribe su movimiento en `bitacora` en la misma ejecución.

## Trazabilidad mínima

Columnas de `bitacora`: `timestamp`, `accion`, `codigo_far`, `medicamento_id`, `delta_reservado`, `detalle`, `estado_anterior`, `estado_nuevo`, `actor` (las tres últimas se incorporaron con US-20).

- `detalle` identifica al actor y, en rechazos, el motivo — nunca datos clínicos ni la receta.

## Brechas conocidas y pendientes

- **US-09 y US-10** todavía no completan `estado_anterior`, `estado_nuevo` y `actor` en sus filas de bitácora (alineación pendiente); US-05 sí lo hace desde GitHub #7.
- **US-09 no verifica titularidad:** hoy cualquier chat que conozca un código `#FAR-XXXX` puede adjuntar una receta a ese pedido; cubrirlo forma parte del modelo de identidad (GitHub #19).
- **Cancelación por el cliente:** no implementada; cuando exista, debe liberar stock exactamente una vez y registrarse como las demás transiciones.
- **PWA (US-11):** escribe `despachos.estado_ruta` sin bitácora; su backend definitivo debe emitirla (GitHub #13).

## Decisión D-01 (resuelta el 16-oct-2026)

Los pedidos **sin receta** nacen directamente en `EN_PREPARACION`; los que **requieren receta** nacen en `PENDIENTE_RECETA` con `fecha_expiracion = fecha_creacion + 12 h`. Implementado en US-05 y documentado en [`google-sheets-schema.md`](./google-sheets-schema.md).
