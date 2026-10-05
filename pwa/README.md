# PWA de reparto para conductores (US-11)

Aplicación web instalable que permite al conductor municipal de la Farmacia Peñalolén ver la lista de entregas, marcar cada pedido como `EN_RUTA` o `ENTREGADO` con un solo toque y consultar el tiempo estimado de llegada (ETA) calculado con OSRM. La carcasa de la aplicación funciona sin conexión mediante un service worker.

## Rápido camino

1. Servir la carpeta con cualquier servidor estático: `npx serve pwa`.
2. Abrir la URL en el navegador (a 360 px de ancho funciona sin desplazamiento horizontal).
3. Verificar: la lista carga con datos de demostración y el banner indica `Modo demostración`.
4. Ejecutar las pruebas: `node pwa/test/pwa.test.mjs`.

## Detalles

| Tema | Decisión |
|------|----------|
| Estados | `PENDIENTE` → `EN_RUTA` (botón *Marcar en ruta*) y `PENDIENTE`/`EN_RUTA` → `ENTREGADO` (botón *Entregado*). Transiciones inválidas no envían nada al backend. |
| ETA | El botón *Ver ETA* (y el paso automático a `EN_RUTA`) consulta OSRM y muestra `≈ N min` o `ETA no disponible`. |
| Modo demo | `demoMode = true` mientras el backend no exista: se usan datos embebidos, se ignoran los fallos de `PATCH` y el banner lo indica. |
| Sin catálogo | La interfaz no muestra precios ni stock: no tiene acceso al catálogo. |

### Contrato del backend esperado (por construir)

| Método | Ruta | Cuerpo / respuesta |
|--------|------|--------------------|
| `GET` | `{apiBaseUrl}` (por defecto `/api/despachos`) | Arreglo JSON de entregas: `{ codigo_far, cliente, direccion, sector, telefono, lat, lon, estado_ruta }` |
| `PATCH` | `{apiBaseUrl}/{codigo}` | Cuerpo `{ estado_ruta }` → entrega actualizada |

Mientras este contrato no exista, `app.js` cae en los datos de demostración y activa `demoMode`.

### OSRM

- Se usa el servidor público de demostración: `https://router.project-osrm.org`.
- Tiene límite de tasa y no garantiza disponibilidad; ante un fallo la ETA se muestra como `ETA no disponible`.
- En producción debe reemplazarse por un OSRM autoalojado cambiando `CONFIG.osrmBase` en `pwa/app.js`.
- Coordenadas en orden **longitud, latitud**, con el origen (depósito en Peñalolén) como segundo punto de la ruta.

### Pruebas

```bash
node pwa/test/pwa.test.mjs
```

Pruebas sin dependencias (Node ≥ 18) sobre las funciones puras: `computeEtaMinutes`, `formatEta`, `nextEstado`, `buildOsrmUrl` y `pickDeliveries`. Imprime `PASS`/`FAIL` por aserción y termina con código `1` si algo falla.

## Checklist

- [ ] La UI se ve correctamente a 360 px de ancho.
- [ ] `Marcar en ruta` y `Entregado` cambian el estado en un toque.
- [ ] El banner distingue datos en vivo, sin conexión y modo demostración.
- [ ] `node pwa/test/pwa.test.mjs` termina con código 0.

## Siguiente paso

- [ ] TODO: conectar los endpoints reales de n8n (`GET`/`PATCH` en `/api/despachos`) y desactivar `demoMode`.
- [ ] TODO: apuntar `CONFIG.osrmBase` a una instancia propia de OSRM antes de uso intensivo.
