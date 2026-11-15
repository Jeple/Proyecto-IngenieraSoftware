#!/usr/bin/env bash
# Diagnóstico del entorno local (no muestra secretos). Uso: bash scripts/local/doctor.sh
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
command -v node >/dev/null 2>&1 || { echo "Falta Node.js 18 o superior: https://nodejs.org"; exit 1; }
cd "$repo"
exec node scripts/local/doctor.mjs
