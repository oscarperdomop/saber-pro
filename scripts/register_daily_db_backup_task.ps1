param(
    [string]$TaskName = "SaberPro_Daily_DB_Backup_2359"
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backupScript = (Resolve-Path (Join-Path $PSScriptRoot "backup_db_daily.ps1")).Path

$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -ProjectRoot `"$projectRoot`""

$createOutput = schtasks /Create /F /SC DAILY /ST 23:59 /TN $TaskName /TR $taskCommand 2>&1
if ($LASTEXITCODE -ne 0) {
    throw ("No fue posible crear la tarea programada. Salida: " + ($createOutput -join " "))
}

Write-Output "Tarea creada/actualizada: $TaskName"
Write-Output "Comando: $taskCommand"
