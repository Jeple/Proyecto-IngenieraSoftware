# Runbook de cierre · Entrega 2 (Sprint 2)

**Deadline:** domingo 15-nov-2026, 23:30 (WebC). **Este documento es la lista de lo que falta y cómo hacerlo.** Todo lo que se podía resolver desde el repositorio ya está resuelto; lo que queda requiere personas (grabar, capturar, firmar, subir).

Estado del repositorio al momento de escribir: `main` = `f01e60b` (Sprint 1 + Sprint 2 + checklist), tags `v0.1-sprint1` / `v0.2-sprint2`, solo la rama `main`, PR #25/#26/#27 fusionados y CI en verde.

## 1. Lo que ya está resuelto (no lo repitan)

- Sprint 2 completo en `main` y verificado: 413/413 pruebas, integración 14/14 con n8n 2.44.2 real, E2E 17/17, p95 2.110 ms, 0 sobreventas.
- Corrección de seguridad B-01 (inyección de fórmulas en `despachos.direccion`) en `2c7aec8`.
- Tags de línea base publicados; ramas fusionadas eliminadas; control de configuración documentado.
- Issues: US-17 (#28) y US-22 (#29) creados; #9, #10 y #13 cerrados; #24 etiquetado `wont-este-semestre`; #6, #18 y #19 con comentario del merge.
- Documentos nuevos en el repo: informe del Sprint 2, guion del video, evidencia del tablero, kit de capturas, checklist de la rúbrica y este runbook.
- Evidencia post-fix agregada: `docs/evidencia/pruebas-unitarias/2026-11-15-17-27-*` y `docs/evidencia/integracion/ci-2026-11-15.md`.

## 2. Tabla maestra: lo que tienen que hacer

Prioridad: 🔴 bloquea la entrega · 🟠 evidencia exigida · 🟢 recomendado.

| # | Tarea | Qué hacer exactamente | Cómo / comando | Tip profesional o IA | Tiempo | Responsable | Prioridad |
|---|---|---|---|---|---|---|---|
| 1 | Actualizar el clon local | Traer `main` y confirmar tags | `git fetch --prune && git switch main && git pull --ff-only` (debe quedar en `f01e60b`); `git tag` | Si alguien ve «main = Sprint 1», casi siempre es un clon viejo: `git fetch --prune` lo arregla | 3 min | Todos | 🔴 |
| 2 | Documento de alcance firmado | Convertir a PDF el alcance ya firmado por la contraparte y subirlo a WebC | Exportar PDF (Word → Guardar como PDF); verificar que tenga firma, fecha y nombre del stakeholder | Preséntalo como «acuerdo de alcance de la Entrega 2», no como anexo; el PDF debe verse profesional (portada + firma) | 10 min | Juan Pablo | 🔴 |
| 3 | Informe del Sprint 2 | Usar `docs/informe-sprint-2.md` como fuente; completar datos del equipo y exportar a PDF | Abrir el md, pasarlo a Word/PDF (Pandoc, Google Docs o Word), revisar ortografía y subir a WebC | No agregues texto nuevo sin fuente: cada cifra del informe ya tiene archivo de evidencia. Si usas IA para corregir estilo, pídele «mantén las cifras y las citas, solo mejora redacción» | 25 min | Juan Pablo / Álvaro | 🔴 |
| 4 | Video ≤ 5 min | Grabar la demo con el guion y subirlo como «no listado» | Seguir `docs/guion-video-sprint-2.md`; grabar con OBS/Loom/CapCut; editar; subir a YouTube (no listado) y pegar el enlace en WebC | Ver §3: la IA acelera edición, voz y subtítulos, pero **la demo debe ser real** | 90 min | Todos (graba Julián) | 🔴 |
| 5 | Capturas de aceptación | Tomar `cap-02`…`cap-19`, `cap-n8n`, `cap-bitacora`, `cap-ci` y anotar *execution id* | Seguir `docs/entrega-2/kit-capturas-aceptacion.md`; datos sintéticos; ocultar token y `chat_id` | Captura la **mitad superior** del chat (mensajes del bot) y la fila exacta de la planilla. Nombra los archivos igual que el plan para que el informe los cite sin ambigüedad | 60 min | Antonio + Javier | 🟠 |
| 6 | CA-08 desde segundo teléfono | Repetir «estado #FAR-XXXX» desde otro teléfono y capturar el mismo mensaje que un pedido inexistente | Con el chat B (otro integrante), enviar el código del pedido del chat A; guardar captura | Es la prueba de titularidad (RNF-07). Muestra el chat B y el mensaje de «No encontré ese pedido» | 10 min | Antonio | 🟠 |
| 7 | Tablero #6: capturas antes/después | Capturar la vista del tablero antes y después de mover tarjetas | Ver §4; tomar `tablero-antes.png` y `tablero-despues.png`; mover a **Done** lo fusionado y verificado | Muestra la iteración «Sprint 2» filtrada: impacto visual inmediato para el profesor | 20 min | Javier | 🟠 |
| 8 | Tablero #6: estados e iteraciones | Mover a Done US-04/05/06/09/10/17/20/21/22/T-01 y renombrar iteraciones Sprint 0/1/2/3 | En la UI del Project #6; pasos en §4 | Hazlo **antes** de la captura «después». Deja en In Review solo lo que depende de capturas/video | 15 min | Javier | 🟠 |
| 9 | Matriz de riesgos: RS-15 | Corregir la fila RS-15: el túnel rápido expone el editor de n8n hasta crear el usuario local | Editar `docs/entrega-2/matriz-riesgos-seguridad.md` y el `.xlsx` | Añade el control «crear usuario local antes de abrir el túnel»; demuestra rigor, no lo escondas | 10 min | Responsable de calidad | 🟢 |
| 10 | Subida final a WebC | Subir 4 elementos: informe PDF, alcance firmado PDF, video (enlace) y enlace al repositorio | Formulario WebC; antes de enviar, abrir el video en incógnito y verificar el PDF | Deja un `README` de entrega con los 4 enlaces en un solo lugar (Google Doc) para no improvisar | 15 min | Juan Pablo | 🔴 |
| 11 | Proteger `main` | Activar PR obligatorio + checks `validate-json` e `integracion-n8n` | Settings → Branches → Add rule (main) | Hazlo al final, cuando ya no queden pushes directos; queda como evidencia de control de configuración | 5 min | Julián | 🟢 |
| 12 | Verificación final | Confirmar que todo está en verde antes de cerrar | `node scripts/correr-pruebas.mjs`; `bash scripts/check_secrets.sh`; `gh run list --branch main` | Si algo falla, no lo edites en caliente: documenta el defecto y usa la evidencia del 9-nov | 10 min | Todos | 🟠 |

## 3. Video: cómo hacerlo con IA y que quede muy bien

El detalle está en `docs/guion-video-sprint-2.md`; este es el resumen operativo.

**Regla de oro:** la IA se usa para **editar, limpiar audio, subtitular y locutar**, nunca para inventar respuestas del bot. La demo debe ser real (datos sintéticos) y verificable.

1. **Grabar en bruto** (OBS Studio o Loom), 16:9, 1080p, 30–60 fps. Graba la pantalla del teléfono/emulador de Telegram + pestaña de n8n + pestaña de Sheets en tomas separadas.
2. **Limpiar audio:** Descript (Studio Sound) o Adobe Podcast (gratis) eliminan ruido y nivelan voz.
3. **Editar por texto:** Descript o CapCut transcriben el video; borras muletillas y silencios leyendo el texto, no cortando a ciegas.
4. **Voz en off con IA (si no quieren locutar):** ElevenLabs en español latino (estabilidad 0.45–0.55, similitud 0.75–0.85, velocidad 0.95–1.0). Genera la narración del guion y móntala sobre las tomas. Si usan su propia voz, mejor: transmite cercanía.
5. **Subtítulos automáticos:** CapCut/Whisper; corrige nombres propios («Peñalolén», «#FAR-0001») y revisa que no aparezcan datos personales.
6. **Títulos y motion:** CapCut o Canva; 3–4 tarjetas máximo (Problema → Incremento → Calidad → Aprendizajes). Tipografía grande, alto contraste.
7. **B-roll y transiciones:** Runway/Vidu solo para el gancho o transiciones; no para la demo.
8. **Música:** YouTube Audio Library o Pixabay (libre de derechos), volumen 10–15 % bajo la voz.
9. **Exportar:** 1080p, MP4 H.264, 8–10 Mbps; duración final **< 5:00**. Subir como «no listado» y probar el enlace en incógnito.

**Prompts útiles para IA:** «Resume este guion en 5 tarjetas de 6 palabras», «Convierte esta narración a español neutro de Chile, tono cercano y seguro», «Genera subtítulos SRT y corrige puntuación», «Propón 3 títulos honestos para el video», «Revisa este guion y elimina cualquier afirmación no respaldada por los datos».

**Qué NO hacer:** no prometer llamadas +56, no decir «21/21 con capturas» si las capturas no están, no mostrar tokens ni `chat_id`, no usar música con copyright, no simular pantallas con IA.

**Plan B si falla el bot en vivo:** usa clips pregrabados de la demo + el log de la terminal (`node scripts/local/e2e.mjs` o `prueba-integracion.mjs`) y narra el resultado. Ten el video de respaldo en Drive.

## 4. Tablero #6: cómo dejarlo presentable

El token de `gh` de esta sesión no tiene scope `read:project`, así que estos pasos son en la interfaz web (o con `gh auth refresh -s project`).

1. Abrir <https://github.com/users/Jeple/projects/6/views/1> y capturar la vista actual (**tablero-antes.png**).
2. **Iteraciones:** renombrar para que coincidan con el Inception: Sprint 0 (Inception), Sprint 1 (hasta 16-oct), Sprint 2 (hasta 15-nov), Sprint 3 (hasta el examen).
3. **Traer los issues nuevos:** añadir #28 (US-17) y #29 (US-22) al proyecto y ponerlos en la iteración Sprint 2.
4. **Mover a Done:** #6 (US-04), #7 (US-05), #8 (US-06), #11 (US-09), #12 (US-10), #18 (US-20), #20 (US-21), #21 (T-02) y #28/#29. Dejar en In Review solo lo que depende de capturas/video (#14 y lo que el equipo decida).
5. **Cerrar/etiquetar:** #9, #10 y #13 ya están cerrados; #24 con `wont-este-semestre`; #15/#16/#17 quedan en Sprint 3.
6. Capturar la vista final (**tablero-despues.png**) con el filtro de la iteración Sprint 2.
7. Adjuntar ambas capturas al informe (sección de gestión ágil) y al checklist.

## 5. Checklist final de WebC

- [ ] Informe del Sprint 2 en PDF (fuente: `docs/informe-sprint-2.md`).
- [ ] Documento de alcance firmado en PDF.
- [ ] Enlace al video (no listado) probado en incógnito, duración < 5:00.
- [ ] Enlace al repositorio: <https://github.com/Jeple/Proyecto-IngenieraSoftware>.
- [ ] Capturas de aceptación y del tablero adjuntas en el informe (o en el Drive del equipo).
- [ ] Verificar que ningún PDF/captura muestre tokens, `chat_id` ni RUT reales.

## 6. Frases de impacto (para el video y el informe)

- «43.089 vecinos inscritos y 39.212 boletas al año, con el 81 % de las transacciones todavía presenciales.»
- «Un asistente omnicanal que responde en segundos, reserva con código y deriva al químico farmacéutico cuando corresponde.»
- «Costo de infraestructura $0: n8n autoalojado, Telegram, Google Sheets y créditos gratuitos.»
- «413 pruebas automáticas, integración con n8n real y CI en verde: no es una demo frágil, es un incremento verificable.»
- «Salvaguardas clínicas antes que cualquier intención comercial: SAMU 131, *4141 y cero consejo médico.»

## 7. Contingencias

- **Sin credenciales/planilla el día de la grabación:** usar los clips del 9-nov y la evidencia JSON/MD; narrar el E2E como respaldo. No inventar pantallas.
- **El tablero no carga o falta tiempo:** priorizar capturas «antes» + issues ya creados/cerrados; el checklist documenta el resto.
- **Se cae el túnel:** grabar con `--sin-tunel` y el E2E local (Telegram simulado), o usar la grabación previa.
- **Falta el PDF del alcance:** subir el informe y el video igual; dejar constancia en WebC y enviar el alcance en cuanto esté firmado.

## 8. Verificación rápida (copiar y pegar)

```bash
git log --oneline -3
git tag -l
node scripts/correr-pruebas.mjs
bash scripts/check_secrets.sh
gh run list --repo Jeple/Proyecto-IngenieraSoftware --branch main --limit 3
```
