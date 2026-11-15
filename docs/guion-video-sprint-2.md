# Guion del video · Sprint 2 / Entrega 2

> **Uso interno para grabar, narrar y editar.** Proyecto «Sistema de IA Omnicanal para la Farmacia Comunitaria de Peñalolén» — TICS331, Ingeniería de Software, Grupo 10. Todos los datos son sintéticos: RUT `11.111.111-1`, direcciones inventadas y una hoja escrita a mano que dice «RECETA DE PRUEBA». La demo es real: se graba al bot respondiendo; no se simulan respuestas.
>
> Respuestas y cifras tomadas de: [plan de pruebas de aceptación](plan-pruebas-aceptacion.md), [E2E del 9-nov](evidencia/e2e/e2e-2026-11-09-22-10.md), [receta manual del 9-nov](evidencia/e2e/manual-receta-2026-11-09.md), [backlog actualizado](entrega-2/backlog-actualizado.md), [calidad ISO 25010](entrega-2/calidad-iso25010.md) y [mediciones de rendimiento](evidencia/rendimiento/). Estilo tomado del [guion del Sprint 1](guion-video-sprint-1.md).

## 1. Ficha técnica

| Ítem | Definición |
|---|---|
| Duración objetivo | **4:45** (tope absoluto 5:00; dejar 3 s de margen al exportar) |
| Formato | 16:9, 1920 × 1080, 30 fps (usar 60 fps solo para cámara o b-roll; la pantalla se graba a 30) |
| Audio | 48 kHz, 24 bits; voz limpia, sin eco ni ruido de fondo; normalizar a −14 LUFS y pico −1 dB |
| Voz | Español de Chile neutro, tono seguro y cercano, 145–160 palabras por minuto; frases cortas; sin muletillas |
| Objetivo | Demostrar el incremento del Sprint 2 y la calidad del software; la edición no se evalúa, la claridad de la demo sí |
| Público | Docente y ayudantes de TICS331, e integrantes del equipo que revisan la entrega |
| Canal | YouTube «no listado», enlace verificado en incógnito y respaldo en Drive |
| Datos | 100 % sintéticos; ocultar token, `chat_id`, RUT reales y la URL del túnel |

## 2. Estructura cronometrada

