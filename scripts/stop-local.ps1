$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$PidPath = Join-Path $Root ".dia8dragon-server.pid"
$UrlPath = Join-Path $Root ".dia8dragon-url.txt"

if (!(Test-Path $PidPath)) {
  Write-Host "No saved Dia8Dragon server process was found."
  exit 0
}

$SavedPid = [int]((Get-Content -LiteralPath $PidPath -Raw).Trim())

try {
  Stop-Process -Id $SavedPid -ErrorAction Stop
  Write-Host "Stopped Dia8Dragon server process $SavedPid."
} catch {
  Write-Host "Dia8Dragon server process $SavedPid was not running."
}

Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $UrlPath -Force -ErrorAction SilentlyContinue
