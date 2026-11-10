# Sistema de Inteligencia Artificial Omnicanal para Farmacia Comunitaria

Asistente de chat para la Farmacia Comunitaria de la Municipalidad de Peñalolén (Cormup): el vecino consulta stock y precio aunque escriba mal el nombre, reserva con un código `#FAR-XXXX`, envía la foto de su receta y sigue su pedido. El prototipo funciona en **Telegram** sobre n8n y Google Sheets. Repositorio del curso TICS331 — Ingeniería de Software, Semestre 2-2026, Grupo 10.

> **Alcance firmado (Entrega 2):** consulta, reserva, receta con aprobación farmacéutica, liberación a las 12 h, estado del pedido, router de un solo chat y despacho marcado por el personal. **Fuera de este semestre:** agente de voz, app del conductor con ETA y canal WhatsApp (adaptador futuro). Detalle en `docs/entrega-2/backlog-actualizado.md`.

**Empezar aquí:** [guía de instalación local](docs/guia-instalacion-local.md) · [documentación de la Entrega 2](docs/entrega-2/) · [plan de aceptación](docs/plan-pruebas-aceptacion.md) · [CHANGELOG](CHANGELOG.md)

## Problema

La Farmacia Comunitaria de Peñalolén atiende a **43.089 usuarios** inscritos y emite **39.212 boletas al año**, pero el **81% de las transacciones sigue siendo presencial** en ventanilla. Para conocer existencias y precios, el vecino debe descargar una planilla estática sin buscador por principio activo ni dosis; el personal clínico responde manualmente consultas repetitivas por mensajería instantánea; y las reservas telefónicas o verbales no se descuentan en tiempo real del inventario, lo que provoca sobreventas y demoras de 2 a 7 días hábiles en el despacho vehicular. El objetivo es automatizar la consulta de stock, la cotización y la trazabilidad de pedidos con reserva transaccional en Google Sheets, sin tocar el ERP SAP de Cormup y con un costo de infraestructura de $0 USD (RNF-05).

## Stack tecnológico

| Componente | Rol | Capa gratuita |
|---|---|---|
| n8n 2.44.2 (Docker) | Orquestación de los workflows de negocio (9 flujos) | Self-hosted con imagen oficial; sin costo de licencia |
| Telegram Bot API | Canal de mensajería del vecino y del personal | Gratis: mensajes ilimitados mediante un bot |
| Google Sheets | Base de datos operativa (catálogo, inventario, órdenes) | Incluida con cuenta de Google |
| Google Drive | Resguardo de recetas médicas (permisos restringidos) | Incluida con cuenta de Google |
| Gemini (opcional) | Solo elige una etiqueta para mensajes ambiguos; nunca redacta respuestas (R-02) | Free tier de Google AI Studio |
| Cloudflare Tunnel | Publicación de n8n sin abrir puertos (túnel rápido sin cuenta en local) | Gratuito |
| Google Apps Script | Inicialización del libro de datos | Incluida con cuenta de Google |
| GitHub + GitHub Actions | Repositorio, tablero y CI | Gratuito para repositorios públicos |

Nota de alcance: el prototipo se mantiene desacoplado de SAP (exclusión explícita del informe de Inception) y opera exclusivamente sobre capas gratuitas (RNF-05).

## Estructura del repositorio

```text
.
├── README.md                       # Visión general, quickstart y roadmap
├── .gitignore                      # Exclusiones: secretos, datos locales, build
├── .env.example                    # Plantilla de variables de entorno (copiar a .env)
├── docker-compose.yml              # Servicios n8n + cloudflared (RNF-03)
├── secrets/                        # JSON de service-account local (no se versiona)
│   └── .gitkeep
├── docs/
│   ├── arquitectura.md             # Diagrama, capas, decisiones y guardrails
│   └── google-sheets-schema.md     # Esquema de las 5 hojas y reglas de negocio (US-01)
├── scripts/
│   └── setup-sheets.gs             # Google Apps Script que crea el libro de datos
├── workflows/                      # Exportes JSON de n8n (convención US-XX-<slug>.json)
│   └── README.md
├── .github/
│   └── workflows/
│       └── validate-workflows.yml  # CI: valida el JSON de workflows/ (US-02)
└── pwa/
    └── README.md                   # Placeholder del módulo conductor (US-11)
```

