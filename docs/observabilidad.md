# Observabilidad, alertas y recuperación (US-21 · GitHub #20)

Estrategia de diagnóstico del prototipo: qué se observa, cómo se correlaciona sin datos personales, qué se alerta y cómo se reprocesa. Los procedimientos paso a paso viven en [runbook-operaciones.md](./runbook-operaciones.md).

## Estrategia de correlación

- **Ejecuciones:** cada ejecución de n8n tiene `execution id`; la alerta de error lo incluye con enlace directo para diagnóstico.
- **Negocio:** la línea de tiempo de un pedido se reconstruye con `bitacora` por `codigo_far` (timestamps, acción, actor, delta) — nunca con datos personales.
- **Webhooks:** el `update_id` de Telegram queda visible en la ejecución de origen; sirve para distinguir una reentrega de un mensaje nuevo.
- **Regla:** ni los logs ni las alertas incluyen RUT, dirección, teléfono ni contenido de recetas (ver [identidad-roles.md](./identidad-roles.md)).

## Eventos y niveles de alerta

| Evento | Nivel | Destino | Acción esperada |
|---|---|---|---|
| Fallo definitivo de un workflow (Error Trigger) | CRITICAL | Telegram del admin (US-21) | Runbook: diagnóstico por workflow |
| `CONFLICTO_INVENTARIO` (verificación posterior a la escritura, US-05) | WARN | Cliente + revisión manual | Revisar `inventario` vs `ordenes` |
| Expiración con `CLAMP` (US-10) | WARN | `bitacora` | Auditar `stock_reservado` |
| Receta rechazada (US-20) | INFO | Cliente + `bitacora` | — |
| Entrega fuera de cobertura o duplicado (US-05) | INFO | Cliente | — |

## Métricas y panel operativo

El panel es el que n8n ya ofrece (capa gratuita, RNF-05) — no hay dashboard propio:

- **Overview**: volumen de ejecuciones y tendencia de errores por hora y por día.
- **Executions**: lista filtrable por estado y workflow, con tiempos de ejecución (latencia) y reintentos.
- **Workflows**: columna de activos, para detectar workflows detenidos por accidente.

Qué revisar cada día: tasa de error de los workflows críticos (reserva, recetas, cron), latencia de los webhooks, alertas CRITICAL en Telegram y workflows inactivos.

## Políticas de timeout, retry e idempotencia

- **Reintentos de envío (Telegram):** los nodos `httpRequest` de salida (US-05, US-06, US-09, US-20 y US-21) usan `retryOnFail` con 3 intentos y 2 segundos de espera.
- **Idempotencia:** las guardas por estado (US-09, US-10, US-20) y la guarda de duplicados (US-05, ventana de 2 minutos) hacen que un reintento o un reproceso **no dupliquen** pedidos, reservas ni notificaciones.
- **Timeouts:** los webhooks responden 200 inmediato (`responseMode onReceived`) y procesan después; los nodos HTTP usan el timeout por defecto de n8n.
- **Reproceso seguro:** repetir una ejecución fallida es seguro por las guardas anteriores; el paso a paso está en el runbook.

## Registro de fallos y reproceso controlado

- **Registro:** la lista de *Executions* de n8n conserva cada fallo con su payload; complementa la bitácora de negocio, que registra el efecto real y no el intento.
- **Alerta accionable:** workflow, execution id, nodo, mensaje de error truncado y enlace (workflow `US-21-alertas-errores.json`; configurarlo como *Error Workflow* global y definir `TELEGRAM_ADMIN_CHAT_ID`).
- **Fallback:** si el bot de Telegram está caído, la alerta no puede salir; se revisa la lista de ejecuciones en n8n (el error workflow no se reintenta a sí mismo, para evitar bucles).

## Respaldos y restauración

- **n8n:** volumen Docker y procedimiento de respaldo/restauración documentado en [n8n-despliegue.md](./n8n-despliegue.md).
- **Google Sheets:** historial de versiones del libro (Archivo → Historial de versiones) + export periódico.
- **Google Drive:** las recetas viven en una carpeta dedicada (papelera de 30 días).

## Simulaciones de fallo (checklist)

- [ ] Detener el contenedor n8n y confirmar que el webhook público falla de forma visible.
- [ ] Forzar un error de Google Sheets (ID inválido) en un workflow crítico y confirmar alerta + reproceso seguro.
- [ ] Invalidar el token del bot y confirmar el fallback por UI (la alerta no puede enviarse).
- [ ] Restaurar un respaldo de n8n con datos sintéticos y verificar workflows activos.

Estas simulaciones requieren el entorno real; quedan pendientes de ejecutar como parte del cierre de #20.
