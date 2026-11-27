**Problema.** Una reserva escribe en varias hojas (`ordenes`, `inventario`, `bitacora` y `despachos`). Si Google rechaza una escritura a mitad de camino, el pedido puede quedar incompleto. Hoy lo mitigan 3 reintentos y una alerta al equipo (US-21).

**Propuesta.** Un paso de compensación que deshaga lo ya escrito y avise al vecino, con una prueba que simule el rechazo.

**Criterio de aceptación.** Dado un rechazo simulado de la hoja `inventario`, cuando un vecino reserva, entonces no queda la fila en `ordenes` ni stock reservado, y el vecino recibe el aviso de error.

**Relacionado.** RS-09 en `docs/entrega-2/matriz-riesgos-seguridad.md` y #15.
