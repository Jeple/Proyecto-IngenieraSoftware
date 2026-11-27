# Guion del video · v0.1 (Sprint 3)

**Duración máxima: 5:00.** Es una Sprint Review: se evalúa ver el producto funcionando, cómo lo usan las personas, cómo responde ante errores y su estado actual. No se evalúa la edición.

**Dónde se graba:** en el ambiente preproductivo de la v0.1 ([despliegue-preproductivo.md](despliegue-preproductivo.md)), con el catálogo sintético recién cargado. Pantalla dividida: Telegram (letra grande) a la izquierda y la planilla a la derecha.

**Teléfonos:** A = el vecino. B = otro integrante, que no está autorizado como personal. El químico farmacéutico y el personal usan el chat autorizado en el `.env`.

| Bloque | Tiempo | Quién habla | En pantalla |
|---|---|---|---|
| 1. Problema y objetivo | 0:00 – 0:25 | Product Owner | Portada del informe |
| 2. Qué cambió en el Sprint 3 | 0:25 – 0:50 | Scrum Master | Tablero filtrado por el Sprint 3 |
| 3. Recorrido completo | 0:50 – 3:00 | Maneja Julián; narra Matilda | Telegram y planilla |
| 4. Errores y situaciones límite | 3:00 – 4:05 | Narra Antonio | Telegram (teléfonos A y B) |
| 5. Calidad y estado actual | 4:05 – 4:40 | Javier | GitHub Actions en verde y la tabla de calidad |
| 6. Qué falta para un piloto | 4:40 – 5:00 | Álvaro | Tabla de requisitos del informe |

## Bloque 1 · Problema y objetivo (0:00 – 0:25)

> «Somos el Grupo 10. La Farmacia Comunitaria de Peñalolén atiende a 43 mil vecinos con un catálogo en Excel sin buscador, consultas respondidas a mano y reservas que no se descuentan del inventario. Les mostramos la versión 0.1 de un asistente de chat que resuelve consultas, reservas, recetas y seguimiento, con un químico farmacéutico aprobando cada receta.»

## Bloque 2 · Qué cambió en el Sprint 3 (0:25 – 0:50)

> «En este último sprint corregimos tres errores: el estado de un pedido con receta prometía preparación antes de la aprobación, un pedido rechazado aparecía en revisión y una consulta con "quiero" o "necesito" terminaba en una reserva. Unificamos el trato de usted, probamos todas las piezas de código y dejamos la versión 0.1 en un ambiente que cualquiera puede probar. Quedan pendientes la revisión de los textos por un químico farmacéutico y la medición con vecinos reales.»

## Bloque 3 · Recorrido completo (0:50 – 3:00)

Escriba los mensajes exactos. Las operaciones que escriben en la planilla tardan de 5 a 20 segundos: narre lo que ocurre mientras espera.

| Seg. | Quién y qué escribe | Qué decir | Qué debe verse |
|---|---|---|---|
| 0:50 | A: `hola` | «El bot se presenta como automático y avisa que no da indicaciones médicas.» | Bienvenida con el menú |
| 1:05 | A: `necesito neurogab 75 por favor` | «El vecino pregunta como habla. Antes del Sprint 3 esto terminaba en una reserva; ahora informa stock y precio.» | Neurogab 75 mg, precio y stock |
| 1:20 | A: `hola, ¿hay pregavalina 75?` | «Aunque esté mal escrito, lo encuentra; si está agotado, ofrece un bioequivalente.» | Pregalex agotado y Neurogab como alternativa |
| 1:35 | A: `reservar neurogab 75 x1 rut 11.111.111-1, Pasaje Ficticio 123, Peñalolén Alto` | «Reserva con un RUT ficticio: el stock queda apartado de inmediato.» | Código #FAR-0001; en la planilla, la fila PENDIENTE_RECETA y el reservado +1 |
| 2:00 | A: foto de la hoja «RECETA DE PRUEBA» con el pie `#FAR-0001` | «La receta llega por el mismo chat a una carpeta privada.» | «Recibimos la receta…» y el aviso al químico farmacéutico, sin RUT |
| 2:15 | A: `estado #FAR-0001` | «Mientras espera, el vecino ve que un químico farmacéutico la está revisando.» | «Recibimos la receta de su pedido… la está revisando» |
| 2:25 | Químico farmacéutico: `aprobar FAR-0001` | «Nada pasa a preparación sin su aprobación.» | Aviso al vecino; la fila pasa a EN_PREPARACION |
| 2:40 | Personal: `en ruta FAR-0001` y luego `entregado FAR-0001` | «El personal marca el despacho y el vecino recibe cada aviso. Al entregar, el stock se descuenta una sola vez.» | «va en camino», «fue entregado»; en `inventario`, real −1 y reservado −1 |

