**Problema.** El túnel rápido de Cloudflare cambia de dirección cada vez que el servidor se reinicia, y hay que volver a ejecutar `levantar` a mano para que Telegram encuentre el bot (`docs/entrega-final/despliegue-preproductivo.md`, sección 3).

**Propuesta.** Usar el túnel con nombre (perfil `tunel-nombrado` de `docker-compose.yml`) o un servicio del sistema que ejecute `levantar` al arrancar.

**Criterio de aceptación.** Dado el servidor recién reiniciado y sin intervención del equipo, cuando un vecino escribe «hola», entonces recibe la bienvenida a más tardar 5 minutos después del arranque.
