# Guía de instalación local (paso a paso)

Con esta guía, cualquier integrante del equipo levanta el prototipo completo en su computador y hace el recorrido del vecino por Telegram. No hace falta saber n8n. **Tiempo estimado: 30 minutos** la primera vez (la mitad es crear las cuentas gratuitas).

| Al terminar tendrá | Cómo se ve |
|---|---|
| Un bot de Telegram propio que responde | Le escribe "hola" y contesta con el menú |
| n8n con los 9 flujos importados y publicados | <http://localhost:5678> |
| Una planilla de Google con el catálogo sintético | 16 medicamentos ficticios |
| Un túnel gratuito de Cloudflare | URL `https://…trycloudflare.com` que cambia en cada arranque |

> **Datos:** todo es sintético. Nunca use RUT, direcciones, teléfonos ni recetas reales (Ley 19.628). Para la foto de "receta", use una hoja escrita a mano que diga *RECETA DE PRUEBA*.

---

## 1. Requisitos (una sola vez)

| Herramienta | Windows | macOS | Linux |
|---|---|---|---|
| **Git** | <https://git-scm.com/download/win> | `xcode-select --install` | `sudo apt install git` |
| **Node.js 18 o superior (LTS)** | <https://nodejs.org> (instalador .msi) | <https://nodejs.org> o `brew install node` | <https://nodejs.org> o el gestor de su distribución |
| **Docker Desktop** | <https://www.docker.com/products/docker-desktop> (acepte WSL 2) | <https://www.docker.com/products/docker-desktop> | Docker Engine + plugin `docker compose` |

Compruebe en una terminal (PowerShell en Windows, Terminal en macOS/Linux):

```
node --version      # v18 o superior
docker info         # debe responder sin error: Docker Desktop tiene que estar ABIERTO
```

## 2. Descargar el proyecto

```
git clone https://github.com/Jeple/Proyecto-IngenieraSoftware.git
cd Proyecto-IngenieraSoftware
```

Mientras la Entrega 2 no se fusione en `main`, cambie a la rama de trabajo que indique el equipo (por ejemplo `git switch feature/sprint-2-entrega`).

## 3. Crear el bot de Telegram (3 minutos)

1. En Telegram, busque **@BotFather** y envíe `/newbot`.
2. Elija un nombre (por ejemplo, *Farmacia Peñalolén Prueba Juan*) y un usuario terminado en `bot` (por ejemplo, `farmacia_pnl_juan_bot`).
3. BotFather responde con un **token** del estilo `123456789:AAH…`. **Es una contraseña:** no lo pegue en chats, capturas ni documentos.
4. Busque **@userinfobot**, envíele cualquier mensaje y anote su **Id** (un número). Ese es su `chat_id`; con él usted hará de químico farmacéutico, de personal y de administrador en la demo.

## 4. Crear la cuenta de servicio de Google (8 minutos)

La cuenta de servicio es un "usuario robot" que n8n usa para leer y escribir la planilla.

1. Entre a <https://console.cloud.google.com> con su cuenta de Google y cree un proyecto (por ejemplo, `farmacia-prueba`).
2. Menú **APIs y servicios → Biblioteca**: habilite **Google Sheets API** y **Google Drive API**.
3. Menú **IAM y administración → Cuentas de servicio → Crear cuenta de servicio**. Póngale un nombre (por ejemplo, `n8n-farmacia`). No necesita roles: **Continuar → Listo**.
4. Abra la cuenta creada → pestaña **Claves → Agregar clave → Crear clave nueva → JSON**. Se descarga un archivo.
5. Guárdelo dentro del proyecto como **`secrets/service-account.json`**. La carpeta `secrets/` está ignorada por git: nunca se sube.
6. Abra el JSON con el Bloc de notas y copie el valor de `client_email` (termina en `iam.gserviceaccount.com`). Lo usará en los pasos 5 y 6.

## 5. Crear la planilla (2 minutos)

1. En <https://sheets.google.com> cree una hoja de cálculo **en blanco** (por ejemplo, *Farmacia prueba*).
2. **Compartir** → pegue el `client_email` → rol **Editor** → Enviar (si pregunta, no notificar).
3. Copie el **ID** de la URL: lo que está entre `/d/` y `/edit`.
   `https://docs.google.com/spreadsheets/d/`**`1AbC…xyz`**`/edit`

Las hojas, encabezados y el catálogo se crean solos en el paso 9.

## 6. Carpeta de recetas y permiso OAuth (8 minutos)

Las recetas se guardan en **su propio Google Drive**, en una carpeta privada (RNF-07). La cuenta de servicio no puede guardarlas porque Google le da **cuota 0**: lo comprobamos, la subida falla con «Service Accounts do not have storage quota». Por eso, n8n sube la foto **con su permiso** (OAuth). Funciona con una cuenta Gmail común.

**6.1 Carpeta.** En <https://drive.google.com> → **Nuevo → Nueva carpeta** (por ejemplo, *Recetas - Farmacia prueba*). Ábrala y copie el **ID** de la URL, lo que sigue a `/folders/`.

