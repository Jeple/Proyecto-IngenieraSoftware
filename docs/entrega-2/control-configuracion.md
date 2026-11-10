# Control de configuración (SCM) · Entrega 2

Repositorio: **<https://github.com/Jeple/Proyecto-IngenieraSoftware>** (público). Tablero: **GitHub Project #6** (<https://github.com/users/Jeple/projects/6/views/1>).

Usamos los conceptos de la clase 09:
- **Ítems de configuración (ICS):** las piezas que se versionan.
- **Líneas base:** los tags de cada sprint.
- **Integración continua:** la CI en GitHub Actions.
- **Auditoría de configuración y pruebas de regresión.**

## 1. Ítems de configuración

| ICS | Ubicación | Cómo se controla |
|---|---|---|
| Workflows de n8n (9 en el alcance y 1 postergado) | `workflows/*.json` | ID fijo por flujo, `versionId` nuevo en cada cambio, reglas estáticas (`test-workflows-n8n.mjs`) y pruebas por flujo |
| Código de los nodos Code | Dentro de cada JSON | Se prueba cargándolo desde el JSON versionado (no hay copias aparte) |
| Infraestructura | `docker-compose.yml` (pila local), `infra/n8n/` (túnel con nombre) | Versiones de imagen fijadas |
| Configuración | `.env.example` (plantilla) | `.env` y `secrets/` nunca se versionan (`.gitignore`) |
| Scripts | `scripts/` (pruebas y mediciones), `scripts/local/` (arranque, diagnóstico, carga, E2E) | Revisión en PR; sin dependencias npm |
| Datos sintéticos | `data/seed/` | Generados con semilla fija (`scripts/generate_seed.py`) |
| Documentación y diagramas | `docs/`, `docs/entrega-2/diagramas/*.puml` (fuente) y `exportados/` | Los diagramas se regeneran con `node docs/entrega-2/diagramas/exportar.mjs` |
| Artefactos de presentación | `presentacion/*.html` | Generados por `scripts/build-*.mjs`; la CI compara byte a byte el archivo versionado con el generador |
| Evidencia | `docs/evidencia/` | Logs fechados de pruebas, integración y mediciones |

## 2. Modelo de ramas: declarado frente a real

El README declara un **GitFlow adaptado**: `main` protegida, `develop` de integración y una rama `feature/US-XX-<slug>` por historia. En la práctica:

