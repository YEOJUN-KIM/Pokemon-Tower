param([Parameter(Mandatory=$true)][string]$NodePath,[switch]$SelfTest)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$towerRoot=Split-Path -Parent $PSScriptRoot
$script:worker=$null
$script:gameAddress=$null
$script:testPassed=$false
$script:testDeadline=[DateTime]::UtcNow.AddSeconds(40)

$form=New-Object System.Windows.Forms.Form
$form.Text='포켓몬 타워 실행기'
$form.ClientSize=New-Object System.Drawing.Size(760,590)
$form.MinimumSize=New-Object System.Drawing.Size(720,590)
$form.StartPosition='CenterScreen'
$form.BackColor=[System.Drawing.Color]::FromArgb(27,43,57)
$form.ForeColor=[System.Drawing.Color]::FromArgb(236,243,246)
$form.Font=New-Object System.Drawing.Font('Malgun Gothic',10)
function New-Label($text,$x,$y,$width,$height){
 $control=New-Object System.Windows.Forms.Label
 $control.Text=$text;$control.SetBounds($x,$y,$width,$height)
 $form.Controls.Add($control);return $control
}
function New-Button($text,$x,$y,$width){
 $control=New-Object System.Windows.Forms.Button
 $control.Text=$text;$control.SetBounds($x,$y,$width,44)
 $control.FlatStyle='Flat';$control.BackColor=[System.Drawing.Color]::FromArgb(59,80,95)
 $control.ForeColor=$form.ForeColor;$control.Cursor='Hand'
 $form.Controls.Add($control);return $control
}
$title=New-Label '포켓몬 타워' 26 20 700 38
$title.Font=New-Object System.Drawing.Font('Malgun Gothic',21,[System.Drawing.FontStyle]::Bold)
$subtitle=New-Label '서버를 켜고, 게임을 열고, 접속 주소를 나누세요.' 28 65 700 26
$status=New-Label '서버 상태를 확인하고 있습니다…' 28 108 700 28
$status.Font=New-Object System.Drawing.Font('Malgun Gothic',12,[System.Drawing.FontStyle]::Bold)
$address=New-Object System.Windows.Forms.TextBox
$address.ReadOnly=$true;$address.SetBounds(28,146,704,34)
$address.Font=New-Object System.Drawing.Font('Consolas',12)
$address.Anchor='Top,Left,Right';$form.Controls.Add($address)
$open=New-Button '게임 열기' 28 194 180
$copy=New-Button '주소 복사' 220 194 180
$hint=New-Label '주소를 복사해 카톡 등에 붙여넣으면 바로 접속할 수 있어요.' 28 245 700 28
$start=New-Button '서버 켜기 / 업데이트' 28 289 240
$start.BackColor=[System.Drawing.Color]::FromArgb(48,112,101)
$stop=New-Button '서버 끄기' 282 289 180
$refresh=New-Button '상태 새로고침' 476 289 220
$note=New-Label '창을 닫아도 서버는 유지됩니다. 종료하려면 「서버 끄기」를 누르세요.' 28 345 704 26
$note.Font=New-Object System.Drawing.Font('Malgun Gothic',9)
$log=New-Object System.Windows.Forms.TextBox
$log.Multiline=$true;$log.ReadOnly=$true;$log.ScrollBars='Vertical'
$log.SetBounds(28,385,704,176);$log.Anchor='Top,Bottom,Left,Right'
$log.BackColor=[System.Drawing.Color]::FromArgb(18,31,42);$log.ForeColor=$form.ForeColor
$log.Font=New-Object System.Drawing.Font('Malgun Gothic',9)
$form.Controls.Add($log)
$open.Enabled=$false;$copy.Enabled=$false

