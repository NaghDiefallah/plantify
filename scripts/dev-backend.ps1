$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$pythonExe = Join-Path $repoRoot 'venv\Scripts\python.exe'

if (-not (Test-Path $pythonExe)) {
    throw "Python virtual environment not found at $pythonExe"
}

Set-Location (Join-Path $repoRoot 'backend')
& $pythonExe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
