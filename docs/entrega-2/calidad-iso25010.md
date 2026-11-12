# Atributos de calidad · ISO/IEC 25010 · Entrega 2

Usamos el modelo de calidad del producto de **ISO/IEC 25010** tal como lo presentó la clase 10:
- Ocho características: adecuación funcional, eficiencia de desempeño, compatibilidad, usabilidad, confiabilidad, seguridad, mantenibilidad y portabilidad.
- Las subcaracterísticas de usabilidad que muestra la clase: inclusividad y auto-descriptividad.
- La calidad en uso como complemento.

Seguimos la plantilla de la clase 10: elegir las 3 características más críticas para el dominio y justificarlas, y definir por cada una una métrica con su fórmula, umbral, herramienta y frecuencia. Agregamos 3 características de apoyo.

## 1. Ficha del sistema

| Ítem | Valor |
|---|---|
| Sistema | Asistente de chat de la Farmacia Comunitaria de Peñalolén (prototipo) |
| Versión analizada | Sprint 2, rama `feature/sprint-1-2` más los cambios de la Entrega 2 (9 de noviembre de 2026) |
| Stack | n8n 2.44.2 (Docker), Telegram Bot API, Google Sheets y Drive, Cloudflare Tunnel |
| Estado | MVP en entorno local de demostración; datos sintéticos |

## 2. Características priorizadas

### 2.1 Adecuación funcional · corrección funcional (crítica)
- **Justificación:** una farmacia no puede informar un remedio, un precio o un stock que no existe (riesgo R-02, crítico). Tampoco puede reservar más de lo que hay, porque eso genera las sobreventas que hoy son el problema central.
- **Consecuencia de fallar:** un vecino viaja por un remedio agotado o se queda sin su tratamiento crónico.
- **Metas SMART asociadas:** 0 sobreventas y ≥ 98 % de exactitud al identificar medicamentos.

### 2.2 Seguridad · confidencialidad, integridad, autenticidad, no repudio y responsabilidad (crítica)
- **Justificación:** el sistema maneja RUT, direcciones y fotos de recetas, que son datos de salud y datos sensibles según la Ley 19.628. La Ley 21.719 aumenta las exigencias desde su entrada en vigencia.
- **Consecuencia de fallar:** que se filtre una receta o que un tercero vea el pedido de otro vecino.

### 2.3 Eficiencia de desempeño · comportamiento temporal (crítica)
- **Justificación:** la promesa al vecino es responder al instante. Si un adulto mayor espera demasiado, vuelve a llamar por teléfono y el personal pierde el tiempo que el sistema debía liberar.
- **Meta SMART asociada:** < 2,5 s.

### 2.4 Características de apoyo
- **Usabilidad (inclusividad y auto-descriptividad):** el usuario principal es un adulto mayor o un cuidador. El bot se presenta como automático, ofrece un menú y entiende frases naturales.
- **Confiabilidad (tolerancia a fallos y recuperabilidad):** si algo falla, el vecino recibe un aviso y el equipo una alerta, y la cola de mensajes no se pierde.
- **Mantenibilidad (modularidad, capacidad de prueba y capacidad de modificación):** seis integrantes con dedicación parcial deben poder levantar, entender y cambiar el sistema.

## 3. Tabla de métricas

