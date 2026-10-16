# Informe de Sprint 1 — MVP conversacional y reserva

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 16-oct-2026 | Equipo del proyecto (Grupo 10) | Versión inicial |

> Todos los datos, mensajes y capturas del sprint usan datos sintéticos. Sin RUT, direcciones ni recetas reales.

## 1. Resumen

El Sprint 1 entregó el walking skeleton del sistema: un vecino puede **consultar stock y precio**, **crear una reserva con código `#FAR-XXXX`** y **seguir el estado de su pedido**, todo sobre el canal del prototipo (Telegram), con el estado operativo en Google Sheets y auditoría completa de cada movimiento.

## 2. Alcance logrado

| Historia | Qué quedó funcionando | Evidencia |
|---|---|---|
| Consulta de stock y precio (fuzzy) | Búsqueda tolerante a errores ("pregavalina 75"), saldo neto recalculado y sugerencia de bioequivalentes ante quiebre; respuestas solo con datos de la planilla | `scripts/test-fuzzy-match.mjs` (32 pruebas) |
| Reserva con descuento inmediato | Código transaccional, incremento de `stock_reservado`, captura de RUT, dirección y sector con validación de cobertura, guarda de duplicados, fila de despacho | `scripts/test-reserva.mjs` (79 pruebas) |
| Trazabilidad del pedido | Consulta por RUT o `#FAR-XXXX` solo desde el chat titular; terceros reciben el mismo mensaje que un pedido inexistente | `scripts/test-trazabilidad.mjs` (18 pruebas) |
| Ciclo de vida | Máquina de estados canónica con 7 estados y matriz de transiciones documentada | `docs/ciclo-vida-pedido.md` |
| Aprobación farmacéutica | El químico farmacéutico aprueba o rechaza recetas por comando; el rechazo libera stock una sola vez | `scripts/test-aprobacion.mjs` (19 pruebas) |

## 3. Decisiones técnicas del sprint

1. **Canal:** Telegram Bot API como canal del prototipo (costo $0); la venta se mantiene como WhatsApp y su adaptador queda planificado.
2. **Estado inicial (D-01):** sin receta → `EN_PREPARACION`; con receta → `PENDIENTE_RECETA` (12 h).
3. **Titularidad por chat:** las consultas y recetas solo se aceptan desde el chat que creó el pedido.
4. **Auditoría:** bitácora con `estado_anterior`, `estado_nuevo` y `actor` en todas las transiciones.

## 4. Pruebas y evidencia

- Suites automatizadas en cada push (CI de GitHub Actions): 242 pruebas en verde al cierre de este informe (0 fallos).
- Cada workflow tiene su suite: fuzzy 32, reserva 79, trazabilidad 18, aprobación 19, recetas 53, expiración 13, PWA 18, alertas 10.
- Escaneo de secretos (`scripts/check_secrets.sh`) en OK.

## 5. Limitaciones conocidas

- Las pruebas validan la lógica extraída de los workflows; la verificación de punta a punta contra Google Sheets y el bot reales se ejecuta con la guía E2E y queda pendiente en el entorno del equipo.
- La concurrencia formal (reservas simultáneas) se prueba en el Sprint 3 (US-13); hoy se mitiga con escrituras serializadas y guardas por estado.
- El video demostrativo se graba con el guion adjunto (`docs/guion-video-sprint-1.md`).

## 6. Privacidad

- Fixtures, capturas y datos de demostración 100% sintéticos.
- Los mensajes del bot nunca exponen pedidos de terceros; la bitácora no contiene datos personales.
