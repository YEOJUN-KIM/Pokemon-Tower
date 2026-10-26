param([ValidateSet('create','verify','extract')][string]$Mode,[Parameter(Mandatory=$true)][string]$Directory,[Parameter(Mandatory=$true)][string]$ZipPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$towerDirectory=[IO.Path]::GetFullPath($Directory)
$towerZip=[IO.Path]::GetFullPath($ZipPath)
$towerPolicy=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'windows-player-path-policy.json') -Raw | ConvertFrom-Json
$towerPrefix=$towerPolicy.archiveRoot+'/'
function Assert-TowerZipPath([string]$Name) {
    if(!$Name.StartsWith($towerPrefix) -or $Name.Contains('\') -or $Name.Contains(':') -or @($Name.Split('/') | Where-Object {$_ -eq '..' -or $_ -eq '.' -or $_ -eq '' -or $_.Length -gt 255}).Count){throw ('Unsafe ZIP entry: '+$Name)}
    if($Name.Length+$towerPolicy.extractionRootBudget+1 -gt $towerPolicy.maxFullPath){throw ('Windows Explorer path budget exceeded: '+$Name)}
}
if($Mode -eq 'create') {
    $towerFiles=@([IO.Directory]::EnumerateFiles($towerDirectory,'*',[IO.SearchOption]::AllDirectories))
    foreach($towerFile in $towerFiles){Assert-TowerZipPath ($towerPrefix+$towerFile.Substring($towerDirectory.Length+1).Replace('\','/'))}
    # Explicit file enumeration includes .next and .pnpm (Compress-Archive skips hidden items).
    $towerArchive=[IO.Compression.ZipFile]::Open($towerZip,[IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach($towerFile in $towerFiles) {
            $towerRelative=$towerFile.Substring($towerDirectory.Length+1).Replace('\','/')
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($towerArchive,$towerFile,$towerPrefix+$towerRelative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally { $towerArchive.Dispose() }
} elseif($Mode -eq 'verify') {
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
            Assert-TowerZipPath $towerEntry.FullName
            if(!$towerExpected.ContainsKey($towerEntry.FullName)){throw ('Unexpected/duplicate ZIP entry: '+$towerEntry.FullName)}
            $towerStream=$towerEntry.Open()
            try{$towerHash=[BitConverter]::ToString($towerSha.ComputeHash($towerStream)).Replace('-','').ToLowerInvariant()}finally{$towerStream.Dispose()}
            if($towerHash -ne $towerExpected[$towerEntry.FullName]){throw ('ZIP content mismatch: '+$towerEntry.FullName)}
            $towerExpected.Remove($towerEntry.FullName)
        }
        Write-Output ('ZIP verified: '+$towerArchive.Entries.Count+' exact files under '+$towerPrefix)
    }finally{$towerSha.Dispose();$towerArchive.Dispose()}
} else {
    # Exercise classic Win32 APIs with explicit MAX_PATH-compatible limits.
    # Do not use \\?\ paths, LongPathsEnabled, Expand-Archive or a 7-Zip backend.
    if(Test-Path -LiteralPath $towerDirectory){throw 'Extraction destination must not exist'}
    Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class TowerClassicPaths {
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateDirectoryW(string path,IntPtr security);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern SafeFileHandle CreateFileW(string path,uint access,uint share,IntPtr security,uint creation,uint flags,IntPtr template);
 public static void Directory(string path) {
  if(path.Length>240||path.StartsWith(@"\\?\"))throw new Exception("Classic Win32 directory path exceeded: "+path);
  if(!CreateDirectoryW(path,IntPtr.Zero)&&Marshal.GetLastWin32Error()!=183)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),path);
 }
 public static void Extract(Stream input,string path) {
  if(path.Length>240||path.StartsWith(@"\\?\"))throw new Exception("Classic Win32 file path exceeded: "+path);
  using(var handle=CreateFileW(path,0x40000000,0,IntPtr.Zero,1,0x80,IntPtr.Zero)) {
   if(handle.IsInvalid)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),path);
   using(var output=new FileStream(handle,FileAccess.Write)){input.CopyTo(output);}
  }
 }
}
'@
    $towerArchive=[IO.Compression.ZipFile]::OpenRead($towerZip)
    try {
        foreach($towerEntry in $towerArchive.Entries){
            Assert-TowerZipPath $towerEntry.FullName
            $towerDestination=[IO.Path]::GetFullPath((Join-Path $towerDirectory $towerEntry.FullName.Replace('/','\')))
            if(!$towerDestination.StartsWith($towerDirectory+'\') -or $towerDestination.Length -gt $towerPolicy.maxFullPath){throw ('Classic Win32 extraction path exceeded: '+$towerDestination)}
        }
        [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($towerDirectory)) | Out-Null
        [TowerClassicPaths]::Directory($towerDirectory)
        $towerMaximum=0
        foreach($towerEntry in $towerArchive.Entries){
            $towerDestination=Join-Path $towerDirectory $towerEntry.FullName.Replace('/','\')
            $towerParents=New-Object 'System.Collections.Generic.Stack[string]'
            for($towerParent=[IO.Path]::GetDirectoryName($towerDestination);$towerParent.Length -gt $towerDirectory.Length;$towerParent=[IO.Path]::GetDirectoryName($towerParent)){$towerParents.Push($towerParent)}
            while($towerParents.Count){[TowerClassicPaths]::Directory($towerParents.Pop())}
            $towerInput=$towerEntry.Open()
            try{[TowerClassicPaths]::Extract($towerInput,$towerDestination)}finally{$towerInput.Dispose()}
            $towerMaximum=[Math]::Max($towerMaximum,$towerDestination.Length)
        }
        Write-Output ('Classic Win32 extracted '+$towerArchive.Entries.Count+' files; maximum path '+$towerMaximum+'; destination '+$towerDirectory)
    }finally{$towerArchive.Dispose()}
}
