# Esquema de Google Sheets (US-01)

Modelo de datos operativo de la Farmacia Comunitaria de Peñalolén: un libro de Google Sheets con 5 hojas que funcionan como base de datos del prototipo (RNF-06). Este esquema lo crea automáticamente `scripts/setup-sheets.gs`; el personal de bodega lo consume como planilla convencional, mientras que n8n lo usa como almacenamiento transaccional. Los nombres de columna están en inglés porque son la interfaz técnica de los workflows; la documentación los describe en español.

## Resumen de hojas

| Hoja | Propiedad | Clave |
|---|---|---|
| `catalogo` | Catálogo oficial de medicamentos y precios | `medicamento_id` (PK) |
| `inventario` | Stock real y reservado por medicamento | `medicamento_id` (FK → `catalogo`) |
| `ordenes` | Solicitudes de reserva de los vecinos | `codigo_far` (PK) |
| `despachos` | Estado logístico del pedido a domicilio | `codigo_far` (PK, FK → `ordenes`) |
| `bitacora` | Bitácora de movimientos de reserva (trazabilidad) | Sin clave; solo inserción |

## Hoja `catalogo`

| Columna | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `medicamento_id` | text | Sí | Clave primaria con formato `MED-0001` |
| `nombre_comercial` | text | Sí | Nombre comercial del producto |
| `principio_activo` | text | Sí | Principio activo (base de la búsqueda difusa, RF-01) |
| `dosis` | text | Sí | Dosis del producto, p. ej. `75 mg` |
| `forma` | text | Sí | Forma farmacéutica, p. ej. `Cápsula`, `Comprimido` |
| `requiere_receta` | enum `SI` \| `NO` | Sí | Indica si el fármaco exige prescripción (ver D-01) |
| `precio_unitario_clp` | number | Sí | Precio unitario oficial en pesos chilenos |
| `bioequivalente_de` | text | No | `medicamento_id` del producto del cual este es bioequivalente; nulo si no aplica |
| `activo` | enum `SI` \| `NO` | Sí | Los productos inactivos no se ofrecen al vecino |

Notas:

- `bioequivalente_de` es una referencia a la propia hoja (`catalogo.medicamento_id`). En datos reales debe unir productos con el mismo `principio_activo` y `dosis`; es la columna que alimenta la sugerencia de reemplazos de RF-02.
- La búsqueda difusa (RF-01) cruza `nombre_comercial`, `principio_activo` y `dosis`.

## Hoja `inventario`

| Columna | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `medicamento_id` | text | Sí | Clave foránea → `catalogo.medicamento_id` |
| `stock_real` | int (≥ 0) | Sí | Unidades físicas en bodega |
| `stock_reservado` | int (≥ 0) | Sí | Unidades comprometidas por órdenes vigentes (RF-04) |
| `stock_neto` | formula | Sí | `=B<row>-C<row>`; cálculo legible para humanos, no debe usarse en lógica de n8n |
| `ultima_actualizacion` | datetime | Sí | Marca de tiempo del último movimiento |

Notas:

- Las columnas se alinean con la fórmula: `A = medicamento_id`, `B = stock_real`, `C = stock_reservado`, `D = stock_neto`. n8n recalcula el neto en sus expresiones (`stock_real - stock_reservado`) en lugar de leer la fórmula.
- Un `medicamento_id` tiene exactamente una fila de inventario.

## Hoja `ordenes`

