# Guía de continuidad

Para el equipo que reciba este proyecto (otro curso, la Municipalidad o Transformación Digital Municipal): qué hay, cómo levantarlo, cómo probarlo, cómo mantenerlo y cómo seguir desarrollándolo sin romper lo que funciona.

## 1. Estado al cierre del semestre

- **Versión:** v0.1.0, prototipo funcional con datos sintéticos ([CHANGELOG](../../CHANGELOG.md)).
- **Qué hace:** consulta de stock y precio aunque el nombre esté mal escrito, reserva con código #FAR que aparta el stock, receta por foto con aprobación del químico farmacéutico, liberación de reservas a las 12 horas, estado del pedido solo para quien lo hizo y despacho marcado por el personal. Detalle para usuarios en el [manual de uso](manual-de-uso.md).
- **Qué no hace (alcance firmado):** WhatsApp, agente de voz, app del conductor, pago en línea e integración con SAP.
- **Calidad:** 422 pruebas automáticas en verde y CI en cada cambio. Mediciones y brechas en [calidad de la v0.1](calidad-v0.1.md).

## 2. Mapa del repositorio

| Carpeta | Qué contiene |
|---|---|
| `workflows/` | Los flujos de n8n exportados en JSON: el router (US-17) y un flujo por tarea |
| `scripts/` | Pruebas automáticas (`test-*.mjs`), escáner de secretos y mediciones |
| `scripts/local/` | Levantar el sistema, diagnóstico (`doctor`), carga del catálogo, prueba de integración, E2E y mediciones |
| `docs/` | Guías, plan de aceptación, esquema de la planilla, ciclo de vida del pedido y operación |
| `docs/entrega-2/` | Diseño (diagramas y ADR), calidad, estrategia de pruebas y matriz de riesgos |
| `docs/entrega-final/` | Documentos del cierre: arquitectura, decisiones, manual, despliegue, calidad y métricas |
| `docs/evidencia/` | Resultados fechados de pruebas, E2E, integración y rendimiento |
| `data/seed/` | Datos sintéticos |

## 3. Instalar y ejecutar

- **En un computador propio (unos 30 minutos):** [guía de instalación local](../guia-instalacion-local.md). Requiere Git, Node 18 o superior, Docker y cuentas gratuitas de Telegram y Google.
- **En un servidor siempre encendido:** [ambiente preproductivo](despliegue-preproductivo.md).
- **Sin cuentas, solo para mirar:** `node scripts/local/prueba-integracion.mjs` levanta n8n en un contenedor desechable con un Telegram simulado.

## 4. Probar

| Qué | Comando | Necesita |
|---|---|---|
| Pruebas automáticas (422) | `node scripts/correr-pruebas.mjs` | Solo Node |
| Escáner de secretos y RUT | `bash scripts/check_secrets.sh` | Bash (Git Bash en Windows) |
| Integración con n8n real | `node scripts/local/prueba-integracion.mjs` | Docker |
| Aceptación de punta a punta | `node scripts/local/e2e.mjs` | Entorno levantado con cuentas propias |
| Latencia de las consultas | `node scripts/local/medir-latencia.mjs --n 20` | Entorno levantado |
| Reservas simultáneas | `node scripts/local/prueba-concurrencia.mjs --n 20 --stock 10` | Entorno levantado |
| Exactitud de la búsqueda | `node scripts/medir-busqueda.mjs` | Solo Node |
| Cobertura de nodos Code | `node scripts/medir-cobertura-nodos.mjs` | Solo Node |

El plan de aceptación con sus 21 casos está en [`plan-pruebas-aceptacion.md`](../plan-pruebas-aceptacion.md). Los resultados quedan fechados en `docs/evidencia/`.

## 5. Operar y mantener

