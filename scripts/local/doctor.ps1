# Diagnóstico del entorno local (no muestra secretos). Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\local\doctor.ps1
$repo = Resolve-Path (Join-Path $PSScriptRoot '..\..')
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Falta Node.js 18 o superior: https://nodejs.org' -ForegroundColor Red
  exit 1
}
Push-Location $repo
try { node (Join-Path $repo 'scripts\local\doctor.mjs'); exit $LASTEXITCODE } finally { Pop-Location }
