$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Dist = Join-Path $Root "dist"
$PidPath = Join-Path $Root ".dia8dragon-server.pid"
$UrlPath = Join-Path $Root ".dia8dragon-url.txt"
$PreferredPort = if ($env:DIA8DRAGON_PORT) { [int]$env:DIA8DRAGON_PORT } else { 3000 }

if (!(Test-Path (Join-Path $Dist "index.html"))) {
  Write-Host "Missing dist\index.html. This package is incomplete."
  exit 1
}

$MimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg" = "image/svg+xml"
  ".webp" = "image/webp"
  ".ico" = "image/x-icon"
  ".txt" = "text/plain; charset=utf-8"
}

function Get-SafeFilePath {
  param([string]$RequestTarget)

  $PathOnly = $RequestTarget.Split("?")[0]
  if ([string]::IsNullOrWhiteSpace($PathOnly) -or $PathOnly -eq "/") {
    return (Join-Path $Dist "index.html")
  }

  $Decoded = [Uri]::UnescapeDataString($PathOnly).TrimStart("/")
  $Candidate = [IO.Path]::GetFullPath((Join-Path $Dist $Decoded))
  $DistFull = [IO.Path]::GetFullPath($Dist)

  if (!$Candidate.StartsWith($DistFull, [StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }

  if (Test-Path $Candidate -PathType Leaf) {
    return $Candidate
  }

  if ((Test-Path $Candidate -PathType Container) -and (Test-Path (Join-Path $Candidate "index.html"))) {
    return (Join-Path $Candidate "index.html")
  }

  return (Join-Path $Dist "index.html")
}

function Write-HttpResponse {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body
  )

  $Header = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $HeaderBytes = [Text.Encoding]::ASCII.GetBytes($Header)
  $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
  if ($Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

$Listener = $null
$Port = $PreferredPort
$Started = $false

while (!$Started -and $Port -lt ($PreferredPort + 20)) {
  try {
    $Listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Parse("127.0.0.1"), $Port)
    $Listener.Start()
    $Started = $true
  } catch {
    if ($Listener) {
      try { $Listener.Stop() } catch {}
    }
    $Port += 1
  }
}

if (!$Started) {
  Write-Host "Could not start Dia8Dragon on ports $PreferredPort-$($PreferredPort + 19)."
  Write-Host "Try closing old Dia8Dragon windows, then run START_APP.bat again."
  exit 1
}

$Url = "http://127.0.0.1:$Port/"
Set-Content -LiteralPath $PidPath -Value $PID -Encoding UTF8
Set-Content -LiteralPath $UrlPath -Value $Url -Encoding UTF8

Write-Host "Dia8Dragon is running at $Url"
Write-Host "To stop: close this window or double-click STOP_APP.bat."

if ($env:DIA8DRAGON_NO_OPEN -ne "1") {
  Start-Process $Url
}

try {
  while ($true) {
    $Client = $Listener.AcceptTcpClient()
    try {
      $Stream = $Client.GetStream()
      $Reader = [IO.StreamReader]::new($Stream, [Text.Encoding]::ASCII, $false, 4096, $true)
      $RequestLine = $Reader.ReadLine()

      if ([string]::IsNullOrWhiteSpace($RequestLine)) {
        $Body = [Text.Encoding]::UTF8.GetBytes("Bad request")
        Write-HttpResponse $Stream 400 "Bad Request" "text/plain; charset=utf-8" $Body
        continue
      }

      do {
        $Line = $Reader.ReadLine()
      } while ($null -ne $Line -and $Line.Length -gt 0)

      $Parts = $RequestLine.Split(" ")
      $Target = if ($Parts.Length -ge 2) { $Parts[1] } else { "/" }

      if ($Target.Split("?")[0] -eq "/__health") {
        $Body = [Text.Encoding]::UTF8.GetBytes("{""ok"":true}")
        Write-HttpResponse $Stream 200 "OK" "application/json; charset=utf-8" $Body
        continue
      }

      $FilePath = Get-SafeFilePath $Target
      if (!$FilePath -or !(Test-Path $FilePath -PathType Leaf)) {
        $Body = [Text.Encoding]::UTF8.GetBytes("Not found")
        Write-HttpResponse $Stream 404 "Not Found" "text/plain; charset=utf-8" $Body
        continue
      }

      $Extension = [IO.Path]::GetExtension($FilePath).ToLowerInvariant()
      $ContentType = if ($MimeTypes.ContainsKey($Extension)) { $MimeTypes[$Extension] } else { "application/octet-stream" }
      $Body = [IO.File]::ReadAllBytes($FilePath)
      Write-HttpResponse $Stream 200 "OK" $ContentType $Body
    } catch {
      try {
        $Body = [Text.Encoding]::UTF8.GetBytes("Server error")
        Write-HttpResponse $Stream 500 "Internal Server Error" "text/plain; charset=utf-8" $Body
      } catch {}
    } finally {
      $Client.Close()
    }
  }
} finally {
  if ($Listener) {
    $Listener.Stop()
  }
}
