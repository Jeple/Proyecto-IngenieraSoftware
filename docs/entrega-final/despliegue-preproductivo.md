# Ambiente preproductivo de la v0.1

Objetivo: que el bot de la v0.1 responda todo el día entre el 30 de noviembre y el 4 de diciembre de 2026 (y después, si se necesita), para que cualquier persona pueda probarlo sin depender del computador de quien presenta.

El ambiente usa exactamente lo mismo que el entorno local (Docker, n8n 2.44.2, túnel rápido de Cloudflare y los scripts de `scripts/local/`), pero en un computador que queda encendido. Todos los datos son sintéticos.

## 1. Dónde montarlo

| Opción | Costo | Comentario |
|---|---|---|
| **Máquina virtual en la nube (recomendada)** | $0 con crédito estudiantil o capa gratuita | Azure for Students suele activarse con el correo de la universidad, sin tarjeta. Google Cloud y Oracle Cloud tienen capas gratuitas, pero piden tarjeta |
| Computador del equipo siempre encendido | $0 | Sirve como respaldo. Hay que desactivar la suspensión y dejar Docker Desktop abierto |

Tamaño sugerido para la máquina virtual: Ubuntu 24.04 LTS, 2 GB de RAM (1 GB funciona con swap), 10 GB de disco. Solo hace falta abrir el puerto 22 (SSH) hacia dentro: el túnel de Cloudflare sale desde la máquina, así que n8n nunca queda expuesto con un puerto abierto.

## 2. Paso a paso en una máquina virtual Ubuntu

1. **Instalar lo necesario** (Ubuntu 24.04 trae Node 18, suficiente):
   ```
   sudo apt update && sudo apt install -y git docker.io docker-compose-v2 nodejs
   sudo usermod -aG docker $USER
   ```
   Cierre la sesión SSH y vuelva a entrar para que el permiso de Docker se aplique.

2. **Descargar la versión etiquetada:**
   ```
   git clone --branch v0.1.0 https://github.com/Jeple/Proyecto-IngenieraSoftware.git farmacia
   cd farmacia
   ```

3. **Copiar las credenciales sin pasar por chats.** Desde el computador que ya tiene el entorno funcionando:
   ```
   scp secrets/service-account.json secrets/oauth-client.json usuario@IP-DE-LA-VM:~/farmacia/secrets/
   ```
   No copie el `.env` completo por chat ni por correo. Si lo copia, use `scp` igual que arriba.

4. **Levantar todo:**
   ```
   bash scripts/local/levantar.sh
   ```
   La primera vez crea `.env` y le indica qué datos faltan (token del bot, planilla, carpeta de recetas y `chat_id` del personal). Complételos con `nano .env` y vuelva a ejecutar el comando.

5. **Cargar el catálogo sintético** (solo la primera vez; `--reiniciar` borra los pedidos de prueba):
   ```
   node scripts/local/cargar-catalogo.mjs --reiniciar
   ```

6. **Conectar el Drive de recetas.** El editor de n8n solo escucha dentro de la máquina virtual. Desde su computador abra un túnel SSH y entre por el navegador:
   ```
   ssh -L 5678:localhost:5678 usuario@IP-DE-LA-VM
   ```
   Abra <http://localhost:5678>, cree el usuario local y vaya a **Credentials → «Google Drive (OAuth)» → Sign in with Google**. La conexión dura 7 días mientras la app de Google esté en modo de prueba: si se conecta el 28 de noviembre o después, cubre el examen del 4 de diciembre.

7. **Verificar:**
   ```
   node scripts/local/doctor.mjs
   ```
   No debe aparecer «FALTA». Después escriba «hola» al bot desde un teléfono.

## 3. Mantenerlo funcionando

- Los contenedores se reinician solos (`restart: unless-stopped`), pero el túnel rápido cambia de dirección cada vez que se reinicia. **Después de cualquier reinicio de la máquina, ejecute de nuevo `bash scripts/local/levantar.sh`**: vuelve a registrar el webhook del bot.
- Revise una vez al día con `node scripts/local/doctor.mjs`. Si muestra «último error de entrega», el túnel cambió: ejecute `levantar` otra vez.
- **Un bot, un solo ambiente.** Si otro computador ejecuta `levantar` con el mismo token, el bot pasa a responder desde ese computador. Durante la evaluación, la demo se hace contra este ambiente y nadie más ejecuta `levantar` con el bot oficial.

## 4. Cómo pueden probarlo otras personas

- **Como vecino:** basta con buscar el bot en Telegram y escribirle. El [manual de uso](manual-de-uso.md) tiene los mensajes de ejemplo y sus respuestas.
- **Como químico farmacéutico o personal:** hay que agregar su `chat_id` a `TELEGRAM_PHARMACIST_CHAT_IDS` o `TELEGRAM_STAFF_CHAT_IDS` en el `.env` y ejecutar `levantar` de nuevo. Desde un chat no autorizado, los comandos «aprobar», «en ruta» o «entregado» se tratan como mensajes comunes.

## 5. Al terminar la evaluación

1. Detenga el ambiente (`node scripts/local/levantar.mjs --detener`) y elimine la máquina virtual.
2. Rote las credenciales, porque circularon fuera del repositorio durante el semestre: borre la clave de la cuenta de servicio y cree otra, elimine el cliente OAuth y revoque el token del bot con `/revoke` en @BotFather ([guía de instalación, sección 15](../guia-instalacion-local.md#15-seguridad)).
3. Borre las recetas de prueba de la carpeta de Drive.
