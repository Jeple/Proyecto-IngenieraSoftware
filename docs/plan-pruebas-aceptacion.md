# Plan de pruebas de aceptación y reporte · Entrega 2

Casos derivados de los criterios BDD del Inception (sección 6.1), de `docs/guia-pruebas-e2e.md` y de las historias nuevas (US-17 y US-22). Cada caso se ejecuta en el **entorno local con credenciales** (`docs/guia-instalacion-local.md`) y con **datos sintéticos**.

## 1. Preparación (criterio de entrada)

1. `node scripts/local/levantar.mjs` termina sin errores y `node scripts/local/doctor.mjs` no muestra «FALTA».
2. `node scripts/local/cargar-catalogo.mjs --reiniciar`: catálogo sintético, pedidos vacíos y Pregalex 75 mg (`MED-0001`) sin stock.
3. Dos cuentas de Telegram:
   - **A**, el «vecino»;
   - **B**, otro integrante, para la titularidad.
   - El químico farmacéutico y el personal usan el `chat_id` configurado en `.env`, que puede ser el de A.
4. **Automatizado:** `node scripts/local/e2e.mjs` ejecuta los casos marcados con ⚙. Envía *updates* firmados al webhook local, captura las respuestas en un proxy que también las reenvía a Telegram (llegan al chat A) y verifica la planilla. Los casos marcados con ✋ se hacen a mano en el teléfono y se respaldan con una captura.

## 2. Casos

