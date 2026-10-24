param([ValidateSet('create','verify')][string]$Mode,[Parameter(Mandatory=$true)][string]$Directory,[Parameter(Mandatory=$true)][string]$ZipPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$towerDirectory=[IO.Path]::GetFullPath($Directory)
$towerZip=[IO.Path]::GetFullPath($ZipPath)
$towerPrefix=[IO.Path]::GetFileName($towerDirectory)+'/'
if($Mode -eq 'create') {
    # Explicit file enumeration includes .next and .pnpm (Compress-Archive skips hidden items).
    $towerArchive=[IO.Compression.ZipFile]::Open($towerZip,[IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach($towerFile in [IO.Directory]::EnumerateFiles($towerDirectory,'*',[IO.SearchOption]::AllDirectories)) {
            $towerRelative=$towerFile.Substring($towerDirectory.Length+1).Replace('\','/')
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($towerArchive,$towerFile,$towerPrefix+$towerRelative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally { $towerArchive.Dispose() }
} else {
    $towerExpected=@{}
    $towerManifest=Get-Content -LiteralPath (Join-Path $towerDirectory 'release-manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach($towerFile in $towerManifest.files){$towerExpected[$towerPrefix+$towerFile.path]=$towerFile.sha256}
    $towerManifestPath=Join-Path $towerDirectory 'release-manifest.json'
    $towerManifestSha=[Security.Cryptography.SHA256]::Create()
    try {$towerExpected[$towerPrefix+'release-manifest.json']=[BitConverter]::ToString($towerManifestSha.ComputeHash([IO.File]::ReadAllBytes($towerManifestPath))).Replace('-','').ToLowerInvariant()}finally{$towerManifestSha.Dispose()}
    $towerArchive=[IO.Compression.ZipFile]::OpenRead($towerZip)
    $towerSha=[Security.Cryptography.SHA256]::Create()
    try {
        if($towerArchive.Entries.Count -ne $towerExpected.Count){throw 'ZIP file count mismatch'}
        foreach($towerEntry in $towerArchive.Entries){
            if(!$towerExpected.ContainsKey($towerEntry.FullName)){throw ('Unexpected/duplicate ZIP entry: '+$towerEntry.FullName)}
            $towerStream=$towerEntry.Open()
            try{$towerHash=[BitConverter]::ToString($towerSha.ComputeHash($towerStream)).Replace('-','').ToLowerInvariant()}finally{$towerStream.Dispose()}
            if($towerHash -ne $towerExpected[$towerEntry.FullName]){throw ('ZIP content mismatch: '+$towerEntry.FullName)}
            $towerExpected.Remove($towerEntry.FullName)
        }
        Write-Output ('ZIP verified: '+$towerArchive.Entries.Count+' exact files under '+$towerPrefix)
    }finally{$towerSha.Dispose();$towerArchive.Dispose()}
}