## Requisitos previos

- **Docker Desktop** (o Docker Engine + Docker Compose).
- **Cuenta de Google**: Google Sheets, Google Drive, Google Apps Script y Google AI Studio (clave de Gemini Flash).
- **Cuenta de Cloudflare** con Zero Trust para crear el túnel.
- **Cuenta de GitHub** con acceso al repositorio y al tablero del proyecto.

## Quickstart

La forma recomendada es un solo comando, que crea `.env`, importa y publica los flujos, abre el túnel y registra el webhook del bot (paso a paso en [`docs/guia-instalacion-local.md`](docs/guia-instalacion-local.md)):

```
powershell -ExecutionPolicy Bypass -File scripts\local\levantar.ps1   # Windows
bash scripts/local/levantar.sh                                       # macOS / Linux
node scripts/local/cargar-catalogo.mjs --reiniciar                   # catálogo sintético
node scripts/local/doctor.mjs                                        # qué falta (sin mostrar secretos)
```

Pruebas: `node scripts/correr-pruebas.mjs` (413 pruebas) y `node scripts/local/prueba-integracion.mjs` (n8n real con Telegram simulado, sin credenciales).

### Configuración manual (referencia histórica del Sprint 0)

1. **Clonar** el repositorio y entrar al directorio:
   `git clone https://github.com/Jeple/Proyecto-IngenieraSoftware.git`
2. **Crear el archivo de entorno**: `copy .env.example .env` (cmd) o `Copy-Item .env.example .env` (PowerShell), y completar cada clave según los comentarios del archivo. El archivo `.env` real nunca se commitea.
3. **Crear el libro de datos**: ejecutar `scripts/setup-sheets.gs` en Google Apps Script (Extensiones → Apps Script → pegar el código → Ejecutar `setupSpreadsheet`). Copiar el ID del libro resultante a `GOOGLE_SHEET_ID` en `.env`, colocar el JSON de service-account en `secrets/` y registrar su ruta en `GOOGLE_SERVICE_ACCOUNT_FILE`. Borrar las filas de ejemplo antes de cargar el catálogo oficial.
4. **Levantar los servicios**: `docker compose up -d`. Modo local sin túnel: `docker compose up n8n` y abrir <http://localhost:5678>.
5. **Abrir n8n y crear credenciales** (Google Sheets/Drive, Gemini, Vapi) con las cuentas propias de cada desarrollador, y crear el bot de Telegram con **@BotFather** para obtener el token: copiar ese token en `TELEGRAM_BOT_TOKEN` y elegir un secreto de webhook arbitrario (una cadena aleatoria cualquiera) en `TELEGRAM_WEBHOOK_SECRET`, ambos en `.env`. Los exportes de workflows nunca incluyen credenciales.

## Modelo de ramas

> **Actualización Entrega 2:** la rama `develop` nunca se creó. El equipo trabaja con ramas cortas desde `main` que vuelven por pull request revisado y con la CI en verde (ver `docs/entrega-2/control-configuracion.md`). La tabla siguiente es el modelo declarado en el Sprint 0.

| Rama | Tipo | Propósito |
|---|---|---|
| `main` | Protegida | Estado estable; se etiqueta al cierre de cada sprint con el incremento validado |
| `develop` | Protegida | Integración del sprint en curso. **Nota:** se crea tras el primer commit del repositorio |
| `feature/US-XX-<slug>` | Efímera | Una rama por historia de usuario (ej. `feature/US-04-consulta-stock`); se fusiona en `develop` mediante Pull Request revisado por al menos un integrante |

