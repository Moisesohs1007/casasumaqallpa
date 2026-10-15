# ============================================================
# SCRIPT: Modificar AMBAS copias del GPD para 58mm
# EJECUTAR COMO ADMINISTRADOR
# ============================================================

$ErrorActionPreference = "Continue"

$gpdPaths = @(
    "C:\Windows\System32\spool\drivers\x64\POS-80-Series.gpd",
    "C:\Windows\System32\spool\drivers\x64\3\POS-80-Series.gpd"
)

Write-Host "=== Modificando AMBAS copias del GPD para 58mm ===" -ForegroundColor Cyan

foreach ($gpdPath in $gpdPaths) {
    Write-Host ""
    Write-Host "Procesando: $gpdPath" -ForegroundColor Yellow

    if (-not (Test-Path $gpdPath)) {
        Write-Host "  No existe, saltando..." -ForegroundColor Gray
        continue
    }

    # Backup
    $bak = $gpdPath + ".bak"
    if (-not (Test-Path $bak)) {
        Copy-Item $gpdPath $bak -Force
        Write-Host "  Backup creado" -ForegroundColor Green
    }

    # Leer y modificar
    $gpd = Get-Content $gpdPath -Raw -Encoding UTF8

    $gpd = $gpd -replace '\*Name:"Thermal Paper\(80 x 210\)"', '*Name:"Thermal Paper(58 x 210)"'
    $gpd = $gpd -replace '\*Name:"Thermal Paper\(80 x 297\)"', '*Name:"Thermal Paper(58 x 297)"'
    $gpd = $gpd -replace '\*Name:"Thermal Paper\(80 x 3276\)"', '*Name:"Thermal Paper(58 x 3276)"'

    $gpd = $gpd -replace '\*PageDimensions: PAIR\(576, 1678\)', '*PageDimensions: PAIR(384, 1678)'
    $gpd = $gpd -replace '\*PrintableArea: PAIR\(576, 1678\)', '*PrintableArea: PAIR(384, 1678)'
    $gpd = $gpd -replace '\*PageDimensions: PAIR\(576, 2374\)', '*PageDimensions: PAIR(384, 2374)'
    $gpd = $gpd -replace '\*PrintableArea: PAIR\(576, 2374\)', '*PrintableArea: PAIR(384, 2374)'
    $gpd = $gpd -replace '\*PageDimensions: PAIR\(576, 26182\)', '*PageDimensions: PAIR(384, 26182)'
    $gpd = $gpd -replace '\*PrintableArea: PAIR\(576, 26182\)', '*PrintableArea: PAIR(384, 26182)'

    $gpd = $gpd -replace '\*MinSize: PAIR\(576, 480\)', '*MinSize: PAIR(384, 480)'
    $gpd = $gpd -replace '\*MaxSize: PAIR\(576, 31969\)', '*MaxSize: PAIR(384, 31969)'
    $gpd = $gpd -replace '\*MaxPrintableWidth: 576', '*MaxPrintableWidth: 384'

    $gpd = $gpd -replace '\*ModelName: "POS80"', '*ModelName: "POS58"'

    Set-Content -Path $gpdPath -Value $gpd -Encoding UTF8 -NoNewline
    Write-Host "  GPD modificado correctamente" -ForegroundColor Green
}

# Reiniciar el servicio de impresion
Write-Host ""
Write-Host "Reiniciando servicio de impresion..." -ForegroundColor Yellow
Restart-Service Spooler -Force
Start-Sleep -Seconds 3
Write-Host "Servicio reiniciado" -ForegroundColor Green

Write-Host ""
Write-Host "=== LISTO ===" -ForegroundColor Green
Write-Host "Ahora ve a: Configuracion > Impresoras > POS-80-Series > Preferencias de impresion > Avanzado"
Write-Host "Deberias ver 'Thermal Paper(58 x 3276)'"
