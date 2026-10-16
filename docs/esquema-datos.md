# Esquema de datos (US-01)

Base operativa: Google Sheets, 4 pestañas. Los nombres de pestaña y de columna son exactamente los de este documento.

> **Estado:** este documento describe el **modelo inicial de datos (US-01)** y se conserva como referencia histórica y de los datos sintéticos. El **esquema operativo vigente** del prototipo es [`google-sheets-schema.md`](./google-sheets-schema.md); la correspondencia entre ambos está al final de este documento (reconciliación del 16-oct-2026).

## Medicamentos
Una fila por presentación y marca.

| Columna | Descripción |
|---|---|
| ID_Medicamento | `MED-001`. Clave estable. |
| Principio_Activo | Ej. Pregabalina. |
| Marca | Nombre comercial (ficticio en datos seed). |
| Dosis | Texto, ej. `75 mg`. Cada dosis es una fila distinta. |
| Forma_Farmaceutica | Cápsula, Comprimido… |
| Grupo_Bioequivalente | `BE-PREG-75`. Marcas con el mismo grupo son intercambiables. |
| Requiere_Receta | `SI` / `NO`. Define el estado inicial del pedido. |
| Precio_CLP | Entero. |
| Stock_Real | Unidades físicas en bodega. |
| Stock_Reservado | Unidades comprometidas por pedidos vivos. |
| Stock_Disponible | **Fórmula en Sheets** `=Stock_Real-Stock_Reservado`. No está en el CSV. |
| Activo | `SI` / `NO`. Descontinuar sin borrar historial. |

## Pedidos (cabecera)

| Columna | Descripción |
|---|---|
| ID_Pedido | `#FAR-0001`. Código visible al usuario. |
| RUT | Normalizado `12345678-5` (sin puntos, DV `0-9` o `K`). |
| Telefono | `+569XXXXXXXX`. |
| Direccion, Sector | Entrega. Sector agrupa rutas. |
| Estado | Ver estados. |
| URL_Receta | Vacía hasta recibir la receta. |
| Timestamp_Creacion / _Actualizacion / _Expiracion | ISO 8601 con offset `-03:00`. Expiración = creación + 48 h. **(superado: 12 h; ver reconciliación)** |
| Total_CLP | Suma de Items_Pedido. |

## Items_Pedido
| Columna | Descripción |
|---|---|
| ID_Pedido | FK a Pedidos. |
| ID_Medicamento | FK a Medicamentos. |
| Cantidad | Unidades. |
| Precio_Unitario_CLP | Precio congelado al crear el pedido. |

## Log_Reservas (append-only)
| Columna | Descripción |
|---|---|
| ID_Log | `LOG-00001`. |
| Timestamp | ISO 8601. |
| ID_Pedido, ID_Medicamento, Cantidad | Qué se movió. |
| Tipo_Evento | `RESERVA`, `CONFIRMACION_ENTREGA`, `LIBERACION_CANCELACION`, `LIBERACION_EXPIRACION`. |
| Stock_Real_Despues, Stock_Reservado_Despues | Estado del medicamento tras el evento. |
| Origen | `BOT`, `ADMIN`, `JOB_EXPIRACION`. |

## Reglas de stock
| Evento | Efecto |
|---|---|
| RESERVA | `Reservado += n`, solo si `Real - Reservado >= n`. |
| CONFIRMACION_ENTREGA | `Real -= n` y `Reservado -= n`. |
| LIBERACION_CANCELACION / LIBERACION_EXPIRACION | `Reservado -= n`. |

Invariante: `Stock_Reservado` = suma de cantidades en pedidos en estado PENDIENTE_RECETA, RECETA_RECIBIDA, EN_PREPARACION o EN_RUTA, y `Stock_Disponible >= 0`.

La atomicidad (bloqueo con `LockService` de Apps Script) se implementa en una US posterior.