| ID | Historia | Criterio (Dado / Cuando / Entonces) | Entrada (datos ficticios) | Resultado esperado | Modo |
|---|---|---|---|---|---|
| CA-01 | US-04 | Dado un producto con stock, cuando el vecino lo consulta con su nombre genérico, entonces recibe precio y stock disponible | `losartan 50` | «Losarmed 50 mg — $4.990 c/u. Stock disponible: 92 unidades.» | ⚙ |
| CA-02 | US-04 | Dado un producto agotado escrito con errores, cuando se consulta, entonces informa el quiebre y sugiere bioequivalentes con stock | `hola, ¿hay pregavalina 75?` | Pregalex 75 mg agotado; «Neurogab 75 mg — $7.490 c/u.» | ⚙ ✋ |
| CA-03 | US-04 / R-02 | Dado un producto que no está en el catálogo, cuando se consulta, entonces no inventa nombre, precio ni stock | `paracetamol 500` | «No encontré "paracetamol 500" en nuestro catálogo…» | ⚙ |
| CA-04 | US-05 | Dado un remedio con receta y stock, cuando el vecino confirma la reserva con RUT, dirección y sector, entonces se crea #FAR-XXXX en PENDIENTE_RECETA con 12 h y sube stock_reservado | `reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto` | Código `#FAR-0001`; `ordenes`: PENDIENTE_RECETA y `fecha_expiracion` igual a creación + 12 h; `inventario` de MED-0002: reservado +1; `bitacora`: RESERVA_ALTA; `despachos`: PENDIENTE | ⚙ ✋ |
| CA-05 | US-05 (D-01) | Dado un remedio sin receta, cuando se reserva, entonces nace en EN_PREPARACION y no expira | `reservar somnia x2 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto` | `ordenes`: EN_PREPARACION y sin `fecha_expiracion` | ⚙ |
| CA-06 | US-05 | Dada una dirección fuera de cobertura o un producto sin stock, cuando se reserva, entonces se rechaza con un mensaje guía y no se escribe nada | `reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 100, Ñuñoa` · `reservar pregalex 75 x1 rut 11.111.111-1, Av. Grecia 8735, San Luis` | Rechazo con guía; la hoja `ordenes` no cambia | ⚙ |
| CA-07 | US-06 | Dado un pedido del vecino, cuando consulta por su RUT, entonces recibe el estado vigente | `estado 11.111.111-1` (desde A) | «Tu pedido #FAR-… está esperando la foto de tu receta…» | ⚙ ✋ |
| CA-08 | US-06 / RNF-07 | Dado el pedido de A, cuando B pregunta por ese código, entonces recibe el mismo mensaje que para un pedido inexistente | `estado #FAR-0001` (desde B) | «No encontré ese pedido…» | ⚙ ✋ |
| CA-09 | US-17 | Dado un vecino nuevo, cuando saluda, entonces el bot se presenta como automático y muestra el menú | `/start` | Bienvenida con «asistente virtual» y el menú | ⚙ ✋ |
| CA-10 | US-17 / US-14 / RNF-08 | Dada una urgencia o una pregunta clínica, cuando el vecino escribe, entonces no recibe consejo médico y se le deriva | `me duele el pecho` · `¿cuántas pastillas me tomo?` | SAMU 131 · «No puedo dar indicaciones…» | ⚙ ✋ |
| CA-11 | US-17 / seguridad | Dado un mensaje sin el secreto del webhook, cuando llega, entonces se descarta sin respuesta | `POST` al webhook sin el encabezado | Ningún mensaje del bot | ⚙ |
| CA-12 | US-09 | Dado un pedido PENDIENTE_RECETA, cuando el titular envía la foto con el código, entonces se guarda en Drive y el pedido pasa a RECETA_RECIBIDA | Foto «RECETA DE PRUEBA» con pie `#FAR-0001` | Respuesta «Recibimos la receta… un químico farmacéutico la revisará»; archivo en la carpeta compartida; `url_receta` y `fecha_receta` llenas; bitácora RECETA_RECIBIDA | ✋ |
| CA-13 | US-09 | Dado que llegó una receta, entonces el farmacéutico recibe el aviso con el enlace y sin el RUT | (consecuencia de CA-12) | Mensaje «Nueva receta recibida para #FAR-0001 (MED-0002 x1)…» sin RUT | ✋ |
| CA-14 | US-20 | Dado un pedido RECETA_RECIBIDA, cuando el farmacéutico aprueba, entonces pasa a EN_PREPARACION y se avisa al vecino | `aprobar FAR-0001` | Aviso al vecino; confirmación al farmacéutico; bitácora RECETA_APROBADA con `actor` farmaceutico:… | ⚙ ✋ |
| CA-15 | US-20 | Dado otro pedido RECETA_RECIBIDA, cuando el farmacéutico rechaza, entonces pasa a RECHAZADO y libera el stock una vez | `rechazar FAR-0002 receta ilegible` | RECHAZADO; reservado −1; aviso con el motivo; repetir el comando no cambia nada | ⚙ |
| CA-16 | US-10 | Dado un pedido PENDIENTE_RECETA vencido, cuando corre el cron, entonces pasa a CANCELADO_EXPIRADO, libera el stock y avisa | `cargar-catalogo.mjs --pedido-vencido <chat A>` y luego, como personal, `revisar vencidos` | #FAR-0900 en CANCELADO_EXPIRADO; reservado de MED-0003 de 1 a 0; aviso «…cancelado por falta de receta…» | ⚙ ✋ |
| CA-17 | US-22 | Dado un pedido EN_PREPARACION, cuando el personal marca «en ruta», entonces cambia el estado y el vecino recibe el aviso | `en ruta FAR-0001`, y luego `estado 11.111.111-1` | «Su pedido #FAR-0001 va en camino…»; `despachos`: EN_RUTA; bitácora DESPACHO_EN_RUTA; el estado responde «va en camino» | ⚙ ✋ |
| CA-18 | US-22 | Dado un pedido EN_RUTA, cuando el personal marca «entregado», entonces se descuentan el stock real y el reservado una sola vez | `entregado FAR-0001` (dos veces) | ENTREGADO; MED-0002 real −1 y reservado −1; el segundo comando dice «ya estaba ENTREGADO» | ⚙ ✋ |
| CA-19 | US-21 | Dado un fallo en un subflujo, entonces el administrador recibe una alerta y el vecino un aviso de problema | Renombrar la hoja `catalogo` y consultar `losartan 50` (luego restaurarla) | Alerta «ALERTA n8n: el workflow "US-04…" falló… Nodo: read_catalogo»; el vecino recibe «Tuvimos un problema…» | ⚙ |
| CA-20 | US-13 / RNF-04 | Dado un producto con stock 3, cuando llegan 5 reservas simultáneas (cantidades 1 a 5), entonces no hay sobreventa ni actualizaciones perdidas | `node scripts/local/prueba-concurrencia.mjs` | reservado ≤ 3; reservado igual a la suma de las reservas creadas; una fila de bitácora por reserva | ⚙ |
| CA-21 | RNF-01 | Dada la planilla real, cuando se hacen 20 consultas seguidas, entonces el p95 es menor a 2,5 s | `node scripts/local/medir-latencia.mjs --n 20` | p95 < 2.500 ms | ⚙ |

