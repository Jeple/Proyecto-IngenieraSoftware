# Guion del video demostrativo — Sprint 1 (~5 minutos)

> Uso interno para grabar. Todo con datos sintéticos: chat de prueba, RUT ficticio (por ejemplo `12.345.678-5`) y direcciones inventadas. Antes de grabar, revisar que no queden datos reales visibles en el chat, la planilla ni las notificaciones.

## Preparación (antes de grabar)

1. Entorno levantado (`docker compose up -d`), workflows activos y bot de Telegram respondiendo.
2. Planilla con el catálogo sintético cargado; borrar filas de ejemplo si persisten.
3. Chat de prueba limpio en el teléfono/escritorio, sin historial previo con datos reales.
4. Grabar pantalla del chat + (opcional) ventana de n8n → Executions, y planilla en otra pestaña.

## Escena 1 — Presentación (0:00–0:20)

Voz en off / cartel: "Farmacia Comunitaria de Peñalolén — asistente del prototipo para consultas, reservas y estado de pedidos. Datos sintéticos."

## Escena 2 — Consulta de stock con error de escritura (0:20–1:20)

- Escribir: `hola, tienen pregavalina 75?`
- Mostrar la respuesta: producto correcto, precio en CLP y stock disponible (lógica difusa tolerando el typo).
- Escribir una consulta de un producto con stock 0 para mostrar la sugerencia de bioequivalentes.
- Mencionar: "las cifras salen de la planilla oficial; el bot no inventa datos".

## Escena 3 — Reserva con código (1:20–2:40)

- Escribir: `reservar losartan 50 x2 rut 12.345.678-5, Av. Los Aromas 1234, Peñalolén Alto`
- Mostrar la respuesta con `#FAR-XXXX`, total y la instrucción de 12 horas si requiere receta.
- (Opcional) Mostrar en la planilla: la fila nueva en `ordenes` y el `stock_reservado` incrementado.

## Escena 4 — Guardas de negocio (2:40–3:20)

- Reenviar el mismo mensaje → respuesta "ya quedó registrado" (sin duplicar).
- Probar una dirección fuera de cobertura (`... Ñuñoa`) → rechazo con mensaje claro, sin escribir nada.

## Escena 5 — Consulta de estado (3:20–4:00)

- Escribir: `estado de mi pedido FAR-XXXX`
- Mostrar la respuesta correcta.
- (Opcional, potente) Desde OTRO chat de prueba, consultar el mismo código → mismo mensaje neutro que "no encontrado" (los pedidos de terceros no se filtran).

## Escena 6 — Cierre y evidencia (4:00–5:00)

- Mostrar la pestaña de Executions de n8n (todo verde) y la suite de pruebas en la CI.
- Cierre: "Sprint 1: consulta, reserva y trazabilidad funcionando de punta a punta en el prototipo; WhatsApp llega en la siguiente fase".

## Checklist de privacidad antes de publicar

- [ ] Sin RUT, direcciones ni recetas reales en pantalla.
- [ ] Los códigos mostrados son de los datos sintéticos.
- [ ] Sin tokens ni URLs internas visibles (cuidado con la barra de direcciones de n8n).
- [ ] Notificaciones del sistema silenciadas.