| Tiempo | Bloque | Qué se ve en pantalla | Qué se dice (narración literal) | Evidencia o dato |
|---|---|---|---|---|
| 0:00–0:28 | Gancho: problema e impacto | Cifras grandes sobre fondo limpio (43.089 · 39.212 · 81 % · $0); plano del teléfono con el chat. | «En Peñalolén hay 43.089 usuarios inscritos en la farmacia comunitaria. Cada año se emiten 39.212 boletas. Y el 81 % de las transacciones sigue siendo presencial. Para saber si hay un remedio, el vecino debe ir, llamar o abrir una planilla sin buscador. Eso cuesta tiempo. A veces, salud. Por eso construimos un asistente que responde en segundos por Telegram, con el stock real y costo de infraestructura cero.» | [README §Problema](../README.md); RNF-05 |
| 0:28–0:50 | Objetivo del sprint | Esquema simple: vecino → Telegram → n8n → Google Sheets. | «El objetivo del Sprint 2 fue cerrar el alcance firmado: que el vecino consulte, reserve, envíe su receta y siga su pedido; que el farmacéutico apruebe; y que el personal marque el despacho. Todo sobre n8n y Google Sheets, sin tocar el ERP de la Municipalidad y sin pagar licencias.» | [README §Alcance](../README.md); [backlog](entrega-2/backlog-actualizado.md) |
| 0:50–1:27 | Historias completadas | Tarjetas US-17, US-09, US-20, US-10, US-22 y US-21; tablero con las historias. | «El incremento son nueve historias y tres frentes transversales. Un router único entiende frases naturales. La receta por foto llega a Drive y avisa al farmacéutico sin mostrar el RUT. La aprobación mueve el pedido a preparación. La expiración libera el stock a las 12 horas. El personal marca “en ruta” y “entregado”. Y las alertas avisan cuando algo falla. En el tablero figuran In Review: los PR #25 y #26 ya están fusionados en main; falta la verificación cruzada, las capturas y el video. Ese es el avance real.» | [backlog §2 y §3](entrega-2/backlog-actualizado.md) |
| 1:27–1:47 | Lo pendiente y fuera de alcance | Lista con tachados: voz, WhatsApp, app del conductor, panel, correo. | «Lo pendiente es de cierre, no de producto: la verificación cruzada, las capturas del plan, repetir una prueba desde un segundo teléfono y grabar este video. Y queda fuera de este semestre la voz telefónica, WhatsApp, la app del conductor, el panel de administración y las recetas por correo. Cada exclusión tiene su razón y su issue.» | [backlog §2](entrega-2/backlog-actualizado.md); [plan §3](plan-pruebas-aceptacion.md) |
| 1:47–3:46 | Demo en vivo del bot | Mitad izquierda: Telegram. Mitad derecha: pestañas `ordenes`, `inventario`, `bitacora`, `despachos` y n8n → Executions. | «Ahora, la demostración. Todo ocurre en el bot real, con la planilla real y datos sintéticos. El recorrido es el del vecino. Escribo /start: el bot se presenta como asistente virtual y muestra el menú. Consulto “hola, ¿hay pregavalina 75?”. Tolera el error de escritura. Pregalex está agotado y ofrece Neurogab 75 mg, a $7.490. El dato sale de la planilla; no lo inventa. Reservo con “reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto”. Confirma el código #FAR-XXXX y 12 horas. La orden queda PENDIENTE_RECETA, el reservado sube uno y la bitácora registra RESERVA_ALTA. Consulto “estado 11.111.111-1”: responde que espera la foto de la receta. Y otro chat no ve ese pedido. Envío la foto “RECETA DE PRUEBA” con el pie #FAR-XXXX. Confirma la recepción, la orden pasa a RECETA_RECIBIDA y el archivo queda en Drive. Al farmacéutico le llega el aviso, sin el RUT. “Aprobar FAR-XXXX”: el vecino recibe el aviso y la orden pasa a EN_PREPARACION, con actor farmacéutico en la bitácora. “En ruta FAR-XXXX”: aviso al vecino y despacho EN_RUTA. “Entregado FAR-XXXX”: descuenta stock real y reservado una sola vez. Si repito, dice “ya estaba ENTREGADO”. Si un flujo falla, el administrador recibe “ALERTA n8n… Nodo: read_catalogo” y el vecino, “Tuvimos un problema…”. Renombro catalogo, consulto y la restauro. Nadie queda en silencio.» | [plan §2](plan-pruebas-aceptacion.md); [E2E 17/17](evidencia/e2e/e2e-2026-11-09-22-10.md); [receta manual](evidencia/e2e/manual-receta-2026-11-09.md) |
| 3:46–4:09 | Calidad: pruebas, CI y seguridad | GitHub Actions en verde; 413/413; p95 2.110 ms; 0 sobreventas; Executions. | «La calidad no es una diapositiva: 413 pruebas en 14 suites, dos jobs de CI en verde y escaneo de secretos. Los 21 casos de aceptación están ejecutados: 17 automáticos y los de receta probados a mano; las capturas están pendientes. El p95 de una consulta es 2.110 milisegundos, bajo la meta de 2,5 segundos. Cinco reservas simultáneas sobre stock tres: cero sobreventas. Y cero productos inventados.» | [ISO 25010 §3](entrega-2/calidad-iso25010.md); [latencia](evidencia/rendimiento/latencia-e2e-2026-11-09-22-06.json); [concurrencia](evidencia/rendimiento/concurrencia-2026-11-09-22-07.json) |
| 4:09–4:30 | Aprendizajes | Tres tarjetas: «probar en real», «consistencia», «evidencia». | «Tres aprendizajes. Primero: probar en el n8n real; seis defectos de integración (D-13 a D-18) que el diseño no mostraba y que solo aparecieron al ejecutar con la planilla real. Segundo: la consistencia se diseña; una ejecución a la vez evita la sobreventa. Tercero: la demo es parte del producto; sin evidencia no hay incremento. Y no inflamos el avance: al 9 de noviembre, cero puntos cerrados.» | [ADR-05 y ADR-07](entrega-2/decisiones-diseno.md); [backlog §4](entrega-2/backlog-actualizado.md) |
| 4:30–4:45 | Cierre: repo y tags | Repositorio en GitHub, nombres de tags, logo del grupo y «Gracias». | «El repositorio es github.com/Jeple/Proyecto-IngenieraSoftware. Los tags v0.1-sprint1 y v0.2-sprint2 marcan las líneas base; el detalle está en el CHANGELOG. La farmacia ya tiene un asistente que consulta, reserva y sigue cada pedido. Con datos sintéticos y costo cero. Gracias.» | [control de configuración §6](entrega-2/control-configuracion.md); [CHANGELOG](../CHANGELOG.md) |

