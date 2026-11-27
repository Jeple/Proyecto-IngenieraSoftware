# Checklist de la entrega final (v0.1)

**Plazo:** martes 1 de diciembre de 2026, 23:59, en WebC (informe en PDF, 70 %, y video de hasta 5 minutos, 30 %). **Demo y examen:** viernes 4 de diciembre.

Estado al 27 de noviembre. El informe es `Informe_Final_Grupo10.docx` (no está en el repositorio; lo comparte Juan Pablo): todo lo que falta completar en él está **resaltado en amarillo**.

Leyenda: ✅ listo · 🟡 depende de una tarea de la sección 2 (número entre paréntesis).

## 1. La pauta de la profesora, punto por punto

| Punto de la pauta | Dónde se cumple | Estado |
|---|---|---|
| Portada y resumen ejecutivo de hasta una página | Informe, página 1 (portada) y página 2 | ✅ (falta el nombre del Scrum Master, tarea 10) |
| Enlaces al repositorio, Product Backlog, ambiente preproductivo, release v0.1.0 y video | Informe, «Enlaces del proyecto» | 🟡 bot (6), release (3), video (9) |
| **1.** Contexto, personas y necesidades | Informe §1 | ✅ |
| **1.** Proceso actual y cómo lo cambia la solución (con diagrama) | Informe §1, figura 1 | ✅ |
| **1.** Evolución de la comprensión, beneficios y limitaciones | Informe §1 | ✅ |
| **2.** Producto, funcionalidades y flujo de uso | Informe §2 y [manual de uso](manual-de-uso.md) | ✅ |
| **2.** Estado final del backlog con enlace al tablero | Informe §2 | 🟡 el tablero no refleja el estado real (5) |
| **2.** Evolución del alcance: implementadas, pendientes, modificadas y descartadas | Informe §2 | ✅ |
| **2.** Dos historias de usuario con criterios, resultados y evidencias | Informe §2 (US-04 y US-09/US-20) | 🟡 capturas del anexo B (8) |
| **3.** Diseño y ejecución de las pruebas de aceptación con el PO, con enlaces y versiones | Informe §3 y [plan de aceptación](../plan-pruebas-aceptacion.md) | 🟡 corrida del PO sobre la v0.1 (7) |
| **3.** Resultados exitosos y de error, cobertura y errores en tickets | Informe §3 | 🟡 issues por crear (4) |
| **3.** Tres atributos de calidad con valor medido, acciones y brecha | Informe §3 y [calidad de la v0.1](calidad-v0.1.md) | 🟡 20 reservas y latencia (7) |
| **3.** Evidencias (capturas y manual de uso) | Informe, anexo B, y [manual de uso](manual-de-uso.md) | 🟡 capturas (8) |
| **3.** Qué se demostró, qué no y limitaciones | Informe §3 | ✅ |
| **4.** Arquitectura con diagramas de contexto y despliegue | Informe §4, figuras 2 y 3, y [arquitectura](arquitectura-v0.1.md) | ✅ |
| **4.** Dos decisiones de diseño, una GRASP y una SOLID, con enlaces al código | Informe §4 y [decisiones](decisiones-grasp-solid.md) | ✅ |
| **4.** Pruebas, CI, buenas prácticas y tareas futuras OWASP en tickets | Informe §4 e [issues](issues/) | 🟡 issues por crear (4) |
| **4.** Seguridad, privacidad, supervisión humana, IA responsable y 3 riesgos | Informe §4 | ✅ |
| **5.** v0.1 funcional en un ambiente preproductivo que terceros puedan probar | Informe §5 y [ambiente preproductivo](despliegue-preproductivo.md) | 🟡 bot encendido (6) |
| **5.** Funcionalidades, problemas resueltos y conocidos | Informe §5 | ✅ |
| **5.** Valor, requisitos para un piloto y recomendaciones | Informe §5 | ✅ |
| **5.** Guía de continuidad en el repositorio | [Guía de continuidad](guia-continuidad.md) | 🟡 los enlaces funcionan cuando la rama esté en `main` (2) |
| **6.** Evolución por iteración, métricas y autocrítica | Informe §6 y [métricas](metricas-proyecto.md) | ✅ |
| **6.** Contribución individual con evidencias y horas | Informe §6 | 🟡 horas y aportes (10) |
| **6.** Reflexión individual | Informe §6 | 🟡 cada integrante (10) |
| **6.** Principales aprendizajes | Informe §6 | ✅ |
| Declaración de uso de IA generativa | Informe | ✅ |
| Anexos: alcance firmado por el stakeholder | Informe, anexo A | 🟡 adjuntar el PDF firmado (11) |
| Video: demo tipo Sprint Review, uso real, errores y estado actual, máximo 5 min | [Guion](guion-video-v0.1.md) | 🟡 grabar y subir (9) |
| Solo datos sintéticos y sin credenciales | Todo el repositorio (`check_secrets.sh` en la CI) | ✅ (revisar capturas y video) |

## 2. Lo que falta hacer, en orden

Responsables sugeridos según los roles del semestre; el equipo puede reasignarlos.

