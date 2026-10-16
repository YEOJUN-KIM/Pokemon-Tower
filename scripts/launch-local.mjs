import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const next=join(root,'node_modules/next/dist/bin/next');
const origin='http://127.0.0.1:3000';

async function main(){
  if(Number(process.versions.node.split('.')[0])<24)throw Error('Node.js 24 이상이 필요합니다.');
  await access(next).catch(()=>{throw Error('의존성이 없습니다. 먼저 pnpm install --frozen-lockfile을 실행해 주세요.');});
  if(process.argv.includes('--check')){console.log('Local launcher prerequisites OK.');return;}

  // Avoid opening an unrelated service if another process owns this port.
  await new Promise((resolve,reject)=>{
    const probe=createServer();
    probe.once('error',()=>reject(Error('3000번 포트를 이미 사용 중입니다. 기존 로컬 실행 창을 확인하거나 종료한 뒤 다시 실행해 주세요.')));
    probe.listen({host:'127.0.0.1',port:3000,exclusive:true},()=>probe.close(resolve));
  });

  console.log(`포켓몬 타워 · 로컬 실행\n접속 주소: ${origin}\n종료하려면 이 창에서 Ctrl+C를 누르세요.\n`);
  // Next loads .env.local itself. Override only the web origin so an old
  // public tunnel URL cannot break local cookies or POST requests.
  const server=spawn(process.execPath,[next,'dev','--hostname','127.0.0.1','--port','3000'],{
    cwd:root,env:{...process.env,TOWER_ORIGIN:origin},stdio:'inherit',
  });
  let exited=false;
  const completion=new Promise((resolve,reject)=>{
    server.once('error',error=>{exited=true;reject(error);});
    server.once('exit',code=>{exited=true;resolve(code??1);});
  });
  // Consume failures immediately while waiting for readiness.
  completion.catch(()=>{});
  const onInterrupt=()=>{}; // The foreground Next process receives console Ctrl+C too.
  process.on('SIGINT',onInterrupt);
  try{
    const deadline=Date.now()+120000;
    while(!exited&&Date.now()<deadline){
      try{
        const response=await fetch(`${origin}/api/health`,{signal:AbortSignal.timeout(1500)});
        if(response.ok&&!exited){
          const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler',origin],{
            detached:true,stdio:'ignore',windowsHide:true,
          });
          browser.on('error',()=>console.log(`브라우저에서 ${origin} 주소를 열어 주세요.`));
          browser.unref();
          break;
        }
      }catch{}
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    if(!exited&&Date.now()>=deadline)console.log(`준비가 지연되고 있습니다. 위 오류를 확인하거나 ${origin} 주소를 직접 열어 주세요.`);
    process.exitCode=await completion;
  }finally{process.removeListener('SIGINT',onInterrupt);}
}

main().catch(error=>{console.error(`로컬 실행 실패: ${error.message}`);process.exitCode=1;});
