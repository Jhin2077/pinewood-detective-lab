$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$libraryRoot = Join-Path $projectRoot 'public\ui-library\semiotic'
$packagePath = Join-Path $libraryRoot 'pinewood-semiotic-signs-svg.zip'
$packageItems = @(
  (Join-Path $libraryRoot 'svg'),
  (Join-Path $libraryRoot 'contact-sheet.svg'),
  (Join-Path $libraryRoot 'manifest.json'),
  (Join-Path $libraryRoot 'README.md')
)

Compress-Archive -LiteralPath $packageItems -DestinationPath $packagePath -CompressionLevel Optimal -Force

$package = Get-Item -LiteralPath $packagePath
Write-Host "Packaged Pinewood Semiotic Signs: $($package.FullName) ($($package.Length) bytes)"
