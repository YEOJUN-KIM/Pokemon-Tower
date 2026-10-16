param([Parameter(Mandatory=$true)][string]$NodePath,[switch]$SelfTest,[switch]$Preview)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -Path (Join-Path $PSScriptRoot 'pocket-button.cs') -ReferencedAssemblies System.Windows.Forms,System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$towerRoot=Split-Path -Parent $PSScriptRoot
$script:pocketFonts=New-Object System.Drawing.Text.PrivateFontCollection
$script:pocketFonts.AddFontFile((Join-Path $towerRoot 'public/fonts/neodgm.ttf'))
$script:readyFont=New-Object System.Drawing.Font($script:pocketFonts.Families[0],32,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
$script:infoFont=New-Object System.Drawing.Font($script:pocketFonts.Families[0],16,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
$script:worker=$null
$script:gameAddress=$null
$script:testPassed=$false
$script:testDeadline=[DateTime]::UtcNow.AddSeconds(40)

$form=New-Object System.Windows.Forms.Form
$form.Text='포켓몬 타워 · Pocket Launcher'
$form.ClientSize=New-Object System.Drawing.Size(1000,620)
$form.FormBorderStyle='FixedSingle';$form.MaximizeBox=$false
$form.AutoScaleMode='None';$form.StartPosition='CenterScreen';$form.KeyPreview=$true
$form.BackColor=[System.Drawing.ColorTranslator]::FromHtml('#1747AB')
$form.ForeColor=[System.Drawing.ColorTranslator]::FromHtml('#E4ECFF')
$form.Font=New-Object System.Drawing.Font('Malgun Gothic',10)
$form.Icon=[System.Drawing.Icon]::new((Join-Path $towerRoot 'src/app/favicon.ico'))
$script:lcd=[System.Drawing.ColorTranslator]::FromHtml('#CFDDA5')
$script:ink=[System.Drawing.ColorTranslator]::FromHtml('#293E29')
function Round-Path($x,$y,$width,$height,$radius){
 $path=New-Object System.Drawing.Drawing2D.GraphicsPath
 $diameter=$radius*2
 $path.AddArc($x,$y,$diameter,$diameter,180,90)
 $path.AddArc(($x+$width-$diameter),$y,$diameter,$diameter,270,90)
 $path.AddArc(($x+$width-$diameter),($y+$height-$diameter),$diameter,$diameter,0,90)
 $path.AddArc($x,($y+$height-$diameter),$diameter,$diameter,90,90)
 $path.CloseFigure();return ,$path
}
function Paint-Round($graphics,$color,$x,$y,$width,$height,$radius){
 $path=Round-Path $x $y $width $height $radius
 $brush=New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($color))
 $graphics.FillPath($brush,$path);$brush.Dispose();$path.Dispose()
}
$form.Add_Paint({
 param($sender,$eventArgs)
 $g=$eventArgs.Graphics;$g.SmoothingMode='AntiAlias'
 $gradient=New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Rectangle(0,0,1000,620)),([System.Drawing.ColorTranslator]::FromHtml('#3675DF')),([System.Drawing.ColorTranslator]::FromHtml('#123481')),90)
 $g.FillRectangle($gradient,0,0,1000,620);$gradient.Dispose()
 Paint-Round $g '#5D98EF' 20 18 960 580 64
 Paint-Round $g '#245DC3' 23 22 954 572 62
 Paint-Round $g '#12377B' 171 52 658 452 38
 Paint-Round $g '#202C40' 176 48 648 449 36
 Paint-Round $g '#111A29' 196 76 608 376 14
 Paint-Round $g '#CFDDA5' 204 84 592 360 6
 # Recessed directional pad and speaker slots are part of the shell.
 Paint-Round $g '#174799' 33 228 126 132 35
 Paint-Round $g '#101C32' 77 234 38 118 5
 Paint-Round $g '#101C32' 39 274 114 38 5
 Paint-Round $g '#28374B' 81 238 30 110 4
 Paint-Round $g '#28374B' 43 278 106 30 4
 $padBrush=New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#142039'))
 $g.FillEllipse($padBrush,83,280,26,26);$padBrush.Dispose()
 for($i=0;$i -lt 5;$i++){Paint-Round $g '#153B86' (865+$i*13) (425-$i*5) 6 56 3}
 Paint-Round $g '#96DE65' 862 110 10 10 5
 # Four small inset screws finish the handheld casing.
 foreach($point in @(@(46,48),@(946,48),@(46,562),@(946,562))){
  Paint-Round $g '#17458F' $point[0] $point[1] 8 8 4
 }
})
function New-Label($text,$x,$y,$width,$height){
 $control=New-Object System.Windows.Forms.Label
 $control.Text=$text;$control.SetBounds($x,$y,$width,$height)
 $control.BackColor=[System.Drawing.Color]::Transparent
 $form.Controls.Add($control);return $control
}
function New-Button($text,$x,$y,$width){
 if($text -eq 'A' -or $text -eq 'B'){$control=New-Object PocketButton}else{$control=New-Object System.Windows.Forms.Button}
 $control.Text=$text;$control.SetBounds($x,$y,$width,42)
 $control.FlatStyle='Flat';$control.FlatAppearance.BorderSize=0
 $control.BackColor=[System.Drawing.ColorTranslator]::FromHtml('#142A52')
 $control.ForeColor=$form.ForeColor;$control.Cursor='Hand'
 $control.UseVisualStyleBackColor=$false
 $form.Controls.Add($control);return $control
}
function Round-Button($button,$diameter){
 $button.Size=New-Object System.Drawing.Size($diameter,$diameter)
 $path=New-Object System.Drawing.Drawing2D.GraphicsPath
 $path.AddEllipse(0,0,$diameter,$diameter)
 $button.Region=New-Object System.Drawing.Region($path);$path.Dispose()
 $button.Font=New-Object System.Drawing.Font('Consolas',22,[System.Drawing.FontStyle]::Bold)
 $button.BackColor=[System.Drawing.ColorTranslator]::FromHtml('#17263E')
 $button.FlatAppearance.MouseOverBackColor=[System.Drawing.ColorTranslator]::FromHtml('#34496B')
 $button.FlatAppearance.MouseDownBackColor=[System.Drawing.ColorTranslator]::FromHtml('#0B1424')
}
$brand=New-Label 'P O C K E T   S Y S T E M' 320 19 360 22
$brand.TextAlign='MiddleCenter';$brand.Font=New-Object System.Drawing.Font('Consolas',10,[System.Drawing.FontStyle]::Bold)
$powerLabel=New-Label 'POWER' 880 105 80 24
$powerLabel.Font=New-Object System.Drawing.Font('Consolas',9,[System.Drawing.FontStyle]::Bold)
$title=New-Label 'POKEMON TOWER' 226 104 540 38
$title.BackColor=$script:lcd;$title.ForeColor=$script:ink
$title.Font=New-Object System.Drawing.Font('Consolas',25,[System.Drawing.FontStyle]::Bold)
$subtitle=New-Label '포켓몬 타워  /  나만의 작은 배틀 타워' 229 147 540 25
$subtitle.BackColor=$script:lcd;$subtitle.ForeColor=$script:ink
$subtitle.Font=New-Object System.Drawing.Font('Malgun Gothic',9)
$status=New-Label '서버 상태를 확인하고 있습니다…' 229 187 535 28
$status.BackColor=$script:lcd;$status.ForeColor=$script:ink
$status.Font=New-Object System.Drawing.Font('Malgun Gothic',11,[System.Drawing.FontStyle]::Bold)
$addressCaption=New-Label 'LINK ADDRESS' 229 224 390 18
$addressCaption.BackColor=$script:lcd;$addressCaption.ForeColor=$script:ink
$addressCaption.Font=New-Object System.Drawing.Font('Consolas',9,[System.Drawing.FontStyle]::Bold)
$address=New-Object System.Windows.Forms.Label
$address.TabStop=$false;$address.UseMnemonic=$false;$address.SetBounds(229,248,540,25)
$address.BorderStyle='None';$address.BackColor=$script:lcd;$address.ForeColor=$script:ink
$address.Font=New-Object System.Drawing.Font('Consolas',11)
$form.Controls.Add($address)
$script:diagnostics=New-Object System.Text.StringBuilder
$script:errorLogPath=$null
$message=New-Label '' 229 286 540 82
$message.BackColor=$script:lcd;$message.ForeColor=$script:ink
$message.Font=$script:infoFont
$message.UseCompatibleTextRendering=$true
$errorLogLink=New-Object System.Windows.Forms.LinkLabel
$errorLogLink.Text='오류 로그 열기';$errorLogLink.SetBounds(229,374,540,24)
$errorLogLink.BackColor=$script:lcd;$errorLogLink.LinkColor=$script:ink
$errorLogLink.Visible=$false;$errorLogLink.TabStop=$true
$form.Controls.Add($errorLogLink)

