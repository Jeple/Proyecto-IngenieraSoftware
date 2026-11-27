**Categoría OWASP v4.** Pruebas de lógica de negocio (OTG-BUSLOGIC). Referencia: [Guía de Pruebas de OWASP v4](https://owasp.github.io/www-project-web-security-testing-guide/assets/archive/OWASP_Testing_Guide_v4.pdf).

Complementa #15, que cubre la carga de 20 reservas.

**Casos.**
- El mismo mensaje de reserva enviado dos veces seguidas: debe responder que ya quedó registrado.
- 50 reservas simultáneas sobre stock 10: `node scripts/local/prueba-concurrencia.mjs --n 50 --stock 10`.
- Reservas con cantidad 0 o 999.

**Criterio de aceptación.** 0 sobreventas y el stock nunca queda negativo.
