Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $repoRoot 'frontend'

function Stop-PortProcess {
    [CmdletBinding()]
    param([int]$Port)
    
    $seen = @{}
    foreach ($line in @(netstat -ano)) {
        if ($line -match ":${Port}\s+\S+\s+LISTENING\s+(\d+)") {
            $processId = $Matches[1]
            if (-not $seen.ContainsKey($processId)) {
                $seen[$processId] = $true
                Write-Host "[frontend] Releasing stale port ${Port} (PID $processId)"
                $null = cmd /c "taskkill /F /T /PID $processId 2>nul"
            }
        }
    }
    if ($seen.Count -gt 0) { Start-Sleep -Milliseconds 600 }
}

Stop-PortProcess 3000

# When the console is closed the PowerShell engine fires this event before dying
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-PortProcess 3000 }

Set-Location $frontendRoot

$nextBinaryCandidates = @(
    (Join-Path $frontendRoot 'node_modules\.bin\next'),
    (Join-Path $frontendRoot 'node_modules\.bin\next.cmd'),
    (Join-Path $frontendRoot 'node_modules\.bin\next.exe'),
    (Join-Path $frontendRoot 'node_modules\.bin\next.bunx')
)

$hasNextBinary = $false
foreach ($candidate in $nextBinaryCandidates) {
    if (Test-Path $candidate) {
        $hasNextBinary = $true
        break
    }
}

if (-not $hasNextBinary) {
    Write-Host "[frontend] Next.js binary not found; installing frontend dependencies"
    & bun install
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install frontend dependencies"
    }
}

# Prevent static-export env flags from leaking into local Next.js dev.
if (Test-Path Env:PLATFORM_TARGET) { Remove-Item Env:PLATFORM_TARGET }
if (Test-Path Env:NEXT_PUBLIC_STATIC_LOCALE) { Remove-Item Env:NEXT_PUBLIC_STATIC_LOCALE }

try {
    bun run dev
} finally {
    Stop-PortProcess 3000
}
