# Prueba manual de punta a punta: receta por foto (CA-12, CA-13 y CA-14)

- **Fecha:** 9 de noviembre de 2026, 18:57–18:58 (hora de Chile).
- **Camino:** 100 % real, sin simulaciones. Telegram (teléfono y web del PO) → túnel de Cloudflare → router US-17 → US-05, US-09 y US-20 en n8n 2.44.2 → Google Sheets y Google Drive (OAuth).
- **Datos:** sintéticos. RUT 11.111.111-1 y hoja escrita a mano «Receta de prueba».

| Paso | Mensaje del PO | Respuesta del bot | Verificación en la planilla |
|---|---|---|---|
| 1 | `reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto` | Reserva confirmada con el código **#FAR-0901** y el plazo de 12 h | Bitácora: `RESERVA_ALTA` → PENDIENTE_RECETA, actor `cliente:<chat>` |
| 2 | Foto «Receta de prueba» con pie `#FAR-0901` | Al vecino: «Recibimos la receta de tu pedido #FAR-0901. Un químico farmacéutico la revisará…» | Orden en RECETA_RECIBIDA; `url_receta` apunta a Google Drive; `fecha_receta` registrada; bitácora `RECETA_RECIBIDA` |
| 3 | (aviso automático) | Al farmacéutico: «Nueva receta recibida para #FAR-0901 (MED-0002 x1). Ver receta: [enlace a Drive]…», **sin RUT** | El archivo quedó en la carpeta «Recetas - Farmacia prueba Grupo 10» |
| 4 | `aprobar FAR-0901` | Al vecino: «Tu pedido #FAR-0901 fue aprobado y pasa a preparación.» Al farmacéutico: «Aprobado: #FAR-0901 pasa a EN_PREPARACION.» | Orden en **EN_PREPARACION**; bitácora `RECETA_APROBADA`, actor `farmaceutico:<chat>` |
| Extra | `aprobar FAR-0004` (código inexistente) | «No encontré el pedido #FAR-0004.» | Sin cambios |

**Resultado: CA-12, CA-13 y CA-14 pasan con el camino real.** Captura de la conversación: `Entrega 2/capturas/cap-12-14-receta-real.png` (la toma el PO).

**Nota:** el código fue #FAR-0901 porque en la planilla ya existía el pedido de demostración #FAR-0900, creado con `--pedido-vencido`; el siguiente número continúa desde el mayor.
