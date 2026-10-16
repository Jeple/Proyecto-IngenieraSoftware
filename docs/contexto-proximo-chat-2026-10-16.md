# Contexto para el próximo chat — 16 de octubre de 2026

Documento de traspaso: qué es este proyecto, qué quedó hecho, qué falta y cómo trabajar en él. Escrito al cierre de la sesión del **16-oct-2026**, tras completar el desarrollo de los Sprints 1 y 2.

## 0. Si retomás en otro computador

```
git clone https://github.com/Jeple/Proyecto-IngenieraSoftware.git
cd Proyecto-IngenieraSoftware
git checkout feature/sprint-1-2
```

Todo el trabajo está en la rama `feature/sprint-1-2` (el PR #25 sigue abierto contra `main`, listo para revisión). En la carpeta `docs/` y `presentacion/` está todo lo que hace falta.

## 1. En una frase

MVP de atención omnicanal para la **Farmacia Comunitaria de Peñalolén** (consulta de stock, reservas, seguimiento, recetas y despacho): prototipo sobre **Telegram + n8n + Google Sheets**, que **se vende como WhatsApp** (el adaptador a WhatsApp Business es el issue #24). El desarrollo de los dos sprints está **completo** y en fase de revisión/validación.

## 2. Dónde está todo

- **Repo:** `github.com/Jeple/Proyecto-IngenieraSoftware` (público). `main` es la rama por defecto; el trabajo vive en `feature/sprint-1-2`.
- **Board:** GitHub Project #6. Estados al cierre: **#3, #4, #5, #6, #7, #8, #18, #19 y #20 → In Review / QA**; #9 → In Progress; #24 → Backlog; #1 → Done. Cada issue tiene un comentario con la evidencia (commits, pruebas y pendientes).
- **Demos para la reunión:**
  - `presentacion/panel-demo.html` — panel gerencial (doble clic).
  - `presentacion/mapa-workflows.html` — los 8 flujos dibujados caja por caja (doble clic).
  - `presentacion/n8n-demo/iniciar-demo.ps1` — levanta la **app real de n8n** local con los flujos importados.
  - `presentacion/guion-demo-jefes.md` — guion en vivo (~8 min) por temas, con preparación y plan B.
- **Documentos clave:** `docs/informe-inception.md`, `docs/informe-sprint-1.md`, `docs/ciclo-vida-pedido.md`, `docs/identidad-roles.md`, `docs/observabilidad.md`, `docs/runbook-operaciones.md`, `docs/guia-pruebas-e2e.md`, `docs/guion-video-sprint-1.md`, `docs/n8n-despliegue.md`.

## 3. Qué quedó hecho (sesión del 16-oct)

| Trabajo | Commit |
|---|---|
| Fix de titularidad en la consulta de estado (#8) | `8713c1b` |
| Excepción documentada de fixtures en `check_secrets` (opción A) | `80aee9a` |
| US-20: aprobación farmacéutica por Telegram + estado `RECHAZADO` + matriz de estados (#18) | `a3d54e3` |
| US-05: entrega (RUT/dirección/sector), cobertura Peñalolén, guarda de duplicados (#7) | `2194148` |
| US-09 + US-10: titularidad de recetas, auditoría completa y `docs/identidad-roles.md` (#19) | `b4cff39` |
| US-21: observabilidad (alertas, reintentos, runbook) (#20) | `eb2acbe` |
| Reconciliación del modelo de datos inicial vs. operativo (#3) | `f91f5e2` |
| Informe de Inception v1.0 (#5) + informe de Sprint 1 y guion de video (#9) + guía E2E | `16383bc` |
| Panel de demostración + guion de la demo con jefes | `b39b2b2`, `2395353` |
| Mapa visual de workflows para la reunión | `4bf9185` |
| Lanzador de n8n local (app real con los flujos importados) | `af828ec` |
| Board actualizado + comentarios de evidencia por issue + PR #25 listo para revisión | (vía `gh`) |

**Números al cierre:** 8 flujos de n8n + PWA del conductor; **266 pruebas automáticas en verde**; CI en verde; `check_secrets` OK; datos sintéticos verificados (13 pedidos, $193.750 CLP, 16 medicamentos, 29 movimientos).

## 4. Qué falta (no es código)

1. **Prueba de punta a punta** con el entorno real (n8n + Sheets + bot): seguir `docs/guia-pruebas-e2e.md`. Es la evidencia que falta para pasar #5, #6, #7, #8, #18, #19 y #20 a **Done**.
2. **Grabar el video** del Sprint 1 (~5 min): `docs/guion-video-sprint-1.md`.
3. **Exportar a PDF** el informe de Inception y el de Sprint 1 (ya están versionados).
4. **#4 (despliegue n8n):** verificar Named Tunnel, Cloudflare Access y restauración (entorno Cloudflare; ver `docs/n8n-despliegue.md`).
5. **Merge del PR #25** (decisión del equipo) y mover los issues a Done cuando el E2E pase.
6. **Probar el lanzador de n8n** una vez con paciencia: `presentacion/n8n-demo/iniciar-demo.ps1` (la primera vez descarga n8n; quedó sin probar de punta a punta por un hipo de red y una descarga pesada). Nota: Docker Desktop estaba cerrado en la máquina; con Node corre igual.
7. **Presentación con los jefes:** revisar el PPT del compañero contra `presentacion/guion-demo-jefes.md` y decidir si se usa ese PPT corregido o un informe corto (la reunión no exige ninguno de los dos, pero se quiere uno).
8. **Publicación** del panel/mapa con link (GitHub Pages recomendado / Vercel) cuando lo decidan.
9. **Archivo sin subir (a propósito):** `docs/Preguntas y Respuestas  sobre el proyecto(1).pdf` — apareció durante la sesión; **no se commiteó**; consultar a Julián qué hacer con él.

## 5. Decisiones clave (respetar)

- **D-01:** sin receta → `EN_PREPARACION`; con receta → `PENDIENTE_RECETA` (12 h). Ver `docs/google-sheets-schema.md`.
- **Expiración = 12 horas** (única regla vigente; el 48 h del modelo inicial quedó superado).
- **Canal:** se vende WhatsApp; el prototipo corre en Telegram; el adaptador es el issue #24.
- **Nada pasa a Done sin evidencia** (correr la guía E2E primero).
- **Titularidad:** consultas y recetas solo desde el chat que creó el pedido; los mensajes de "no encontrado" no revelan existencia.
- **Auditoría:** la bitácora es solo inserción y registra `estado_anterior`, `estado_nuevo` y `actor` en todos los flujos.

## 6. Cómo trabajar en este repo (gotchas)

- **Pruebas:** `node scripts/test-*.mjs` (266 en verde) y `node pwa/test/pwa.test.mjs`. CI: `.github/workflows/validate-workflows.yml`.
- **Secretos:** `bash scripts/check_secrets.sh`. Los fixtures de `scripts/test-*.mjs` están exceptuados de la regla de RUT (a propósito, documentado).
- **Workflows JSON:** no editarlos a mano sin cuidado. Los exports mezclan formatos (CRLF; arrays numéricos inline en US-09; estándar en el resto). El patrón seguro usado en la sesión: verificar que la re-serialización reproduzca el archivo, hacer reemplazos con guarda de coincidencia única y escribir solo si todo pasa. Tras cambiar un workflow, correr su suite.
- **Generadores con prueba de consistencia:** si cambian `data/seed/*.csv` o `workflows/*.json`, regenerar con `node scripts/build-demo-panel.mjs` y `node scripts/build-workflow-map.mjs` (el CI falla si el HTML versionado no coincide).
- **Memoria del proyecto:** hay historial en Engram (buscar `proyecto-ingenierasoftware`; topic keys `project/*`).

## 7. Comandos rápidos

```bash
# pruebas de todo el proyecto
for f in scripts/test-*.mjs; do node "$f"; done && node pwa/test/pwa.test.mjs

# regenerar artefactos de la demo (si cambian datos o flujos)
node scripts/build-demo-panel.mjs && node scripts/build-workflow-map.mjs

# ver el PR
gh pr view 25 --repo Jeple/Proyecto-IngenieraSoftware
```
