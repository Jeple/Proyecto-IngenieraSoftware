# Esquema de datos (US-01)

Base operativa: Google Sheets, 4 pestañas. Los nombres de pestaña y de columna son exactamente los de este documento.

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
| Stock_Neto | **Fórmula en Sheets** `=Stock_Real-Stock_Reservado`. No está en el CSV. |
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
| Timestamp_Creacion / _Actualizacion / _Expiracion | ISO 8601 con offset `-03:00`. Expiración = creación + 48 h. |
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

Invariante: `Stock_Reservado` = suma de cantidades en pedidos en estado PENDIENTE_RECETA, RECETA_RECIBIDA, EN_PREPARACION o EN_RUTA, y `Stock_Neto >= 0`.

La atomicidad (bloqueo con `LockService` de Apps Script) se implementa en una US posterior.

## Estados del pedido
```
PENDIENTE_RECETA → RECETA_RECIBIDA → EN_PREPARACION → EN_RUTA → ENTREGADO
        │                  │
        └──────────────────┴──→ CANCELADO_EXPIRADO
```
- Pedidos sin medicamentos con receta nacen en `RECETA_RECIBIDA` (con `URL_Receta` vacía).
- Terminales: `ENTREGADO`, `CANCELADO_EXPIRADO`.
- La cancelación solo es posible desde `PENDIENTE_RECETA` y `RECETA_RECIBIDA`.