## 3. Reporte de ejecución

Para cada caso, complete el resultado, la fecha, el *execution id* de n8n (Executions → la ejecución → ID en la URL) y la referencia a la captura (carpeta `Entrega 2/capturas/`). `scripts/local/e2e.mjs` llena automáticamente las columnas de los casos ⚙ en `docs/evidencia/e2e/`.

| ID | Resultado (Pasa / Falla / Pendiente) | Fecha | Execution id | Captura | Observaciones |
|---|---|---|---|---|---|
| CA-01 | Pasa | 2026-11-09 | — |  | Automático (`e2e-2026-11-09-22-10.md`): 1749 ms · «Losarmed 50 mg — $4.990 c/u. Stock disponible: 92 unidades.» |
| CA-02 | Pasa | 2026-11-09 | — | cap-02-consulta.png | Automático (`e2e-2026-11-09-22-10.md`): 1510 ms · «Pregalex 75 mg — $8.990 c/u. Stock disponible: 0 unidades. Producto agotado temporalmente. Bioequivalentes dis» |
| CA-03 | Pasa | 2026-11-09 | — |  | Automático (`e2e-2026-11-09-22-10.md`): 1546 ms |
| CA-04 | Pasa | 2026-11-09 | — | cap-04-reserva.png | Automático (`e2e-2026-11-09-22-10.md`): 7839 ms · estado=PENDIENTE_RECETA · expira en 12.00 h · reservado=1 · bitácora=1 · despacho=PENDIENTE |
| CA-05 | Pasa | 2026-11-09 | — |  | Automático (`e2e-2026-11-09-22-10.md`): estado=EN_PREPARACION |
| CA-06 | Pasa | 2026-11-09 | — |  | Automático (`e2e-2026-11-09-22-10.md`): filas 2→2 · «Por ahora la entrega a domicilio cubre solo los sectores Peñ» · «Pregalex 75 mg — $8.990 c/u. Stock disponible: 0 unidades. P» |
| CA-07 | Pasa | 2026-11-09 | — | cap-07-estado.png | Automático (`e2e-2026-11-09-22-10.md`): «Tu pedido #FAR-0002 está en preparación en bodega. Sector: Peñalolén Alto.». En la corrida anterior falló por D-18 (`e2e-2026-11-09-21-59.md`) |
| CA-08 | Pasa | 2026-11-09 | — | cap-08-titularidad.png | Automático (`e2e-2026-11-09-22-10.md`): «No encontré ese pedido. Revisa el código #FAR-XXXX o tu RUT e inténtalo de nuevo». El segundo chat es simulado; falta repetirlo desde un segundo teléfono (✋) |
| CA-09 | Pasa | 2026-11-09 | — | cap-09-bienvenida.png | Automático (`e2e-2026-11-09-22-10.md`): 402 ms |
| CA-10 | Pasa | 2026-11-09 | — | cap-10-urgencia.png | Automático (`e2e-2026-11-09-22-10.md`): 242 ms / 234 ms |
| CA-11 | Pasa | 2026-11-09 | — |  | Automático (`e2e-2026-11-09-22-10.md`): sin respuesta (correcto) |
| CA-12 | Pasa | 2026-11-09 | — | cap-12-14-receta-real.png | Manual con el camino real, sin simulaciones (`docs/evidencia/e2e/manual-receta-2026-11-09.md`) |
| CA-13 | Pasa | 2026-11-09 | — | cap-12-14-receta-real.png | Manual con el camino real, sin simulaciones (`docs/evidencia/e2e/manual-receta-2026-11-09.md`) |
| CA-14 | Pasa | 2026-11-09 | — | cap-12-14-receta-real.png | Automático (`e2e-2026-11-09-22-10.md`): estado=EN_PREPARACION · actor=farmaceutico:<chat_id> · respuestas=2. También pasó con la receta real (docs/evidencia/e2e/manual-receta-2026-11-09.md) |
| CA-15 | Pasa | 2026-11-09 | — |  | Automático (`e2e-2026-11-09-22-10.md`): FAR-0003: reservado 1→0→0 |
| CA-16 | Pasa | 2026-11-09 | — | cap-16-expiracion.png | Automático (`e2e-2026-11-09-22-10.md`): estado=CANCELADO_EXPIRADO · reservado=0 · 5215 ms. Ejecutado con «revisar vencidos» |
| CA-17 | Pasa | 2026-11-09 | — | cap-17-en-ruta.png | Automático (`e2e-2026-11-09-22-10.md`): orden=EN_RUTA · despacho=EN_RUTA. En la corrida anterior falló por D-18 |
| CA-18 | Pasa | 2026-11-09 | — | cap-18-entregado.png | Automático (`e2e-2026-11-09-22-10.md`): real 65→64→64 · reservado 1→0→0 |
| CA-19 | Pasa | 2026-11-09 | — | cap-19-alerta.png | Automático (`e2e-2026-11-09-22-10.md`): 2 mensajes |
| CA-20 | Pasa | 2026-11-09 | — |  | 5 reservas simultáneas (1 a 5 u.) sobre stock 3: 2 creadas (2 + 1), 3 rechazadas, reservado 3 = suma; sobreventa 0 (`docs/evidencia/rendimiento/concurrencia-2026-11-09-22-07.json`) |
| CA-21 | Pasa | 2026-11-09 | — |  | p50 1.656 ms, p95 2.110 ms, máx. 2.211 ms en 20 consultas (`docs/evidencia/rendimiento/latencia-e2e-2026-11-09-22-06.json`) |