## 3. Guion de narración completo

> Listo para leer o para TTS. Las indicaciones entre paréntesis son de interpretación, no se leen. Mantener pausas de medio segundo entre bloques y mirar a cámara solo en el gancho y el cierre.

**(0:00–0:28 · Gancho)** «En Peñalolén hay 43.089 usuarios inscritos en la farmacia comunitaria. Cada año se emiten 39.212 boletas. Y el 81 % de las transacciones sigue siendo presencial. Para saber si hay un remedio, el vecino debe ir, llamar o abrir una planilla sin buscador. Eso cuesta tiempo. A veces, salud. Por eso construimos un asistente que responde en segundos por Telegram, con el stock real y costo de infraestructura cero.» *(Pausa. Entra el esquema.)*

**(0:28–0:50 · Objetivo)** «El objetivo del Sprint 2 fue cerrar el alcance firmado: que el vecino consulte, reserve, envíe su receta y siga su pedido; que el farmacéutico apruebe; y que el personal marque el despacho. Todo sobre n8n y Google Sheets, sin tocar el ERP de la Municipalidad y sin pagar licencias.»

**(0:50–1:27 · Historias)** «El incremento son nueve historias y tres frentes transversales. Un router único entiende frases naturales. La receta por foto llega a Drive y avisa al farmacéutico sin mostrar el RUT. La aprobación mueve el pedido a preparación. La expiración libera el stock a las 12 horas. El personal marca “en ruta” y “entregado”. Y las alertas avisan cuando algo falla. En el tablero figuran In Review: los PR #25 y #26 ya están fusionados en main; falta la verificación cruzada, las capturas y el video. Ese es el avance real.»

**(1:27–1:47 · Pendiente)** «Lo pendiente es de cierre, no de producto: la verificación cruzada, las capturas del plan, repetir una prueba desde un segundo teléfono y grabar este video. Y queda fuera de este semestre la voz telefónica, WhatsApp, la app del conductor, el panel de administración y las recetas por correo. Cada exclusión tiene su razón y su issue.»

**(1:47–1:57 · Entrada a la demo)** «Ahora, la demostración. Todo ocurre en el bot real, con la planilla real y datos sintéticos. El recorrido es el del vecino.» *(Cambia la captura a pantalla completa.)*

**(1:57–2:07 · /start)** «Escribo /start: el bot se presenta como asistente virtual y muestra el menú.»

**(2:07–2:22 · Consulta)** «Consulto “hola, ¿hay pregavalina 75?”. Tolera el error de escritura. Pregalex está agotado y ofrece Neurogab 75 mg, a $7.490. El dato sale de la planilla; no lo inventa.»

**(2:22–2:42 · Reserva)** «Reservo con “reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto”. Confirma el código #FAR-XXXX y 12 horas. La orden queda PENDIENTE_RECETA, el reservado sube uno y la bitácora registra RESERVA_ALTA.»

**(2:42–2:52 · Estado)** «Consulto “estado 11.111.111-1”: responde que espera la foto de la receta. Y otro chat no ve ese pedido.»

**(2:52–3:12 · Receta)** «Envío la foto “RECETA DE PRUEBA” con el pie #FAR-XXXX. Confirma la recepción, la orden pasa a RECETA_RECIBIDA y el archivo queda en Drive. Al farmacéutico le llega el aviso, sin el RUT.»

**(3:12–3:22 · Aprobación)** «“Aprobar FAR-XXXX”: el vecino recibe el aviso y la orden pasa a EN_PREPARACION, con actor farmacéutico en la bitácora.»

