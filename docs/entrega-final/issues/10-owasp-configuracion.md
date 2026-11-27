**Categoría OWASP v4.** Pruebas de configuración y despliegue (OTG-CONFIG). Referencia: [Guía de Pruebas de OWASP v4](https://owasp.github.io/www-project-web-security-testing-guide/assets/archive/OWASP_Testing_Guide_v4.pdf).

**Casos.**
- n8n escucha solo en 127.0.0.1 y el editor no responde desde internet.
- Túnel con nombre que expone solo la ruta del webhook.
- Versiones fijadas en `docker-compose.yml`.
- `N8N_ENCRYPTION_KEY` y `secrets/` fuera del repositorio.

**Criterio de aceptación.** Un escaneo desde fuera solo encuentra la ruta del webhook.