| Columna | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `codigo_far` | text | Sí | Clave primaria con formato `FAR-0001`; se muestra al usuario como `#FAR-0001` (RF-03) |
| `fecha_creacion` | datetime | Sí | Momento de confirmación de la solicitud |
| `rut` | text | Sí | RUT del cliente |
| `telefono` | text | Sí | `chat_id` de Telegram del cliente. Se captura al crear la orden y se usa como destinatario de las notificaciones; puede ser también un id de grupo. Se conserva el nombre de la columna por compatibilidad con el modelo original |
| `nombre_cliente` | text | Sí | Nombre del solicitante |
| `medicamento_id` | text | Sí | Clave foránea → `catalogo.medicamento_id` |
| `cantidad` | int (≥ 1) | Sí | Unidades solicitadas |
| `precio_total_clp` | number | Sí | `cantidad × precio_unitario_clp` al momento de la reserva |
| `estado` | enum | Sí | Estado vigente del pedido (ver enumeración más abajo) |
| `url_receta` | text | No | URL de la receta en Google Drive (RNF-07); nula si no corresponde |
| `fecha_receta` | datetime | No | Momento en que la receta fue recibida |
| `fecha_expiracion` | datetime | Sí | `fecha_creacion + 12 horas`; define la ventana de expiración (RF-06) |
| `notas` | text | No | Observaciones operativas |

Enumeración de `estado` (RF-07: los estados vigentes son exactamente esta lista):

| Estado | Significado |
|---|---|
| `PENDIENTE_RECETA` | Orden confirmada; aguarda la fotografía de la receta |
| `RECETA_RECIBIDA` | Receta almacenada en Google Drive y enlazada en `url_receta` (llegó por Telegram o por correo IMAP, RF-05); habilita la aprobación farmacéutica (US-20): solo con aprobación explícita pasa a `EN_PREPARACION` |
| `EN_PREPARACION` | Bodega prepara el pedido |
| `EN_RUTA` | Pedido en despacho vehicular |
| `ENTREGADO` | Pedido entregado al vecino |
| `CANCELADO_EXPIRADO` | Cancelado por el cron de 12 horas (RF-06) |
| `RECHAZADO` | Receta rechazada por el farmacéutico (US-20); el stock reservado se libera en la misma transición |

Notas de `RECETA_RECIBIDA`:

- El cambio de estado ocurre solo después de que la receta está en Google Drive y `ordenes.url_receta` apunta a ella; nunca se marca el estado con la imagen aún sin subir.
- Junto con el estado se registra el movimiento `RECETA_RECIBIDA` en `bitacora` (delta `0`, sin efecto en `stock_reservado`) y se fija `fecha_receta`.
- La transición a `EN_PREPARACION` requiere aprobación explícita de un farmacéutico autorizado; el rechazo deja la orden en `RECHAZADO` y libera `stock_reservado` una sola vez (US-20, comandos por Telegram).

## Hoja `despachos`

| Columna | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `codigo_far` | text | Sí | Clave primaria y foránea → `ordenes.codigo_far` |
| `sector` | enum | Sí | `Peñalolén Alto` \| `Peñalolén Nuevo` \| `San Luis` \| `Otro` |
| `direccion` | text | Sí | Dirección de entrega |
| `estado_ruta` | enum | Sí | `PENDIENTE` \| `EN_RUTA` \| `ENTREGADO` |
| `eta_minutos` | int | No | Duración estimada del viaje calculada por OSRM (RF-08) |
| `fecha_marcado` | datetime | No | Momento del último cambio de `estado_ruta` |

Notas:

- Los sectores replican los tres macrosectores de mayor demanda del informe de Inception.
- `estado_ruta` es la vista logística del conductor; el estado comercial del pedido vive en `ordenes.estado`.

## Hoja `bitacora`

| Columna | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `timestamp` | datetime | Sí | Momento del movimiento |
| `accion` | text | Sí | Tipo de movimiento, p. ej. `RESERVA_ALTA`, `RESERVA_LIBERADA`, `EXPIRACION`, `RECETA_RECIBIDA`, `RECETA_APROBADA`, `RECETA_RECHAZADA` |
| `codigo_far` | text | Sí | Orden afectada |
| `medicamento_id` | text | Sí | Medicamento afectado |
| `delta_reservado` | int (con signo) | Sí | Variación de `stock_reservado` (positivo al reservar, negativo al liberar) |
| `detalle` | text | No | Información adicional del movimiento |
| `estado_anterior` | text | No | Estado de origen de la transición (desde US-20) |
| `estado_nuevo` | text | No | Estado de destino de la transición (desde US-20) |
| `actor` | text | No | Actor que ejecutó la transición, p. ej. `farmaceutico:<chat_id>` (desde US-20) |