| # | Característica / subcaracterística | Métrica | Fórmula | Meta (umbral) | Herramienta y método | Frecuencia | Medición al 9 de noviembre |
|---|---|---|---|---|---|---|---|
| Q1 | Adecuación · corrección | Exactitud de la búsqueda de medicamentos | aciertos / consultas del set etiquetado × 100 | ≥ 98 % (Inception) | `node scripts/medir-busqueda.mjs` (50 consultas sintéticas: errores de tipeo, marcas, frases naturales y 5 fuera de catálogo) | Cada cambio del buscador o del router | **100 % (50/50)** con router; 80 % (40/50) sin la normalización. Preliminar: set propio, a validar con consultas reales |
| Q2 | Adecuación · corrección | Productos inventados | respuestas con un producto que no está en la planilla | 0 | Diseño (ADR-03: sin LLM en las respuestas) y casos fuera de catálogo en Q1 | Cada release | **0** (5/5 consultas fuera de catálogo respondieron «No encontré») |
| Q3 | Adecuación · corrección | Sobreventas | Σ max(0, stock_reservado − stock_real) tras N reservas simultáneas | 0 | Prueba de concurrencia contra la planilla real: `node scripts/local/prueba-concurrencia.mjs` (CA-20) | Sprint 3 y cada cambio de reserva | **0** el 9-nov: 5 reservas simultáneas (1 a 5 unidades) sobre un stock de 3; se crearon 2 (2 + 1 = 3), las otras 3 se rechazaron y el reservado quedó en 3, igual a la suma (`docs/evidencia/rendimiento/concurrencia-2026-11-09-22-07.json`). La carga de 20 reservas queda para US-13 |
| Q4 | Adecuación · completitud | Historias Must con criterios de aceptación cumplidos | Must que pasan sus casos CA / Must del alcance | 100 % al cierre del semestre | Plan de aceptación (`docs/plan-pruebas-aceptacion.md`) | Cada Sprint Review | **21/21 casos CA pasan** (9-nov: 17/17 automáticos, 2 manuales con el camino real, y CA-20 y CA-21 medidos). Las historias siguen en *In Review* hasta el merge (DoD) |
| Q5 | Seguridad · autenticidad | Mensajes sin secreto válido procesados | mensajes procesados sin `X-Telegram-Bot-Api-Secret-Token` correcto | 0 | Integración INT-01 e INT-02; `test-router.mjs` (1a a 1e) | Cada push (CI) | **0** |
| Q6 | Seguridad · confidencialidad | Fugas de titularidad | consultas de un chat ajeno que revelan un pedido | 0 | `test-trazabilidad.mjs` (casos 16 a 18), `test-recetas-telegram.mjs` | Cada push | **0** en pruebas y en el E2E (CA-08, con un segundo chat simulado); falta repetirlo desde un segundo teléfono |
| Q7 | Seguridad · confidencialidad | Secretos o datos reales en el repositorio | hallazgos de `check_secrets.sh` + reglas 9a a 9c de `test-workflows-n8n.mjs` | 0 | CI (paso *Check secrets*) | Cada push | **0** |
| Q8 | Seguridad · no repudio y responsabilidad | Transiciones con autor | filas de bitácora con `actor` / transiciones ejecutadas × 100 | 100 % | Revisión de la hoja `bitacora` tras el E2E | Cada E2E | Por diseño en los 6 flujos que escriben. Verificado en CA-14 (actor `farmaceutico:`) y en la receta real (`cliente:` y `farmaceutico:`); falta contar el 100 % de la hoja |
| Q9 | Eficiencia · comportamiento temporal | Latencia del router (sin planilla) | p50 y p95 del tiempo entre el webhook y el `sendMessage` | p95 < 2,5 s | `scripts/local/prueba-integracion.mjs` (n8n real y Telegram simulado) | Cada cambio del router | **p50 209 ms, p95 313 ms** (30 mensajes en serie). Con 10 simultáneos: p50 1.644 ms, p95 2.645 ms. Repetida tras los últimos cambios (`integracion-2026-11-09-22-16.json`): p95 310 ms en serie y 2.788 ms con 10 simultáneos |
| Q10 | Eficiencia · comportamiento temporal | Latencia de punta a punta de una consulta | p95 del tiempo entre el webhook y la respuesta, con lecturas reales de Sheets | p95 < 2,5 s | `node scripts/local/medir-latencia.mjs --n 20` (CA-21), con la planilla real | Cada sprint | **p50 1.656 ms, p95 2.110 ms, máx. 2.211 ms** (20/20, consultas en serie, 9-nov). Cumple. Las operaciones que escriben (reserva, receta, despacho) tardan entre 5 y 20 s; no tienen meta en el Inception y quedan como deuda (caché y menos lecturas) |
| Q11 | Usabilidad · auto-descriptividad | Mensajes que el router no entiende | mensajes con «no entendí» / total del set de mensajes × 100 | ≤ 10 % | `scripts/medir-busqueda.mjs` (20 mensajes etiquetados) | Cada cambio del router | **5 % (1/20)**, que corresponde al único mensaje que el set marca como ambiguo. Clasificación correcta: 100 % (20/20) |
| Q12 | Usabilidad · calidad en uso | Consultas resueltas sin intervención humana (meta SMART) | conversaciones resueltas por el bot / conversaciones totales × 100 | ≥ 70 % | Prueba con un funcionario y vecinos voluntarios (S-05) | Sprint 3 | No medible aún sin usuarios reales; Q11 es el indicador previo |
| Q13 | Confiabilidad · tolerancia a fallos | Fallas silenciosas | subflujos que fallan sin aviso al vecino ni alerta al equipo | 0 | Integración INT-10 a INT-14 | Cada push (CI) | **0** (5/5 con una alerta y aviso al vecino) |
| Q14 | Mantenibilidad · capacidad de prueba | Pruebas automáticas en verde | pruebas que pasan / total | 100 % | `node scripts/correr-pruebas.mjs`, CI | Cada push | **413/413** en 14 suites |
| Q15 | Mantenibilidad · capacidad de prueba | Nodos Code con pruebas | nodos Code cargados por alguna suite / nodos Code en flujos del alcance | ≥ 90 % | Revisión de `scripts/test-*.mjs` | Cada sprint | **19/23 (83 %)**, bajo la meta. Faltan 4 nodos de mapeo de US-10 (`expand_orders`, `expand_inventory`, `emit_bitacora` y `emit_notifications`); se cubren en el E2E (CA-16) y quedan como tarea del Sprint 3 |
| Q16 | Portabilidad · instalabilidad | Tiempo de puesta en marcha | minutos desde `git clone` hasta el bot respondiendo | ≤ 30 min | Guía `docs/guia-instalacion-local.md` cronometrada por un integrante | Una vez por sprint | Arranque sin credenciales verificado desde una copia limpia (n8n listo en 57 s, 9/9 flujos publicados, túnel activo); falta cronometrar con cuentas nuevas |