**(3:22–3:36 · Despacho y entrega)** «“En ruta FAR-XXXX”: aviso al vecino y despacho EN_RUTA. “Entregado FAR-XXXX”: descuenta stock real y reservado una sola vez. Si repito, dice “ya estaba ENTREGADO”.»

**(3:36–3:46 · Alerta)** «Si un flujo falla, el administrador recibe “ALERTA n8n… Nodo: read_catalogo” y el vecino, “Tuvimos un problema…”. Renombro catalogo, consulto y la restauro. Nadie queda en silencio.»

**(3:46–4:09 · Calidad)** «La calidad no es una diapositiva: 413 pruebas en 14 suites, dos jobs de CI en verde y escaneo de secretos. Los 21 casos de aceptación están ejecutados: 17 automáticos y los de receta probados a mano; las capturas están pendientes. El p95 de una consulta es 2.110 milisegundos, bajo la meta de 2,5 segundos. Cinco reservas simultáneas sobre stock tres: cero sobreventas. Y cero productos inventados.»

**(4:09–4:30 · Aprendizajes)** «Tres aprendizajes. Primero: probar en el n8n real; seis defectos de integración (D-13 a D-18) que el diseño no mostraba y que solo aparecieron al ejecutar con la planilla real. Segundo: la consistencia se diseña; una ejecución a la vez evita la sobreventa. Tercero: la demo es parte del producto; sin evidencia no hay incremento. Y no inflamos el avance: al 9 de noviembre, cero puntos cerrados.»

**(4:30–4:45 · Cierre)** «El repositorio es github.com/Jeple/Proyecto-IngenieraSoftware. Los tags v0.1-sprint1 y v0.2-sprint2 marcan las líneas base; el detalle está en el CHANGELOG. La farmacia ya tiene un asistente que consulta, reserva y sigue cada pedido. Con datos sintéticos y costo cero. Gracias.»

## 4. Shot list de la demo

> Grabar con el catálogo recién reiniciado (`cargar-catalogo.mjs --reiniciar`): el primer pedido será `#FAR-0001`. En la evidencia manual el código fue `#FAR-0901` porque ya existía `#FAR-0900`; en el video decir siempre «#FAR-XXXX» o el código que aparezca en pantalla. Las escrituras tardan 5–20 s: se acelera el metraje (corte o 2×) sin cambiar el contenido.