$hint=New-Label '' 229 389 540 20
$hint.BackColor=$script:lcd;$hint.ForeColor=$script:ink
$hint.Font=New-Object System.Drawing.Font('Malgun Gothic',9)
$screenBrand=New-Label 'P O K E M O N   T O W E R   /   P O C K E T' 230 461 540 22
$screenBrand.TextAlign='MiddleCenter';$screenBrand.Font=New-Object System.Drawing.Font('Consolas',10,[System.Drawing.FontStyle]::Italic)
$open=New-Button 'A' 900 228 62;Round-Button $open 62
$open.AccessibleName='게임 열기';$open.TabIndex=1
$openLabel=New-Label '게임 열기' 884 298 94 24;$openLabel.TextAlign='MiddleCenter'
$copy=New-Button 'B' 839 315 56;Round-Button $copy 56
$copy.AccessibleName='주소 복사';$copy.TabIndex=2
$copyLabel=New-Label '주소 복사' 820 379 94 24;$copyLabel.TextAlign='MiddleCenter'
$start=New-Button '서버 켜기' 263 519 272
$start.TabIndex=0;$start.AccessibleName='서버 켜기'
$stop=New-Button '서버 끄기' 548 519 132;$stop.TabIndex=3
$refresh=New-Button '새로고침' 44 378 106;$refresh.TabIndex=4
$refresh.AccessibleName='상태 새로고침'
$refresh.Font=New-Object System.Drawing.Font('Malgun Gothic',9)
$note=New-Label "창을 닫아도 서버는 유지됩니다.`r`n종료는 「서버 끄기」." 409 412 360 27
$note.BackColor=$script:lcd;$note.ForeColor=$script:ink;$note.Visible=$false
$note.Font=New-Object System.Drawing.Font('Malgun Gothic',8);$note.TextAlign='BottomRight'
$tooltip=New-Object System.Windows.Forms.ToolTip
$tooltip.SetToolTip($open,'A · 게임 열기');$tooltip.SetToolTip($copy,'B · 주소 복사')
$tooltip.SetToolTip($refresh,'현재 서버 상태와 주소를 다시 확인합니다.')
$open.Enabled=$false;$copy.Enabled=$false


