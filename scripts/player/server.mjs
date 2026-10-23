import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {createInterface} from 'node:readline';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export async function claimPort(port=3000){await new Promise((resolve,reject)=>{const probe=createServer();probe.once('error',()=>reject(Error(`${port}번 포트가 사용 중입니다. 기존 게임 또는 해당 프로그램을 종료한 뒤 다시 실행해 주세요.`)));probe.listen({host:'127.0.0.1',port,exclusive:true},()=>probe.close(resolve));});}
export function openBrowser(origin,log){
 const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler',origin],{detached:true,stdio:'ignore',windowsHide:true});browser.once('error',error=>log.write('Browser error: '+error.message));browser.unref();log.write('Browser launch requested: '+origin);
}
export async function startProduction({directory,node,db,log,event,noBrowser=false,stopAfterHealth=false,port=3000}){
 await claimPort(port);const origin=`http://127.0.0.1:${port}`;
 // An installed game never inherits developer database, public tunnel origin or Node preloads.
 const env={...process.env,NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:String(port),TOWER_ORIGIN:origin,TOWER_DB_PATH:db};delete env.NODE_OPTIONS;
 const server=spawn(node,['scripts/start-deploy.mjs'],{cwd:directory,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])createInterface({input:stream}).on('line',line=>log.write(line));
 let startupError;const completion=new Promise(resolve=>{server.once('error',error=>{startupError=error;resolve(1);});server.once('exit',code=>resolve(code??1));});
 let stopping=false;
 const stop=()=>{stopping=true;if(server.exitCode===null)server.kill();};
 const interrupt=()=>stop();process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
 const input=()=>stop();process.stdin.on('data',input);process.stdin.resume();
 try{
  log.write('Server start: '+directory);let healthy=false;
  for(let i=0;i<120;i++){
   if(startupError)throw startupError;if(server.exitCode!==null){if(stopping)return 0;throw Error('게임 서버를 시작하지 못했습니다. 실행 로그를 확인해 주세요.');}
   try{const r=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(1000)});if(r.ok&&(await r.json()).status==='ok'){healthy=true;break;}}catch{}
   await delay(250);
  }
  if(!healthy)throw Error('게임 시작을 확인하지 못했습니다. 실행 로그를 확인해 주세요.');
  log.write('Health OK');event({type:'ready',message:'게임을 시작했습니다.',origin});
  if(!noBrowser)openBrowser(origin,log);else log.write('Browser launch skipped by explicit --no-browser');
  if(stopAfterHealth)stop();
  const code=await completion;log.write('Server exit code: '+code+(stopping?' (requested shutdown; launcher exits 0)':''));return stopping?0:code;
 }finally{stop();await completion;process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);process.stdin.removeListener('data',input);process.stdin.pause();}
}