| # | Tiempo | Entrada exacta | Respuesta esperada (plan/evidencia) | Planilla o dato a mostrar |
|---|---|---|---|---|
| 1 | 1:57 | `/start` | Se presenta como «asistente virtual» y muestra el menú (CA-09; 402 ms en el E2E). | Solo el chat; opcional n8n → Executions del router. |
| 2 | 2:07 | `hola, ¿hay pregavalina 75?` | «Pregalex 75 mg — $8.990 c/u. Stock disponible: 0 unidades. Producto agotado temporalmente…» y bioequivalente «Neurogab 75 mg — $7.490 c/u.» (CA-02; E2E 1.510 ms). | `inventario`: MED-0001 con stock 0; el stock de Neurogab que respalda la oferta. |
| 3 | 2:22 | `reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto` | Confirmación con `#FAR-XXXX` y plazo de 12 h (CA-04; E2E 7.839 ms). | `ordenes`: PENDIENTE_RECETA y `fecha_expiracion` = creación + 12 h; `inventario` MED-0002: reservado 0→1; `bitacora`: RESERVA_ALTA; `despachos`: PENDIENTE. |
| 4 | 2:42 | `estado 11.111.111-1` | «Tu pedido #FAR-… está esperando la foto de tu receta…» (CA-07). Tras el despacho: «…va en camino…» (CA-17). | `ordenes`: estado vigente; `despachos`: PENDIENTE → EN_RUTA. |
| 5 | 2:52 | Foto de hoja «RECETA DE PRUEBA» con pie `#FAR-XXXX` | Al vecino: «Recibimos la receta de tu pedido #FAR-XXXX. Un químico farmacéutico la revisará…». Al farmacéutico: «Nueva receta recibida para #FAR-XXXX (MED-0002 x1). Ver receta: [enlace a Drive]…», sin RUT (CA-12 y CA-13; [receta manual](evidencia/e2e/manual-receta-2026-11-09.md)). | `ordenes`: RECETA_RECIBIDA, `url_receta` y `fecha_receta`; `bitacora`: RECETA_RECIBIDA; carpeta privada de Drive con `receta-FAR-….jpg`. |
| 6 | 3:12 | `aprobar FAR-XXXX` (chat del farmacéutico) | Al vecino: «Tu pedido #FAR-XXXX fue aprobado y pasa a preparación.». Al farmacéutico: «Aprobado: #FAR-XXXX pasa a EN_PREPARACION.» (CA-14; manual). | `ordenes`: EN_PREPARACION; `bitacora`: RECETA_APROBADA, actor `farmaceutico:…`. |
| 7 | 3:22 | `en ruta FAR-XXXX` (personal) | «Su pedido #FAR-XXXX va en camino…» (CA-17). | `despachos`: EN_RUTA; `bitacora`: DESPACHO_EN_RUTA; `estado 11.111.111-1` responde «va en camino». |
| 8 | 3:29 | `entregado FAR-XXXX` y repetirlo | ENTREGADO; stock real −1 y reservado −1 una sola vez; el segundo comando dice «ya estaba ENTREGADO» (CA-18). | `inventario` MED-0002: real −1 y reservado −1; `despachos`: ENTREGADO; `bitacora`: la transición una sola vez. |
| 9 | 3:36 | Renombrar la hoja `catalogo` y consultar `losartan 50`; luego restaurarla | Alerta «ALERTA n8n: el workflow "US-04…" falló… Nodo: read_catalogo»; el vecino recibe «Tuvimos un problema…» (CA-19; E2E 2 mensajes). | n8n → Executions con el error y US-21; restaurar `catalogo` antes de seguir. |

## 5. Checklist de preparación y grabación

**Cuentas y entorno (la noche anterior y 30 min antes):**
- [ ] `bash scripts/local/levantar.sh` (o `.ps1`) sin errores y `node scripts/local/doctor.mjs` **sin ninguna línea «FALTA»**.
- [ ] `.env` completo: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_PHARMACIST_CHAT_IDS`, `TELEGRAM_ADMIN_CHAT_ID`, `GOOGLE_SHEET_ID`, `GOOGLE_DRIVE_RECETAS_FOLDER_ID`; Gemini es opcional.
- [ ] `node scripts/local/cargar-catalogo.mjs --reiniciar` (16 medicamentos sintéticos, pedidos vacíos, Pregalex 75 mg sin stock).
- [ ] Credencial «Google Drive (OAuth)» conectada y verificada por `doctor` (si venció a los 7 días, reconectar en n8n).
- [ ] Bot de Telegram con nombre de prueba; dos cuentas: A (vecino) y B (farmacéutico/personal). Nunca usar la cuenta personal con historial real.
- [ ] Foto de prueba: hoja escrita a mano con «RECETA DE PRUEBA» y el código en el pie; guardada en el carrete del teléfono.

**Puesta en escena:**
- [ ] Grabar en horizontal, 1920 × 1080, 30 fps; teléfono en soporte o captura de pantalla de Telegram Web.
- [ ] Micrófono a 15–20 cm, sin ventilador ni aire acondicionado; grabar 10 s de silencio para limpiar en edición.
- [ ] Luz frontal suave; evitar ventana a contraluz y reflejos en la pantalla.
- [ ] Silenciar notificaciones del computador y del teléfono; cerrar correo, WhatsApp y pestañas personales.
- [ ] Ocultar token, `chat_id`, URL del túnel, correo de la cuenta de servicio y cualquier RUT real. Usar solo `11.111.111-1`.
- [ ] Cursor grande y lento; zoom del navegador al 110 %; no mostrar la barra de marcadores.
- [ ] Preparar dos pestañas: Telegram y la planilla, con las hojas `ordenes`, `inventario`, `bitacora` y `despachos` listas.
- [ ] Tomar **2 o 3 tomas completas** de la demo; no borrar la primera hasta revisar la última.

**Respaldo:**
- [ ] Grabar también la terminal con `node scripts/local/e2e.mjs` (17/17) y las Executions de n8n.
- [ ] Capturas de respaldo de cada paso (chat, planilla y Drive) por si el bot falla en vivo.
- [ ] Cargar el teléfono al 100 % y tener datos móviles como red alternativa.

## 6. Cómo editarlo con IA (sección destacada)

La IA acelera la edición, pero **no reemplaza la demo**: las respuestas del bot se graban reales. La IA solo recorta, transcribe, corrige, titula y da voz.

### 6.1 Herramientas recomendadas y para qué

| Herramienta | Para qué usarla | Configuración sugerida |
|---|---|---|
| **CapCut** | Edición general, subtítulos automáticos y eliminación de silencios | Exportar 1080p, H.264, 8–10 Mbps; revisar subtítulos uno por uno |
| **Descript** | Edición por texto y «Studio Sound» para limpiar la voz | Transcribir, borrar muletillas y ruidos; conservar la pista original |
| **Opus Clip** | Cortes y versiones verticales para redes | Solo para difusión; el video de la entrega es el horizontal completo |
| **Runway / Vidu** | B-roll y transiciones | Planos de farmacia, planillas o ciudad; nunca simular pantallas del bot |
| **HeyGen** | Avatar o presentador si no hay locutor disponible | Usar solo si el equipo lo decide; el avatar no debe afirmar nada que no esté en este guion |
| **ElevenLabs** | Voz en off en español latino/chileno | Estabilidad 0,45–0,60; similitud 0,75–0,85; velocidad 0,95–1,0; escuchar 3 muestras y elegir |
| **Whisper / CapCut** | Subtítulos automáticos y corrección | Español; revisar «Peñalolén», «n8n», «Neurogab», «Pregalex», «RUT» y los códigos `#FAR` |
| **Canva** | Miniatura, títulos y lower thirds | Miniatura 1280 × 720; misma tipografía y dos colores institucionales |
| **Screen Studio** | Zoom y seguimiento de cursor en la demo | Zooms suaves en la planilla; no abusar, priorizar legibilidad |

