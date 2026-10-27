# Serves the game from the "game" folder at http://localhost:8765/ and opens it in the
# default browser. Browsers won't run the game straight from the files on disk, so this
# little local web server is needed. Close this window to stop it.

param([switch]$NoOpen, [int]$Port = 8765)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'game'))
$url = "http://localhost:$Port/"

$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.ico' = 'image/x-icon'
  '.woff' = 'font/woff'; '.woff2' = 'font/woff2'; '.ttf' = 'font/ttf'
  '.wav' = 'audio/wav'; '.mp3' = 'audio/mpeg'; '.ogg' = 'audio/ogg'; '.flac' = 'audio/flac'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
try {
  $listener.Start()
} catch {
  # already running (the game is open in another window): just open it again
  if (-not $NoOpen) { Start-Process $url }
  exit
}

Write-Host ''
Write-Host '  ENCHANTED is running.' -ForegroundColor Magenta
Write-Host "  If the game didn't open by itself, go to $url in your browser."
Write-Host '  Keep this window open while you play. Close it when you are done.'
Write-Host ''
if (-not $NoOpen) { Start-Process $url }

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($path -eq '') { $path = 'index.html' }
    $file = [IO.Path]::GetFullPath((Join-Path $root $path))
    if ($file.StartsWith($root) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
      $stream = [IO.File]::OpenRead($file)
      $res.ContentLength64 = $stream.Length
      $stream.CopyTo($res.OutputStream)
      $stream.Close()
    } else {
      $res.StatusCode = 404
    }
  } catch {
    # the browser closed the connection early: nothing to do
  } finally {
    try { $res.Close() } catch { }
  }
}
