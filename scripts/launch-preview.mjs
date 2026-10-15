import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {access,readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve,join,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {homedir} from 'node:os';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const execute=promisify(execFile),action=process.argv[2]??'start';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function findFile(candidates){for(const candidate of candidates.filter(Boolean)){try{await access(candidate);return candidate;}catch{}}}
async function main(){
 if(!['start','stop','status','check'].includes(action))throw Error('start / stop / status / check 중 하나를 지정하세요.');
 if(Number(process.versions.node.split('.')[0])<24)throw Error('Node.js 24 이상이 필요합니다.');
 const docker=await findFile([
  ...(process.env.PATH??'').split(delimiter).map(folder=>join(folder,'docker.exe')),
  process.env.LOCALAPPDATA&&join(process.env.LOCALAPPDATA,'Programs','DockerDesktop','resources','bin','docker.exe'),
  join(homedir(),'AppData','Local','Programs','DockerDesktop','resources','bin','docker.exe'),
  process.env.ProgramFiles&&join(process.env.ProgramFiles,'Docker','Docker','resources','bin','docker.exe'),
 ]);
 if(!docker)throw Error('Docker Desktop을 설치한 뒤 다시 실행해 주세요.');
 const env={...process.env};for(const key of Object.keys(env))if(key.toLowerCase()==='path')delete env[key];
 env.PATH=dirname(docker)+delimiter+(process.env.PATH??'');
 const read=(file,args,timeout=10000)=>execute(file,args,{cwd:root,env,windowsHide:true,timeout,maxBuffer:5*1024*1024}).then(result=>result.stdout.trim());
 const engineReady=async()=>{try{return await read(docker,['info','--format','{{.OSType}}'],5000)==='linux';}catch{return false;}};
 if(action==='check'){
  console.log(`Node.js ${process.versions.node}\nDocker: ${docker}\nDocker 엔진: ${await engineReady()?'실행 중':'꺼져 있음 (게임 실행 시 자동 시작)'}\n실행 폴더: ${root}`);return;
 }
 console.log('\n포켓몬 타워 · 개인 플레이 실행기\n');
 if(!await engineReady()){
  if(action!=='start'){console.log('Docker가 꺼져 있습니다. 게임 서버도 실행 중이 아닙니다.');return;}
  const desktop=await findFile([
   resolve(dirname(docker),'..','..','Docker Desktop.exe'),
   process.env.LOCALAPPDATA&&join(process.env.LOCALAPPDATA,'Programs','DockerDesktop','Docker Desktop.exe'),
   join(homedir(),'AppData','Local','Programs','DockerDesktop','Docker Desktop.exe'),
   process.env.ProgramFiles&&join(process.env.ProgramFiles,'Docker','Docker','Docker Desktop.exe'),
  ]);
  if(!desktop)throw Error('Docker Desktop을 직접 실행한 뒤 다시 시도해 주세요.');
  console.log('1/3 Docker Desktop을 켜고 있습니다. 처음에는 잠시 걸릴 수 있어요.');
  const child=spawn(desktop,[],{detached:true,stdio:'ignore',windowsHide:true});
  await once(child,'spawn');child.unref();
  const deadline=Date.now()+120000;let ready=false,lastNotice=Date.now();
  while(Date.now()<deadline){if(await engineReady()){ready=true;break;}if(Date.now()-lastNotice>15000){console.log('Docker의 Linux 엔진을 기다리고 있습니다…');lastNotice=Date.now();}await sleep(2000);}
  if(!ready)throw Error('Docker가 아직 준비되지 않았습니다. Docker Desktop의 Linux 엔진 상태를 확인한 뒤 다시 실행해 주세요.');
 }
 const compose=['compose','-p','tower-preview','--env-file','.data/preview.env','-f','compose.yaml','-f','compose.preview.yaml'];
 if(action==='status'){
  let services='';try{services=await read(docker,[...compose,'ps','--status','running','--services']);}catch{}
  if(!services.split(/\r?\n/).includes('game')||!services.split(/\r?\n/).includes('tunnel')){console.log('게임 또는 터널이 꺼져 있습니다. 「포켓몬타워 실행.cmd」로 켜 주세요.');return;}
 }else{
  console.log(action==='start'?'2/3 게임 서버·저장 DB·임시 터널을 준비합니다. 최초 실행이나 업데이트에는 몇 분 걸릴 수 있어요.':'게임 서버와 터널을 종료합니다. 저장 데이터는 유지됩니다.');
  const child=spawn(process.execPath,[join(root,'scripts','preview.mjs'),action,...(process.argv.includes('--no-build')?['--no-build']:[])],{cwd:root,env,stdio:'inherit',windowsHide:true});
  const progress=setInterval(()=>console.log('준비 중입니다… 이 창을 그대로 두세요.'),15000);
  try{const [code]=await once(child,'exit');if(code!==0)throw Error('서버 실행 단계가 실패했습니다. 위 오류 내용을 확인해 주세요.');}finally{clearInterval(progress);}
  if(action==='stop'){console.log('\n종료했습니다. 다음 실행에도 기존 저장을 이어 씁니다.');return;}
 }
 const settings=await readFile('.data/preview.env','utf8'),origin=settings.match(/^TOWER_ORIGIN=(https:\/\/[a-z0-9-]+\.trycloudflare\.com)\s*$/m)?.[1];
 const port=settings.match(/^TOWER_PORT=(\d+)\s*$/m)?.[1]??'3004';
 if(!origin)throw Error('게임 주소를 찾지 못했습니다. 실행 파일을 다시 실행해 주세요.');
 if(action==='start'){
  const deadline=Date.now()+60000;let ready=false;
  while(Date.now()<deadline){try{if((await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}}catch{}await sleep(1000);}
  if(!ready)throw Error('게임 서버가 아직 준비되지 않았습니다. 실행기의 ‘상태 새로고침’으로 확인해 주세요.');
 }
 await mkdir('.data',{recursive:true});await writeFile('.data/preview-url.txt',origin+'\n');
 console.log(`\n${action==='start'?'3/3 실행 완료!':'실행 중'}\n\n게임 주소: ${origin}\n\n이 PC와 휴대폰에서 같은 주소로 접속하세요.\n주소는 .data/preview-url.txt에도 저장됩니다.\n이 창을 닫아도 게임은 켜져 있습니다.\n게임을 끌 때는 실행기의 ‘서버 끄기’를 누르세요.\n저장: 기존 tower-preview 전용 DB (로컬 개발 저장과 별도)\n`);
 if(action==='start'&&!process.argv.includes('--no-browser')){
  const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler',origin],{detached:true,stdio:'ignore',windowsHide:true});
  browser.on('error',()=>console.log('브라우저에서 위 게임 주소를 직접 열어 주세요.'));browser.unref();
 }
}
main().catch(error=>{console.error(`\n실행하지 못했습니다: ${error.message}`);process.exitCode=1;});
