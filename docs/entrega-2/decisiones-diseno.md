# Decisiones de diseño (ADR) y análisis de responsabilidades · Entrega 2

Formato breve de *Architecture Decision Record*: contexto, decisión, alternativas y consecuencias. Las ADR 1 a 4 vienen del Inception y el Sprint 1; las ADR 5 a 12 se tomaron en el Sprint 2, a partir de defectos encontrados al ejecutar los flujos en **n8n 2.44.2 real**.

## Parte A · Registro de decisiones

### ADR-01 · n8n como orquestador y Google Sheets como base de datos
- **Contexto:** costo $0 (RNF-05), personal que ya trabaja con planillas (RNF-06) y un semestre de plazo.
- **Decisión:** flujos en n8n autoalojado en Docker; datos operativos en un libro de Google Sheets con 5 hojas.
- **Alternativas:** backend propio (Node/Express + PostgreSQL), con más control pero más trabajo y un panel de administración adicional; Airtable o Supabase, con límites de capa gratuita y lejos de lo que el personal conoce.
- **Consecuencias:** la planilla es una base de datos sin transacciones; la consistencia se protege con la ADR-07. Leer Sheets domina la latencia (R-01).

### ADR-02 · Telegram como canal del prototipo
- **Contexto:** se presentó WhatsApp a la Municipalidad, pero WhatsApp Business exige una cuenta verificada por Meta, un número de la Municipalidad y cobra los mensajes que inicia la empresa.
- **Decisión:** el prototipo usa Telegram Bot API; WhatsApp queda como adaptador futuro (issue #24).
- **Alternativas:** el *sandbox* de WhatsApp, que solo admite números de prueba registrados y no sirve para una demo con vecinos; o SMS, que tiene costo.
- **Consecuencias:** la lógica no depende del canal. Cambiar de canal es escribir un **Adapter** de entrada y salida (Parte C).

### ADR-03 · Búsqueda difusa determinista, sin LLM en las respuestas
- **Contexto:** el riesgo crítico R-02 es que la IA invente un remedio o un precio.
- **Decisión:** US-04 y US-05 responden solo con datos leídos de la planilla y un puntaje determinista (Levenshtein, cobertura y dosis; umbral 0,72). Ningún LLM redacta respuestas.
- **Alternativas:** Gemini con *grounding* por instrucciones, que se descartó porque la garantía dependería del texto del *prompt* y no de la estructura.
- **Consecuencias:** cero alucinaciones por construcción. A cambio, frases muy libres pueden no reconocerse, y por eso existe la ADR-06.

### ADR-04 · Bitácora de solo inserción con actor
- **Contexto:** trazabilidad (RF-07), no repudio y responsabilidad (ISO 25010, seguridad).
- **Decisión:** cada transición escribe en `bitacora` los campos `estado_anterior`, `estado_nuevo`, `actor` y `delta_reservado`. La bitácora nunca se edita.
- **Consecuencias:** se puede reconstruir el stock reservado a partir de la bitácora; sirve de evidencia ante un reclamo.

### ADR-05 · Un único webhook y un router de intenciones (US-17)
- **Contexto:** un bot de Telegram admite **un solo webhook**, pero el diseño del Sprint 1 tenía cinco (`telegram-consulta`, `-reserva`, `-trazabilidad`, `-recetas` y `-aprobacion`). Con el bot real, solo uno habría recibido mensajes.
- **Decisión:** el router `US-17` es el único punto de entrada (`/webhook/telegram-bot`). Clasifica con reglas y deriva con *Execute Workflow* a subflujos que ya no tienen webhook propio.
- **Alternativas:**
  - Un único workflow gigante, con baja cohesión y difícil de probar.
  - El router llamando a los webhooks internos por HTTP, que mantenía cinco puertas públicas y no permitía la ADR-07.
- **Consecuencias:**
  - Menor superficie de ataque: una sola URL pública.
  - Cada subflujo vuelve a validar el secreto (defensa en profundidad).
  - Los subflujos se pueden probar por separado.

### ADR-06 · Reglas primero; Gemini solo como respaldo para elegir una etiqueta
- **Contexto:** el buscador no reconocía frases naturales: «hola, ¿hay pregavalina 75?» obtenía 0,457 con un umbral de 0,72. Ese era el ejemplo exacto mostrado a la Municipalidad.
- **Decisión:**
  - El router normaliza el texto: quita saludos y muletillas y convierte «2 cajas» en `x2`.
  - Clasifica con reglas en un orden fijo: foto, comandos del personal, seguridad clínica, saludo, reserva, estado y consulta.
  - Solo un texto largo que no calza con ninguna regla se envía a Gemini, si hay clave. Gemini devuelve **una etiqueta de una lista cerrada** y nunca redacta la respuesta.
  - Sin clave, falla o etiqueta inválida, el router responde con el menú de ayuda.
- **Alternativas:** clasificar todo con un LLM, que agregaba latencia, costo potencial y el riesgo R-02.
- **Consecuencias:** las 5 frases naturales de prueba pasan a calzar (`test-router.mjs`, bloque 5). El LLM es opcional y está acotado.

### ADR-07 · Serializar las ejecuciones para no sobrevender (RNF-04)
- **Contexto:** la reserva hace lectura, cálculo y escritura sobre la planilla. Dos reservas simultáneas podían leer el mismo `stock_reservado` y perder una actualización.
- **Decisión:**
  - `N8N_CONCURRENCY_PRODUCTION_LIMIT=1`: n8n atiende una ejecución de producción a la vez y pone las demás en fila.
  - El router **espera** a cada subflujo (`waitForSubWorkflow`). Las ejecuciones de subflujo no cuentan para el límite, así que no hay bloqueo mutuo.
  - Telegram entrega con `max_connections=1`.
- **Evidencia:**
  - Con 3 solicitudes simultáneas, las ejecuciones no se solaparon (sondeo del 9 de noviembre).
  - La prueba de integración mide p50 de 1.644 ms y p95 de 2.645 ms con 10 mensajes simultáneos, frente a 209 ms y 313 ms en serie.
- **Alternativas:**
  - Un candado en la planilla, sin atomicidad real en Sheets.
  - n8n en *queue mode* con Redis, que sale del costo $0 y es más complejo.
  - Una verificación posterior con compensación, que ya existe (`verify_reservation`) pero llega tarde.
- **Consecuencias:** se privilegia la consistencia sobre el rendimiento. Con ráfagas de mensajes, la latencia de cola puede pasar de 2,5 s. Es aceptable con 156 atenciones diarias, y se medirá con datos reales en US-13.

### ADR-08 · Configuración por `$env` y credencial con ID fijo
- **Contexto:** en n8n 2.x el *sandbox* de los nodos Code **no tiene `process`**. Los flujos usaban `process.env.TELEGRAM_WEBHOOK_SECRET`, así que el secreto nunca coincidía y todos los mensajes se descartaban en silencio. Además:
  - Las URL y los cuerpos HTTP no empezaban con `=`, de modo que se enviaban literalmente `bot{{$env...}}` y `"={{ $json.chat_id }}"`.
  - Los nodos de Sheets no tenían autenticación ni credencial.
  - El nodo de Drive usaba la versión 2.1, que no existe.
- **Decisión:**
  - Los nodos leen la configuración con `$env`, habilitado con `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`.
  - Las expresiones van con `=` y los cuerpos con `JSON.stringify`.
  - La planilla y la carpeta se leen de `.env`.
  - Todos los nodos de Google usan la credencial `farmaciaGoogleSA`, que el script de arranque importa desde el JSON de la cuenta de servicio.
  - Drive usa la versión 3.
- **Consecuencias:**
  - Los JSON del repositorio no contienen IDs ni secretos y se importan ya enlazados.
  - `scripts/test-workflows-n8n.mjs` convierte cada defecto en una regla de la CI para que no vuelva.

### ADR-09 · Despacho marcado por el personal en lugar de la app del conductor (US-22)
- **Contexto:** el alcance firmado deja fuera la PWA con OSRM. Sin ella, nadie movía los pedidos a `EN_RUTA` ni a `ENTREGADO`, y el stock reservado nunca se liberaba al entregar.
- **Decisión:** el personal autorizado marca el avance con los comandos `en ruta FAR-XXXX` y `entregado FAR-XXXX`, con el mismo patrón de US-20:
  - lista blanca;
  - el estado de origen como guarda;
  - bitácora y aviso al vecino;
  - descuento de `stock_real` y `stock_reservado` una sola vez.
- **Alternativas:**
  - Editar a mano la planilla, sin bitácora ni aviso y con riesgo de errores de stock.
  - Construir el backend de la PWA, que está fuera de alcance.
- **Consecuencias:** se cierra la máquina de estados (7 estados, 8 transiciones). La PWA queda como prototipo en modo demostración.

### ADR-10 · Degradación elegante y alertas sin duplicados
- **Decisión:**
  - Si un subflujo falla, el router responde al vecino «Tuvimos un problema… SAMU 131 si es urgencia» en lugar de quedar en silencio.
  - La alerta al equipo la emite el subflujo mediante US-21, que es el `errorWorkflow` de todos los flujos.
  - Los envíos a Telegram reintentan 3 veces con 2 s de espera.
- **Evidencia:** en la integración, INT-10 a INT-14 reciben una sola alerta y el vecino recibe el aviso.

### ADR-11 · Versiones fijadas y saltos de línea normalizados
- **Decisión:**
  - n8n en la versión 2.44.2 y cloudflared en la 2026.10.1, ambas en `docker-compose.yml`, PlantUML en la 1.2026.9 y Node 20 en la CI.
  - `.gitattributes` con `eol=lf`.
- **Motivo:**
  - Con `latest`, cualquier cambio de n8n podía romper los flujos sin aviso.
  - En Windows, `core.autocrlf` convertía a CRLF los HTML generados, y dos pruebas de consistencia fallaban solo por eso.

### ADR-12 · Túnel rápido de Cloudflare para el entorno local
- **Decisión:** cada integrante abre un túnel `trycloudflare.com`, sin cuenta. El script de arranque lee la URL y registra el webhook con `secret_token`.
- **Alternativas:**
  - El túnel con nombre (`infra/n8n`), con URL estable pero que requiere cuenta y *token*; queda para la demo final.
  - ngrok, que exige cuenta.
- **Consecuencias:** la URL cambia en cada arranque. Por eso el script vuelve a registrar el webhook cada vez, y `doctor` detecta el desfase.

### ADR-13 · Recetas al Drive del usuario con OAuth2
- **Contexto:** el diseño suponía que la cuenta de servicio subiría las recetas. Google le asigna **cuota 0** en Drive: la subida falla con «Service Accounts do not have storage quota». Las unidades compartidas resuelven esto, pero solo existen en Google Workspace, y las cuentas del equipo son Gmail.
- **Decisión:** US-09 sube la foto con OAuth2 (credencial «Google Drive (OAuth)», conectada una vez en el editor de n8n) a una carpeta privada del Drive del responsable. Sheets sigue con la cuenta de servicio.
- **Alternativas:**
  - Unidad compartida, que requiere Workspace.
  - Delegación de dominio, también de Workspace.
  - Guardar la imagen en la planilla, que vulnera RNF-07.
- **Consecuencias:**
  - Funciona con Gmail.
  - En modo «prueba», Google exige reconectar cada 7 días.
  - Para producción, la Municipalidad usaría su Workspace con una unidad compartida.
  - `doctor` verifica que la credencial esté conectada.

### Hallazgo de rendimiento (medido con la planilla real)
Dentro de n8n, cada nodo de Google Sheets tarda entre 1 y 3 s, aunque la API responde en unos 250 ms (token, metadatos de la hoja y datos). Por eso:
- una consulta (2 lecturas) tarda alrededor de 3 s;
- una reserva (4 lecturas y 4 escrituras) tarda entre 10 y 20 s.

La API admite 60 lecturas por minuto por usuario. El plan del Sprint 3 es:
- leer catálogo e inventario en una sola llamada (`values:batchGet` por HTTP);
- guardar el catálogo en caché (R-01);
- agrupar las escrituras;
- enviar un acuse inmediato («Estoy registrando su reserva…»).

## Parte B · Responsabilidades, cohesión y acoplamiento

Criterio de la clase 08:
- **Cohesión:** qué tan centrada está la responsabilidad de un módulo.
- **Acoplamiento:** cuánto depende un módulo de los detalles internos de otro.

| Componente | Responsabilidad única | Cohesión | Acoplamiento | Comentario |
|---|---|---|---|---|
| Router US-17 | Recibir, autenticar y clasificar cada mensaje; derivar | Alta (funcional) | Bajo hacia los subflujos: solo conoce su ID y les pasa el update tal cual | No lee la planilla. Las respuestas clínicas son textos fijos |
| Consulta US-04 | Responder stock y precio | Alta | Datos: lee `catalogo` e `inventario` | Comparte el buscador con US-05 (ver deuda) |
| Reserva US-05 | Crear el pedido y apartar stock | Media-alta: también crea el despacho y valida la cobertura | Datos: escribe 4 hojas | Candidata a dividirse: «crear pedido» y «registrar despacho» |
| Estado US-06 | Informar el estado al titular | Alta | Lee `ordenes` y `despachos` | La titularidad está encapsulada aquí |
| Recetas US-09 | Guardar la receta y avisar | Alta | Drive, Sheets y Telegram | El aviso al farmacéutico es un paso separado y probado |
| Aprobación US-20 | Transiciones de la receta | Alta | Datos | Patrón compartido con US-22 |
| Despacho US-22 | Transiciones logísticas | Alta | Datos | Reutiliza el diseño de US-20, no su código |
| Expiración US-10 | Liberar las reservas vencidas | Alta | Datos | Sin entrada pública |
| Alertas US-21 | Notificar las fallas | Alta | Ninguno con el negocio | Nunca incluye RUT ni recetas |
| Scripts locales | Arranque, diagnóstico y carga | Alta por archivo; librería común en `scripts/local/lib/` | Docker CLI y APIs públicas | Sin dependencias npm |

**Acoplamiento por datos, no por control.** Los flujos se comunican mediante la planilla, con un esquema documentado en `google-sheets-schema.md`, y mediante el contrato del update de Telegram. Ningún flujo llama a otro, salvo el router.

Las **pruebas de contrato** (`test-router.mjs`, bloques 5 y 6) verifican que lo que entrega el router lo entienden los *parsers* reales de US-04, US-05, US-06, US-20 y US-22.

**Deuda técnica identificada:**
1. **Buscador difuso duplicado** en US-04 y US-05. n8n no importa módulos locales sin una *allowlist*. Lo mitiga el *drift guard* de `test-reserva.mjs`, que falla si las copias divergen.
2. **Escrituras sin transacción (US-05, US-20, US-22).** Si una escritura falla a mitad de camino, queda un estado parcial. El E2E lo mostró: con la cuota agotada, un pedido quedó ENTREGADO sin descontar el stock.
   - Hoy lo mitigan 3 reintentos por nodo y la alerta de US-21.
   - En US-05 también ayuda `verify_reservation`.
   - La compensación queda para el Sprint 3: escribir el estado al final y reconciliar contra la bitácora.
3. **Tono mixto.** Los flujos del Sprint 1 tratan de «tú» y los nuevos de «usted». Se unifica en US-14.

## Parte C · Patrones aplicados (clase 08)

| Patrón | Dónde | Cómo |
|---|---|---|
| **Facade** (estructural) | Router US-17 | Una sola interfaz pública (el webhook) oculta seis subflujos; el vecino y Telegram no conocen la estructura interna |
| **Strategy** (comportamiento) | Router → subflujos | La intención elige la estrategia que atiende el mensaje (consulta, reserva, estado, receta, aprobación, despacho); agregar una estrategia no cambia las demás |
| **Adapter** (estructural) | `parseTelegramUpdate` en cada flujo; adaptador WhatsApp planificado (#24) | Convierte el *update* de Telegram en el ítem interno `{chat_id, text, ...}`; WhatsApp será otro adaptador hacia el mismo ítem |
| **Observer** (comportamiento) | US-21 como `errorWorkflow`; aviso al farmacéutico al llegar una receta | Los flujos no conocen a quien los observa: n8n notifica la falla y US-21 reacciona |
| **State** (máquina de estados) | `ordenes.estado` (7 estados) | Cada comando solo es válido desde un estado de origen. Esa guarda da la idempotencia (`estados-pedido.puml`) |
| **Pipes and Filters** (arquitectónico) | Cada workflow de n8n | Cadenas de nodos que transforman un ítem: parsear, leer, decidir, escribir y responder |
| **Arquitectura dirigida por eventos** | Webhook de Telegram y cron horario | El sistema reacciona a mensajes y al reloj, sin sondeo |
