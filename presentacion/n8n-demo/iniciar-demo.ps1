# iniciar-demo.ps1 — abre los flujos del proyecto en la app real de n8n.
# Camino 1 (recomendado): Docker Desktop abierto y corriendo.
# Camino 2: Node.js instalado (usa npx; la primera vez descarga n8n).
# No necesita credenciales ni planilla: los flujos se importan inactivos.

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Resolve-Path (Join-Path $here "..\..")
$workflows = Join-Path $repo "workflows"
$data = Join-Path $here "n8n-data"
$n8nHome = Join-Path $data ".n8n"
New-Item -ItemType Directory -Force -Path $n8nHome | Out-Null
$db = Join-Path $n8nHome "database.sqlite"
$web = "http://localhost:5678"

function Arrancar-ConDocker {
    $dataFwd = $n8nHome -replace '\\', '/'
    $wfFwd = $workflows -replace '\\', '/'
    $volumen = "${dataFwd}:/home/node/.n8n"
    if (-not (Test-Path $db)) {
        Write-Host "[1/2] Importando los flujos (solo la primera vez)..." -ForegroundColor Cyan
        docker run --rm -v $volumen -v "${wfFwd}:/workflows:ro" -e N8N_ENCRYPTION_KEY=demo-local n8nio/n8n import:workflow --separate --input=/workflows
    } else {
        Write-Host "Los flujos ya estaban importados." -ForegroundColor Green
    }
    Write-Host "[2/2] Iniciando n8n en $web ... (deja esta ventana abierta; Ctrl+C para salir)" -ForegroundColor Cyan
    Start-Process $web
    docker run --rm -it -p 5678:5678 -v $volumen -e N8N_ENCRYPTION_KEY=demo-local n8nio/n8n start
}

function Arrancar-ConNpx {
    $env:N8N_USER_FOLDER = $data
    $env:N8N_ENCRYPTION_KEY = "demo-local"
    if (-not (Test-Path $db)) {
        Write-Host "[1/2] Importando los flujos (la primera vez descarga n8n y puede tardar)..." -ForegroundColor Cyan
        npx --yes n8n@latest import:workflow --separate --input="$workflows"
    } else {
        Write-Host "Los flujos ya estaban importados." -ForegroundColor Green
    }
    Write-Host "[2/2] Iniciando n8n en $web ... (deja esta ventana abierta; Ctrl+C para salir)" -ForegroundColor Cyan
    Start-Process $web
    npx --yes n8n@latest start
}

$dockerOk = $false
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
}

if ($dockerOk) {
    Arrancar-ConDocker
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Host "Docker esta instalado pero no esta corriendo; uso Node (npx) como respaldo." -ForegroundColor Yellow
    }
    Arrancar-ConNpx
} else {
    Write-Host "No encontre Docker ni Node. Revisa LEEME.md para las opciones." -ForegroundColor Yellow
    exit 1
}
