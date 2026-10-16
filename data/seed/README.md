# Datos sintéticos (US-01)

CSV generados por `scripts/generate_seed.py` (datos ficticios, semilla fija). Para regenerarlos:

```
python3 scripts/generate_seed.py
```

El script valida el stock reservado, IDs únicos, FKs, estados y DV de RUT antes de escribir.

## Carga en Google Sheets

1. Crear una planilla con 4 pestañas: `Medicamentos`, `Pedidos`, `Items_Pedido`, `Log_Reservas`.
2. En cada pestaña: **Archivo → Importar → Subir** el CSV correspondiente
   (`medicamentos.csv`, `pedidos.csv`, `items_pedido.csv`, `log_reservas.csv`).
   - Ubicación de importación: **Reemplazar hoja actual**.
   - Separador: coma.
   - **Desmarcar** "Convertir texto en números, fechas y fórmulas" (conserva el RUT, el teléfono y el `#` del ID).
3. En `Medicamentos`, agregar la columna `Stock_Neto` (columna L) con `=I2-J2` y arrastrarla hasta la última fila.
4. En `Pedidos`, aplicar **Datos → Validación de datos → Menú desplegable** a la columna `Estado` con:
   `PENDIENTE_RECETA, RECETA_RECIBIDA, EN_PREPARACION, EN_RUTA, ENTREGADO, CANCELADO_EXPIRADO`.

Descripción de columnas y reglas: [docs/esquema-datos.md](../../docs/esquema-datos.md).