## 4. Conexión con las metas SMART del Inception

| Meta SMART | Métricas | Estado al 9 de noviembre |
|---|---|---|
| ≥ 70 % de consultas resueltas sin intervención humana | Q11 (indicador previo) y Q12 (meta) | El router clasifica bien el 100 % del set sintético. La meta real se mide en el Sprint 3 |
| Respuesta < 2,5 s | Q9, Q10 | Cumple para las consultas: p95 de 2,11 s con la planilla real (20 consultas en serie). Con ráfagas de 10 mensajes, el p95 del router (2,65 s) supera la meta por la serialización (ADR-07), un compromiso consciente. Las operaciones que escriben tardan entre 5 y 20 s |
| 0 sobreventas por reservas | Q2, Q3 | Verificado con la planilla real: 5 reservas simultáneas sobre un stock de 3, 0 sobreventas (CA-20). Falta la carga de 20 reservas (US-13) |
| $0 en licencias | — | Cumplido: todos los componentes son gratuitos o autoalojados; Gemini es opcional |
| ≥ 98 % de exactitud de la búsqueda (Inception) | Q1 | 100 % en un set sintético (preliminar) |

## 5. Plan de pruebas mínimo por característica

La estrategia completa está en [`estrategia-pruebas.md`](./estrategia-pruebas.md).

| Tipo | Objetivo | Precondición | Entrada | Resultado esperado | Criterio de éxito |
|---|---|---|---|---|---|
| Funcional (aceptación) | Consulta con error de escritura | Catálogo sintético cargado | «hola, ¿hay pregavalina 75?» | Pregalex 75 mg agotado y Neurogab 75 mg como bioequivalente | CA-02 pasa |
| Seguridad | Titularidad del pedido | Pedido #FAR-0001 creado desde el chat A | Chat B escribe «estado #FAR-0001» | «No encontré ese pedido…» | CA-08 pasa |
| Rendimiento | Latencia | n8n local y planilla real | 20 consultas en serie (`medir-latencia.mjs`) | p95 medido | p95 < 2,5 s |
| Concurrencia | 0 sobreventas | Producto con stock 3 | 5 reservas simultáneas de 1 a 5 unidades | Solo se confirman las que caben en el stock; las demás se rechazan | Q3 = 0 |

## 6. Herramientas

| Herramienta | Categoría | Por qué en este proyecto |
|---|---|---|
| Node.js `node:test`-style (scripts propios, sin dependencias) | Pruebas unitarias y de contrato | Los nodos Code de n8n son JavaScript: se cargan desde el JSON versionado y se prueban fuera de n8n, sin instalar nada |
| Docker + n8n 2.44.2 + Telegram simulado (`prueba-integracion.mjs`) | Integración y rendimiento | Prueba la misma imagen que se despliega, sin credenciales; corre en la CI |
| GitHub Actions | Integración continua | Gratuito para repositorios públicos; bloquea los PR con pruebas o secretos en rojo |
| `check_secrets.sh` | Seguridad (análisis estático) | Busca claves, tokens y RUT antes de cada push |
