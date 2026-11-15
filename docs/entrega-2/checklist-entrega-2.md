# Checklist de cumplimiento · Entrega 2 (Sprint Review)

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 15-nov-2026 | Equipo del proyecto (Grupo 10) | Verificación contra la rúbrica de la Entrega 2 y estado del repositorio |

**Datos de referencia:** repositorio <https://github.com/Jeple/Proyecto-IngenieraSoftware> · rama `main` en `d42b6b2` · tags `v0.1-sprint1` y `v0.2-sprint2` · PR [#25](https://github.com/Jeple/Proyecto-IngenieraSoftware/pull/25) y [#26](https://github.com/Jeple/Proyecto-IngenieraSoftware/pull/26) fusionados · tablero [GitHub Project #6](https://github.com/users/Jeple/projects/6/views/1) · entrega en WebC: **domingo 15-nov, 23:30**.

Leyenda: ✅ cubierto en el repositorio · ⚠️ parcial · ❌ falta (acción del equipo, fuera del repositorio).

## 1. Matriz de cumplimiento de la rúbrica

| # | Entregable esperado | Dónde está | Estado | Acción pendiente |
|---|---|---|---|---|
| 1 | Documento de alcance firmado por el stakeholder | No se versiona (contiene firma y datos de la contraparte); se sube a WebC | ❌ | Juan Pablo: subir el PDF firmado junto al informe |
| 2 | Backlog actualizado y priorizado | [`docs/entrega-2/backlog-actualizado.md`](backlog-actualizado.md) | ✅ | — |
| 3 | Evidencia del avance del tablero | Issues de GitHub + plan en [`paquete-final.md`](paquete-final.md) §4 | ⚠️ | Javier: capturas **antes/después**, mover estados y crear US-17/US-22 (ver §4) |
| 4 | Diagrama de secuencia de las principales funcionalidades | [`secuencia-consulta`](diagramas/secuencia-consulta.puml), [`reserva`](diagramas/secuencia-reserva.puml), [`trazabilidad`](diagramas/secuencia-trazabilidad.puml), [`receta-aprobación`](diagramas/secuencia-receta-aprobacion.puml), [`expiracion`](diagramas/secuencia-expiracion.puml), [`despacho`](diagramas/secuencia-despacho.puml) (+ PNG/SVG en [`exportados/`](diagramas/exportados/)) | ✅ | — |
| 5 | Justificación de las principales decisiones de diseño | [`docs/entrega-2/decisiones-diseno.md`](decisiones-diseno.md) (ADR y cohesión/acoplamiento) | ✅ | — |
| 6 | Enlace al repositorio y evidencia de control de configuración | [`docs/entrega-2/control-configuracion.md`](control-configuracion.md) + tags + PRs + CI | ✅ | — |
| 7 | Diagrama de secuencia y diagrama de componentes | [`componentes.puml`](diagramas/componentes.puml) y [`despliegue.puml`](diagramas/despliegue.puml) (+ exportados) | ✅ | — |
| 8 | Decisiones de diseño | [`docs/entrega-2/decisiones-diseno.md`](decisiones-diseno.md) | ✅ | — |
| 9 | Atributos de calidad (ISO/IEC 25010) | [`docs/entrega-2/calidad-iso25010.md`](calidad-iso25010.md) | ✅ | Matizar «21/21»: el plan de pruebas ya admite que faltan capturas y CA-08 desde un segundo teléfono |
| 10 | Estrategia de pruebas | [`docs/entrega-2/estrategia-pruebas.md`](estrategia-pruebas.md) | ✅ | — |
| 11 | Plan de pruebas de aceptación y reporte de la 1.ª evidencia de pruebas unitarias | [`docs/plan-pruebas-aceptacion.md`](../plan-pruebas-aceptacion.md) + [`docs/evidencia/pruebas-unitarias/`](../evidencia/pruebas-unitarias/) | ✅ | Añadir capturas y *execution id* a la tabla de reporte (§3 del plan) |
| 12 | Matriz de riesgos de seguridad | [`docs/entrega-2/matriz-riesgos-seguridad.md`](matriz-riesgos-seguridad.md) + [`matriz-riesgos-seguridad.xlsx`](matriz-riesgos-seguridad.xlsx) | ✅ | Corregir RS-15 (el túnel rápido expone el editor; ver §4) |
| 13 | Backlog actualizado | [`docs/entrega-2/backlog-actualizado.md`](backlog-actualizado.md) | ✅ | — |
| 14 | Video del incremento (máx. 5 min) | Se sube a WebC (no se versiona el archivo); guion del Sprint 1 en [`docs/guion-video-sprint-1.md`](../guion-video-sprint-1.md) como referencia | ❌ | Grabar con el contenido mínimo de §5 |

