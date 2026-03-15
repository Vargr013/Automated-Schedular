param(
    [string]$ContainerName = "scheduler-local-db",
    [string]$Image = "postgres:17",
    [string]$LocalDbName = "scheduler_dev",
    [string]$LocalDbUser = "postgres",
    [string]$LocalDbPassword = "postgres",
    [int]$LocalDbPort = 54329,
    [string]$SourceUrl = $env:POSTGRES_URL_NON_POOLING,
    [switch]$WriteLocalEnv
)

$ErrorActionPreference = "Stop"

function Require-Docker {
    try {
        docker version | Out-Null
    }
    catch {
        throw "Docker is not available. Start Docker Desktop and try again."
    }
}

function Wait-ForPostgres {
    param(
        [string]$Container,
        [string]$User,
        [string]$Database
    )

    for ($i = 0; $i -lt 30; $i++) {
        try {
            docker exec $Container pg_isready -U $User -d $Database | Out-Null
            return
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }

    throw "Local Postgres did not become ready in time."
}

function Upsert-EnvValue {
    param(
        [string[]]$Lines,
        [string]$Key,
        [string]$Value
    )

    $escaped = [Regex]::Escape($Key)
    $replacement = "$Key=`"$Value`""

    for ($i = 0; $i -lt $Lines.Length; $i++) {
        if ($Lines[$i] -match "^${escaped}=") {
            $Lines[$i] = $replacement
            return ,$Lines
        }
    }

    return $Lines + $replacement
}

function Update-EnvFile {
    param(
        [string]$EnvFile,
        [string]$BackupSuffix,
        [string]$LocalDbName,
        [string]$LocalDbUser,
        [string]$LocalDbPassword,
        [string]$LocalPrismaUrl,
        [string]$LocalPooledUrl
    )

    if (-not (Test-Path $EnvFile)) {
        return
    }

    $backupFile = "${EnvFile}${BackupSuffix}"
    if (-not (Test-Path $backupFile)) {
        Copy-Item $EnvFile $backupFile
    }

    $lines = Get-Content $EnvFile
    $lines = Upsert-EnvValue -Lines $lines -Key "POSTGRES_DATABASE" -Value $LocalDbName
    $lines = Upsert-EnvValue -Lines $lines -Key "POSTGRES_HOST" -Value "localhost"
    $lines = Upsert-EnvValue -Lines $lines -Key "POSTGRES_PASSWORD" -Value $LocalDbPassword
    $lines = Upsert-EnvValue -Lines $lines -Key "POSTGRES_PRISMA_URL" -Value $LocalPooledUrl
    $lines = Upsert-EnvValue -Lines $lines -Key "POSTGRES_URL" -Value $LocalPooledUrl
    $lines = Upsert-EnvValue -Lines $lines -Key "POSTGRES_URL_NON_POOLING" -Value $LocalPrismaUrl
    $lines = Upsert-EnvValue -Lines $lines -Key "POSTGRES_USER" -Value $LocalDbUser

    Set-Content -Path $EnvFile -Value $lines
    Write-Host "Updated: ${EnvFile}"
    Write-Host "Backup: ${backupFile}"
}

if (-not $SourceUrl) {
    throw "POSTGRES_URL_NON_POOLING is not set. Load your remote DB env vars first or pass -SourceUrl explicitly."
}

Require-Docker

$existingContainer = docker ps -a --filter "name=^/${ContainerName}$" --format "{{.Names}}"

if (-not $existingContainer) {
    Write-Host "Creating local Postgres container ${ContainerName} on port ${LocalDbPort}..."
    docker run `
        --detach `
        --name $ContainerName `
        --env "POSTGRES_DB=${LocalDbName}" `
        --env "POSTGRES_USER=${LocalDbUser}" `
        --env "POSTGRES_PASSWORD=${LocalDbPassword}" `
        --publish "${LocalDbPort}:5432" `
        $Image | Out-Null
}
else {
    Write-Host "Starting existing local Postgres container ${ContainerName}..."
    docker start $ContainerName | Out-Null
}

Write-Host "Waiting for local Postgres to accept connections..."
Wait-ForPostgres -Container $ContainerName -User $LocalDbUser -Database $LocalDbName

$dumpFile = Join-Path $env:TEMP "scheduler-dev.dump"

if (Test-Path $dumpFile) {
    Remove-Item $dumpFile -Force
}

Write-Host "Pulling a fresh dump from the remote database..."
docker run `
    --rm `
    --volume "${env:TEMP}:/backup" `
    $Image `
    pg_dump `
    --dbname "$SourceUrl" `
    --format custom `
    --no-owner `
    --no-privileges `
    --file /backup/scheduler-dev.dump

Write-Host "Resetting the local database..."
docker exec $ContainerName psql -U $LocalDbUser -d postgres -c "DROP DATABASE IF EXISTS ${LocalDbName} WITH (FORCE);" | Out-Null
docker exec $ContainerName psql -U $LocalDbUser -d postgres -c "CREATE DATABASE ${LocalDbName};" | Out-Null

Write-Host "Copying the dump into the local container..."
docker cp $dumpFile "${ContainerName}:/tmp/scheduler-dev.dump"

Write-Host "Restoring the local database clone..."
docker exec $ContainerName pg_restore `
    --clean `
    --if-exists `
    --no-owner `
    --no-privileges `
    -U $LocalDbUser `
    -d $LocalDbName `
    /tmp/scheduler-dev.dump | Out-Null

docker exec $ContainerName rm -f /tmp/scheduler-dev.dump | Out-Null

$localPrismaUrl = "postgres://${LocalDbUser}:${LocalDbPassword}@localhost:${LocalDbPort}/${LocalDbName}"
$localPooledUrl = "${localPrismaUrl}?pgbouncer=true&connection_limit=1"

if ($WriteLocalEnv) {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    $envLocalFile = Join-Path $repoRoot ".env.local"
    $envFile = Join-Path $repoRoot ".env"

    if (-not (Test-Path $envLocalFile)) {
        throw ".env.local was not found, so I could not update it."
    }

    Update-EnvFile -EnvFile $envLocalFile -BackupSuffix ".remote-backup" -LocalDbName $LocalDbName -LocalDbUser $LocalDbUser -LocalDbPassword $LocalDbPassword -LocalPrismaUrl $localPrismaUrl -LocalPooledUrl $localPooledUrl
    Update-EnvFile -EnvFile $envFile -BackupSuffix ".remote-backup" -LocalDbName $LocalDbName -LocalDbUser $LocalDbUser -LocalDbPassword $LocalDbPassword -LocalPrismaUrl $localPrismaUrl -LocalPooledUrl $localPooledUrl
}

Write-Host ""
Write-Host "Local clone is ready."
Write-Host "Database: ${LocalDbName}"
Write-Host "Container: ${ContainerName}"
Write-Host "Port: ${LocalDbPort}"
Write-Host "Prisma URL: ${localPrismaUrl}"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. If you did not use -WriteLocalEnv, update .env.local to point at localhost."
Write-Host "2. Run: npx prisma generate"
Write-Host "3. Run: npm run dev"