| Rama | Estado | Comentario |
|---|---|---|
| `main` | Base de Matilda: esquema de datos y despliegue (PR #22 y #23 fusionados) | Rama por defecto |
| `feature/US-01` | Remota, ya fusionada (#22) | Puede borrarse |
| `feature/sprint-1-2` | Todo el desarrollo de los Sprints 1 y 2 (25 commits). **PR #25 abierto** | Agrupa varias historias: no sigue «una rama por historia» |
| `develop` | **Nunca se creó** | Desviación del modelo declarado |

**Decisión para la Entrega 2** (simplificación consciente, más cercana a *GitHub Flow*):
- Ramas de trabajo cortas que salen de `main` y vuelven por PR con revisión de un integrante y la CI en verde.
- Se abandona `develop`, porque con un equipo pequeño y PR revisados agrega un paso sin aportar control.
- Se actualizará el README para reflejar el modelo real.
- Los cambios de esta entrega van en la rama `feature/sprint-2-entrega`, creada desde `feature/sprint-1-2`.

## 3. Pull requests e historial

| PR | Rama | Estado | Contenido |
|---|---|---|---|
| #22 | `feature/US-01` → `main` | Fusionado | Esquema de datos y datos sintéticos (US-01) |
| #23 | `feature/US-04` → `main` | Fusionado | Despliegue de n8n con Docker y Cloudflare Tunnel (corresponde a US-02, aunque la rama se llamó US-04) |
| #25 | `feature/sprint-1-2` → `main` | **Abierto** | Prototipo de los Sprints 1 y 2 (Telegram) |
| (nuevo) | `feature/sprint-2-entrega` → `main` | Por abrir | Correcciones de integración, US-17, US-22, entorno local, pruebas y documentación de la Entrega 2 |

**Mensajes de commit:** Conventional Commits con la historia como alcance y referencia al issue. Ejemplos del historial:
- `feat(US-20): aprobación farmacéutica de recetas y máquina de estados (GitHub #18)`
- `fix(US-06): exigir titularidad del chat en la consulta de estado (RF-07)`

Los commits de esta entrega siguen el mismo estilo con `Refs #issue` (ver `paquete-final.md`).

## 4. Integración continua

`.github/workflows/validate-workflows.yml` se ejecuta en cada push y PR que toque `workflows/`, `scripts/`, `pwa/` o `docker-compose.yml`. Tiene dos jobs:

**Job `validate-json` (Node 20):**
- JSON válido y sin BOM.
- `check_secrets.sh`.
- 14 suites automáticas (413 pruebas): las unitarias por flujo, las de contrato del router, las reglas estáticas de n8n y la consistencia de los HTML generados.

**Job `integracion-n8n`:**
- Descarga la imagen fijada `n8nio/n8n:2.44.2`.
- Importa y publica los 9 flujos.
- Ejecuta 14 casos con Telegram simulado y mide la latencia.

Cada job puede bloquear el PR (*quality gate*). Con la protección de rama que se propone en `paquete-final.md`, nada entra a `main` en rojo.

## 5. Versiones fijadas (reproducibilidad)

| Componente | Versión | Dónde |
|---|---|---|
| n8n | 2.44.2 | `docker-compose.yml` (`N8N_VERSION`), `infra/n8n/docker-compose.yml`, CI |
| cloudflared | 2026.10.1 | `docker-compose.yml` (`CLOUDFLARED_VERSION`), `infra/n8n/` |
| PlantUML | 1.2026.9 | `docs/entrega-2/diagramas/exportar.mjs` |
| Node (CI) | 20 | `actions/setup-node` |
| Runner del job `integracion-n8n` | `ubuntu-24.04` | `.github/workflows/validate-workflows.yml`. Se fijó el 10-nov: en `ubuntu-latest` (Ubuntu 26 desde el 19-oct) el job se cortó por tiempo al levantar n8n |
| Node (local) | ≥ 18 | Verificado por `levantar.mjs` y `doctor.mjs` |
| Fin de línea | LF | `.gitattributes` (`* text=auto eol=lf`) |

Antes, `docker-compose.yml` usaba `n8n:latest` y `cloudflared:latest`. La regla 10a de `test-workflows-n8n.mjs` impide volver a usar `latest`.

## 6. Líneas base (tags) y CHANGELOG

| Tag | Commit | Contenido |
|---|---|---|
| `v0.1-sprint1` | `d216bfa` (último commit del Sprint 1, 16-oct) | Prototipo de los Sprints 1 y 2 tal como se entregó a revisión. Se etiqueta después de fusionar el PR #25 |
| `v0.2-sprint2` | Commit de fusión del PR de la Entrega 2 en `main` | Incremento del Sprint 2 con el E2E aprobado |

Los cambios por sprint están en [`CHANGELOG.md`](../../CHANGELOG.md) (formato *Keep a Changelog*).

## 7. Auditoría de configuración y regresión

- **Secretos:** `bash scripts/check_secrets.sh` (local y CI). Detecta claves privadas, JWT, tokens, `.env` versionados, credenciales con datos dentro de workflows y RUT fuera de los datos sintéticos.
- **Coherencia entre ICS:**
  - `test-workflows-n8n.mjs` verifica que el catálogo de flujos (`scripts/local/lib/flujos.mjs`), los ID de los JSON y los destinos del router coincidan.
  - `test-mapa` y `test-panel` verifican que los HTML generados correspondan a los workflows y datos actuales.
- **Regresión:** las 413 pruebas en cada push, más el *drift guard* entre las dos copias del buscador difuso.
- **Prueba de humo:** `node scripts/local/doctor.mjs` y el paso 7 de `levantar.mjs`.
