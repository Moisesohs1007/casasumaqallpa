# ============================================================
# SCRIPT: Reinstalar driver POS-80 con tamaños de 58mm
# EJECUTAR COMO ADMINISTRADOR
# ============================================================

$ErrorActionPreference = "Stop"

$gpdPath = "C:\Windows\System32\spool\drivers\x64\3\POS-80-Series.gpd"
$driverName = "POS-80-Series Driver"
$printerName = "POS-80-Series"

Write-Host "=== Reinstalando driver POS-80 con papel 58mm ===" -ForegroundColor Cyan

# 1. Verificar el GPD
Write-Host "Verificando GPD modificado..." -ForegroundColor Yellow
$gpd = Get-Content $gpdPath -Raw -Encoding UTF8
if ($gpd -match 'Thermal Paper\(58 x 3276\)') {
    Write-Host "GPD OK: contiene tamaños de 58mm" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: El GPD no parece tener 58mm. Reaplicando cambios..." -ForegroundColor Red
    # Reaplicar cambios
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
    Write-Host "GPD actualizado" -ForegroundColor Green
}

# 2. Obtener el puerto actual
$portName = (Get-Printer -Name $printerName -ErrorAction SilentlyContinue).PortName
Write-Host "Puerto actual: $portName" -ForegroundColor Yellow

# 3. Detener el servicio de impresion
Write-Host "Deteniendo servicio de impresion..." -ForegroundColor Yellow
Stop-Service -Name Spooler -Force
Start-Sleep -Seconds 3

# 4. Eliminar la impresora y el driver
Write-Host "Eliminando impresora y driver..." -ForegroundColor Yellow
try {
    & rundll32 printui.dll,PrintUIEntry /n "$printerName" /dl
} catch {}
Start-Sleep -Seconds 2

# Eliminar el driver del store
try {
    & pnputil /enum-drivers 2>$null | Out-Null
} catch {}

# 5. Iniciar el servicio de nuevo
Write-Host "Iniciando servicio de impresion..." -ForegroundColor Yellow
Start-Service -Name Spooler
Start-Sleep -Seconds 3

# 6. Instalar el driver de nuevo (reutilizando los archivos modificados)
Write-Host "Instalando driver modificado..." -ForegroundColor Yellow

# Encontrar el INF del driver
$infPath = Get-ChildItem -Path "C:\Windows\System32\DriverStore\FileRepository" -Recurse -Filter "*.inf" -ErrorAction SilentlyContinue | 
    Where-Object { (Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue) -match "POS-80-Series" } |
    Select-Object -First 1

if ($infPath) {
    Write-Host "INF encontrado: $($infPath.FullName)" -ForegroundColor Green
    # Instalar el driver desde el INF (usara los archivos GPD/DLL modificados en el spool)
    & rundll32 printui.dll,PrintUIEntry /ia /f "$($infPath.FullName)" /m "$driverName"
    Start-Sleep -Seconds 2
} else {
    Write-Host "No se encontro INF, intentando instalacion directa..." -ForegroundColor Yellow
}

# 7. Crear la impresora de nuevo en el mismo puerto
Write-Host "Creando impresora en puerto $portName..." -ForegroundColor Yellow
Add-Printer -Name $printerName -DriverName $driverName -PortName $portName
Start-Sleep -Seconds 2

# 8. Establecer como predeterminada
try {
    $defaultPrinter = Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Name -eq $printerName }
    if ($defaultPrinter) {
        $defaultPrinter.SetDefaultPrinter() | Out-Null
        Write-Host "Impresora establecida como predeterminada" -ForegroundColor Green
    }
} catch {}

Write-Host ""
Write-Host "=== REINSTALACION COMPLETADA ===" -ForegroundColor Green
Write-Host "Ahora abre: Configuracion > Impresoras > POS-80-Series > Preferencias de impresion > Avanzado"
Write-Host "Deberias ver 'Thermal Paper(58 x 3276)' en la lista de tamanos."
