# Runbook de operaciones (GitHub #20)

Procedimientos paso a paso para los incidentes del prototipo. El enfoque, las métricas y las políticas están en [observabilidad.md](./observabilidad.md).

## 1. El bot no responde a los vecinos

**Síntomas:** mensajes sin respuesta; no aparecen ejecuciones nuevas del webhook.

**Diagnóstico:**

1. `docker compose ps`: contenedores `n8n` y `cloudflared` arriba.
2. n8n → Workflows: el workflow del canal está **activo**.
3. n8n → Executions: ¿llegan ejecuciones nuevas del webhook?
4. Consultar `getWebhookInfo` del bot en Telegram y confirmar que apunta al host del túnel.

**Acción:** reiniciar el contenedor caído (`docker compose restart <servicio>`); si el túnel cambió de URL, actualizar el webhook del bot. Detalle en [n8n-despliegue.md](./n8n-despliegue.md).

## 2. No llegan las alertas de error

1. Verificar `TELEGRAM_ADMIN_CHAT_ID` en `.env`.
2. Confirmar que `US-21-alertas-errores.json` está importado, **activo** y configurado como **Error Workflow** en Settings de n8n.
3. Si el bot está caído, la alerta no puede salir: revisar **Executions** directamente (fallback documentado).

## 3. Error de Google Sheets (permisos o cuota)

1. Identificar el nodo que falló en la alerta.
2. Verificar la credencial de servicio (archivo en `secrets/`, permisos de edición del libro).
3. Si es cuota (429), esperar y reprocesar: la idempotencia evita duplicados.

## 4. CONFLICTO_INVENTARIO en una reserva

1. Comparar `inventario.stock_reservado` con la suma de órdenes vivas del medicamento.
2. Ajustar `stock_reservado` a mano en la hoja al valor correcto.
3. Anotar el ajuste en `ordenes.notas` del pedido afectado. La `bitacora` no se edita (solo inserción).

## 5. Expiración con CLAMP

1. Buscar en `bitacora` las filas `EXPIRACION` con `CLAMP` en `detalle`.
2. Auditar el `stock_reservado` del medicamento y corregirlo si quedó subestimado.

## 6. El cron de expiración no corre

1. n8n → Workflows: `cron-expiracion` activo.
2. Executions del workflow: la última ejecución debe tener menos de 1 hora.
3. Si está inactivo, activarlo y verificar la zona horaria del contenedor.

## 7. Reproceso de un evento fallido

1. Leer la alerta (workflow, ejecución, nodo).
2. Abrir la ejecución en n8n y corregir la causa (credencial, cuota, dato).
3. Usar **Retry** de la ejecución: las guardas por estado y la ventana de duplicados garantizan que no se duplica nada.
4. Confirmar en `bitacora` que el efecto quedó registrado una sola vez.

## 8. Restauración (respaldo → entorno limpio)

1. Restaurar el volumen de n8n con el respaldo más reciente (ver [n8n-despliegue.md](./n8n-despliegue.md)).
2. Verificar workflows activos y credenciales.
3. Si hubo daño de datos, restaurar una versión del libro de Sheets desde su historial.
4. Evidencia esperada: workflows activos + una reserva sintética de punta a punta.
