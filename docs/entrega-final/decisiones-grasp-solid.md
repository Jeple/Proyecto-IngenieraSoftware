# Dos decisiones de diseño explicadas con GRASP y SOLID

Este documento explica, en palabras simples, dos decisiones que sostienen el asistente de la Farmacia Comunitaria. Cada una se justifica con un principio de diseño reconocido:

- **GRASP** reúne criterios para decidir *qué parte del sistema debe hacer cada cosa*.
- **SOLID** reúne criterios para que el sistema *se pueda cambiar sin romperse*.

El detalle técnico de todas las decisiones está en el [registro de decisiones (ADR)](../entrega-2/decisiones-diseno.md).

## Decisión 1 · Una sola puerta de entrada que reparte el trabajo

**Qué decidimos.** Todo mensaje que llega al bot entra por un único punto, el *router* (US-17). Ese punto lee el mensaje, decide qué quiere la persona (consultar un remedio, reservar, ver su pedido, enviar la receta, o un comando del personal) y se lo pasa al flujo que sabe atenderlo. El router no lee la planilla ni calcula precios: solo decide y deriva.

**Por qué.**
- Telegram admite una sola dirección por bot. En el Sprint 1 había cinco y, con el bot real, solo una habría recibido mensajes (defecto D-03).
- Una sola puerta expuesta a internet es más fácil de proteger: el router verifica que cada mensaje venga de Telegram antes de hacer cualquier otra cosa.
- Las reglas de seguridad clínica (urgencias, autolesión, preguntas de dosis) se aplican una sola vez y **antes** de cualquier intención comercial.

**Principio GRASP: Controlador.** El controlador es el primer objeto que recibe un evento del exterior y lo coordina, sin hacer el trabajo él mismo. Es como la recepción de un consultorio: recibe a todos, pregunta a qué vienen y los envía al box correcto, pero no atiende consultas médicas.

**Dónde se ve en el código.**
- Flujo [`workflows/US-17-router-telegram.json`](../../workflows/US-17-router-telegram.json): el nodo `clasificar` decide la intención, el nodo `derivar` elige el camino y los nodos `ir_consulta`, `ir_reserva`, `ir_estado`, `ir_receta`, `ir_aprobacion`, `ir_despacho` e `ir_expiracion` llaman al subflujo que corresponde.
- Pruebas: [`scripts/test-router.mjs`](../../scripts/test-router.mjs) (71 pruebas, incluidas las de contrato con los flujos que reciben el mensaje).

**Qué ganamos y qué costó.**
- Una intención nueva se agrega en el router y en el flujo que la atiende, sin tocar los demás. Así se sumaron el comando del personal «revisar vencidos» (router y US-10) y las reservas en lenguaje natural, como «quiero dos somnia» (router y US-05).
- El costo es un punto central: si el router falla, el bot no responde. Lo mitigan la alerta automática al equipo (US-21) y el aviso al vecino («Tuvimos un problema…»).

## Decisión 2 · Cada flujo hace una sola cosa

**Qué decidimos.** En vez de un gran flujo que lo hace todo, hay un flujo por tarea:

| Tarea | Flujo | Pruebas |
|---|---|---|
| Consultar stock y precio | [`US-04-consulta-stock.json`](../../workflows/US-04-consulta-stock.json) | `test-fuzzy-match.mjs` (32) |
| Reservar con código #FAR | [`US-05-reserva.json`](../../workflows/US-05-reserva.json) | `test-reserva.mjs` (79) |
| Ver el estado del pedido | [`US-06-trazabilidad.json`](../../workflows/US-06-trazabilidad.json) | `test-trazabilidad.mjs` (20) |
| Recibir la foto de la receta | [`US-09-recetas-telegram.json`](../../workflows/US-09-recetas-telegram.json) | `test-recetas-telegram.mjs` (28) |
| Liberar reservas vencidas a las 12 h | [`US-10-cron-expiracion.json`](../../workflows/US-10-cron-expiracion.json) | `test-cron-expiracion.mjs` (19) |
| Aprobar o rechazar recetas | [`US-20-aprobacion-recetas.json`](../../workflows/US-20-aprobacion-recetas.json) | `test-aprobacion.mjs` (19) |
| Avisar fallas al equipo | [`US-21-alertas-errores.json`](../../workflows/US-21-alertas-errores.json) | `test-alertas.mjs` (10) |
| Marcar el despacho | [`US-22-despacho-personal.json`](../../workflows/US-22-despacho-personal.json) | `test-despacho.mjs` (38) |

**Principio SOLID: Responsabilidad única (la «S»).** Cada pieza debe tener un solo motivo para cambiar. En la farmacia pasa lo mismo: quien despacha no es quien aprueba recetas.

**Por qué.**
- Un cambio queda acotado a un flujo. En el Sprint 3 corregimos los mensajes de estado del pedido (defectos D-19 y D-20) tocando solo US-06, sin riesgo para la reserva ni para las recetas.
- Cada flujo se prueba por separado: hoy son 422 pruebas automáticas en 14 grupos, todas en verde.
- Si un flujo falla, el resto sigue funcionando y la alerta indica cuál fue.

**Qué costó.**
- n8n no permite compartir código entre flujos, así que el buscador de remedios está copiado en US-04 y US-05. Una prueba falla si las dos copias dejan de ser iguales.
- La reserva (US-05) todavía hace dos cosas: crea el pedido y registra el despacho. Está anotada como deuda técnica para dividirla.

## Otros principios presentes

- **GRASP · Experto en información.** El stock disponible (real menos reservado) se calcula en el flujo que lee el inventario, nunca con la fórmula de la planilla, que alguien podría editar a mano.
- **SOLID · Abierto/cerrado** y **GRASP · Variaciones protegidas.** En cada flujo, una función (`parseTelegramUpdate`) traduce el mensaje de Telegram a un formato interno, y la lógica de la farmacia trabaja solo con ese formato. Conectar WhatsApp más adelante significa agregar un adaptador que entregue ese mismo formato, sin cambiar las reglas de la farmacia ([issue #24](https://github.com/Jeple/Proyecto-IngenieraSoftware/issues/24)).
