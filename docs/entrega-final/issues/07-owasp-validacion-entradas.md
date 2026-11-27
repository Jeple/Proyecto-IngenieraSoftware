**Categoría OWASP v4.** Pruebas de validación de entradas (OTG-INPVAL). Referencia: [Guía de Pruebas de OWASP v4](https://owasp.github.io/www-project-web-security-testing-guide/assets/archive/OWASP_Testing_Guide_v4.pdf).

**Contexto.** Los textos del vecino se guardan en la planilla. En la revisión del PR #26 ya se corrigió un caso en la dirección (B-01). Falta probar todos los campos libres de forma sistemática.

**Casos.** Textos que empiezan con `=`, `+`, `-` o `@` (fórmulas de planilla), comillas, saltos de línea, emojis y textos de 4.096 caracteres en la dirección, el motivo de rechazo, el pie de foto de la receta y la consulta.

**Criterio de aceptación.** Ningún valor se interpreta como fórmula en la planilla, el bot responde sin error y cada caso queda como prueba automática.