### 6.2 Flujo paso a paso

1. **Grabar** la demo real y la locución (o el audio de referencia para TTS).
2. **Limpiar audio:** quitar ruido, normalizar a −14 LUFS y emparejar volúmenes entre tomas.
3. **Transcribir** con Whisper o CapCut y **editar por texto**: borrar muletillas, pausas largas y tomas falsas.
4. **Voz IA** solo si no hay locutor humano: generar por bloques, no todo de una vez, y conservar los cortes del guion.
5. **Subtítulos:** máximo 2 líneas y 42 caracteres por línea; sincronizar y corregir nombres propios a mano.
6. **Títulos y motion:** cifras del gancho, tarjetas de historias y rótulos de la demo; animaciones de 0,3–0,5 s.
7. **Color y música:** corrección suave, sin filtros que oculten la pantalla; música libre de derechos a −22 dB bajo la voz.
8. **Exportar** 1080p, 30 fps, H.264, audio AAC 192 kbps, 8–10 Mbps; revisar el archivo final completo antes de subirlo.

### 6.3 Prompts de IA listos para usar

1. **Títulos:** «Genera 6 títulos de máximo 70 caracteres para un video de 4:45 sobre un asistente de farmacia con IA en Telegram, costo $0, proyecto TICS331. Tono profesional y cercano, sin promesas falsas. Devuelve una tabla con el título y por qué funciona.»
2. **Guion:** «Reescribe este guion para que dure 4:45 a 150 palabras por minuto. Conserva exactamente estas cifras y citas; no agregues datos ni respuestas del bot que no estén en el texto.»
3. **Subtítulos:** «Corrige esta transcripción para subtítulos: puntuación, sin muletillas, máximo 42 caracteres por línea y 2 líneas por subtítulo. Respeta los nombres propios y los códigos #FAR.»
4. **Estilo chileno:** «Ajusta el texto al español de Chile neutro, frases de menos de 18 palabras, sin tecnicismos innecesarios y sin modismos exagerados. Mantén el tono seguro y cercano.»
5. **Auditoría anti-alucinación:** «Actúa como auditor. Compara cada afirmación del guion con esta tabla de datos verificados y marca en rojo toda frase que no tenga respaldo. No reescribas; solo lista los riesgos.»
6. **Descripción de YouTube:** «Escribe una descripción de 90 palabras para un video no listado: qué muestra, stack, datos sintéticos, repositorio y tags. Sin afirmar que está en producción.»
7. **B-roll:** «Propón 8 planos de b-roll de 2–3 segundos para un video sobre una farmacia comunitaria y un bot de Telegram. No simules la interfaz del bot ni inventes personas reales.»
8. **Preparar TTS:** «Prepara esta narración para ElevenLabs: expande abreviaturas y números (“43.089” → “cuarenta y tres mil ochenta y nueve”, “p95” → “percentil noventa y cinco”), agrega pausas con comas y divide en bloques de 20 segundos.»