| # | Tarea | Responsable sugerido | Cuándo | Cómo se sabe que está hecho |
|---|---|---|---|---|
| 1 | Subir los cambios del cierre a la rama `sprint-3/entrega-final` | Juan Pablo | Vie 27-nov | Los commits están en GitHub |
| 2 | Abrir el PR de la rama hacia `main`, revisarlo, **aprobarlo** (*Review → Approve*) y fusionarlo | Juan Pablo abre; Julián revisa y fusiona | Sáb 28-nov | La rama está en `main` y el PR tiene una aprobación |
| 3 | Publicar la release `v0.1.0` desde `main` (comandos abajo) | Julián | Sáb 28-nov, después de 2 | Existe [la release](https://github.com/Jeple/Proyecto-IngenieraSoftware/releases/tag/v0.1.0) |
| 4 | Crear los 12 issues pendientes y cerrar las 8 historias terminadas con `issues/actualizar-issues.ps1` | Juan Pablo o Julián | Sáb 28-nov | [Issues `v0.1-pendiente`](https://github.com/Jeple/Proyecto-IngenieraSoftware/issues?q=label%3Av0.1-pendiente) |
| 5 | Actualizar el tablero (sección 3) | Javier | Sáb 28-nov | El tablero coincide con la tabla del backlog del informe |
| 6 | Montar el ambiente preproductivo y dejar el bot encendido hasta el 4-dic ([guía](despliegue-preproductivo.md)). Conectar el Drive de recetas el 28-nov o después | Matilda | Sáb 28 – Dom 29 | `node scripts/local/doctor.mjs` sin «FALTA» y el bot responde «hola» desde otro teléfono |
| 7 | Corrida del PO sobre la v0.1: `node scripts/local/e2e.mjs`, `prueba-concurrencia.mjs --n 20 --stock 10` y `medir-latencia.mjs --n 20` | Juan Pablo | Dom 29-nov | Reportes nuevos en `docs/evidencia/` y cifras anotadas en el informe |
| 8 | Capturas B1 a B8 del anexo B, solo con datos ficticios y sin tokens ni `chat_id` | Antonio | Dom 29-nov | Las 8 imágenes pegadas en el anexo B |
| 9 | Grabar el video con el [guion](guion-video-v0.1.md), subirlo a YouTube como «no listado» y pegar el enlace | Todos; edita y sube Álvaro | Lun 30-nov | Video de 5:00 o menos con el enlace en el informe |
| 10 | Definir el Scrum Master; cada integrante envía sus horas, sus aportes y su reflexión de 3 a 5 líneas | Todos | Lun 30-nov | Sin amarillo en la sección 6 del informe |
| 11 | Conseguir el PDF del alcance firmado el 13-nov (5 páginas) | Matilda | Lun 30-nov | El PDF firmado queda unido al final del informe |
| 12 | Completar lo resaltado en amarillo, quitar el resaltado, exportar a PDF, unir el alcance firmado y subir a WebC | Juan Pablo | Mar 1-dic, antes de las 23:59 | Entrega enviada en WebC |
| 13 | Rotar las credenciales que circularon por chat (issue de RS-05) | Matilda | Después de la demo del 4-dic | Credenciales anteriores revocadas |

Opcional: regenerar las imágenes de los 3 diagramas de secuencia que cambiaron de «tú» a «usted» con `node docs/entrega-2/diagramas/exportar.mjs`, que requiere Docker.

### Comandos de la tarea 3 (release)

```powershell
git switch main
git pull
git tag -a v0.1.0 -m "v0.1.0 · primera versión del producto (cierre del semestre)"
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0 · Asistente de la Farmacia Comunitaria" --notes-file docs/entrega-final/release-v0.1.0.md
```

Sin GitHub CLI: en GitHub, **Releases → Draft a new release**, elegir la etiqueta `v0.1.0` y pegar el texto de [`release-v0.1.0.md`](release-v0.1.0.md) sin el comentario de la primera línea.

### Comando de la tarea 4 (issues)

```powershell
powershell -ExecutionPolicy Bypass -File docs/entrega-final/issues/actualizar-issues.ps1
```

Requiere [GitHub CLI](https://cli.github.com/) con `gh auth login`. Sin la CLI, se crean a mano en **Issues → New issue**: el título está en el script y el cuerpo, en el archivo `.md` de la carpeta [`issues/`](issues/).

## 3. Cambios del tablero (tarea 5)

En el [Project #6](https://github.com/users/Jeple/projects/6), primero corregir las iteraciones del campo «Sprints» (**⋯ → Settings → Sprints**). Después mover las tarjetas.

| Iteración | Fechas reales |
|---|---|
| Sprint 0 | 28-ago a 4-sep |
| Sprint 1 | 5-sep a 16-oct |
| Sprint 2 | 17-oct a 15-nov |
| Sprint 3 | 16-nov a 4-dic |

| Tarjetas | Estado | Sprint |
|---|---|---|
| #5 (US-03) | Done | Sprint 0 |
| #3 (US-01), #4 (US-02) | Done | Sprint 1 |
| #6 (US-04), #7 (US-05), #8 (US-06), #11 (US-09), #12 (US-10), #14 (US-12), #18 (US-20), #19 (T-01), #20 (US-21) | Done | Sprint 2 |
| #28 (US-17, 5 SP), #29 (US-22, 3 SP): agregarlos al proyecto | Done | Sprint 2 |
| #15 (US-13), #16 (US-14), #21 (T-02) | In Progress | Sprint 3 |
| #17 (US-15) | Ready for Dev | Sprint 3 |
| #10 (voz), #13 (app del conductor), #24 (WhatsApp) | Backlog, sin sprint (fuera del alcance firmado) | — |
| #1 (ejemplo) y #9 (video del Sprint 1, fusionado con #14) | Archivar | — |
| Los 12 issues nuevos de la tarea 4 | Backlog, sin sprint | — |

Antes y después, tomar una captura del tablero para el anexo del informe si el equipo lo quiere mostrar.
