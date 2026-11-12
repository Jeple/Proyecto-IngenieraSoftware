#!/usr/bin/env bash
# iniciar-demo.sh — abre los flujos del proyecto en la app real de n8n.
# Camino 1 (recomendado): Docker corriendo. Camino 2: Node.js (usa npx).
# No necesita credenciales ni planilla: los flujos se importan inactivos.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
WORKFLOWS="$REPO/workflows"
DATA="$HERE/n8n-data"
N8N_HOME="$DATA/.n8n"
mkdir -p "$N8N_HOME"
DB="$N8N_HOME/database.sqlite"
WEB="http://localhost:5678"

abrir_navegador() {
  if command -v open >/dev/null 2>&1; then open "$WEB"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$WEB"
  else echo "Abrí $WEB en el navegador."; fi
}

if docker info >/dev/null 2>&1; then
  if [ ! -f "$DB" ]; then
    echo "[1/2] Importando los flujos (solo la primera vez)..."
    docker run --rm -v "$N8N_HOME:/home/node/.n8n" -v "$WORKFLOWS:/workflows:ro" \
      -e N8N_ENCRYPTION_KEY=demo-local n8nio/n8n import:workflow --separate --input=/workflows
  else
    echo "Los flujos ya estaban importados."
  fi
  echo "[2/2] Iniciando n8n en $WEB ... (Ctrl+C para salir)"
  abrir_navegador
  exec docker run --rm -it -p 5678:5678 -v "$N8N_HOME:/home/node/.n8n" \
    -e N8N_ENCRYPTION_KEY=demo-local n8nio/n8n start
elif command -v npx >/dev/null 2>&1; then
  export N8N_USER_FOLDER="$DATA"
  export N8N_ENCRYPTION_KEY="demo-local"
  if [ ! -f "$DB" ]; then
    echo "[1/2] Importando los flujos (la primera vez descarga n8n y puede tardar)..."
    npx --yes n8n@latest import:workflow --separate --input="$WORKFLOWS"
  else
    echo "Los flujos ya estaban importados."
  fi
  echo "[2/2] Iniciando n8n en $WEB ... (Ctrl+C para salir)"
  abrir_navegador
  exec npx --yes n8n@latest start
else
  echo "No encontré Docker ni Node. Revisá LEEME.md para las opciones."
  exit 1
fi