Notas:

- Hoja de solo inserción desde n8n: nunca se editan ni borran filas; es la evidencia de trazabilidad que explica cada cambio de `stock_reservado`.
- Todo flujo que modifica reservas debe escribir su contraparte en `bitacora` en la misma operación encolada.
- Las columnas `estado_anterior`, `estado_nuevo` y `actor` se incorporaron con US-20; US-05, US-09 y US-10 todavía no las completan (alineación pendiente, ver [ciclo-vida-pedido.md](./ciclo-vida-pedido.md)).

## Reglas de negocio

| Regla | Comportamiento | Referencia |
|---|---|---|
| Saldo neto y quiebre | `stock_neto = stock_real - stock_reservado`. Si el saldo es 0, se informa el quiebre y se sugieren bioequivalentes: filas de `catalogo` cuyo `bioequivalente_de` apunta al `medicamento_id` consultado (búsqueda inversa), solo con `activo = SI` | RF-02 |
| Reserva inmediata | Toda orden confirmada incrementa `stock_reservado` de forma inmediata y registra el movimiento en `bitacora` | RF-04 |
| Expiración a 12 horas | Un cron horario cancela las órdenes `PENDIENTE_RECETA` con `fecha_expiracion` vencida: estado `CANCELADO_EXPIRADO`, decremento de `stock_reservado`, registro en `bitacora` y notificación al usuario por Telegram | RF-06 |
| Aprobación farmacéutica | `RECETA_RECIBIDA` → `EN_PREPARACION` solo con aprobación explícita de un farmacéutico autorizado; `rechazar` pasa la orden a `RECHAZADO` y libera `stock_reservado` una sola vez. Los comandos llegan por Telegram y el chat debe estar en `TELEGRAM_PHARMACIST_CHAT_IDS` | US-20 (GitHub #18) |
| Estados vigentes | Los estados válidos de una orden son exactamente la enumeración de `ordenes.estado`; RF-07 los devuelve al consultar por RUT o `#FAR-XXXX` | RF-07 |
| Escrituras serializadas | Las escrituras de reserva son secuenciales y encoladas desde n8n (un solo worker). La API de Sheets se trata como recurso serializado para evitar condiciones de carrera y sobreventas | RNF-04 |
| Recetas fuera de la planilla | `ordenes.url_receta` apunta a Google Drive con permisos restringidos a personal autorizado. Nunca se guardan imágenes de recetas dentro del spreadsheet | RNF-07 |

## Decisión D-01 — estado inicial de órdenes sin receta (resuelta)

> **Resuelta por el equipo el 16-oct-2026.** Si `requiere_receta = NO`, la orden nace directamente en `EN_PREPARACION` y no expira. Si `requiere_receta = SI`, la orden nace en `PENDIENTE_RECETA` con `fecha_expiracion = fecha_creacion + 12 h` (RF-06).
>
> Implementada en `workflows/US-05-reserva.json` (nodo `evaluate_reservation`, función `initialStateFor`) y verificada en `scripts/test-reserva.mjs`. No agrega estados fuera de la enumeración de `ordenes.estado`.

## Checklist de validación con el equipo

- [x] D-01 confirmada (16-oct-2026): sin receta → `EN_PREPARACION`; con receta → `PENDIENTE_RECETA` (12 h).
- [ ] Validar con bodega los nombres de columna y los enums (`sector`, `estado`, `estado_ruta`).
- [ ] Verificar que las cantidades de `stock_real` del catálogo oficial respetan `int ≥ 0`.
- [ ] Eliminar las filas de ejemplo de `catalogo` e `inventario` creadas por `scripts/setup-sheets.gs` antes de cargar el catálogo oficial.
