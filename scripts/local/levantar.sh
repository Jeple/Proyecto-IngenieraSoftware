#!/usr/bin/env bash
# Arranque local en macOS, Linux o Git Bash. Uso, desde la carpeta del repositorio:
#   bash scripts/local/levantar.sh [--sin-tunel] [--detener]
# Toda la lógica vive en levantar.mjs (multiplataforma).
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
command -v node >/dev/null 2>&1 || { echo "Falta Node.js 18 o superior: https://nodejs.org (versión LTS)"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Falta Docker Desktop o Docker Engine: https://docs.docker.com/get-docker/"; exit 1; }
cd "$repo"
exec node scripts/local/levantar.mjs "$@"