Los commits directos a `main` y `develop` están prohibidos.

## Roadmap por sprint

**Sprint 0 — Inception, Arquitectura y Datos**
- US-01: Modelado de Datos y Catálogo Dinámico en Google Sheets
- US-02: Pipeline CI/CD y Despliegue de Orquestador n8n
- US-03: Redacción del Informe de Inception y Arquitectura

**Sprint 1 — MVP Conversacional Telegram & Reserva (Walking Skeleton)**
- US-04: Consulta Inteligente de Stock y Precios (Fuzzy Search)
- US-05: Creación de Pedido con Descuento Inmediato de Stock
- US-06: Consulta de Trazabilidad de Despachos por RUT — **implementado**
- US-20: Ciclo de Vida del Pedido y Validación Farmacéutica — **implementado** (aprobación y rechazo de recetas por Telegram; GitHub #18)
- US-07: Video Sprint Review e Incremento Sprint 1

**Sprint 2 — Agente Telefónico de Voz, Recetas y Módulo Chofer**
- US-08: Integración de Agente Telefónico de Voz Natural — **fuera del alcance firmado** (Won't este semestre)
- US-09: Ingesta Asíncrona de Recetas Médicas — **Telegram implementado**; canal de correo (IMAP) **postergado** a una versión posterior
- US-10: Tarea Programada (Cron) de Expiración a 12 Horas — **implementado**
- US-11: Módulo Web Conductor y Tiempos de Entrega (OSRM) — **fuera del alcance firmado**; la PWA queda como prototipo en modo demostración y el despacho lo marca el personal (US-22)
- US-21: Observabilidad, Alertas y Recuperación de Workflows — **implementado** (alertas por Telegram + runbook; GitHub #20)
- US-12: Video Sprint Review y Documentación Sprint 2

**Sprint 3 — Calidad, Testing E2E y Examen Final**
- US-13: Pruebas de Estrés y Consistencia de Reservas Concurrentes
- US-14: Hardening de Prompts y Seguridad Clínica
- US-15: Preparación de Demo Final y Examen de Grado

### Historias propuestas (pendientes de planificar)

- US-16 — Panel de administración: UI web para configurar API keys y secretos, mapear las celdas/hojas de Google Sheets, consultar los datos en vivo y probar los flujos, de modo que la demo y la operación diaria no requieran tocar la terminal.
- US-17 — Router de intenciones de Telegram: un único webhook que clasifica el mensaje y deriva a consulta, reserva, trazabilidad, recetas, aprobación o despacho — **implementado en la Entrega 2**.
- US-18 — Backend de la PWA del repartidor (GET/PATCH de despachos) — fuera del alcance firmado.
- US-22 — Despacho marcado por el personal («en ruta» / «entregado») con aviso al vecino y descuento final de stock — **implementado en la Entrega 2**.
- US-19 — Canal de correo para recetas (IMAP): retoma la mitad postergada de US-09 cuando se habilite.

## Enlaces

- Repositorio: <https://github.com/Jeple/Proyecto-IngenieraSoftware>
- Tablero del proyecto: <https://github.com/users/Jeple/projects/6/views/1>

## Referencia al Informe de Inception

Este documento resume el arranque técnico del proyecto. La fuente de verdad es el **Informe de Inception** «Sistema de Inteligencia Artificial Omnicanal para Farmacia Comunitaria» (TICS331, Semestre 2-2026, Grupo 10), que define los requerimientos (RF-01..RF-08, RNF-01..RNF-08), el backlog de 60 Story Points y las exclusiones de alcance. Ante cualquier discrepancia entre este repositorio y el informe, prevalece el informe. La arquitectura detallada se documenta en [`docs/arquitectura.md`](docs/arquitectura.md) y el modelo de datos en [`docs/google-sheets-schema.md`](docs/google-sheets-schema.md).
