$ErrorActionPreference = 'Stop'
$towerRoot = Split-Path -Parent $PSScriptRoot
$towerCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (!(Test-Path -LiteralPath $towerCompiler)) {
    $towerCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
}
if (!(Test-Path -LiteralPath $towerCompiler)) { throw 'Windows .NET Framework C# compiler not found.' }

$towerExecutable = Join-Path $towerRoot '포켓몬타워 실행.exe'
$towerSource = Join-Path $PSScriptRoot 'windows-launcher.cs'
$towerIcon = Join-Path $towerRoot 'src\app\favicon.ico'
& $towerCompiler /nologo /target:winexe /platform:anycpu /optimize+ /codepage:65001 /reference:System.Windows.Forms.dll "/win32icon:$towerIcon" "/out:$towerExecutable" $towerSource
if ($LASTEXITCODE -ne 0) { throw 'Launcher build failed.' }
Write-Output "Built: $towerExecutable"
