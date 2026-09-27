# PWA del conductor (US-11)

Placeholder del módulo web para el repartidor municipal de la Farmacia Comunitaria de Peñalolén. Su propósito es permitir marcar un pedido como `EN_RUTA` y `ENTREGADO` en un solo clic desde el teléfono en terreno, y notificar al vecino la estimación de llegada (RF-08).

## Stack planeado

- PWA ligera alojada en este mismo repositorio, dentro de la carpeta `pwa/` (sin tiendas de aplicaciones: las apps móviles nativas están fuera del alcance).
- Interfaz mínima orientada a pantallas pequeñas y uso con una mano; el estado se persiste en Google Sheets a través de los workflows de n8n.
- ETA calculado con la API pública de OSRM (`OSRM_BASE_URL` en `.env`) y enviada al vecino por WhatsApp.

## TODO

- [ ] US-11: pantalla de lista de entregas del día con `codigo_far`, `sector` y `direccion`.
- [ ] US-11: marcado de estados `PENDIENTE` → `EN_RUTA` → `ENTREGADO` (un clic, contra la hoja `despachos`).
- [ ] US-11: cálculo de `eta_minutos` con OSRM al marcar `EN_RUTA` y notificación por WhatsApp al cliente.
- [ ] US-11: modo offline básico para zonas de Peñalolén con cobertura intermitente.

El diseño de datos asociado está en [`docs/google-sheets-schema.md`](../docs/google-sheets-schema.md) (hojas `despachos` y `ordenes`); el flujo técnico completo, en [`docs/arquitectura.md`](../docs/arquitectura.md) (workflow `conductor-pwa`, RF-08).
