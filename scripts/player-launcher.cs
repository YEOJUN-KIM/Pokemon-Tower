using System;
using System.IO;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using System.Collections.Generic;
using System.Runtime.InteropServices;

// Only the EXE owns this non-inheritable handle. Windows closes it even after a forced EXE exit.
internal sealed class ManagedProcessJob : IDisposable {
 [StructLayout(LayoutKind.Sequential)] struct BasicLimits {
  public long PerProcessUserTimeLimit,PerJobUserTimeLimit;public uint LimitFlags;
  public UIntPtr MinimumWorkingSetSize,MaximumWorkingSetSize;public uint ActiveProcessLimit;
  public UIntPtr Affinity;public uint PriorityClass,SchedulingClass;
 }
 [StructLayout(LayoutKind.Sequential)] struct IoCounters {public ulong ReadOperationCount,WriteOperationCount,OtherOperationCount,ReadTransferCount,WriteTransferCount,OtherTransferCount;}
 [StructLayout(LayoutKind.Sequential)] struct ExtendedLimits {
  public BasicLimits BasicLimitInformation;public IoCounters IoInfo;
  public UIntPtr ProcessMemoryLimit,JobMemoryLimit,PeakProcessMemoryUsed,PeakJobMemoryUsed;
 }
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes,string name);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int kind,IntPtr info,uint size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 IntPtr handle;
 public ManagedProcessJob(){
  handle=CreateJobObject(IntPtr.Zero,null);if(handle==IntPtr.Zero)throw new System.ComponentModel.Win32Exception();
  var limits=new ExtendedLimits();limits.BasicLimitInformation.LimitFlags=0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
  int size=Marshal.SizeOf(limits);IntPtr buffer=Marshal.AllocHGlobal(size);
  try{Marshal.StructureToPtr(limits,buffer,false);if(!SetInformationJobObject(handle,9,buffer,(uint)size))throw new System.ComponentModel.Win32Exception();}
  catch{Dispose();throw;}finally{Marshal.FreeHGlobal(buffer);}
 }
 public void Assign(Process child){if(!AssignProcessToJobObject(handle,child.Handle))throw new System.ComponentModel.Win32Exception();}
 public void Dispose(){if(handle!=IntPtr.Zero){CloseHandle(handle);handle=IntPtr.Zero;}}
}

