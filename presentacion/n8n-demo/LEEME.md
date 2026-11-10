# Ver los flujos en la app real de n8n (para la reunión)

Con esto abrís **n8n en tu computador con todos los flujos del proyecto ya importados**: el lienzo real, las cajitas, las conexiones, todo clickeable.

Este n8n es **solo para mirar**: los flujos quedan inactivos y no necesitás credenciales, planilla ni internet (salvo la primera descarga).

## Requisito

- **Docker Desktop abierto y corriendo** (recomendado), **o**
- **Node.js 20+** instalado (el script lo usa automáticamente como alternativa).

## Cómo usarlo

**Windows** (PowerShell, en esta carpeta):

```
.\iniciar-demo.ps1
```

**Mac / Linux:**

```
bash iniciar-demo.sh
```

La primera vez tarda (descarga n8n e importa los flujos). Después abre solo:

`http://localhost:5678` → la primera vez te pide crear una **cuenta local** (usuario y clave cualquiera; queda solo en tu máquina) → **Workflows** → ahí están todos los flujos para abrir y ver el diagrama real.

- **Para salir:** Ctrl+C en la ventana del script.
- **Para volver a mirar:** correr el script de nuevo (abre en segundos; no vuelve a importar).
- **Para borrarlo del todo:** eliminar la carpeta `n8n-demo`. Nada de esto se sube a GitHub.

## Si preferís hacerlo a mano

1. Levantá n8n como prefieras (Docker o `npx n8n@latest start`).
2. En la UI: **Workflows → Import from File** → elegí los JSON de la carpeta `workflows/`.

## Alternativa sin instalar nada

`presentacion/mapa-workflows.html` (doble clic): el mismo contenido como mapa estático, sin n8n.
