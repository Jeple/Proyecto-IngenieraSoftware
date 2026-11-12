# Matriz de riesgos de seguridad · Entrega 2

Metodología: activos → amenazas clasificadas con **STRIDE** (Suplantación, Manipulación, Repudio, Divulgación de información, Denegación de servicio, Elevación de privilegios), más seguridad clínica y cumplimiento legal. Probabilidad (P) e impacto (I) en escala 1 a 5; **nivel = P × I**: Bajo ≤ 4, Medio 5–9, Alto 10–14, Crítico ≥ 15. Se evalúa el riesgo **inherente** (sin controles) y el **residual** (con los controles existentes). La versión en Excel es `matriz-riesgos-seguridad.xlsx`.

Marco legal: **Ley 19.628** sobre protección de la vida privada (vigente) y **Ley 21.719**, que la reemplaza y crea la Agencia de Protección de Datos Personales; su entrada en vigencia está prevista para el 1 de diciembre de 2026 y hay un proyecto en trámite para postergarla (verificado el 9 de noviembre de 2026). Los datos de salud son datos sensibles.

## 1. Activos

| ID | Activo | Descripción |
|---|---|---|
| A1 | Datos personales del vecino | RUT, dirección, sector y chat_id en las hojas ordenes y despachos (Ley 19.628) |
| A2 | Recetas médicas | Fotos en una carpeta privada de Google Drive, subidas con OAuth (dato sensible de salud) |
| A3 | Secretos y credenciales | Token del bot, secreto del webhook, JSON de la cuenta de servicio, N8N_ENCRYPTION_KEY |
| A4 | Integridad del inventario y los pedidos | Hojas inventario y ordenes; stock reservado |
| A5 | Bitácora de auditoría | Hoja bitacora (solo inserción) |
| A6 | Disponibilidad del servicio | n8n en Docker, túnel de Cloudflare, Telegram y APIs de Google |
| A7 | Historial de ejecuciones de n8n | Volumen n8n_data: guarda los mensajes procesados (incluye RUT y direcciones) |
| A8 | Repositorio público | Código, workflows y documentación en GitHub |

## 2. Matriz

