# Workflows de n8n

Esta carpeta versiona los exportes JSON de los workflows de n8n. En el Sprint 0 no contiene ningún workflow: los archivos se crean a medida que se implementan las historias de usuario (ver tabla más abajo). La estructura está preparada para que la CI valide el JSON en cada Push y Pull Request.

## Convención de nombres

```text
US-XX-<slug>.json
```

- `US-XX`: historia de usuario que origina el workflow (ej. `US-04`).
- `<slug>`: nombre del workflow dentro de n8n, en minúsculas y con guiones (ej. `consulta-stock`).
- Ejemplo completo: `US-04-consulta-stock.json`.

El prefijo corresponde a la historia que **origina** el flujo. Cuando una historia posterior amplía ese mismo flujo, modifica el mismo archivo en lugar de crear otro (por ejemplo, US-06 amplía `US-04-consulta-stock.json` con la consulta de estado por RUT o `#FAR-XXXX`).

## Exportar un workflow desde n8n

1. Abrir el workflow en el editor de n8n.
2. Menú superior derecho → **Download JSON**.
3. Guardar el archivo en esta carpeta respetando la convención de nombres.
4. Confirmar que la CI pasa (el JSON debe ser válido, sin BOM de Windows).

## Importar un workflow en n8n

1. En el editor de n8n: **Workflows → Import from File** (o pegar el JSON con *Import from Clipboard*).
2. Revisar que los nodos de credenciales queden enlazados (aparecen en rojo hasta configurarlos).
3. Activar el workflow solo después de verificar las credenciales y el webhook.

## Credenciales

**Los exportes de n8n nunca incluyen credenciales.** Cada desarrollador configura las suyas propias (Google Sheets/Drive, WhatsApp Cloud API, Gemini, Vapi) en su instancia local de n8n, siguiendo el [Quickstart del README](../README.md). Los identificadores compartidos (por ejemplo `GOOGLE_SHEET_ID`) se toman del archivo `.env` local; los secretos nunca se commitean.

## Mapa de historias → workflow

| Historia | Archivo planeado | Workflow n8n | Requerimientos | Estado |
|---|---|---|---|---|
| US-04 | `US-04-consulta-stock.json` | `consulta-stock` | RF-01, RF-02 | pendiente |
| US-05 | `US-05-reserva.json` | `reserva` | RF-03, RF-04 | pendiente |
| US-06 | Amplía `US-04-consulta-stock.json` | `consulta-stock` | RF-07 | pendiente |
| US-08 | Sin archivo propio: Vapi invoca por HTTP los webhooks de `consulta-stock` y `reserva` | `consulta-stock`, `reserva` | RNF-02 | pendiente |
| US-09 | `US-09-recetas.json` | `recetas` | RF-05 | pendiente |
| US-10 | `US-10-cron-expiracion.json` | `cron-expiracion` | RF-06 | pendiente |
| US-11 | `US-11-conductor-pwa.json` | `conductor-pwa` | RF-08 | pendiente |

Historias de calidad sin workflow propio (US-01, US-02, US-03, US-07, US-12, US-13, US-14, US-15) no aparecen en esta tabla. El detalle de qué flujo cubre cada requerimiento está en [`docs/arquitectura.md`](../docs/arquitectura.md).

## Validación por CI

El workflow [`.github/workflows/validate-workflows.yml`](../.github/workflows/validate-workflows.yml) se ejecuta en cada Push o Pull Request que toque `workflows/**`:

- **Falla** si algún `workflows/*.json` no es JSON válido (el mensaje indica el archivo con error).
- **Advierte** (sin fallar) si la carpeta aún no contiene archivos JSON, como ocurre en el Sprint 0.

La validación no requiere dependencias: usa el Node.js ya instalado en `ubuntu-latest`.

## Checklist antes de commitear un workflow

- [ ] El archivo sigue la convención `US-XX-<slug>.json`.
- [ ] El JSON fue exportado desde n8n y abre sin errores al reimportarlo.
- [ ] El archivo no contiene credenciales ni tokens.
- [ ] La CI `validate-workflows` quedó en verde.
