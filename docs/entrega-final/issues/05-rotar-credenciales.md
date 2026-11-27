**Problema.** El 15 de noviembre se compartieron por el chat del equipo los JSON de la cuenta de servicio y del cliente OAuth, para levantar el sistema en otro computador (RS-05, riesgo materializado). No llegaron al repositorio: el historial completo se revisó el 27 de noviembre sin hallazgos.

**Tareas al cierre de la evaluación (4 de diciembre).**
- [ ] Borrar la clave de la cuenta de servicio y crear otra.
- [ ] Eliminar el cliente OAuth y crear otro.
- [ ] Revocar el token del bot con `/revoke` en @BotFather.
- [ ] Actualizar el `.env` del ambiente y ejecutar `levantar`.

Guía: `docs/guia-instalacion-local.md`, sección 15.

**Criterio de aceptación.** Las credenciales anteriores quedan revocadas y `node scripts/local/doctor.mjs` no muestra «FALTA» con las nuevas.