**6.2 Pantalla de consentimiento.** En la consola de Google Cloud, dentro de su proyecto:
1. Vaya a **Google Auth Platform → Comenzar**.
2. Nombre de la app: `Farmacia prueba`; correo de asistencia: el suyo. Pulse **Siguiente**.
3. Público: **Externo**. Pulse **Siguiente**.
4. Contacto: su correo. Acepte la política, pulse **Continuar** y luego **Crear**.
5. En **Público → Usuarios de prueba → + Add users**, agregue su propio Gmail y pulse **Guardar**.

**6.3 Cliente OAuth.** En **Clientes → + Crear cliente**:
1. Tipo: **Aplicación web**. Nombre: `n8n local`.
2. En **Orígenes autorizados de JavaScript** escriba `http://localhost:5678`, **sin ruta**.
3. En **URIs de redireccionamiento autorizados** escriba:
   ```
   http://localhost:5678/rest/oauth2-credential/callback
   ```
   Si pega esta URI en la primera sección (Orígenes), Google muestra «Origen no válido: Los URI no deben contener una ruta». Va en la **segunda** sección.
4. Pulse **Crear**, luego **Descargar JSON**, y guarde el archivo como `secrets/oauth-client.json`.

**6.4 Conectar.** Se hace después del paso 7. El arranque crea la credencial «Google Drive (OAuth)» en n8n. Para conectarla:
1. Abra <http://localhost:5678> y cree su usuario local.
2. Vaya a **Overview → Credentials → «Google Drive (OAuth)» → Sign in with Google**.
3. Elija su cuenta. Ante «Google no verificó esta app», pulse **Continuar** y luego **Permitir**.
4. `doctor` debe mostrar «credencial "Google Drive (OAuth)" conectada».

> Mientras la app esté «en prueba», Google pide reconectar cada 7 días; basta con repetir el paso 6.4. Con una cuenta institucional (Google Workspace) también puede usarse una unidad compartida, pero no es necesario.

## 7. Levantar todo con un comando

**Windows (PowerShell, dentro de la carpeta del proyecto):**

```
powershell -ExecutionPolicy Bypass -File scripts\local\levantar.ps1
```

**macOS, Linux o Git Bash:**

```
bash scripts/local/levantar.sh
```

La primera vez el script crea el archivo **`.env`** y genera dos claves automáticas (`N8N_ENCRYPTION_KEY` y `TELEGRAM_WEBHOOK_SECRET`). Le avisará qué datos faltan.

## 8. Completar el archivo `.env`

Abra `.env` (en la raíz del proyecto) con el Bloc de notas y complete, **sin comillas ni espacios**:

| Clave | Valor |
|---|---|
| `TELEGRAM_BOT_TOKEN` | El token de BotFather (paso 3) |
| `TELEGRAM_PHARMACIST_CHAT_IDS` | Su `chat_id` (paso 3). Varios, separados por comas |
| `TELEGRAM_ADMIN_CHAT_ID` | Su `chat_id` (recibe las alertas de error) |
| `TELEGRAM_STAFF_CHAT_IDS` | Opcional. Si queda vacío, el farmacéutico también marca los despachos |
| `GOOGLE_SHEET_ID` | ID de la planilla (paso 5) |
| `GOOGLE_DRIVE_RECETAS_FOLDER_ID` | ID de la carpeta de recetas en su Drive (paso 6.1) |
| `GEMINI_API_KEY` | Opcional. Sin clave, el router usa solo reglas |

Guarde y **vuelva a ejecutar el comando del paso 7**. Esta vez:

1. levanta n8n (versión fijada 2.44.2);
2. importa la credencial de Google (desde `secrets/service-account.json`) y los 9 flujos, y los publica;
3. abre el túnel rápido de Cloudflare (sin cuenta);
4. registra el webhook del bot con el secreto;
5. corre el diagnóstico y muestra lo que falte.

## 9. Cargar el catálogo sintético

```
node scripts/local/cargar-catalogo.mjs --reiniciar
```

Crea las hojas `catalogo`, `inventario`, `ordenes`, `despachos` y `bitacora`, carga los 16 medicamentos ficticios y deja **Pregalex 75 mg sin stock** a propósito (para ver la sugerencia de bioequivalentes).

## 10. Probar el recorrido completo

Escriba a su bot, en este orden (los datos son ficticios):

| # | Usted escribe | El bot debería |
|---|---|---|
| 1 | `hola` | Presentarse como asistente automático y mostrar el menú |
| 2 | `hola, ¿hay pregavalina 75?` | Decir que Pregalex 75 mg está agotado y ofrecer **Neurogab 75 mg** |
| 3 | `reservar neurogab 75 x1 rut 11.111.111-1, Av. Grecia 8735, Peñalolén Alto` | Confirmar la reserva con un código `#FAR-0001` y el plazo de 12 horas |
| 4 | Una **foto** con el texto `#FAR-0001` en el pie de foto | Confirmar que recibió la receta. A usted (farmacéutico) le llega el aviso con el enlace |
| 5 | `aprobar FAR-0001` | Confirmarle la aprobación; al "vecino" le avisa que pasa a preparación |
| 6 | `en ruta FAR-0001` | Avisar al vecino que el pedido va en camino |
| 7 | `estado 11.111.111-1` | Responder **En ruta** |
| 8 | `entregado FAR-0001` | Avisar la entrega y descontar el stock (revise la hoja `inventario`) |
| 9 | `me duele el pecho` | Derivar al SAMU 131 sin dar consejos clínicos |

