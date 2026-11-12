# Arranque local en Windows (PowerShell). Uso, desde la carpeta del repositorio:
#   powershell -ExecutionPolicy Bypass -File scripts\local\levantar.ps1
# Opciones: -SinTunel, -Detener. Toda la lógica vive en levantar.mjs (multiplataforma).
param([switch]$SinTunel, [switch]$Detener)
$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '..\..')

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Falta Node.js 18 o superior: instálelo desde https://nodejs.org (versión LTS) y vuelva a abrir PowerShell.' -ForegroundColor Red
  exit 1
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host 'Falta Docker Desktop: instálelo desde https://www.docker.com/products/docker-desktop y ábralo.' -ForegroundColor Red
  exit 1
}

$argumentos = @()
if ($SinTunel) { $argumentos += '--sin-tunel' }
if ($Detener) { $argumentos += '--detener' }
Push-Location $repo
try {
  node (Join-Path $repo 'scripts\local\levantar.mjs') @argumentos
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