**Resultado al 9 de noviembre: 21 de 21 casos pasan.** El E2E automático pasó 17 de 17 (`docs/evidencia/e2e/e2e-2026-11-09-22-10.md`). La corrida anterior pasó 15 de 17 (`e2e-2026-11-09-21-59.md`): CA-07 y CA-17 fallaron por el defecto D-18, que se corrigió y se volvió a ejecutar.

**Pendiente del equipo:**
- tomar las capturas de la columna «Captura» (carpeta `Entrega 2/capturas/`), que aún no existen;
- repetir CA-08 desde un segundo teléfono real;
- anotar los *execution id*: en n8n → *Executions*, con la hora de la columna «Fecha» del reporte automático.

## 4. Capturas exactas para el informe y el video

Silencie las notificaciones, oculte el token y use solo los datos de esta tabla.

1. **cap-02:** el chat A con «hola, ¿hay pregavalina 75?» y la respuesta con Neurogab.
2. **cap-04:** la confirmación de la reserva con el código y el plazo de 12 horas.
3. **cap-04b:** la hoja `ordenes` con la fila del pedido (PENDIENTE_RECETA) y la hoja `inventario` con el reservado actualizado.
4. **cap-12:** la foto enviada y la respuesta del bot.
5. **cap-12b:** la carpeta privada de Drive con el archivo `receta-FAR-….jpg`.
6. **cap-13 y cap-14:** el aviso al farmacéutico y la aprobación.
7. **cap-17 y cap-18:** el aviso «va en camino», el estado por RUT y la entrega.
8. **cap-n8n:** n8n → *Executions*, con la lista de ejecuciones exitosas del router y los subflujos.
9. **cap-bitacora:** la hoja `bitacora` con las transiciones y la columna `actor`.
10. **cap-ci:** GitHub → *Actions*, con el último run en verde (los jobs `validate-json` e `integracion-n8n`).

## 5. Criterio de salida

- Todos los casos de historias Must están en «Pasa», o tienen un defecto registrado como issue con la decisión del PO.
- No queda ningún defecto crítico abierto: sobreventa, dato inventado, fuga de datos o consejo clínico.
- El resultado se resume en el informe de la Entrega 2 (sección 9).
