$ErrorActionPreference = 'Stop'

$repoRoot  = Split-Path -Parent $PSScriptRoot
$pythonExe = Join-Path $repoRoot 'venv\Scripts\python.exe'
$venvRoot = Join-Path $repoRoot 'venv'
$backendRoot = Join-Path $repoRoot 'backend'
$requirementsFile = Join-Path $backendRoot 'requirements.txt'
$requirementsStamp = Join-Path $repoRoot 'venv\.backend-requirements.sha256'

if (-not (Test-Path $pythonExe)) {
    Write-Host "[backend] Python virtual environment not found; creating at $venvRoot"

    $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue

    if ($pyLauncher) {
        & $pyLauncher.Source -3 -m venv $venvRoot
    } elseif ($pythonCmd) {
        & $pythonCmd.Source -m venv $venvRoot
    } else {
        throw "No Python executable found. Install Python 3 and retry."
    }

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $pythonExe)) {
        throw "Failed to create Python virtual environment at $venvRoot"
    }
}

if (-not (Test-Path $requirementsFile)) {
    throw "Backend requirements file not found at $requirementsFile"
}

function Test-PythonModule {
    param([string]$ModuleName)

    & $pythonExe -c "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('$ModuleName') else 1)" | Out-Null
    return $LASTEXITCODE -eq 0
}

function Get-FileSha256 {
    param([string]$Path)

    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        try {
            return (($sha256.ComputeHash($stream) | ForEach-Object { $_.ToString('x2') }) -join '')
        } finally {
            $stream.Dispose()
        }
    } finally {
        $sha256.Dispose()
    }
}

function Sync-BackendDependencies {
    $requirementsHash = (Get-FileSha256 -Path $requirementsFile).Trim().ToLowerInvariant()
    $installedHash = if (Test-Path $requirementsStamp) {
        (Get-Content -Path $requirementsStamp -Raw).Trim().ToLowerInvariant()
    } else {
        ''
    }

    $requiredModules = @('fastapi', 'sqlalchemy', 'langdetect')
    $missingModule = $requiredModules | Where-Object { -not (Test-PythonModule $_) } | Select-Object -First 1
    $needsInstall = ($installedHash -ne $requirementsHash) -or [bool]$missingModule

    if (-not $needsInstall) {
        return
    }

    if ($missingModule) {
        Write-Host "[backend] Missing Python module '$missingModule'; syncing backend dependencies"
    } else {
        Write-Host "[backend] backend/requirements.txt changed; syncing backend dependencies"
    }

    & $pythonExe -m pip install -r $requirementsFile
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install backend dependencies from $requirementsFile"
    }

    Set-Content -Path $requirementsStamp -Value $requirementsHash -NoNewline
}

Sync-BackendDependencies

function Stop-PortProcess {
    param([int]$Port)
    $seen = @{}
    foreach ($line in @(netstat -ano)) {
        if ($line -match ":${Port}\s+\S+\s+LISTENING\s+(\d+)") {
            $processId = $Matches[1]
            if (-not $seen.ContainsKey($processId)) {
                $seen[$processId] = $true
                Write-Host "[backend] Releasing stale port ${Port} (PID $processId)"
                $null = cmd /c "taskkill /F /T /PID $processId 2>nul"
            }
        }
    }
    if ($seen.Count -gt 0) { Start-Sleep -Milliseconds 600 }
}

Stop-PortProcess 8000

# When the console is closed the PowerShell engine fires this event before dying
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-PortProcess 8000 }

Set-Location $backendRoot

# Run migrations before starting the dev server
Write-Host "[backend] Running database migrations..."
& $pythonExe -m alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    throw "Failed to run database migrations"
}

# Seed metadata if empty
Write-Host "[backend] Seeding database metadata..."
& $pythonExe scripts/seed_db.py
if ($LASTEXITCODE -ne 0) {
    throw "Failed to seed database"
}

try {
    & $pythonExe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
} finally {
    Stop-PortProcess 8000
}
