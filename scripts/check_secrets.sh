#!/usr/bin/env bash
# Falla si el repo contiene secretos evidentes. Uso: ./scripts/check_secrets.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

fail=0
report() { echo "ERROR: $1"; fail=1; }

# Archivos .env versionados (se permite .env.example)
while IFS= read -r f; do
  case "$f" in *.env.example) ;; *.env|*/.env|.env) report "archivo de entorno versionado: $f" ;; esac
done < <(git ls-files --cached --others --exclude-standard)

files=$(git ls-files --cached --others --exclude-standard | grep -v '^scripts/check_secrets.sh$' || true)

scan() { # descripcion regex
  if [ -n "$files" ] && echo "$files" | xargs grep -InE -- "$2" 2>/dev/null; then
    report "$1"
  fi
}

scan "clave privada"                 '-----BEGIN [A-Z ]*PRIVATE KEY-----'
scan "token JWT"                     'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'
scan "clave de AWS"                  'AKIA[0-9A-Z]{16}'
scan "token de Slack/GitHub"         '(xox[baprs]-[A-Za-z0-9-]{10,}|gh[pousr]_[A-Za-z0-9]{30,})'
scan "N8N_ENCRYPTION_KEY con valor"  '^[[:space:]]*N8N_ENCRYPTION_KEY[[:space:]]*=[[:space:]]*[^[:space:]$]'
scan "CLOUDFLARE_TUNNEL_TOKEN con valor" '^[[:space:]]*CLOUDFLARE_TUNNEL_TOKEN[[:space:]]*=[[:space:]]*[^[:space:]$]'
scan "TUNNEL_TOKEN con valor literal" 'TUNNEL_TOKEN:[[:space:]]*[A-Za-z0-9]{20,}'

# Workflows exportados: no deben llevar credenciales ni datos de usuarios.
# n8n exporta REFERENCIAS a credenciales ({"id", "name"}), que no son secretos y
# son necesarias para que el import quede enlazado; cualquier otro campo
# dentro de "credentials" (data, token, privateKey, ...) sí se rechaza.
if [ -d workflows ] && command -v node >/dev/null 2>&1; then
  if ! node -e '
    const fs = require("fs");
    let bad = [];
    for (const f of fs.readdirSync("workflows").filter((x) => x.endsWith(".json"))) {
      const wf = JSON.parse(fs.readFileSync("workflows/" + f, "utf8"));
      for (const n of wf.nodes || []) {
        for (const [tipo, ref] of Object.entries(n.credentials || {})) {
          const extra = Object.keys(ref || {}).filter((k) => k !== "id" && k !== "name");
          if (extra.length) bad.push(f + ":" + n.name + ":" + tipo + " -> " + extra.join(","));
        }
      }
    }
    if (bad.length) { console.log(bad.join("\n")); process.exit(1); }
  '; then
    report "credenciales con datos dentro de un workflow (solo se permiten id y name)"
  fi
elif [ -d workflows ]; then
  scan "credenciales dentro de un workflow" '"credentials"[[:space:]]*:[[:space:]]*\{[[:space:]]*"[^}]'
fi

# RUT chilenos con formato real (los datos seed viven en data/seed y se excluyen).
# Los fixtures de pruebas (scripts/test-*.mjs) usan RUT sinteticos que no son
# datos reales de pacientes; se excluyen del escaneo de RUT.
rut_files=$(echo "$files" | grep -v '^data/seed/' | grep -v '\.md$' | grep -v '^scripts/test-' || true)
if [ -n "$rut_files" ] && echo "$rut_files" | xargs grep -InE '\b[0-9]{7,8}-[0-9Kk]\b' 2>/dev/null; then
  report "posible RUT fuera de data/seed"
fi

if [ "$fail" -eq 0 ]; then echo "OK: sin secretos evidentes"; fi
exit "$fail"
