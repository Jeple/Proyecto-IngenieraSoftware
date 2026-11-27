# Manual de uso del asistente (v0.1)

El asistente es un bot de Telegram de la Farmacia Comunitaria de Peñalolén. Esta versión es un **prototipo con datos ficticios**: los remedios, precios, RUT y direcciones de este manual no son reales.

El enlace al bot de la v0.1 se publica junto con la [versión v0.1.0](https://github.com/Jeple/Proyecto-IngenieraSoftware/releases).

## 1. Para vecinos y cuidadores

### Qué puede hacer

| Quiero… | Escribo… | El bot responde (ejemplo) |
|---|---|---|
| Ver las opciones | `hola` | Se presenta como asistente automático, muestra el menú y avisa que no da indicaciones médicas |
| Saber si hay un remedio y su precio, aunque lo escriba mal | `hola, ¿hay pregavalina 75?` | «Pregalex 75 mg — $8.990 c/u. Stock disponible: 0 unidades. Producto agotado temporalmente. Bioequivalentes disponibles con stock: - Neurogab 75 mg — $7.490 c/u.» |
| Reservar | `reservar neurogab 75 x1 rut 11.111.111-1, Pasaje Ficticio 123, Peñalolén Alto` | «Reserva confirmada. Su código es #FAR-0001 — Neurogab 75 mg x1, $7.490 en total. Su pedido quedó reservado por 12 horas. Envíe la foto de su receta médica a este chat indicando este código.» |
| Enviar la receta | Una **foto** de la receta con `#FAR-0001` escrito en el texto de la foto | «Recibimos la receta de su pedido #FAR-0001. Un químico farmacéutico la revisará y le avisaremos por este chat.» |
| Saber cómo va mi pedido | `estado #FAR-0001` o `estado 11.111.111-1` | Por ejemplo: «Su pedido #FAR-0001 está esperando la foto de su receta. Tiene 12 horas para enviarla.» |

También entiende frases como «quiero dos somnia»: en ese caso pide los datos que faltan para la reserva (RUT, dirección y sector).

### Avisos que llegan solos

- Cuando el químico farmacéutico aprueba la receta: «Su pedido #FAR-0001 fue aprobado y pasa a preparación.»
- Si la rechaza, el aviso trae el motivo e invita a contactar a la farmacia.
- Cuando el pedido sale: «Su pedido #FAR-0001 va en camino. El conductor de la farmacia lo entregará en la dirección registrada.»
- Cuando se entrega: «Su pedido #FAR-0001 fue entregado. Gracias por preferir la Farmacia Comunitaria de Peñalolén.»
- Si la receta no llega en 12 horas, la reserva se cancela, llega un aviso y el remedio vuelve a quedar disponible para otros vecinos.

### Reglas importantes

- **Despacho a domicilio** solo en Peñalolén Alto, Peñalolén Nuevo y San Luis.
- **La receta se envía dentro de 12 horas** y desde el mismo chat con el que se hizo la reserva.
- **Solo quien hizo el pedido puede consultarlo.** Si otra persona pregunta por ese código, el bot responde lo mismo que para un pedido que no existe.
- **El bot no da indicaciones médicas.** Ante una urgencia responde con el SAMU 131 y el SAPU; ante preguntas de dosis o síntomas, deriva al médico o al químico farmacéutico.
- **El pago sigue igual que hoy**, por Tesorería. El bot no cobra.
- **Datos personales:** el RUT y la dirección se usan solo para gestionar el pedido.

### Si algo no resulta

| El bot dice… | Qué hacer |
|---|---|
| «No encontré ese pedido…» | Revise el código #FAR o su RUT, y escriba desde el mismo chat con el que reservó |
| «Para coordinar la entrega necesito su dirección y sector…» | Repita la reserva con el formato del ejemplo, todo en un mismo mensaje |
| «Por ahora la entrega a domicilio cubre solo los sectores…» | Corrija la dirección o retire en la farmacia |
| «Stock insuficiente…» | Reserve una cantidad menor o igual a la que indica el mensaje |
| «No encontré "…" en nuestro catálogo…» | Pruebe con el nombre del principio activo (el genérico) |
| No responde | El ambiente de prueba puede estar reiniciándose: espere unos minutos o avise al equipo |

Las reservas, recetas y despachos tardan entre 5 y 20 segundos en responder, porque el bot guarda los datos en la planilla antes de contestar.

## 2. Para el personal de la farmacia

Los comandos solo funcionan desde los chats autorizados por el equipo. Desde cualquier otro chat se tratan como mensajes comunes.

| Rol | Escribo… | Qué pasa |
|---|---|---|
| Químico farmacéutico | `aprobar FAR-0001` | El pedido pasa a preparación y el vecino recibe el aviso. Respuesta: «Aprobado: #FAR-0001 pasa a EN_PREPARACION.» |
| Químico farmacéutico | `rechazar FAR-0001 receta ilegible` | El pedido queda rechazado, el remedio vuelve al stock una sola vez y el vecino recibe el aviso con el motivo |
| Personal de despacho | `en ruta FAR-0001` | «Listo: #FAR-0001 pasa a EN_RUTA. Se avisó al vecino.» |
| Personal de despacho | `entregado FAR-0001` | «Listo: #FAR-0001 quedó ENTREGADO y se descontó el stock.» Repetir el comando no vuelve a descontar |
| Personal | `revisar vencidos` | Cancela las reservas sin receta con más de 12 horas. El sistema también lo hace solo cada hora |

Cuando llega una receta, el químico farmacéutico recibe un aviso con el enlace a la foto, sin el RUT del vecino. Si algún flujo falla, el equipo técnico recibe una alerta con el flujo y el paso que falló.

### Dónde mirar

- **Planilla de Google:** hojas `catalogo`, `inventario` (stock real y reservado), `ordenes` (pedidos y su estado), `despachos` y `bitacora` (cada cambio con fecha y autor).
- **n8n → Executions:** cada mensaje procesado, paso a paso. Solo para el equipo técnico.