function Set-Address([string]$value){
 $script:gameAddress=$value;$address.Text=$value
 $open.Enabled=!!$value;$copy.Enabled=!!$value
}
function Begin-Operation([string]$action){
 if($script:worker){return}
 Set-Address ''
 $start.Enabled=$false;$stop.Enabled=$false;$refresh.Enabled=$false
 $status.ForeColor=[System.Drawing.Color]::FromArgb(246,214,142)
 $status.Text=switch($action){start {'서버를 준비하고 있습니다…'} stop {'저장을 유지하며 서버를 종료하고 있습니다…'} default {'현재 접속 주소를 확인하고 있습니다…'}}
 $log.Clear()
 try{
  $info=New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName=$NodePath
  $info.Arguments='"{0}" {1} --no-browser' -f (Join-Path $PSScriptRoot 'launch-preview.mjs'),$action
  $info.WorkingDirectory=$towerRoot;$info.UseShellExecute=$false;$info.CreateNoWindow=$true
  $info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
  $info.StandardOutputEncoding=[System.Text.Encoding]::UTF8;$info.StandardErrorEncoding=[System.Text.Encoding]::UTF8
  $process=New-Object System.Diagnostics.Process;$process.StartInfo=$info
  [void]$process.Start()
  $script:worker=[pscustomobject]@{Process=$process;OutTask=$process.StandardOutput.ReadLineAsync();ErrTask=$process.StandardError.ReadLineAsync();Action=$action;Url=$null}
 }catch{
  $status.Text='실행하지 못했습니다. 아래 내용을 확인해 주세요.';$log.Text=$_.Exception.Message
  $start.Enabled=$true;$stop.Enabled=$true;$refresh.Enabled=$true
 }
}
function Read-Lines([string]$property,[System.IO.StreamReader]$reader){
 for($i=0;$i -lt 60;$i++){
  $task=$script:worker.$property
  if(!$task -or !$task.IsCompleted){break}
  $line=$task.GetAwaiter().GetResult()
  if($null -eq $line){$script:worker.$property=$null;break}
  $log.AppendText($line+[Environment]::NewLine)
  if($line -match '^게임 주소: (https://[a-z0-9-]+\.trycloudflare\.com)$'){$script:worker.Url=$Matches[1]}
  $script:worker.$property=$reader.ReadLineAsync()
 }
}
$timer=New-Object System.Windows.Forms.Timer
$timer.Interval=100
$timer.Add_Tick({
 try{
  if($script:worker){
   Read-Lines 'OutTask' $script:worker.Process.StandardOutput
   Read-Lines 'ErrTask' $script:worker.Process.StandardError
   if($script:worker.Process.HasExited -and !$script:worker.OutTask -and !$script:worker.ErrTask){
    $done=$script:worker;$script:worker=$null
    $start.Enabled=$true;$stop.Enabled=$true;$refresh.Enabled=$true
    if($done.Process.ExitCode -eq 0 -and $done.Url){
     Set-Address $done.Url;$status.Text='● 서버 실행 중';$status.ForeColor=[System.Drawing.Color]::FromArgb(126,220,178)
     $hint.Text='주소를 복사해 카톡 등에 붙여넣으세요. 다시 켜면 주소가 바뀔 수 있어요.'
    }elseif($done.Process.ExitCode -eq 0){$status.Text='● 서버 꺼짐';$status.ForeColor=[System.Drawing.Color]::LightGray;$address.Text='서버를 켜면 현재 게임 주소가 표시됩니다.'}
    else{$status.Text='실행하지 못했습니다. 아래 진행 기록을 확인해 주세요.';$status.ForeColor=[System.Drawing.Color]::FromArgb(255,166,166)}
    $done.Process.Dispose()
    if($SelfTest){
     if(!$script:gameAddress -or !$copy.Enabled -or !$open.Enabled -or !$start.Enabled -or !$stop.Enabled){throw '실행기 상태/버튼 검증 실패'}
     $output=Join-Path $towerRoot 'artifacts/qa/screenshots/launcher'
     [void][System.IO.Directory]::CreateDirectory($output)
     $bitmap=New-Object System.Drawing.Bitmap($form.Width,$form.Height)
     $form.DrawToBitmap($bitmap,(New-Object System.Drawing.Rectangle(0,0,$form.Width,$form.Height)))
     $bitmap.Save((Join-Path $output 'window.png'),[System.Drawing.Imaging.ImageFormat]::Png);$bitmap.Dispose()
     $script:testPassed=$true;$form.Close()
    }
   }
  }
  if($SelfTest -and [DateTime]::UtcNow -gt $script:testDeadline){throw '실행기 검사 시간 초과'}
 }catch{
  $log.AppendText($_.Exception.Message+[Environment]::NewLine)
  $status.Text='실행기 오류가 발생했습니다.';$timer.Stop()
  if($SelfTest){$script:worker=$null;$form.Close()}
 }
})
$start.Add_Click({Begin-Operation 'start'})
$stop.Add_Click({Begin-Operation 'stop'})
$refresh.Add_Click({Begin-Operation 'status'})
$open.Add_Click({if($script:gameAddress){Start-Process -FilePath $script:gameAddress}})
$copy.Add_Click({
 if($script:gameAddress){try{[System.Windows.Forms.Clipboard]::SetText($script:gameAddress);$hint.Text='주소를 복사했어요. 카톡이나 문자 입력창에 붙여넣으세요.'}catch{$hint.Text='복사하지 못했어요. 주소 칸을 선택해 Ctrl+C를 눌러 주세요.'}}
})
$form.Add_Shown({$timer.Start();Begin-Operation 'status'})
$form.Add_FormClosing({
 param($sender,$eventArgs)
 if($script:worker){$eventArgs.Cancel=$true;$note.Text='작업이 진행 중입니다. 완료된 뒤 창을 닫아 주세요.'}else{$timer.Stop()}
})
[void]$form.ShowDialog()
$timer.Dispose();$form.Dispose()
if($SelfTest){if(!$script:testPassed){exit 1};Write-Output 'PASS: unified launcher shows live address and enables server, copy and open controls.'}