**Evidencia de cada Sprint** (rúbrica general): **Informe** ❌ (no hay informe del Sprint 2 en el repo; existe [`docs/informe-sprint-1.md`](../informe-sprint-1.md) como formato) · **Tablero actualizado** ⚠️ · **Repositorio** ✅ · **Diagramas** ✅ · **Video** ❌.

**Resultado:** 11 de los 14 entregables técnicos están cubiertos en el repositorio. Quedan 3 acciones humanas: alcance firmado, capturas/estados del tablero y video; además del informe del Sprint 2.

## 2. Evidencia disponible y cómo verificarla

| Evidencia | Archivo / enlace | Resultado |
|---|---|---|
| Pruebas unitarias (1.ª evidencia) | [`docs/evidencia/pruebas-unitarias/2026-11-09-22-21-resumen.md`](../evidencia/pruebas-unitarias/2026-11-09-22-21-resumen.md) | **413/413** en 14 suites |
| Pruebas unitarias post-corrección B-01 | CI del PR #26: <https://github.com/Jeple/Proyecto-IngenieraSoftware/actions/runs/43741247756> | `validate-json` + `integracion-n8n` en verde |
| Integración con n8n 2.44.2 real | [`docs/evidencia/integracion/integracion-2026-11-09-22-16.json`](../evidencia/integracion/integracion-2026-11-09-22-16.json) | **14/14**; 9/9 flujos importados y publicados |
| E2E de aceptación | [`docs/evidencia/e2e/e2e-2026-11-09-22-10.md`](../evidencia/e2e/e2e-2026-11-09-22-10.md) + [`manual-receta-2026-11-09.md`](../evidencia/e2e/manual-receta-2026-11-09.md) | **17/17** automáticos + receta real a mano |
| Latencia (CA-21) | [`docs/evidencia/rendimiento/latencia-e2e-2026-11-09-22-06.json`](../evidencia/rendimiento/latencia-e2e-2026-11-09-22-06.json) | p50 1.656 ms · p95 **2.110 ms** · máx. 2.211 ms (meta < 2.500 ms) |
| Concurrencia (CA-20) | [`docs/evidencia/rendimiento/concurrencia-2026-11-09-22-07.json`](../evidencia/rendimiento/concurrencia-2026-11-09-22-07.json) | stock 3 · 2 reservas (2+1) · **sobreventa 0** |
| Calidad de búsqueda | [`docs/evidencia/calidad/medicion-busqueda.json`](../evidencia/calidad/medicion-busqueda.json) | 50 consultas sintéticas, con y sin router |
| CI de `main` (merge del PR #26) | <https://github.com/Jeple/Proyecto-IngenieraSoftware/actions/runs/43741739314> | en verde |
| CI del tag `v0.2-sprint2` | <https://github.com/Jeple/Proyecto-IngenieraSoftware/actions/runs/43741766930> | en verde |

Reproducción local (sin credenciales):

```bash
node scripts/correr-pruebas.mjs          # 413/413 en 14 suites
bash scripts/check_secrets.sh            # escaneo de secretos y RUT
node scripts/local/prueba-integracion.mjs --n 20   # 14/14 con n8n real (Docker)
```

## 3. Estado del repositorio y orden de ramas (15-nov-2026)

- `main` quedó en **`d42b6b2`** (merge del PR #26). Contiene **todo** el Sprint 1 y el Sprint 2; se verificó que `feature/sprint-2-entrega` no tenía ningún commit fuera de `main` y que el diff entre ambas era **vacío**.
- **Tags de línea base:** `v0.1-sprint1` → `d216bfa` y `v0.2-sprint2` → `d42b6b2`, publicados en el remoto.
- **Ramas ordenadas:** se eliminaron del remoto las tres ramas ya fusionadas (`feature/US-01`, `feature/sprint-1-2`, `feature/sprint-2-entrega`). El historial se conserva en los PR #25/#26, en los tags y en `main`. Solo queda `main`.
- **Corrección de seguridad incluida:** el PR #26 incorpora `2c7aec8` (B-01: inyección de fórmulas en `despachos.direccion` neutralizada; `append_despacho` escribe con `cellFormat: RAW`).
- **No se creó `develop`:** la decisión de abandonarla está documentada en [`control-configuracion.md`](control-configuracion.md).
- **Si tu clon local muestra `main` como Sprint 1**, está desactualizado; actualízalo:

```bash
git fetch --prune
git switch main
git pull --ff-only          # debe quedar en d42b6b2
git tag                     # deben aparecer v0.1-sprint1 y v0.2-sprint2
```

- **Pendiente recomendado:** proteger `main` (PR obligatorio + checks `validate-json` e `integracion-n8n`). Hoy no tiene protección.

## 4. Pendientes críticos antes de las 23:30

| Prioridad | Qué | Responsable sugerido | Cómo |
|---|---|---|---|
| 1 | Documento de alcance firmado (PDF) | Juan Pablo | Subir a WebC junto con el informe |
| 1 | Informe del Sprint 2 (PDF) | Juan Pablo / Álvaro | Completar marcadores del informe, exportar a PDF y subir a WebC |
| 1 | Video ≤ 5 min del incremento | Todos (graba Julián) | Guion de §5; subir como no listado y pegar el enlace en WebC |
| 2 | Capturas de aceptación | Antonio + Javier | `cap-02`…`cap-19`, `cap-n8n`, `cap-bitacora`, `cap-ci` (tabla del plan de aceptación) y anotar los *execution id* |
| 2 | CA-08 desde un segundo teléfono real | Antonio | Mismo mensaje que en el chat simulado; guardar captura |
| 2 | Tablero #6: capturas **antes/después** y estados | Javier | Crear los issues US-17/US-22, cerrar #9/#10/#13, mover a *Done* lo fusionado y verificado; comandos en [`paquete-final.md`](paquete-final.md) §4 |
| 3 | Corregir RS-15 de la matriz de riesgos | Responsable de calidad | Aclarar que el túnel rápido expone el editor de n8n hasta crear el usuario local |
| 3 | Proteger `main` en GitHub | Julián (dueño) | *Settings → Branches*: PR + 1 aprobación + CI en verde |

> El tablero #6 no se puede actualizar por API desde esta sesión: el token de `gh` no tiene el scope `read:project`/`project`. Se actualiza en la interfaz web, o con `gh auth refresh -s project` y luego los comandos de `paquete-final.md`.

## 5. Contenido mínimo del video (según la rúbrica)

Duración máxima **5 minutos**. No se evalúa la edición, sí la claridad de la demostración.

| Bloque | Tiempo | Qué mostrar | Apoyo |
|---|---|---|---|
| Objetivo del sprint | 0:00–0:30 | Automatizar consulta, reserva, receta, estado y despacho por Telegram sobre n8n + Sheets, costo $0 | README / backlog |
| Historias completadas | 0:30–1:30 | US-04, US-05, US-06, US-09, US-10, US-17, US-20, US-21, US-22, T-01 | Backlog actualizado (§2) |
| Pendiente y alcance | 1:30–2:00 | Fuera de alcance: voz (US-08), WhatsApp (#24), app del conductor (US-11); deudas: transacciones, carga de 20 reservas (US-13) | Backlog / paquete final |
| Demostración del incremento | 2:00–4:15 | `/start` → «hola, ¿hay pregavalina 75?» → reserva `#FAR-XXXX` → estado por RUT → foto de receta → aprobación del farmacéutico → «en ruta»/«entregado» → alerta de error | Datos sintéticos; ocultar token y `chat_id` |
| Aprendizajes | 4:15–4:45 | n8n 2.x (`$env` vs `process.env`), un solo webhook, idempotencia por estado, CI con 413 pruebas, seguridad de fórmulas (B-01) | CHANGELOG / decisiones |
| Cierre | 4:45–5:00 | Repositorio, tags `v0.1`/`v0.2`, documentación y evidencia | Enlaces de §2 |

## 6. Riesgos si no se completan los pendientes

- **Sin alcance firmado** se incumple un entregable explícito y la evaluación formal del stakeholder.
- **Sin video** se incumple un requisito de la rúbrica (aunque el incremento esté completo).
- **Sin capturas del tablero** la evidencia de gestión ágil queda débil frente a la rúbrica.
- **«21/21» sin capturas ni CA-08 real** puede leerse como una afirmación no respaldada; el plan ya reconoce la salvedad y conviene citarla.
- **Sin protección de `main`**, el control de configuración queda declarado pero no aplicado.

## 7. Anexo: comandos de verificación

```bash
# Repositorio
git log --oneline -3                 # d42b6b2 (merge PR #26) y 2c7aec8 (B-01)
git tag -l                           # v0.1-sprint1, v0.2-sprint2
git branch -r                        # solo origin/main

# Calidad
node scripts/correr-pruebas.mjs      # 413/413
bash scripts/check_secrets.sh        # OK
node scripts/local/prueba-integracion.mjs --n 20   # 14/14

# GitHub
gh pr view 26 --repo Jeple/Proyecto-IngenieraSoftware
gh run list --repo Jeple/Proyecto-IngenieraSoftware --branch main --limit 3
```