### 6.4 Reglas éticas (obligatorias)

- **La demo es real.** No se simulan respuestas, no se edita el texto del chat y no se reemplaza una respuesta fallida por una captura inventada.
- **La IA solo edita o mejora:** recorta, transcribe, corrige estilo, titula o da voz; no crea evidencia.
- **Música y recursos libres de derechos.** Guardar la licencia o el enlace de la fuente; nada de música comercial.
- **Sin datos personales:** ni RUT reales, ni direcciones reales, ni recetas reales, ni tokens, ni `chat_id`.
- **Conservar el material original:** una copia del video sin editar, los audios y el proyecto de edición en Drive.
- **Transparencia:** si se usa voz IA o avatar, el equipo debe saberlo y el video no debe afirmar que hay un presentador humano si no lo hay.

## 7. Plan de contingencia y publicación

| Riesgo | Señal | Plan B |
|---|---|---|
| El bot no responde en vivo | Sin mensaje en Telegram | Repetir `levantar`, revisar `doctor` y el webhook; si sigue, usar los segmentos pregrabados de la misma sesión |
| El túnel cambió de URL | `doctor` muestra «último error de entrega» | Volver a levantar; el script registra el webhook de nuevo |
| Drive OAuth vencido (7 días) | «Tuvimos un problema» al enviar la foto | Reconectar la credencial en n8n y repetir el paso |
| Cuota de Sheets agotada | Error de cuota o respuestas lentas | Esperar un minuto; dividir la demo en tomas y unir en edición |
| Se cae internet | Telegram deja de enviar | Usar datos móviles o el E2E en terminal como evidencia de respaldo |
| Falla la locución | Voz trabada o ruido | Regrabar solo el audio; usar TTS con el guion del §3 y avisar que la voz es sintética |

**Publicación (Checklist final del video terminado):**
- [ ] Duración **menor a 5:00** (objetivo 4:45); verificar en el reproductor, no en el editor.
- [ ] Exportar master 1080p, 8–10 Mbps; revisar audio, subtítulos y que no aparezcan datos sensibles.
- [ ] Subir a YouTube como **«no listado»**; no programar ni publicar como público.
- [ ] Título sugerido: «Farmacia Comunitaria de Peñalolén: asistente con IA por $0 | Sprint 2 · TICS331».
- [ ] Descripción sugerida: «Demo real del asistente de la Farmacia Comunitaria de Peñalolén (TICS331, Grupo 10): consulta de stock, reserva con código, receta por foto, aprobación farmacéutica y despacho sobre n8n + Google Sheets, con costo de infraestructura $0. Datos sintéticos. Repositorio: github.com/Jeple/Proyecto-IngenieraSoftware — tags v0.1-sprint1 y v0.2-sprint2.»
- [ ] Verificar el enlace en una ventana de incógnito (sin sesión), con audio y en 1080p.
- [ ] Guardar en Drive: master MP4, proyecto de edición, audio, subtítulos y una copia sin editar.
- [ ] Enviar el enlace y el respaldo al Lead antes del cierre.

## 8. Anexo: datos exactos y frases que no se deben afirmar

### 8.1 Cifras que sí se pueden decir en cámara