## Bloque 4 · Errores y situaciones límite (3:00 – 4:05)

| Seg. | Quién y qué escribe | Qué decir | Qué debe verse |
|---|---|---|---|
| 3:00 | A: `paracetamol 500` | «Si no está en el catálogo, no inventa nada.» | «No encontré "paracetamol 500"…» |
| 3:10 | A: `reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 100, Ñuñoa` | «Fuera de la cobertura, rechaza la reserva y explica por qué.» | El mensaje de cobertura; la planilla no cambia |
| 3:25 | B: `estado #FAR-0001` | «Otra persona no puede ver un pedido ajeno: recibe lo mismo que para un pedido inexistente.» | «No encontré ese pedido…» |
| 3:35 | B: `aprobar FAR-0001` | «Un chat no autorizado no puede aprobar recetas: el bot lo trata como una consulta común.» | «No encontré ese pedido…»; la planilla no cambia |
| 3:45 | A: `me duele el pecho` | «Ante una urgencia deriva al SAMU 131 y no da consejos médicos.» | Respuesta con SAMU 131 |
| 3:55 | Personal: `revisar vencidos` | «Las reservas sin receta se liberan solas a las 12 horas; aquí lo forzamos.» | Aviso de cancelación del pedido vencido (#FAR-0900) |

Antes de grabar, cree el pedido vencido con `node scripts/local/cargar-catalogo.mjs --pedido-vencido <chat_id de A>`.

## Bloque 5 · Calidad y estado actual (4:05 – 4:40)

> «Tenemos 422 pruebas automáticas que corren en cada cambio, más una prueba con n8n real. Los 21 casos de aceptación pasaron con las cuentas reales y la búsqueda identifica bien 50 de 50 consultas de prueba. Su principal límite es el tiempo: reservar o aprobar tarda de 5 a 20 segundos, porque cada paso escribe en la planilla.»

En pantalla: GitHub Actions en verde y la tabla «Tres atributos de calidad» del informe. Si ya se corrió la carga de 20 reservas, diga su resultado.

## Bloque 6 · Qué falta para un piloto (4:40 – 5:00)

> «Para un piloto, la Municipalidad necesita un número de WhatsApp Business, un extracto real del catálogo, una carpeta institucional para las recetas y un convenio para tratar datos personales. Todo lo demás, incluida una guía para que otro equipo continúe, está en el repositorio. Gracias.»

## Antes de grabar

- [ ] `node scripts/local/doctor.mjs` sin «FALTA», el mismo día.
- [ ] `node scripts/local/cargar-catalogo.mjs --reiniciar`, para que el primer pedido sea #FAR-0001.
- [ ] Un ensayo completo con cronómetro, de menos de 5:00.
- [ ] Notificaciones silenciadas en el computador y en los teléfonos.
- [ ] Ninguna ventana con el `.env`, las claves ni el token del bot. No abra la terminal durante la grabación.
- [ ] Solo datos de este guion: ningún nombre, RUT ni foto real.

**Si falla la red:** `node scripts/local/prueba-integracion.mjs` levanta n8n en un contenedor con un Telegram simulado y muestra los casos pasando sin internet. Dígalo explícitamente: es la prueba de integración, no el bot real.

**Subida:** YouTube como «no listado» (o Google Drive con acceso para la universidad); pegue el enlace en la tabla de enlaces del informe.
