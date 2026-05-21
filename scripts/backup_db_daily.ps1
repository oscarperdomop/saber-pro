param(
    [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"

if (-not $ProjectRoot) {
    $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$backupDir = Join-Path $ProjectRoot "backup_db"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = Join-Path $backupDir ("saberpro_backup_" + $timestamp + ".sql")

Push-Location $ProjectRoot
try {
    $dumpCommand = 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    $dump = docker compose --env-file .env.docker exec -T db sh -lc $dumpCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Fallo pg_dump (exit code $LASTEXITCODE)."
    }

    Set-Content -LiteralPath $outputFile -Value $dump -Encoding UTF8

    $logFile = Join-Path $backupDir "last_backup.log"
    $logLine = "[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] Backup creado: " + $outputFile
    Set-Content -LiteralPath $logFile -Value $logLine -Encoding UTF8
}
finally {
    Pop-Location
}