## Estados del pedido
```
PENDIENTE_RECETA → RECETA_RECIBIDA → EN_PREPARACION → EN_RUTA → ENTREGADO
        │                  │
        └──────────────────┴──→ CANCELADO_EXPIRADO
```
- Pedidos sin medicamentos con receta nacen en `RECETA_RECIBIDA` (con `URL_Receta` vacía). **(superado: nacen en `EN_PREPARACION`; D-01 resuelta el 16-oct-2026, ver reconciliación)**
- Terminales: `ENTREGADO`, `CANCELADO_EXPIRADO`.
- La cancelación solo es posible desde `PENDIENTE_RECETA` y `RECETA_RECIBIDA`.

## Privacidad
| Hoja | Datos personales | Criterio |
|---|---|---|
| Pedidos | RUT, Telefono, Direccion, URL_Receta | Mínimo necesario para validar, contactar y entregar. |
| Items_Pedido | Medicamentos por pedido | Unido al RUT permite inferir una condición de salud: restringir el acceso. |
| Log_Reservas | Ninguno | Solo IDs y cantidades. Sin RUT, teléfono, dirección ni receta. |
| Medicamentos | Ninguno | Catálogo y stock. |

- La receta se guarda solo como URL, nunca su contenido ni el diagnóstico.
- Datos seed ficticios: RUT con DV válido, marcas inventadas y URLs `example.org`.
- La planilla debe compartirse solo con el equipo (Editor). Nunca con "cualquiera con el enlace".

## Decisiones de diseño
- **Items_Pedido separada de Pedidos:** un pedido puede tener varios medicamentos.
- **Precio congelado en el ítem:** un cambio posterior de precio no altera pedidos existentes.
- **Log_Reservas append-only:** auditoría y reconstrucción del stock.
- **Stock_Disponible como fórmula:** una sola fuente de verdad, no se guarda en el CSV.
- **Cada dosis es una fila:** evita mezclar presentaciones al reservar stock.

## Correspondencia con el esquema operativo (reconciliación, 16-oct-2026)

El esquema operativo vigente del prototipo es [`google-sheets-schema.md`](./google-sheets-schema.md) (pestañas `catalogo`, `inventario`, `ordenes`, `despachos` y `bitacora`), implementado por `scripts/setup-sheets.gs` y por todos los workflows. Correspondencia con este modelo inicial:

| Modelo inicial (US-01) | Esquema operativo | Nota |
|---|---|---|
| `Medicamentos` (con stock) | `catalogo` + `inventario` | El stock se separa del catálogo para proteger precios y alinear con la planilla real de la farmacia |
| `Pedidos` (cabecera) | `ordenes` | Un pedido del MVP lleva **un** medicamento; el multi-ítem de `Items_Pedido` queda como evolución |
| `Items_Pedido` | `ordenes.medicamento_id`, `cantidad`, `precio_total_clp` | El precio unitario congelado de la orden |
| `Pedidos.Direccion/Sector` | `despachos.direccion/sector` | La vista logística vive aparte; `estado_ruta` cubre el ciclo de despacho |
| `Log_Reservas` | `bitacora` | Equivalente append-only; conserva `delta_reservado` y agrega `estado_anterior`, `estado_nuevo`, `actor` |
| `MED-001` | `MED-0001` | Cuatro dígitos, consistente con `FAR-XXXX` |
| `Telefono +569...` | `telefono` = `chat_id` de Telegram | Se conserva el nombre de columna por compatibilidad |
| Estados (6) | Estados (7: se agrega `RECHAZADO`) | La aprobación farmacéutica (US-20) incorpora el rechazo de receta |
| Expiración 48 h | Expiración 12 h | Decisión del equipo; implementada en US-05 y US-10 (RF-06, issue #12) |
| Sin receta -> `RECETA_RECIBIDA` | Sin receta -> `EN_PREPARACION` | D-01 resuelta por el equipo el 16-oct-2026 |
| Atomicidad con `LockService` (US posterior) | Cola serializada de n8n (RNF-04) | Documentada en el esquema operativo |

**Datos sintéticos:** los CSV de `data/seed/` siguen este modelo inicial y se mantienen como referencia (16 presentaciones, 13 pedidos, 29 eventos). Cargarlos en la planilla operativa requiere una conversión con el mapeo de la tabla anterior (pendiente de script) o regenerarlos directamente en el formato operativo.
