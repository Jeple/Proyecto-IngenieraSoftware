# Informe de Inception — Sistema de Atención Omnicanal para la Farmacia Comunitaria de Peñalolén

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 16-oct-2026 | Equipo del proyecto (Grupo 10) | Versión inicial formalizada a partir del material de Sprint 0 |

> Documento versionado en el repositorio. Para el entregable PDF: exportar este archivo conservando la tabla de versiones. Todos los datos de ejemplo del documento son sintéticos: no contiene RUT, direcciones, recetas ni información de pacientes reales.

## 1. Resumen ejecutivo

La Farmacia Comunitaria de Peñalolén atiende consultas repetitivas por WhatsApp que consumen tiempo del personal clínico y mantiene su catálogo como una planilla estática. Este proyecto construye un prototipo de atención omnicanal orquestado con n8n que responde consultas de stock y precio, toma reservas con código transaccional, permite seguir el estado del pedido y recibe recetas médicas, persistiendo el estado operativo en Google Sheets y resguardando las recetas en Google Drive. El diseño completo opera sobre capas gratuitas ($0 USD en licencias) y sin dependencias del ERP corporativo.

El prototipo no reemplaza al farmacéutico ni entrega asesoría clínica: solo entrega información operativa de la farmacia (disponibilidad, precios, estados de pedido) y deriva cualquier situación clínica a los canales de urgencia correspondientes.

## 2. Problema y contexto

- **Consultas repetitivas:** las preguntas "¿hay stock?" y "¿cuándo llega?" se responden manualmente por WhatsApp; el personal técnico y químico farmacéutico dedica tiempo a tareas que un sistema puede resolver.
- **Catálogo estático:** el catálogo se publica como planilla Excel sin buscador por principio activo.
- **Despacho lento:** la espera del despacho a domicilio se percibe entre 2 y 7 días, sin visibilidad del estado.
- **Contexto operativo:** farmacia comunitaria con decenas de miles de vecinos inscritos y más de un centenar de atenciones diarias entre ventanilla y delivery (cifras del diagnóstico del equipo, documento del proyecto).

## 3. Objetivos

**General:** reducir las consultas repetitivas y la carga operativa del personal mediante un asistente omnicanal con datos siempre consistentes con la planilla oficial.

**Específicos:**
1. Responder consultas de stock y precio por canal de mensajería, con búsqueda tolerante a errores de escritura y sin inventar datos.
2. Tomar reservas inmediatas con código `#FAR-XXXX`, descuento de stock y validación de entrega dentro de Peñalolén.
3. Permitir el seguimiento del pedido por RUT o código, protegiendo los datos de terceros.
4. Recibir recetas médicas por foto, con validación explícita del químico farmacéutico antes de preparar.
5. Dar al conductor una vista de despachos con tiempos estimados.
6. Operar con costo de licencias $0 USD durante el semestre.

## 4. Alcance y exclusiones

**Incluido en el prototipo:**
- Consulta de stock y precio (Telegram como canal activo del prototipo).
- Reserva con código transaccional, descuento de stock y captura de entrega (RUT, dirección, sector).
- Trazabilidad del pedido y expiración automática a las 12 horas.
- Ingesta de recetas por foto (Telegram) y aprobación/rechazo por el químico farmacéutico.
- PWA del conductor (modo demostración; su backend definitivo está planificado).
- Bitácora auditada de cada movimiento y alertas operativas.

**Exclusiones explícitas:**
- **Asesoría clínica:** el bot no diagnostica, no indica tratamientos ni dosis, y no interpreta prescripciones (sin OCR). La validación legal de recetas corresponde al químico farmacéutico.
- **SAP:** desacoplamiento total del ERP corporativo; el prototipo no accede a la red interna.
- **Integración productiva con WhatsApp:** el canal de texto del prototipo es Telegram. La conexión con WhatsApp Business (Meta) está planificada como historia aparte de la entrega, incluyendo verificación de negocio y plantillas aprobadas.
- **Correo (IMAP) para recetas:** postergado a una versión posterior.
- **Pagos en línea, contratos de suministro y lectores de código de barras:** fuera del semestre.

