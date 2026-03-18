$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot 'frontend')

bun run dev
