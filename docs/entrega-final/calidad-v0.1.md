# Calidad de la v0.1 (ISO/IEC 25010)

Seguimos priorizando las mismas tres características de la Entrega 2, porque son las que más pueden dañar a un vecino si fallan: **adecuación funcional**, **seguridad** y **eficiencia de desempeño**. La mantenibilidad se mide como apoyo. Las fórmulas, umbrales y herramientas de cada métrica están en [`calidad-iso25010.md`](../entrega-2/calidad-iso25010.md).

Cada tabla muestra el valor de la Entrega 2 (9 de noviembre), el valor de la v0.1 y qué falta para la meta.

## 1. Adecuación funcional: no inventar, no sobrevender

**Por qué importa.** Si el bot informa un remedio que no existe o reserva más de lo que hay, un vecino crónico puede quedarse sin su tratamiento.

| Métrica | Meta | 9-nov | v0.1 (27-nov) | Qué hicimos | Qué falta |
|---|---|---|---|---|---|
| Q1 · Exactitud de la búsqueda (50 consultas sintéticas) | ≥ 98 % | 100 % | **100 %** (50/50) | Al medir encontramos que el PR #32 la había bajado a 98 %: el router tomaba la dosis como cantidad (D-21). Se corrigió y se agregó una prueba de regresión | Repetir con consultas reales de la farmacia (requiere un extracto anonimizado) |
| Q2 · Productos inventados | 0 | 0 | **0** (5/5 consultas fuera de catálogo responden «No encontré…») | La búsqueda es determinista: ninguna IA redacta respuestas (ADR-03) | — |
| Q3 · Sobreventas con reservas simultáneas | 0 | 0 con 5 reservas | Se mide con 20 reservas en el ambiente preproductivo | El script ahora acepta `--n 20 --stock 10` (US-13) | Ejecutar `prueba-concurrencia.mjs --n 20 --stock 10` y registrar el resultado |
| Q4 · Casos de aceptación que pasan | 100 % | 21/21 | Se repite sobre la v0.1 con el PO | Plan de 21 casos y E2E automático de 17 | Corrida del PO sobre el ambiente preproductivo |

## 2. Seguridad: datos personales y recetas

**Por qué importa.** El sistema maneja RUT, direcciones y fotos de recetas, que son datos de salud (Ley 19.628).

| Métrica | Meta | 9-nov | v0.1 (27-nov) | Qué hicimos | Qué falta |
|---|---|---|---|---|---|
| Q5 · Mensajes sin el secreto del webhook que se procesan | 0 | 0 | **0** (pruebas 1a a 1e del router; integración en la CI) | El router y cada subflujo validan el secreto | — |
| Q6 · Fugas de titularidad (un chat ve el pedido de otro) | 0 | 0 | **0** en las pruebas automáticas | Mismo mensaje para un pedido ajeno y uno inexistente | Repetir CA-08 desde un segundo teléfono en la corrida del PO |
| Q7 · Secretos o datos reales en el repositorio | 0 | 0 | **0** (`check_secrets.sh` y revisión de todo el historial de git) | Escáner en la CI; `.env` y `secrets/` ignorados | Las credenciales circularon por el chat del equipo (RS-05): rotarlas al cierre |
| Q8 · Cambios de estado con autor en la bitácora | 100 % | Verificado por muestreo | Se cuenta en la planilla tras la corrida del PO | Bitácora de solo inserción con `actor` (ADR-04) | Contar el 100 % de las filas |

## 3. Eficiencia de desempeño: responder al instante

**Por qué importa.** Si un adulto mayor espera demasiado, vuelve a llamar por teléfono y el personal pierde el tiempo que el sistema debía liberar.

| Métrica | Meta | 9-nov | v0.1 | Qué hicimos | Qué falta |
|---|---|---|---|---|---|
| Q9 · Latencia del router, sin planilla (p95) | < 2,5 s | 313 ms en serie; 2,65 s con 10 simultáneos | Se mide en la integración de la CI | Una ejecución a la vez para no sobrevender (ADR-07) | Con ráfagas, la cola supera la meta: compromiso aceptado |
| Q10 · Latencia de una consulta con la planilla real (p95) | < 2,5 s | 2,11 s | Se mide en el ambiente preproductivo | Lecturas una sola vez por ejecución (D-13) | Ejecutar `medir-latencia.mjs --n 20` |
| Escrituras (reserva, receta, despacho) | Sin meta en el Inception | 5 a 20 s | Igual | — | **Brecha principal.** Proponemos una meta de 5 s: leer en lote, guardar el catálogo en caché y responder «Estoy registrando su reserva…» mientras se escribe |

## 4. Mantenibilidad (apoyo)

| Métrica | Meta | 9-nov | v0.1 (27-nov) | Qué hicimos |
|---|---|---|---|---|
| Q14 · Pruebas automáticas en verde | 100 % | 413/413 | **422/422** | 9 pruebas nuevas: 6 de la expiración (US-10), 2 de los mensajes de estado (D-19, D-20) y 1 del router (D-21) |
| Q15 · Nodos Code con pruebas | ≥ 90 % | 19/23 (83 %) | **23/23 (100 %)** | Pruebas de los 4 nodos de mapeo de US-10; se mide con `node scripts/medir-cobertura-nodos.mjs` |
| Q16 · Instalación desde cero | ≤ 30 min | Sin cronometrar | Se cronometra al montar el ambiente preproductivo | Guía paso a paso y arranque en un comando |

## 5. Lo que no podemos medir todavía

- **Q12 · Consultas resueltas sin intervención humana (meta ≥ 70 %).** Requiere vecinos y funcionarios reales usando el bot. El indicador previo (Q11) es bueno: el router clasifica bien 20 de 20 mensajes sintéticos, y solo 1 de 20 (5 %) recibe el menú de ayuda, que es justo el mensaje que el set marca como ambiguo. Queda como primera medición de un piloto.
- **Revisión clínica de los mensajes (US-14).** Las reglas existen y están probadas, pero ningún químico farmacéutico las ha revisado todavía.