- **Rutina:** `node scripts/local/doctor.mjs` diagnostica sin mostrar secretos. Para incidentes, el [runbook de operaciones](../runbook-operaciones.md).
- **Drive de recetas:** mientras la app de Google esté en modo de prueba, la conexión OAuth vence a los 7 días y hay que reconectarla en el editor de n8n.
- **Cuota de Google Sheets:** 60 lecturas por minuto. Los flujos leen una vez por ejecución y reintentan 3 veces; con más volumen habrá que leer en lote y usar caché.
- **Datos:** la planilla de Google es la fuente de verdad. El volumen de Docker `n8n_data` guarda las credenciales cifradas y el historial de ejecuciones, que se borra solo a los 7 días.
- **Secretos:** `.env` y `secrets/` nunca se suben al repositorio (los revisa `check_secrets.sh` en la CI). Si un token o una clave circula fuera de esas carpetas, hay que rotarlo ([guía de instalación, sección 15](../guia-instalacion-local.md#15-seguridad)).

## 6. Cómo seguir desarrollando

### Flujo de trabajo

1. **Todo cambio parte de un issue.** Use las plantillas del repositorio: *Historia de usuario* («Como… quiero… para…», con criterios Dado/Cuando/Entonces) o *Error*.
2. **Una rama por issue**, desde `main`: `feature/US-XX-descripcion-corta` para funcionalidades y `fix/descripcion-corta` para errores.
3. **Commits pequeños** con el formato de Conventional Commits y la historia entre paréntesis, por ejemplo `fix(US-06): mensaje de pedido rechazado`.
4. **Pull request** con la plantilla del repositorio. Lo revisa y lo fusiona **otra persona**, con la CI en verde (`validate-json` e `integracion-n8n`).
5. **Cada sprint cierra con una etiqueta** (`v0.1.0`, `v0.2.0`…) y una entrada en el [CHANGELOG](../../CHANGELOG.md).

### Cambiar un flujo de n8n sin romperlo

- Edite el flujo en el editor de n8n y expórtelo con **Download JSON** sobre el archivo de `workflows/` ([detalle](../../workflows/README.md)).
- Si solo cambia un texto, puede editar el JSON con cuidado, pero corra siempre `node scripts/correr-pruebas.mjs`: las pruebas ejecutan el mismo código que corre en n8n.
- `scripts/test-workflows-n8n.mjs` convierte en regla cada error que ya ocurrió con n8n 2.x (por ejemplo, usar `$env` en vez de `process.env`). Si la regla falla, corrija el flujo, no la regla.
- Las versiones están fijadas (n8n 2.44.2). Para actualizar n8n, hágalo en un PR propio con la prueba de integración en verde.

### Agregar una intención nueva al bot

1. Agregue la regla en el nodo `clasificar` del router (US-17) y el camino en `derivar`.
2. Cree el subflujo con su propia prueba en `scripts/test-*.mjs` y súmela a la CI (`.github/workflows/validate-workflows.yml`).
3. Agregue una prueba de contrato en `test-router.mjs`, para comprobar que el subflujo entiende lo que le entrega el router.

### Reglas que no se rompen

- **Ninguna IA redacta respuestas** con remedios, precios o stock: las cifras salen siempre de la planilla.
- **Ningún pedido con receta pasa a preparación** sin la aprobación de un químico farmacéutico.
- **Un pedido solo lo ve el chat que lo creó.**
- **Ante urgencias o preguntas clínicas**, el bot deriva al SAMU 131 o al profesional; nunca da indicaciones.
- **Solo datos sintéticos** hasta que exista un convenio con la Cormup para tratar datos reales (Ley 19.628).

## 7. Pendientes

Los pendientes priorizados están en los [issues abiertos](https://github.com/Jeple/Proyecto-IngenieraSoftware/issues) y en el [tablero del proyecto](https://github.com/users/Jeple/projects/6). Los conocidos al cerrar la v0.1 llevan la etiqueta [`v0.1-pendiente`](https://github.com/Jeple/Proyecto-IngenieraSoftware/issues?q=label%3Av0.1-pendiente), y las pruebas de seguridad pendientes, además, la etiqueta [`owasp`](https://github.com/Jeple/Proyecto-IngenieraSoftware/issues?q=label%3Aowasp). Las decisiones vigentes y sus razones están en el [registro de decisiones](../entrega-2/decisiones-diseno.md).