## 5. Stakeholders

| Stakeholder | Interés | Rol en el proyecto |
|---|---|---|
| Vecinos de Peñalolén | Consultar y reservar sin llamar | Usuarios finales del canal |
| Técnicos y químicos farmacéuticos | Menos carga repetitiva; control de recetas | Validan el flujo de receta y los mensajes de seguridad |
| Personal de bodega | Preparación de pedidos | Consume la planilla operativa |
| Conductor de despacho | Rutas y entregas | Usa la PWA de despachos |
| Municipalidad de Peñalolén | Continuidad del servicio comunal | Contraparte institucional |
| Equipo del proyecto (Grupo 10) | Entrega del semestre | Diseño, desarrollo y operación |
| Equipo docente UAI | Evaluación | Revisión de hitos |

## 6. Dominio y reglas de negocio

- **Estados del pedido (7):** `PENDIENTE_RECETA`, `RECETA_RECIBIDA`, `EN_PREPARACION`, `EN_RUTA`, `ENTREGADO`, `RECHAZADO` y `CANCELADO_EXPIRADO`; máquina de estados y transiciones autorizadas en [`ciclo-vida-pedido.md`](./ciclo-vida-pedido.md).
- **Estado inicial (D-01, resuelta):** sin receta → `EN_PREPARACION`; con receta → `PENDIENTE_RECETA` con 12 horas para enviarla.
- **Expiración:** cron horario cancela los pedidos `PENDIENTE_RECETA` vencidos y libera el stock exactamente una vez.
- **Aprobación farmacéutica:** ningún pedido con receta pasa a preparación sin aprobación explícita del químico farmacéutico (o es rechazado, liberando stock).
- **Cobertura de entrega:** solo sectores Peñalolén Alto, Peñalolén Nuevo y San Luis.
- **Titularidad:** las consultas y las recetas solo se aceptan desde el chat que creó el pedido; los mensajes de "no encontrado" no revelan si un pedido existe.
- **Stock:** `stock_disponible = stock_real - stock_reservado`, recalculado siempre por la lógica y nunca leído de la fórmula de la planilla.

## 7. Arquitectura de alto nivel

Detalle completo en [`arquitectura.md`](./arquitectura.md). Resumen:

- **Orquestación:** n8n autoalojado en Docker, publicado por Cloudflare Tunnel (sin abrir puertos).
- **Canales:** Telegram Bot API (prototipo; webhooks `telegram-*`), Vapi para voz (invoca los webhooks existentes) y correo IMAP postergado. La migración del canal de texto de WhatsApp a Telegram se decidió por costo (la API de Meta pasó a facturar conversaciones utilitarias) y se revisará al conectar WhatsApp Business.
- **Datos:** Google Sheets como base operativa (5 hojas) y Google Drive para recetas (solo la URL se registra).
- **IA:** Gemini Flash solo interpreta y redacta; el grounding al catálogo es estructural (respuestas armadas con datos de la planilla).
- **Logística:** OSRM para tiempos estimados y PWA del conductor.

## 8. Requerimientos (resumen)

**Funcionales (RF-01 a RF-08):** búsqueda difusa; saldo neto y bioequivalentes; código `#FAR-XXXX`; reserva inmediata; ingesta de recetas; expiración a 12 h; trazabilidad por RUT o código; módulo conductor con ETA.

**No funcionales (RNF-01 a RNF-08):** respuesta inmediata de los webhooks; agente de voz; exposición solo por túnel; escrituras serializadas contra sobreventa; costo $0 en licencias; Google Sheets como base operativa; recetas fuera de la planilla con permisos restringidos; sin consejo clínico (guardrails de contención con SAMU 131 y SAPU ante riesgo).

El mapa completo requerimiento → workflow está en [`arquitectura.md`](./arquitectura.md).

## 9. Seguridad, privacidad y ética

