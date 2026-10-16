# Despliegue de n8n (US-04)

n8n corre en Docker y se expone a internet con Cloudflare Tunnel. Es un entorno de **desarrollo**: si la máquina que lo aloja se apaga, n8n deja de responder.

```
Internet ──HTTPS──> Cloudflare ──túnel──> cloudflared ──> n8n ──> volumen n8n_data
```

n8n solo publica el puerto en `127.0.0.1`. La entrada desde internet pasa por el túnel.

## Archivos

| Archivo | Uso |
|---|---|
| `infra/n8n/docker-compose.yml` | n8n y volumen (base) |
| `infra/n8n/docker-compose.quick.yml` | Override: Quick Tunnel (URL aleatoria) |
| `infra/n8n/docker-compose.named.yml` | Override: Named Tunnel (hostname fijo) |
| `infra/n8n/.env.example` | Variables. Copiar a `.env` (no se versiona) |
| `workflows/smoke-test.json` | Webhook `GET /webhook/health` |
| `scripts/check_secrets.sh` | Falla si el repo contiene secretos |

## Primer arranque (local)

```bash
cd infra/n8n
cp .env.example .env
# Generar y pegar la clave en .env, y guardarla en el gestor de contraseñas del equipo:
openssl rand -hex 32
docker compose up -d
```

Abrir http://localhost:5678 y crear el usuario owner con una contraseña fuerte.

## Cargar y activar el webhook de prueba

```bash
cd infra/n8n
docker compose exec n8n n8n import:workflow --input=/workflows/smoke-test.json
docker compose exec n8n n8n publish:workflow --id=smoke-test-000001
docker compose restart n8n
curl http://localhost:5678/webhook/health      # {"status":"ok"}
```

`publish:workflow` solo toma efecto al reiniciar n8n (por eso el `restart`). Si no existe en otra versión, activar el workflow desde el editor. La URL `/webhook-test/...` solo funciona mientras el editor escucha; la de producción es `/webhook/...` y requiere el workflow activo.

## Quick Tunnel (por defecto en desarrollo)

```bash
cd infra/n8n
export COMPOSE_FILE=docker-compose.yml:docker-compose.quick.yml   # evita repetir -f
docker compose up -d
docker compose logs cloudflared | grep trycloudflare.com
```

Los primeros segundos Cloudflare puede responder `1033` o `530`: el túnel tarda un poco en ser alcanzable. Reintentar.

La URL `https://<algo>.trycloudflare.com` **cambia en cada reinicio del túnel**. Para que n8n genere bien las URLs de webhook:

1. En `.env`: `N8N_HOST=<algo>.trycloudflare.com`, `N8N_PROTOCOL=https`, `WEBHOOK_URL=https://<algo>.trycloudflare.com/`.
2. `docker compose up -d n8n` (con `COMPOSE_FILE` exportado como arriba).

> No sirve para WhatsApp ni Vapi: no pueden apuntar a una URL que cambia.
> Quick Tunnel no tiene control de acceso: el editor queda público. No cargar credenciales reales mientras se use.

## Migrar a Named Tunnel

Requiere un dominio agregado a Cloudflare (cuenta gratuita).

1. Cloudflare Zero Trust → **Networks → Tunnels → Create a tunnel** → copiar el token.
2. En el túnel, **Public Hostname**: `n8n.<dominio>` → servicio `http://n8n:5678`.
3. En `.env`: `CLOUDFLARE_TUNNEL_TOKEN=<token>`, `N8N_HOST=n8n.<dominio>`, `N8N_PROTOCOL=https`, `WEBHOOK_URL=https://n8n.<dominio>/`.
4. Levantar con el override nuevo:
   ```bash
   docker compose down
   export COMPOSE_FILE=docker-compose.yml:docker-compose.named.yml
   docker compose up -d
   ```
5. Proteger el editor con **Cloudflare Access** (login por correo) y dejar libre solo la ruta `/webhook/*`.

El volumen, los workflows y `N8N_ENCRYPTION_KEY` no cambian.

## Respaldo

```bash
mkdir -p backups
docker compose exec n8n n8n export:workflow --all --output=/home/node/.n8n/backup-workflows.json
docker compose exec n8n n8n export:credentials --all --encrypted --output=/home/node/.n8n/backup-credentials.json
docker compose cp n8n:/home/node/.n8n/backup-workflows.json backups/
docker compose cp n8n:/home/node/.n8n/backup-credentials.json backups/
```

`backups/` está en `.gitignore`. No commitear respaldos de credenciales. Un export de workflows para versionar debe pasar por `scripts/check_secrets.sh` y revisarse a mano.

## Recuperación

Probado: con el volumen borrado (`down -v`), se recuperaron workflow y credenciales.

1. Levantar n8n con la **misma** `N8N_ENCRYPTION_KEY` y esperar unos segundos: mientras arranca responde `200` con "n8n is starting up", aunque aún no esté listo.
2. Copiar los respaldos al contenedor:
   ```bash
   docker compose cp backups/backup-workflows.json n8n:/home/node/.n8n/
   docker compose cp backups/backup-credentials.json n8n:/home/node/.n8n/
   ```
3. Importar:
   ```bash
   docker compose exec n8n n8n import:workflow --input=/home/node/.n8n/backup-workflows.json
   docker compose exec n8n n8n import:credentials --input=/home/node/.n8n/backup-credentials.json
   ```
4. **Publicar cada workflow** (el import los deja inactivos) y reiniciar:
   ```bash
   docker compose exec n8n n8n list:workflow          # ver los IDs
   docker compose exec n8n n8n publish:workflow --id=<ID>
   docker compose restart n8n
   ```
5. Probar `curl http://localhost:5678/webhook/health`.

Con una clave distinta, las credenciales importadas no se pueden descifrar. El usuario owner no está en el respaldo de workflows: hay que crearlo de nuevo si se pierde el volumen.

## Advertencias

- `docker compose down -v` **borra el volumen** (workflows y credenciales).
- Fijar versiones de imagen; no usar `latest`.
- Antes de cada commit: `./scripts/check_secrets.sh`.

## Verificación de criterios

| Criterio | Prueba |
|---|---|
| HTTPS | `curl -I https://<host>` responde con certificado válido |
| Webhook | `curl https://<host>/webhook/health` devuelve `{"status":"ok"}` |
| Repo limpio | `./scripts/check_secrets.sh` termina en OK y `.env` no está versionado |
