# ============================================================
# SCRIPT: Configurar driver POS-80-Series para papel de 58mm
# EJECUTAR COMO ADMINISTRADOR
# ============================================================

$ErrorActionPreference = "Stop"

$gpdPath = "C:\Windows\System32\spool\drivers\x64\3\POS-80-Series.gpd"
$backupPath = "C:\Windows\System32\spool\drivers\x64\3\POS-80-Series.gpd.bak"

Write-Host "=== Configurando driver POS-80 para papel de 58mm ===" -ForegroundColor Cyan

# 1. Verificar que el archivo existe
if (-not (Test-Path $gpdPath)) {
    Write-Host "ERROR: No se encuentra el archivo GPD en $gpdPath" -ForegroundColor Red
    exit 1
}

# 2. Hacer copia de seguridad
if (-not (Test-Path $backupPath)) {
    Copy-Item $gpdPath $backupPath -Force
    Write-Host "Copia de seguridad creada: $backupPath" -ForegroundColor Green
}

# 3. Leer el GPD
$gpd = Get-Content $gpdPath -Raw -Encoding UTF8

# 4. Reemplazar los tamaños de papel de 80mm por 58mm
#    80mm usa PAIR(576, ...) -> 58mm usa PAIR(384, ...)
#    384 master units @ 203 DPI = 48mm imprimibles (estándar para papel 58mm)

$gpd = $gpd -replace '\*Name:"Thermal Paper\(80 x 210\)"', '*Name:"Thermal Paper(58 x 210)"'
$gpd = $gpd -replace '\*Name:"Thermal Paper\(80 x 297\)"', '*Name:"Thermal Paper(58 x 297)"'
$gpd = $gpd -replace '\*Name:"Thermal Paper\(80 x 3276\)"', '*Name:"Thermal Paper(58 x 3276)"'

$gpd = $gpd -replace '\*PageDimensions: PAIR\(576, 1678\)', '*PageDimensions: PAIR(384, 1678)'
$gpd = $gpd -replace '\*PrintableArea: PAIR\(576, 1678\)', '*PrintableArea: PAIR(384, 1678)'

$gpd = $gpd -replace '\*PageDimensions: PAIR\(576, 2374\)', '*PageDimensions: PAIR(384, 2374)'
$gpd = $gpd -replace '\*PrintableArea: PAIR\(576, 2374\)', '*PrintableArea: PAIR(384, 2374)'

$gpd = $gpd -replace '\*PageDimensions: PAIR\(576, 26182\)', '*PageDimensions: PAIR(384, 26182)'
$gpd = $gpd -replace '\*PrintableArea: PAIR\(576, 26182\)', '*PrintableArea: PAIR(384, 26182)'

# 5. Actualizar el tamaño personalizado para permitir 58mm
$gpd = $gpd -replace '\*MinSize: PAIR\(576, 480\)', '*MinSize: PAIR(384, 480)'
$gpd = $gpd -replace '\*MaxSize: PAIR\(576, 31969\)', '*MaxSize: PAIR(384, 31969)'
$gpd = $gpd -replace '\*MaxPrintableWidth: 576', '*MaxPrintableWidth: 384'

# 6. Cambiar el modelo a POS58
$gpd = $gpd -replace '\*ModelName: "POS80"', '*ModelName: "POS58"'

# 7. Guardar el GPD modificado
Set-Content -Path $gpdPath -Value $gpd -Encoding UTF8 -NoNewline
Write-Host "GPD modificado correctamente" -ForegroundColor Green

# 8. Reiniciar el servicio de cola de impresion
Write-Host "Reiniciando servicio de impresion..." -ForegroundColor Yellow
Stop-Service -Name Spooler -Force
Start-Sleep -Seconds 2
Start-Service -Name Spooler
Write-Host "Servicio de impresion reiniciado" -ForegroundColor Green

Write-Host ""
Write-Host "=== CONFIGURACION COMPLETADA ===" -ForegroundColor Green
Write-Host "Ahora ve a: Configuracion > Impresoras > POS-80-Series > Preferencias de impresion > Avanzado"
Write-Host "Y selecciona 'Thermal Paper(58 x 3276)' como tamano de papel."
Write-Host ""
Write-Host "Si algo sale mal, restaura la copia de seguridad:"
Write-Host "  Copy-Item '$backupPath' '$gpdPath' -Force"
Write-Host "  Restart-Service Spooler"