Para ver la **liberación a las 12 horas** sin esperar:
1. Corra `node scripts/local/cargar-catalogo.mjs --pedido-vencido <su chat_id>`, que crea `#FAR-0900` ya vencido.
2. Escriba al bot `revisar vencidos`. Es un comando del personal: ejecuta US-10 a demanda.

El bot le avisa la cancelación y el stock reservado vuelve a 0.

> Las respuestas que escriben en la planilla (reserva, aprobación, despacho) tardan varios segundos. Cada paso de Google Sheets dentro de n8n demora entre 1 y 3 s; está medido en `docs/evidencia/rendimiento/` y es un tema de mejora para el Sprint 3.

## 11. Ver los flujos en n8n

Abra <http://localhost:5678>. La primera vez pide crear un **usuario local** (correo y clave cualquiera; queda solo en su equipo). En **Workflows** están los 9 flujos publicados; en **Executions** se ve cada mensaje procesado, paso a paso. Las credenciales ya quedaron configuradas por el script: no hay que tocarlas.

## 12. Sin credenciales: solo mirar

- **Mapa de flujos:** abra `presentacion/mapa-workflows.html` con doble clic.
- **n8n solo lectura:** `presentacion/n8n-demo/iniciar-demo.ps1` (o `.sh`), ver `presentacion/n8n-demo/LEEME.md`.
- **Prueba de integración sin cuentas:** `node scripts/local/prueba-integracion.mjs` levanta n8n en un contenedor desechable con un Telegram simulado y verifica 14 casos.
- **PWA del conductor (prototipo fuera del alcance):** `npx serve pwa` y abra la URL que muestra; funciona en modo demostración.

## 13. Diagnóstico, detener y volver a empezar

| Necesito… | Comando |
|---|---|
| Saber qué falta (no muestra secretos) | `node scripts/local/doctor.mjs` (o `scripts\local\doctor.ps1`) |
| Detener todo (conserva los datos) | `node scripts/local/levantar.mjs --detener` |
| Volver a levantar (nueva URL del túnel) | el comando del paso 7 |
| Borrar n8n por completo | `docker compose --profile tunel-rapido down -v` |
| Vaciar los pedidos de prueba | `node scripts/local/cargar-catalogo.mjs --reiniciar` |

## 14. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Docker no está en ejecución` | Docker Desktop cerrado | Ábralo y espere "Engine running" |
| `port is already allocated` (5678) | Otro n8n en ejecución | `docker ps` y deténgalo, o cierre `presentacion/n8n-demo` |
| El bot no contesta | Túnel nuevo sin webhook, o flujo sin publicar | Ejecute de nuevo el paso 7 y luego `doctor` |
| `doctor`: *último error de entrega* | El túnel cambió de URL | Ejecute de nuevo el paso 7 |
| Recetas: «Tuvimos un problema» al enviar la foto | Credencial «Google Drive (OAuth)» sin conectar o vencida (7 días) | Paso 6.4 y luego `doctor` |
| `Quota exceeded … Read requests per minute` | Más de 60 lecturas por minuto a la planilla (ráfaga de mensajes o pruebas seguidas) | Espere un minuto; los flujos reintentan solos (3 intentos) |
| Google Cloud: «Origen no válido: Los URI no deben contener una ruta» | La URI de n8n se pegó en «Orígenes autorizados» | Va en «URIs de redireccionamiento» (paso 6.3) |
| `La cuenta de servicio no puede abrir la planilla` | No se compartió | Compártala como Editor con el `client_email` |
| Responde "No encontré … en nuestro catálogo" | Catálogo vacío o nombre muy distinto | Paso 9; pruebe con el principio activo |
| PowerShell: *la ejecución de scripts está deshabilitada* | Política de ejecución | Use exactamente `powershell -ExecutionPolicy Bypass -File …` |
| Git Bash: rutas `/tmp/...` raras al usar `docker exec` a mano | Conversión de rutas de MSYS | Anteponga `MSYS_NO_PATHCONV=1` (los scripts ya lo evitan) |
| La red de la universidad bloquea `trycloudflare.com` | Firewall | Use otra red (por ejemplo, datos del celular) |
| Se perdió `N8N_ENCRYPTION_KEY` | `.env` borrado | Borre n8n (`down -v`) y ejecute el paso 7 |

## 15. Seguridad

- `.env` y `secrets/` **nunca** se suben (están en `.gitignore`). Antes de cada commit: `bash scripts/check_secrets.sh`.
- Si un token o la clave JSON se filtró: en BotFather use `/revoke`; en Google Cloud borre la clave de la cuenta de servicio y cree otra.
- Al terminar el semestre: borre la clave de la cuenta de servicio y el bot de prueba (`/deletebot`).
