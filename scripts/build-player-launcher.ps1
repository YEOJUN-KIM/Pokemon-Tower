param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
$towerRoot = Split-Path -Parent $PSScriptRoot
if (!$OutputPath) { $OutputPath = Join-Path $towerRoot 'PokemonTower.exe' }
$towerCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (!(Test-Path -LiteralPath $towerCompiler)) { $towerCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
if (!(Test-Path -LiteralPath $towerCompiler)) { throw 'Windows .NET Framework C# compiler not found.' }
# Build a multi-resolution ICO from the project-owned PNG; the source is retained.
Add-Type -AssemblyName System.Drawing
$towerIconDirectory = Join-Path $towerRoot 'artifacts\player-launcher'
New-Item -ItemType Directory -Path $towerIconDirectory -Force | Out-Null
$towerIconPath = Join-Path $towerIconDirectory 'PokemonTower.ico'
$towerSourceImage = [System.Drawing.Image]::FromFile((Join-Path $towerRoot 'public\branding\pokemon-tower-original.png'))
$towerSizes = @(16,32,48,64,128,256)
$towerImages = @()
try {
    foreach ($towerSize in $towerSizes) {
        $towerBitmap = New-Object System.Drawing.Bitmap($towerSize,$towerSize)
        $towerGraphics = [System.Drawing.Graphics]::FromImage($towerBitmap)
        try {
            $towerGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $towerRatio = [Math]::Min($towerSize/$towerSourceImage.Width,$towerSize/$towerSourceImage.Height)
            $towerWidth = [int]($towerSourceImage.Width*$towerRatio)
            $towerHeight = [int]($towerSourceImage.Height*$towerRatio)
            $towerGraphics.DrawImage($towerSourceImage,[int](($towerSize-$towerWidth)/2),[int](($towerSize-$towerHeight)/2),$towerWidth,$towerHeight)
            $towerMemory = New-Object System.IO.MemoryStream
            $towerBitmap.Save($towerMemory,[System.Drawing.Imaging.ImageFormat]::Png)
            $towerImages += ,$towerMemory.ToArray()
            $towerMemory.Dispose()
        } finally { $towerGraphics.Dispose(); $towerBitmap.Dispose() }
    }
} finally { $towerSourceImage.Dispose() }
$towerWriter = New-Object System.IO.BinaryWriter([System.IO.File]::Create($towerIconPath))
try {
    $towerWriter.Write([uint16]0); $towerWriter.Write([uint16]1); $towerWriter.Write([uint16]$towerSizes.Count)
    $towerOffset = 6+16*$towerSizes.Count
    for ($towerIndex=0; $towerIndex -lt $towerSizes.Count; $towerIndex++) {
        $towerDimension = if ($towerSizes[$towerIndex] -eq 256) { 0 } else { $towerSizes[$towerIndex] }
        $towerWriter.Write([byte]$towerDimension); $towerWriter.Write([byte]$towerDimension); $towerWriter.Write([byte]0); $towerWriter.Write([byte]0)
        $towerWriter.Write([uint16]1); $towerWriter.Write([uint16]32); $towerWriter.Write([uint32]$towerImages[$towerIndex].Length); $towerWriter.Write([uint32]$towerOffset)
        $towerOffset += $towerImages[$towerIndex].Length
    }
    foreach ($towerImage in $towerImages) { $towerWriter.Write([byte[]]$towerImage) }
} finally { $towerWriter.Dispose() }
# C# source is UTF-8 without BOM. Explicit codepage also works under Windows PowerShell 5.1 / Korean ACP.
# Pipe decoding is configured separately in ProcessStartInfo; compiler encoding does not affect Node output.
& $towerCompiler /nologo /target:winexe /platform:anycpu /optimize+ /codepage:65001 /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll "/win32icon:$towerIconPath" "/out:$OutputPath" (Join-Path $PSScriptRoot 'player-launcher.cs')
if ($LASTEXITCODE -ne 0) { throw 'Player launcher build failed.' }
Write-Output "Built: $OutputPath"
