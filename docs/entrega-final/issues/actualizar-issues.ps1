# Crea las etiquetas y los issues pendientes de la v0.1, y cierra los issues de historias ya terminadas.
#
# Requisitos: GitHub CLI (https://cli.github.com/) con sesion iniciada (gh auth login)
# y permiso de escritura en el repositorio.
#
# Uso, desde la raiz del repositorio:
#   powershell -ExecutionPolicy Bypass -File docs/entrega-final/issues/actualizar-issues.ps1
#
# Es seguro ejecutarlo una sola vez: si ya existen issues con la etiqueta v0.1-pendiente, se detiene.

$ErrorActionPreference = 'Stop'
$repo = 'Jeple/Proyecto-IngenieraSoftware'
$dir = $PSScriptRoot

Write-Host '1/3 Etiquetas'
gh label create 'v0.1-pendiente' --repo $repo --color FBCA04 --description 'Pendiente conocido al cerrar la v0.1' --force
gh label create 'owasp' --repo $repo --color D93F0B --description 'Prueba de seguridad guiada por la Guía de Pruebas de OWASP v4' --force

$existentes = @(gh issue list --repo $repo --label 'v0.1-pendiente' --state all --limit 100 --json number | ConvertFrom-Json)
if ($existentes.Count -gt 0) {
  Write-Host "Ya hay $($existentes.Count) issues con la etiqueta v0.1-pendiente. No se crean de nuevo."
  exit 1
}

Write-Host '2/3 Issues nuevos'
$issues = @(
  @{ f = '01-escrituras-lentas.md';        t = 'Reservar, aprobar o despachar tarda de 5 a 20 segundos';            l = 'v0.1-pendiente' },
  @{ f = '02-reserva-a-medias.md';         t = 'Una reserva puede quedar a medias si Google rechaza una escritura'; l = 'v0.1-pendiente' },
  @{ f = '03-arranque-automatico.md';      t = 'El bot debe volver a funcionar solo después de reiniciar el servidor'; l = 'v0.1-pendiente' },
  @{ f = '04-oauth-drive-7-dias.md';       t = 'La conexión con la carpeta de recetas vence cada 7 días';           l = 'v0.1-pendiente' },
  @{ f = '05-rotar-credenciales.md';       t = 'Rotar las credenciales que circularon por el chat del equipo (RS-05)'; l = 'v0.1-pendiente' },
  @{ f = '06-medir-q12.md';                t = 'Medir cuántas consultas resuelve el bot sin ayuda humana (Q12)';    l = 'v0.1-pendiente' },
  @{ f = '07-owasp-validacion-entradas.md'; t = 'OWASP · Validación de entradas en los campos libres';              l = 'v0.1-pendiente,owasp' },
  @{ f = '08-owasp-autorizacion.md';       t = 'OWASP · Autorización de comandos del personal y pedidos ajenos';    l = 'v0.1-pendiente,owasp' },
  @{ f = '09-owasp-logica-negocio.md';     t = 'OWASP · Lógica de negocio: reservas repetidas y 50 simultáneas';    l = 'v0.1-pendiente,owasp' },
  @{ f = '10-owasp-configuracion.md';      t = 'OWASP · Configuración del despliegue: túnel con nombre y editor protegido'; l = 'v0.1-pendiente,owasp' },
  @{ f = '11-owasp-manejo-errores.md';     t = 'OWASP · Manejo de errores sin datos internos';                      l = 'v0.1-pendiente,owasp' },
  @{ f = '12-owasp-zap.md';                t = 'OWASP · Análisis dinámico del webhook con OWASP ZAP';               l = 'v0.1-pendiente,owasp' }
)
foreach ($i in $issues) {
  gh issue create --repo $repo --title $i.t --label $i.l --body-file (Join-Path $dir $i.f)
}

Write-Host '3/3 Cierre de historias terminadas'
$hecho = 'Historia terminada e integrada en main, con 422 pruebas automáticas en verde (27-nov) y los casos de aceptación con las cuentas reales (9-nov). Se cierra con la v0.1.'
$cerrar = @(
  @{ n = 7;  c = "US-05 · $hecho" },
  @{ n = 8;  c = "US-06 · $hecho" },
  @{ n = 11; c = "US-09 · Recetas por Telegram terminadas. $hecho El canal por correo quedó fuera del alcance firmado (US-19)." },
  @{ n = 12; c = "US-10 · $hecho" },
  @{ n = 14; c = 'US-12 · El video y el informe del Sprint 2 se entregaron en la Entrega 2 (15-nov).' },
  @{ n = 20; c = "US-21 · $hecho" },
  @{ n = 28; c = "US-17 · $hecho" },
  @{ n = 29; c = "US-22 · $hecho" }
)
foreach ($i in $cerrar) {
  gh issue close $i.n --repo $repo --reason completed --comment $i.c
}

Write-Host 'Listo. Revise: https://github.com/Jeple/Proyecto-IngenieraSoftware/issues?q=label%3Av0.1-pendiente'