| ID | Activo | Categoría | Amenaza | P | I | Inherente | Controles existentes | Evidencia | P res. | I res. | Residual | Responsable | Plan |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RS-01 | A4, A1 | S · Suplantación | Un tercero envía updates falsos al webhook público para crear reservas o leer pedidos | 4 | 4 | 16 Crítico | Secreto del webhook (secret_token) validado en el router y de nuevo en cada subflujo; una sola URL pública; los subflujos no tienen webhook | INT-01, INT-02; test-router 1a–1e; test-workflows-n8n 6a | 1 | 4 | 4 Bajo | Julián Epple (flujos) | Rotar TELEGRAM_WEBHOOK_SECRET en cada despliegue (levantar lo regenera si se borra) |
| RS-02 | A4, A5 | S · Suplantación | Alguien que no es químico farmacéutico ni personal envía «aprobar», «rechazar», «en ruta» o «entregado» | 3 | 4 | 12 Alto | Lista blanca de chat_id por variable de entorno; desde otro chat el comando se trata como mensaje común | test-router 2f, 2j; test-despacho 1g, 1i | 1 | 4 | 4 Bajo | Antonio De Solminihac (identidad) | Activar la verificación en dos pasos de Telegram en las cuentas del personal; revisar la bitácora semanalmente |
| RS-03 | A1 | I · Divulgación | Un vecino consulta por RUT o código el pedido de otra persona | 3 | 4 | 12 Alto | Titularidad por chat_id (solo el chat que creó el pedido); mismo mensaje para un pedido ajeno y uno inexistente | test-trazabilidad 16–18; test-router 6c3; E2E CA-08 (9-nov, segundo chat simulado) | 1 | 4 | 4 Bajo | Antonio De Solminihac | Repetir CA-08 con un segundo teléfono real y captura |
| RS-04 | A2 | I · Divulgación | Se filtra la foto de una receta (enlace reenviado o carpeta con permisos amplios) | 3 | 5 | 15 Crítico | Carpeta privada (sin compartir) en el Drive del responsable; subida con OAuth; el enlace solo va al químico farmacéutico; la planilla guarda la URL, no la imagen; el aviso no incluye RUT | Prueba real CA-12/13 (docs/evidencia/e2e/manual-receta); test-despacho 6d | 2 | 5 | 10 Alto | Matilda Vásquez (infraestructura) | Revisar los compartidos de la carpeta cada sprint; en producción, unidad compartida del Workspace municipal; borrar las recetas de prueba al cierre |
| RS-05 | A3 | I · Divulgación | Un token, la clave JSON o la clave de cifrado se suben al repositorio público o se pegan en un chat | 3 | 5 | 15 Crítico | .gitignore (.env, secrets/); check_secrets.sh en la CI; credencial importada por CLI y nunca impresa; JSON de workflows solo con referencias id/name | CI «Check secrets»; test-workflows-n8n 9a–9c | 1 | 5 | 5 Medio | Matilda Vásquez | Si se filtra: /revoke en BotFather y borrar la clave de la cuenta de servicio (guía, sección 15) |
| RS-06 | A7, A1 | I · Divulgación | El historial de ejecuciones de n8n expone RUT y direcciones a quien acceda al equipo o al editor | 3 | 3 | 9 Medio | n8n solo escucha en 127.0.0.1; editor con usuario local; poda automática a los 7 días (EXECUTIONS_DATA_MAX_AGE=168) | docker-compose.yml; doctor | 2 | 3 | 6 Medio | Matilda Vásquez | En un despliegue real: disco cifrado y ejecuciones exitosas sin datos |
| RS-07 | A1 | I · Divulgación | Los mensajes viajan por Telegram (chats en la nube, sin cifrado de extremo a extremo) | 4 | 3 | 12 Alto | Datos mínimos (RUT y dirección solo al reservar); aviso de uso de datos en la bienvenida; prototipo con datos sintéticos | CA-09 | 3 | 3 | 9 Medio | Juan Pablo Salum (PO) | Riesgo aceptado para el prototipo; reevaluar con el canal oficial (WhatsApp Business) y un convenio con Cormup |
| RS-08 | A1 | I · Divulgación | El texto de un mensaje ambiguo se envía a Gemini, un tercero | 2 | 3 | 6 Medio | Gemini es opcional (sin clave no se usa); solo mensajes ambiguos; solo devuelve una etiqueta; la clave va en un encabezado | test-router 7a–7j | 1 | 3 | 3 Bajo | Julián Epple | Mantener desactivado en la demo con la Municipalidad salvo autorización |
| RS-09 | A4 | T · Manipulación | Dos reservas simultáneas leen el mismo stock y se sobrevende (actualización perdida) | 4 | 5 | 20 Crítico | Ejecuciones serializadas (N8N_CONCURRENCY_PRODUCTION_LIMIT=1), el router espera al subflujo, max_connections=1, verify_reservation | Sondeo de plataforma; integración 10 simultáneos; CA-20 con la planilla real (9-nov): 5 reservas simultáneas sobre stock 3, 0 sobreventas | 2 | 5 | 10 Alto | Julián Epple | US-13 con 20 reservas simultáneas en el Sprint 3 |
| RS-10 | A4, A5 | T · Manipulación | Un funcionario edita a mano stock o estados en la planilla y deja el inventario inconsistente | 3 | 4 | 12 Alto | Compartir la planilla solo con la cuenta de servicio y el personal designado; historial de versiones de Google Sheets; la bitácora permite reconstruir el reservado | google-sheets-schema.md | 2 | 4 | 8 Medio | Juan Pablo Salum (PO) | Proteger hojas y rangos (bitacora y columnas de stock) en el Sprint 3 |
| RS-11 | A5 | R · Repudio | Un actor niega haber aprobado, rechazado o entregado un pedido | 2 | 3 | 6 Medio | Bitácora de solo inserción con estado_anterior, estado_nuevo y actor (farmaceutico:, personal:, cliente:, sistema:cron) | test-aprobacion; test-despacho 2d; CA-14 | 1 | 3 | 3 Bajo | Javier Del Campo (observabilidad) | Revisar en el E2E que el 100 % de las transiciones tenga actor (métrica Q8) |
| RS-12 | A6 | D · Denegación de servicio | Ráfaga de mensajes o reintentos saturan la cola serializada y las respuestas se demoran | 3 | 3 | 9 Medio | Los mensajes sin secreto se descartan en milisegundos; Telegram reintenta; Cloudflare en el borde | Integración: p95 2,6 s con 10 simultáneos | 3 | 2 | 6 Medio | Javier Del Campo | Medir con carga real en US-13; si hace falta, separar consultas (solo lectura) de escrituras |
| RS-13 | A6 | D · Denegación de servicio | Cae el túnel rápido o cambia su URL y Telegram no puede entregar mensajes | 3 | 3 | 9 Medio | levantar.mjs vuelve a registrar el webhook; doctor detecta «último error de entrega»; la cola de Telegram conserva los mensajes | doctor.mjs | 2 | 3 | 6 Medio | Matilda Vásquez | Túnel con nombre y Cloudflare Access (infra/n8n) para la demo final |
| RS-14 | A6, A4 | D · Denegación de servicio | Cuota de la API de Google Sheets (60 lecturas/minuto, HTTP 429): respuestas fallidas y escrituras a medias (materializado en el E2E del 9-nov) | 4 | 4 | 16 Crítico | Lecturas una sola vez por ejecución (executeOnce); 3 reintentos de 5 s por nodo; ejecuciones serializadas; US-21 avisa la falla | E2E 9-nov (D-13, D-15); test-workflows-n8n 5e y 5h | 3 | 3 | 9 Medio | Julián Epple | Sprint 3: lecturas en lote (batchGet), caché del catálogo (R-01), compensación de escrituras y solicitar aumento de cuota |
| RS-15 | A7, A3 | E · Elevación de privilegios | Alguien accede al editor de n8n y modifica flujos o lee credenciales | 2 | 5 | 10 Alto | Puerto solo en localhost; usuario local; credenciales cifradas con N8N_ENCRYPTION_KEY | docker-compose.yml | 1 | 5 | 5 Medio | Matilda Vásquez | No exponer el editor por el túnel en el despliegue con nombre (Cloudflare Access) |
| RS-16 | A8 | T · Manipulación | Un cambio en un workflow introduce un defecto o una puerta trasera | 2 | 4 | 8 Medio | PR con revisión, CI con 413 pruebas, reglas estáticas y prueba de integración; versiones fijadas | CI; test-workflows-n8n | 1 | 4 | 4 Bajo | Scrum Master (por confirmar) | Proteger la rama main (PR obligatorio y CI en verde) |
| RS-17 | A1, A2 | Seguridad clínica | El bot entrega una indicación médica o no deriva una urgencia (RNF-08) | 3 | 5 | 15 Crítico | Reglas de urgencia, autolesión y consejo clínico antes de cualquier intención comercial; respuestas fijas; sin LLM en las respuestas | test-router bloque 3; INT-05 a INT-07; CA-10 | 2 | 5 | 10 Alto | Juan Pablo Salum (PO) | Revisión de los mensajes con un químico farmacéutico (US-14, Sprint 3) |
| RS-18 | A1, A2 | Cumplimiento legal | Tratamiento de datos personales y de salud sin base legal ni aviso (Ley 19.628; Ley 21.719 con vigencia prevista el 1-dic-2026) | 3 | 4 | 12 Alto | Solo datos sintéticos en el semestre; aviso de uso de datos en la bienvenida; minimización; recetas fuera de la planilla | Alcance firmado; guía de instalación | 2 | 4 | 8 Medio | Álvaro Astudillo (documentación) | Antes de usar datos reales: convenio con Cormup, base legal y evaluación de impacto |

## 3. Resumen

| Nivel | Inherente | Residual |
|---|---|---|
| Crítico | 6 | 0 |
| Alto | 6 | 3 |
| Medio | 6 | 9 |
| Bajo | 0 | 6 |

Riesgos residuales que siguen en nivel **Alto** o **Crítico** (se priorizan en el Sprint 3):

- **RS-04** (10 Alto): Se filtra la foto de una receta (enlace reenviado o carpeta con permisos amplios). Plan: Revisar los compartidos de la carpeta cada sprint; en producción, unidad compartida del Workspace municipal; borrar las recetas de prueba al cierre
- **RS-09** (10 Alto): Dos reservas simultáneas leen el mismo stock y se sobrevende (actualización perdida). Plan: US-13 con 20 reservas simultáneas en el Sprint 3
- **RS-17** (10 Alto): El bot entrega una indicación médica o no deriva una urgencia (RNF-08). Plan: Revisión de los mensajes con un químico farmacéutico (US-14, Sprint 3)

Los responsables son propuestos por el PO según las áreas asignadas en el tablero; el equipo los confirma en la retrospectiva.