| Dato | Valor exacto | Dónde verificarlo |
|---|---|---|
| Usuarios inscritos en la farmacia | 43.089 | [README §Problema](../README.md) |
| Boletas emitidas al año | 39.212 | [README §Problema](../README.md) |
| Transacciones presenciales | 81 % | [README §Problema](../README.md) |
| Costo de infraestructura | $0 USD (capas gratuitas; Gemini opcional) | RNF-05, [README §Stack](../README.md) |
| Historias del incremento | 9 historias + 3 frentes transversales | [backlog §2](entrega-2/backlog-actualizado.md) |
| Flujos de n8n publicados | 9 | [guía §8](guia-instalacion-local.md) |
| Medicamentos sintéticos | 16 | [guía §9](guia-instalacion-local.md) |
| Casos de aceptación | 21/21 pasan (17 automáticos + 2 manuales reales + CA-20 y CA-21 medidos) | [plan §3](plan-pruebas-aceptacion.md) |
| E2E automático | 17/17 | [E2E](evidencia/e2e/e2e-2026-11-09-22-10.md) |
| Pruebas unitarias | 413/413 en 14 suites | [ISO 25010 Q14](entrega-2/calidad-iso25010.md) |
| Latencia de consulta | p50 1.656 ms · p95 2.110 ms · máx. 2.211 ms (meta 2.500 ms) | [latencia JSON](evidencia/rendimiento/latencia-e2e-2026-11-09-22-06.json) |
| Concurrencia | 5 reservas sobre stock 3 → 2 creadas, 3 rechazadas, 0 sobreventas | [concurrencia JSON](evidencia/rendimiento/concurrencia-2026-11-09-22-07.json) |
| Productos inventados | 0 (5/5 fuera de catálogo respondieron «No encontré») | [ISO 25010 Q2](entrega-2/calidad-iso25010.md) |
| Fugas de titularidad | 0 en pruebas y E2E (CA-08 con segundo chat simulado) | [ISO 25010 Q6](entrega-2/calidad-iso25010.md) |
| Exactitud de búsqueda | 100 % (50/50) en set sintético, **preliminar** | [ISO 25010 Q1](entrega-2/calidad-iso25010.md) |
| Nodos Code con pruebas | 19/23 (83 %), bajo la meta de 90 % | [ISO 25010 Q15](entrega-2/calidad-iso25010.md) |
| Expiración de reserva | 12 horas | [plan CA-04 y CA-16](plan-pruebas-aceptacion.md) |
| Máquina de estados | 7 estados y 8 transiciones | [ADR-09](entrega-2/decisiones-diseno.md) |
| Velocidad al 9-nov | 0 SP en Done (PR sin fusionar; la cifra final va en el informe) | [backlog §4](entrega-2/backlog-actualizado.md) |

### 8.2 Frases que NO se deben afirmar

- «El bot ya funciona con WhatsApp» o «atiende el +56». **No:** WhatsApp y la voz telefónica están fuera del alcance firmado.
- «21/21 con capturas». **No:** las capturas del plan aún no existen; se puede decir «21/21 casos pasan; las capturas están pendientes».
- «Está en producción» o «lo usan los vecinos». **No:** es un MVP local de demostración con datos sintéticos.
- «Se integró con el ERP SAP». **No:** el prototipo está desacoplado de SAP por decisión de alcance.
- «Responde todo en menos de 2,5 s». **No:** la meta aplica a consultas; reserva, receta y despacho tardan entre 5 y 20 s.
- «100 % de exactitud con vecinos reales». **No:** el 50/50 es un set sintético preliminar.
- «Todas las historias están Done» o «cerramos 60 SP». **No:** al corte están In Review; la cifra real la fija el informe.
- «Cero errores» o «sistema perfecto». **No:** hay deuda técnica documentada (escrituras sin transacción, tono mixto y buscador duplicado).
- «Los tags ya están publicados». **No afirmarlo sin verificar** que `v0.1-sprint1` y `v0.2-sprint2` existen en el remoto.
- «El sistema reemplaza al químico farmacéutico». **No:** la aprobación de recetas es humana y obligatoria.
- «Los 43.089 usuarios son usuarios del bot». **No:** es la población inscrita en la farmacia, no usuarios del prototipo.
