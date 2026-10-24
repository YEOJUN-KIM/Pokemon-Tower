import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {createInterface} from 'node:readline';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export async function claimPort(port=3000){await new Promise((resolve,reject)=>{const probe=createServer();probe.once('error',()=>reject(Error(`${port}번 포트가 사용 중입니다. 기존 게임 또는 해당 프로그램을 종료한 뒤 다시 실행해 주세요.`)));probe.listen({host:'127.0.0.1',port,exclusive:true},()=>probe.close(resolve));});}
export function openBrowser(origin,log){
 const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler',origin],{detached:true,stdio:'ignore',windowsHide:true});browser.once('error',error=>log.write('Browser error: '+error.message));browser.unref();log.write('Browser launch requested: '+origin);
}
export async function startProduction({directory,node,db,log,event,noBrowser=false,stopAfterHealth=false,port=3000,browse=openBrowser}){
 await claimPort(port);const origin=`http://127.0.0.1:${port}`;
 // An installed game never inherits developer database, public tunnel origin or Node preloads.
 const env={...process.env,NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:String(port),TOWER_ORIGIN:origin,TOWER_DB_PATH:db};delete env.NODE_OPTIONS;
 const server=spawn(node,['scripts/start-deploy.mjs'],{cwd:directory,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])createInterface({input:stream}).on('line',line=>log.write(line));
 let startupError;const completion=new Promise(resolve=>{server.once('error',error=>{startupError=error;resolve(1);});server.once('exit',code=>resolve(code??1));});
 let stopping=false,healthy=false,opening=false;
 const isHealthy=async()=>{try{if(stopping||server.exitCode!==null||startupError)return false;const r=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(1000)});return r.ok&&(await r.json()).status==='ok';}catch{return false;}};
 const reopen=async()=>{
  if(opening)return;opening=true;
  try{
   if(healthy&&await isHealthy()&&!stopping){log.write('Tray reopen: health OK');browse(origin+'/',log);}
   else{log.write('Tray reopen: server unavailable');event({type:'warning',message:'게임 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
  }catch(error){log.write('Tray reopen failed: '+error.message);event({type:'warning',message:'게임 화면을 열지 못했습니다. 실행 로그를 확인해 주세요.'});}
  finally{opening=false;}
 };
 const stop=()=>{stopping=true;if(server.exitCode===null)server.kill();};
 const interrupt=()=>stop();process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
 // Newline-delimited commands preserve chunk boundaries and never restart the server.
 const input=createInterface({input:process.stdin});input.on('line',line=>{if(line==='stop')stop();else if(line==='open')void reopen();});
 if(process.env.TOWER_LAUNCHER_MANAGED==='1'){input.once('close',stop);if(process.stdin.readableEnded)stop();}
 try{
  log.write('Server start: '+directory);
  for(let i=0;i<120;i++){
   if(startupError)throw startupError;if(server.exitCode!==null){if(stopping)return 0;throw Error('게임 서버를 시작하지 못했습니다. 실행 로그를 확인해 주세요.');}
   if(await isHealthy()){healthy=true;break;}
   await delay(250);
  }
  if(!healthy)throw Error('게임 시작을 확인하지 못했습니다. 실행 로그를 확인해 주세요.');
  log.write('Health OK');event({type:'ready',message:'게임을 시작했습니다.',origin});
  if(!noBrowser)browse(origin,log);else log.write('Browser launch skipped by explicit --no-browser');
  if(stopAfterHealth)stop();
  const code=await completion;log.write('Server exit code: '+code+(stopping?' (requested shutdown; launcher exits 0)':''));return stopping?0:code;
 }finally{stop();await completion;process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);input.close();process.stdin.pause();}
}