function Set-ReadyMessage {
 $message.Font=$script:readyFont
 $message.Text="A키로 게임 실행`r`nB키로 링크 복사"
 $hint.Text=''
}
function Save-ErrorLog([string]$reason){
 $message.Font=$script:infoFont
 try{
  $directory=Join-Path $towerRoot '.data/launcher-logs'
  [void][System.IO.Directory]::CreateDirectory($directory)
  $name='launcher-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')+'-'+([Guid]::NewGuid().ToString('N').Substring(0,8))+'.log'
  $script:errorLogPath=Join-Path $directory $name
  $content="Pokémon Tower launcher error`r`nTime: $([DateTimeOffset]::Now.ToString('o'))`r`nWorkspace: $towerRoot`r`nNode: $NodePath`r`nPowerShell: $($PSVersionTable.PSVersion)`r`n`r`n$reason`r`n`r`n"+$script:diagnostics.ToString()
  [System.IO.File]::WriteAllText($script:errorLogPath,$content,[System.Text.UTF8Encoding]::new($true))
  $message.Text="문제가 발생했습니다. 오류 로그를 확인해 주세요.`r`n.data/launcher-logs/$name"
  $errorLogLink.Visible=$true
 }catch{
  $message.Text='오류 로그를 저장하지 못했습니다. 프로젝트 폴더의 쓰기 권한을 확인해 주세요.'
  $errorLogLink.Visible=$false
 }
}
function Set-ServerState([bool]$running){
 $script:serverRunning=$running
 $note.Visible=$running -and !$script:worker
 $start.Text=if($running){'업데이트'}else{'서버 켜기'}
 $start.AccessibleName=$start.Text
 $stop.Enabled=$running -and !$script:worker
}
function Set-Address([string]$value){
 $script:gameAddress=$value;$address.Text=$value
 $open.Enabled=!!$value;$copy.Enabled=!!$value
}
function Begin-Operation([string]$action){
 if($script:worker){return}
 Set-Address ''
 $start.Enabled=$false;$stop.Enabled=$false;$refresh.Enabled=$false
 $status.ForeColor=[System.Drawing.ColorTranslator]::FromHtml('#665923')
 $status.Text=switch($action){start {'서버를 준비하고 있습니다…'} stop {'저장을 유지하며 서버를 종료하고 있습니다…'} default {'현재 접속 주소를 확인하고 있습니다…'}}
 $hint.Text=''
 $message.Font=$script:infoFont
 $message.Text=switch($action){start {'잠시만 기다려 주세요.'} stop {'서버를 종료하고 있습니다.'} default {''}}
 $errorLogLink.Visible=$false;$script:errorLogPath=$null
 $note.Visible=$false
 [void]$script:diagnostics.Clear()
 [void]$script:diagnostics.AppendLine("Action: $action")
 try{
  $info=New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName=$NodePath
  $info.Arguments='"{0}" {1} --no-browser' -f (Join-Path $PSScriptRoot 'launch-preview.mjs'),$action
  $info.WorkingDirectory=$towerRoot;$info.UseShellExecute=$false;$info.CreateNoWindow=$true
  $info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
  $info.StandardOutputEncoding=[System.Text.Encoding]::UTF8;$info.StandardErrorEncoding=[System.Text.Encoding]::UTF8
  $process=New-Object System.Diagnostics.Process;$process.StartInfo=$info
  [void]$process.Start()
  $script:worker=[pscustomobject]@{Process=$process;OutTask=$process.StandardOutput.ReadLineAsync();ErrTask=$process.StandardError.ReadLineAsync();Action=$action;Url=$null;Running=$null}
 }catch{
  $status.Text='실행하지 못했습니다.';Save-ErrorLog ($_.Exception.ToString())
  $start.Enabled=$true;$stop.Enabled=$true;$refresh.Enabled=$true
 }
}
function Read-Lines([string]$property,[System.IO.StreamReader]$reader){
 for($i=0;$i -lt 60;$i++){
  $task=$script:worker.$property
  if(!$task -or !$task.IsCompleted){break}
  $line=$task.GetAwaiter().GetResult()
  if($null -eq $line){$script:worker.$property=$null;break}
  if($line -match '^SERVER_STATE=(running|stopped)$'){
   $script:worker.Running=($Matches[1] -eq 'running')
   Set-ServerState $script:worker.Running
   $script:worker.$property=$reader.ReadLineAsync()
   continue
  }
  [void]$script:diagnostics.AppendLine("[$property] $line")
  if($line -match '^게임 주소: (https://[a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com)$'){$script:worker.Url=$Matches[1]}
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
    if($null -ne $done.Running){Set-ServerState $done.Running}
    elseif($done.Url){Set-ServerState $true}
    elseif($done.Process.ExitCode -eq 0){Set-ServerState $false}
    if($done.Process.ExitCode -eq 0 -and $done.Url){
     Set-Address $done.Url;$status.Text='● 서버 실행 중';$status.ForeColor=$script:ink
     Set-ReadyMessage

    }elseif($done.Process.ExitCode -eq 0){$status.Text=if($script:serverRunning){'● 서버 실행 중 · 외부 연결 확인 필요'}else{'● 서버 꺼짐'};$status.ForeColor=$script:ink;$address.Text='';$message.Text=if($script:serverRunning){'외부 연결을 확인한 뒤 다시 시도해 주세요.'}else{'아래 서버 켜기 버튼으로 시작하세요.'}}
    else{$status.Text='실행하지 못했습니다.';$status.ForeColor=[System.Drawing.ColorTranslator]::FromHtml('#803A2A');Save-ErrorLog ($done.Action+' failed with exit code '+$done.Process.ExitCode)}
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
  Save-ErrorLog ($_.Exception.ToString())
  $status.Text='실행기 오류가 발생했습니다.';$timer.Stop()
  if($SelfTest){$script:worker=$null;$form.Close()}
 }
})
$errorLogLink.Add_LinkClicked({
 if($script:errorLogPath){
  try{Start-Process -FilePath 'notepad.exe' -ArgumentList ('"{0}"' -f $script:errorLogPath)}
  catch{$hint.Text='로그 파일을 직접 열어 주세요: .data/launcher-logs/'}
 }
})
$start.Add_Click({Begin-Operation 'start'})
$stop.Add_Click({Begin-Operation 'stop'})
$refresh.Add_Click({Begin-Operation 'status'})
$open.Add_Click({if($script:gameAddress){Start-Process -FilePath $script:gameAddress}})
$copy.Add_Click({
 if($script:gameAddress){try{[System.Windows.Forms.Clipboard]::SetText($script:gameAddress);$hint.Text='주소를 복사했어요. 카톡이나 문자 입력창에 붙여넣으세요.'}catch{$hint.Text='복사하지 못했어요. 잠시 뒤 B 버튼으로 다시 시도해 주세요.'}}
})
$form.Add_KeyDown({
 param($sender,$eventArgs)
 if($eventArgs.Control -or $eventArgs.Alt){return}
 switch($eventArgs.KeyCode){
  'A' {if($open.Enabled){$open.PerformClick();$eventArgs.SuppressKeyPress=$true}}
  'B' {if($copy.Enabled){$copy.PerformClick();$eventArgs.SuppressKeyPress=$true}}
  'R' {if($refresh.Enabled){$refresh.PerformClick();$eventArgs.SuppressKeyPress=$true}}
 }
})
$form.Add_Shown({
 if($Preview){
  Set-ServerState $true
  Set-Address 'https://tower-preview.example'
  $status.Text='● READY TO PLAY';$status.ForeColor=$script:ink
  Set-ReadyMessage

  [System.Windows.Forms.Application]::DoEvents()
  $output=Join-Path $towerRoot 'artifacts/temporary/launcher'
  [void][System.IO.Directory]::CreateDirectory($output)
  $bitmap=New-Object System.Drawing.Bitmap($form.Width,$form.Height)
  $form.DrawToBitmap($bitmap,(New-Object System.Drawing.Rectangle(0,0,$form.Width,$form.Height)))
  $bitmap.Save((Join-Path $output 'pocket-launcher.png'),[System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose();$form.Close();return
 }
 $timer.Start();Begin-Operation 'status'
})
$form.Add_FormClosing({
 param($sender,$eventArgs)
 if($script:worker){$eventArgs.Cancel=$true;$hint.Text='작업이 진행 중입니다. 완료된 뒤 창을 닫아 주세요.'}else{$timer.Stop()}
})
[void]$form.ShowDialog()
$timer.Dispose();$tooltip.Dispose();$form.Icon.Dispose();$form.Dispose()
if($SelfTest){if(!$script:testPassed){exit 1};Write-Output 'PASS: unified launcher shows live address and enables server, copy and open controls.'}
