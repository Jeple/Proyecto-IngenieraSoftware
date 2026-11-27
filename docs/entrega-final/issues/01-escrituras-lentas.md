**Problema.** Las operaciones que escriben en la planilla (reservar, aprobar una receta y marcar un despacho) tardan de 5 a 20 segundos. Un adulto mayor puede pensar que el bot no respondió y volver a llamar a la farmacia.

**Meta propuesta.** p95 de 5 segundos o menos (atributo de eficiencia de desempeño, `docs/entrega-final/calidad-v0.1.md`, sección 3).

**Propuesta.** Leer la planilla en lote, guardar el catálogo en caché y responder de inmediato «Estoy registrando su reserva…» mientras se escribe.

**Criterio de aceptación.** Dado el ambiente preproductivo, cuando se ejecutan 20 reservas seguidas, entonces el p95 es de 5 segundos o menos y `node scripts/correr-pruebas.mjs` sigue en verde.

**Origen.** Informe final, secciones 3 (tres atributos de calidad) y 5 (problemas conocidos).
