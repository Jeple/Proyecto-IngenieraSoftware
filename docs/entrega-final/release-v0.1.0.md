<!-- Texto para las notas de la release v0.1.0 en GitHub (gh release create --notes-file). Los enlaces apuntan a la etiqueta v0.1.0. -->

# v0.1.0 · Asistente de la Farmacia Comunitaria de Peñalolén

Primera versión del producto, al cierre del semestre (TICS331, Grupo 10). Es un prototipo funcional en Telegram, con datos ficticios, para que otras personas lo prueben y otro equipo lo continúe.

## Qué hace

- **Consulta de stock y precio**, aunque el nombre esté mal escrito, con bioequivalentes si está agotado.
- **Reserva con código #FAR**, que aparta el stock al instante.
- **Receta por foto** en el mismo chat, aprobada o rechazada por un químico farmacéutico.
- **Liberación automática** de las reservas sin receta a las 12 horas.
- **Estado del pedido**, visible solo para quien lo hizo.
- **Despacho** marcado por el personal («en ruta» y «entregado»), con aviso al vecino.
- **Alertas** al equipo cuando algo falla, y derivación al SAMU 131 ante urgencias.

## Cómo probarlo

- **Como vecino:** escriba al bot de la v0.1 (el enlace está en el informe final) y siga el [manual de uso](https://github.com/Jeple/Proyecto-IngenieraSoftware/blob/v0.1.0/docs/entrega-final/manual-de-uso.md).
- **Instalarlo:** [guía de continuidad](https://github.com/Jeple/Proyecto-IngenieraSoftware/blob/v0.1.0/docs/entrega-final/guia-continuidad.md) y [ambiente preproductivo](https://github.com/Jeple/Proyecto-IngenieraSoftware/blob/v0.1.0/docs/entrega-final/despliegue-preproductivo.md).
- **Pruebas:** `node scripts/correr-pruebas.mjs` (422 pruebas en 14 suites, solo requiere Node).

## Calidad al publicar

| Indicador | Valor |
|---|---|
| Pruebas automáticas | 422/422 ([resumen del 27-nov](https://github.com/Jeple/Proyecto-IngenieraSoftware/blob/v0.1.0/docs/evidencia/pruebas-unitarias/2026-11-27-07-34-resumen.md)) |
| Nodos de código con pruebas | 23/23 |
| Búsqueda: consultas bien identificadas | 50/50 |
| Casos de aceptación con las cuentas reales | 21/21 (9-nov) |

## Límites conocidos

Telegram en vez de WhatsApp, datos ficticios y escrituras de 5 a 20 segundos. Detalle en los [issues con la etiqueta `v0.1-pendiente`](https://github.com/Jeple/Proyecto-IngenieraSoftware/issues?q=label%3Av0.1-pendiente).

Cambios completos en el [CHANGELOG](https://github.com/Jeple/Proyecto-IngenieraSoftware/blob/v0.1.0/CHANGELOG.md).