- Modelo de identidad y roles: [`identidad-roles.md`](./identidad-roles.md). Nadie sin titularidad recibe estado, precio ni datos de un pedido.
- Privacidad de datos: la planilla nunca guarda la receta (solo su URL en Drive con permisos restringidos); la bitácora no contiene RUT, dirección ni datos clínicos.
- Datos sintéticos: todo el desarrollo, las pruebas y las demostraciones usan datos ficticios.
- Seguridad clínica: ante señales de riesgo (dolor agudo, intoxicación, ideación suicida) la conversación comercial se suspende y se deriva a SAMU 131 / SAPU.

## 10. Riesgos y mitigaciones

| Riesgo | Tipo | Mitigación adoptada |
|---|---|---|
| Concurrencia entre reservas simultáneas | Técnico | Escrituras serializadas (cola n8n) + guardas por estado + pruebas de duplicados; el estrés formal queda en el backlog (US-13) |
| El bot invente datos (alucinación) | Técnico | Grounding estructural: las respuestas se arman con la planilla; el LLM no decide cifras |
| Dependencia de la capa gratuita (cuotas, límites) | Técnico/costo | Política de $0 documentada; métricas de uso; alternativas de autoalojamiento OSRM |
| Privacidad de recetas | Privacidad | Drive con permisos restringidos; sin OCR; validación humana |
| Filtración de pedidos de terceros | Seguridad | Titularidad por chat + mensajes neutros para "no encontrado" |
| Confusión del canal (demo Telegram vs WhatsApp real) | Comercial | Comunicar explícitamente "vender WhatsApp, prototipo Telegram" y mantener la historia de adaptador WhatsApp en el backlog |
| Cambios de precio de la API de Meta | Costo | Canal del prototipo gratuito; decisión revisada antes de producción |

## 11. Roadmap

- **Sprint 0 — Inception, arquitectura y datos:** esquema, datos sintéticos, despliegue n8n, este informe.
- **Sprint 1 — MVP conversacional y reserva:** consulta fuzzy, reserva con código, trazabilidad, ciclo de vida y aprobación farmacéutica, identidad.
- **Sprint 2 — Recetas, despacho y operación:** ingesta de recetas, expiración a 12 h, PWA del conductor, observabilidad y alertas, video e informe.
- **Sprint 3 — Calidad y cierre:** pruebas de concurrencia, hardening, demo final y examen.

## 12. Decisiones registradas

| Decisión | Estado | Fecha | Referencia |
|---|---|---|---|
| D-01: estado inicial según receta | Resuelta | 16-oct-2026 | [`google-sheets-schema.md`](./google-sheets-schema.md) |
| Expiración única a 12 h | Resuelta | 16-oct-2026 | RF-06, issues del proyecto |
| Canal del prototipo: Telegram (venta: WhatsApp) | Decisión del equipo | 16-oct-2026 | [`arquitectura.md`](./arquitectura.md), historia de adaptador WhatsApp |
| Rechazo de receta con estado `RECHAZADO` | Resuelta | 16-oct-2026 | [`ciclo-vida-pedido.md`](./ciclo-vida-pedido.md) |
| Esquema operativo de 5 hojas (reconciliación US-01) | Resuelta | 16-oct-2026 | [`esquema-datos.md`](./esquema-datos.md) |

## 13. Referencias internas

- Arquitectura: [`arquitectura.md`](./arquitectura.md)
- Esquema operativo: [`google-sheets-schema.md`](./google-sheets-schema.md) y reconciliación en [`esquema-datos.md`](./esquema-datos.md)
- Ciclo de vida del pedido: [`ciclo-vida-pedido.md`](./ciclo-vida-pedido.md)
- Identidad y roles: [`identidad-roles.md`](./identidad-roles.md)
- Observabilidad y operación: [`observabilidad.md`](./observabilidad.md), [`runbook-operaciones.md`](./runbook-operaciones.md)
- Despliegue n8n: [`n8n-despliegue.md`](./n8n-despliegue.md)
