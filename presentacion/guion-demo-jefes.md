# Guion de la demo con los jefes — en vivo (~8 minutos)

> Todo con datos sintéticos. La idea: que se vea **funcionando**, no que se explique. Antes de la reunión, repasar la lista de preparación del final.

| # | Tema a mostrar | Qué hacer (breve) |
|---|---|---|
| 1 | **Qué es esto** (30 seg) | Abrir el **panel** (`presentacion/panel-demo.html`): "este es el resumen de lo que el sistema ya procesó: 13 pedidos, $193.750, 29 movimientos — todo con datos de ejemplo". |
| 2 | **El vecino consulta** (1 min) | En Telegram, escribir `pregavalina 75` (con el error a propósito). Mostrar que responde bien: "tolera errores de escritura y las cifras salen de la planilla oficial, no las inventa". |
| 3 | **El vecino reserva** (1 min) | Escribir `reservar losartan 50 x2 rut 12.345.678-5, Av. Los Aromas 1234, Peñalolén Alto`. Mostrar el código `#FAR-XXXX` y el total. |
| 4 | **La reserva no se duplica** (30 seg) | Reenviar el mismo mensaje: responde con el código ya existente y no crea otro pedido. "Esto evita sobreventa y errores". |
| 5 | **El vecino sigue su pedido** (1 min) | Escribir `estado #FAR-XXXX` → respuesta. Luego, desde **otro chat**, el mismo código: "no lo encuentra". "Los pedidos de una persona no se filtran a otra". |
| 6 | **El químico farmacéutico valida** (1 min) | Desde el chat del farmacéutico: `aprobar FAR-XXXX`. "El sistema no reemplaza al farmacéutico: nada pasa a preparación sin su aprobación". |
| 7 | **Detrás de escena** (1 min) | Ventana de **n8n → Executions**: cada mensaje es una ejecución verde con su hora. "Todo queda auditado, y si algo falla el equipo recibe una alerta". |
| 8 | **Avance y cierre** (1 min) | Volver al panel: lo implementado, las **242 pruebas automáticas** y los pendientes honestos (validación final, video, documentos). Cierre: "se vende como WhatsApp; el prototipo corre en Telegram y la conexión real ya está planificada". |

## Preparación (10 minutos antes)

- Entorno levantado y bot respondiendo (detalle en `docs/guia-pruebas-e2e.md`).
- Chats de prueba limpios (vecino y farmacéutico); planilla abierta en otra pestaña; n8n en *Executions*.
- No mostrar datos reales: usar solo los fixtures sintéticos.
- **Plan B:** si falla el internet o el túnel → el panel + el video (cuando esté) o los informes.