internal static class PokemonTowerPlayer {
 static readonly string Home=Environment.GetEnvironmentVariable("LOCALAPPDATA")==null?Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),"PokemonTower"):Path.Combine(Environment.GetEnvironmentVariable("LOCALAPPDATA"),"PokemonTower");
 static string Quote(string value) {
  var result=new System.Text.StringBuilder("\"");int slashes=0;
  foreach(char c in value){if(c=='\\'){slashes++;continue;}if(c=='"'){result.Append('\\',slashes*2+1);result.Append(c);}else{result.Append('\\',slashes);result.Append(c);}slashes=0;}
  result.Append('\\',slashes*2);result.Append('"');return result.ToString();
 }
 static string FindNode(string home) {
  string bundled=Path.Combine(home,"runtime","node.exe");if(File.Exists(bundled))return bundled;
  bundled=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"runtime","node.exe");if(File.Exists(bundled))return bundled;
  foreach(string dir in (Environment.GetEnvironmentVariable("PATH")??"").Split(Path.PathSeparator)) {
   if(String.IsNullOrWhiteSpace(dir))continue;string file=Path.Combine(dir.Trim().Trim('"'),"node.exe");if(File.Exists(file))return file;
  }throw new Exception("처음 실행에 필요한 도구가 없습니다. Node.js 24 이상을 설치한 뒤 다시 실행해 주세요.\nhttps://nodejs.org/");
 }
 static string Sanitize(string text) {
  foreach(string key in Environment.GetEnvironmentVariables().Keys){string value=Environment.GetEnvironmentVariable(key);if(System.Text.RegularExpressions.Regex.IsMatch(key,"TOKEN|PASSWORD|SECRET|CREDENTIAL|API_KEY|AUTH",System.Text.RegularExpressions.RegexOptions.IgnoreCase)&&value!=null&&value.Length>=4)text=text.Replace(value,"[REDACTED]");}
  return System.Text.RegularExpressions.Regex.Replace(text,@"(https?://)[^\s/@]+:[^\s/@]+@","$1[REDACTED]@");
 }
 [STAThread] static int Main(string[] args) {
  bool headless=Array.IndexOf(args,"--headless")>=0||Array.IndexOf(args,"--check")>=0;string home=Home;for(int i=0;i<args.Length-1;i++)if(args[i]=="--home")home=Path.GetFullPath(args[++i]);
  string bootstrapLog=Path.Combine(home,"logs","bootstrap-"+DateTime.UtcNow.ToString("yyyyMMdd-HHmmss")+"-"+Process.GetCurrentProcess().Id+".log");
  try {
   Directory.CreateDirectory(Path.GetDirectoryName(bootstrapLog));
   string root=AppDomain.CurrentDomain.BaseDirectory,script=Path.Combine(root,"scripts","player-launcher.mjs"),node=FindNode(home);
   if(!File.Exists(script))throw new Exception("게임 실행 파일이 부족합니다. PokemonTower.exe를 배포 폴더 안에서 실행해 주세요.");
   ProcessStartInfo versionInfo=new ProcessStartInfo(node,"--version"){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,RedirectStandardOutput=true};
   using(Process version=Process.Start(versionInfo)){string value=version.StandardOutput.ReadToEnd().Trim().TrimStart('v');version.WaitForExit();int major;if(!Int32.TryParse(value.Split('.')[0],out major)||major<24)throw new Exception("게임 실행 도구 업데이트가 필요합니다. Node.js 24 이상을 설치해 주세요. https://nodejs.org/");}
   File.AppendAllText(bootstrapLog,"Launcher bootstrap started "+DateTime.UtcNow.ToString("o")+Environment.NewLine);
   string arguments=Quote(script);foreach(string arg in args)arguments+=" "+Quote(arg);
   // Node writes UTF-8 to pipes; .NET Framework otherwise decodes using the Windows ANSI code page.
   ProcessStartInfo start=new ProcessStartInfo(node,arguments){WorkingDirectory=root,UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,RedirectStandardOutput=true,RedirectStandardError=true,RedirectStandardInput=true,StandardOutputEncoding=System.Text.Encoding.UTF8,StandardErrorEncoding=System.Text.Encoding.UTF8};
   start.EnvironmentVariables["TOWER_LAUNCHER_MANAGED"]="1";
   start.EnvironmentVariables.Remove("NODE_OPTIONS");
   using(ManagedProcessJob job=new ManagedProcessJob()) using(Process child=new Process()) {
    child.StartInfo=start;child.EnableRaisingEvents=true;int exitCode=1;string lastError=null;
    Form window=null;Label status=null;ProgressBar progress=null;NotifyIcon tray=null;
    Action<Action> dispatch=action=>{if(window!=null&&!window.IsDisposed&&window.IsHandleCreated){try{window.BeginInvoke(action);}catch(InvalidOperationException){}}};
    if(!headless){
     Application.EnableVisualStyles();window=new Form(){Text="Pokémon Tower",Width=470,Height=210,StartPosition=FormStartPosition.CenterScreen,FormBorderStyle=FormBorderStyle.FixedDialog,MaximizeBox=false};
     try{window.Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);}catch{}
     status=new Label(){Left=24,Top=25,Width=410,Height=65,Text="게임 실행을 준비하고 있습니다."};progress=new ProgressBar(){Left=24,Top=105,Width=410,Height=22,Style=ProgressBarStyle.Marquee};window.Controls.Add(status);window.Controls.Add(progress);
     tray=new NotifyIcon(){Icon=window.Icon,Text="Pokémon Tower",Visible=false};
     Action openGame=()=>{try{if(!child.HasExited)child.StandardInput.WriteLine("open");}catch(Exception error){tray.ShowBalloonTip(5000,"Pokémon Tower","게임 화면을 열지 못했습니다. "+error.Message,ToolTipIcon.Warning);}};
     tray.DoubleClick+=(s,e)=>openGame();
     ContextMenuStrip menu=new ContextMenuStrip();menu.Items.Add("Pokemon Tower 열기",null,(s,e)=>openGame());menu.Items.Add(new ToolStripSeparator());menu.Items.Add("종료",null,(s,e)=>window.Close());tray.ContextMenuStrip=menu;
     window.FormClosing+=(s,e)=>{try{if(!child.HasExited)child.StandardInput.WriteLine("stop");}catch{};};
    }
    child.OutputDataReceived+=(sender,e)=>{
     if(e.Data==null)return;
     try {
      Dictionary<string,object> item=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(e.Data);string kind=Convert.ToString(item["type"]);
      if(kind=="error")lastError=Convert.ToString(item["message"])+"\n\n단계: "+Convert.ToString(item["stage"])+"\n오류 코드: "+Convert.ToString(item["code"])+"\n로그: "+Convert.ToString(item["log"]);
      if(kind=="browser"){
       // Launch from the EXE, outside the game's job: closing the game must not kill the browser.
       Action browse=()=>{try{
        string origin=Convert.ToString(item["origin"]);
        if(origin!="http://127.0.0.1:3000"&&origin!="http://127.0.0.1:3000/")throw new Exception("게임 주소가 올바르지 않습니다.");
        using(Process browser=Process.Start(new ProcessStartInfo(origin){UseShellExecute=true})){}
        File.AppendAllText(bootstrapLog,"Browser opened by EXE: "+origin+Environment.NewLine);
       }catch(Exception error){File.AppendAllText(bootstrapLog,"Browser error: "+Sanitize(error.Message)+Environment.NewLine);if(tray!=null)tray.ShowBalloonTip(5000,"Pokémon Tower","게임 화면을 열지 못했습니다.",ToolTipIcon.Warning);}};
       if(headless)browse();else dispatch(browse);
      }
      dispatch(()=>{
       if(kind=="install"){window.Show();status.Text=Convert.ToString(item["message"]);progress.Style=ProgressBarStyle.Continuous;progress.Value=Convert.ToInt32(item["progress"]);}
       if(kind=="ready"){window.Hide();tray.Visible=true;tray.Text="Pokémon Tower 실행 중";}
       if(kind=="warning")tray.ShowBalloonTip(5000,"Pokémon Tower",Convert.ToString(item["message"]),ToolTipIcon.Warning);
      });
     } catch { /* Detail is already captured by the Node launcher log. */ }
    };
    child.ErrorDataReceived+=(s,e)=>{if(e.Data!=null)File.AppendAllText(bootstrapLog,Sanitize(e.Data)+Environment.NewLine);};
    child.Exited+=(s,e)=>{exitCode=child.ExitCode;dispatch(()=>window.Close());};
    child.Start();
    try{job.Assign(child);}catch{if(!child.HasExited){child.Kill();child.WaitForExit();}throw;}
    child.BeginOutputReadLine();child.BeginErrorReadLine();
    // The Node entry point cannot spawn tools/server until job membership is established.
    child.StandardInput.WriteLine("start");
    if(!headless){window.Shown+=(s,e)=>{if(child.HasExited)window.Close();};Application.Run(window);if(tray!=null)tray.Dispose();}
    if(!child.WaitForExit(headless?-1:8000)) {
     File.AppendAllText(bootstrapLog,"Graceful stop timed out; closing owned process job."+Environment.NewLine);
     job.Dispose();if(!child.WaitForExit(5000))throw new Exception("게임의 종료를 확인할 수 없습니다. 로그를 확인해 주세요.");
    }
    child.WaitForExit();exitCode=child.ExitCode;
    // Reap any remaining descendants before an error dialog can keep the EXE open.
    job.Dispose();
    File.AppendAllText(bootstrapLog,"Exit code: "+exitCode+Environment.NewLine);
    if(exitCode!=0&&!headless)MessageBox.Show(lastError??("게임을 실행하지 못했습니다. 로그를 확인해 주세요.\n"+bootstrapLog),"Pokémon Tower",MessageBoxButtons.OK,MessageBoxIcon.Error);
    return exitCode;
   }
  }catch(Exception error){try{File.AppendAllText(bootstrapLog,"Bootstrap failed: "+error.Message+Environment.NewLine);}catch{}if(!headless)MessageBox.Show(error.Message+"\n로그: "+bootstrapLog,"Pokémon Tower 실행 오류",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
 }
}
