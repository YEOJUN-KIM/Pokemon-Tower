import {readFile,mkdir,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readMarker,requireNode,ensureWritableSaves} from './player/state.mjs';
import {logger,redact,execute} from './player/process.mjs';
import {install} from './player/install.mjs';
import {startProduction} from './player/server.mjs';
import {tmpdir} from 'node:os';
export const root=fileURLToPath(new URL('../',import.meta.url));
async function launch(argv){
 const flags=new Set(['--repair','--verify','--check','--install-only','--no-browser','--stop-after-health','--headless']);
 let home=path.join(process.env.LOCALAPPDATA??process.env.HOME??root,'PokemonTower');
 for(let i=0;i<argv.length;i++){if(argv[i]==='--home'&&argv[i+1])home=path.resolve(argv[++i]);else if(!flags.has(argv[i]))throw Error('지원하지 않는 실행 옵션입니다: '+argv[i]);}
 const config=JSON.parse(await readFile(new URL('./player/config.json',import.meta.url),'utf8'));
 const log=logger(home,'launcher');let stage='environment',lock;
 const event=value=>{if(value.stage)stage=value.stage;process.stdout.write(JSON.stringify({log:log.file,...value})+'\n');};
 try{
  requireNode();log.write(`Launcher ${config.launcherVersion}; app ${config.appVersion}; startup ${new Date().toISOString()}`);
  await mkdir(home,{recursive:true});
  try{lock=await open(path.join(home,'.launcher.lock'),'wx');await lock.writeFile(String(process.pid));}
  catch(error){if(error.code!=='EEXIST')throw error;let running=true;try{const pid=Number(await readFile(path.join(home,'.launcher.lock'),'utf8'));if(!Number.isInteger(pid)||pid<1)running=false;else process.kill(pid,0);}catch{running=false;}if(running)throw Error('게임 실행기가 이미 열려 있습니다. 기존 실행 창을 확인해 주세요.');await unlink(path.join(home,'.launcher.lock'));lock=await open(path.join(home,'.launcher.lock'),'wx');await lock.writeFile(String(process.pid));}
  let state=await readMarker(home,config);log.write('Fast install check: '+(state.ok?'OK':state.reason));
  if(argv.includes('--check')){if(!state.ok)throw Error(state.reason);event({type:'checked',message:'설치 상태가 정상입니다.'});return 0;}
  stage='save-check';const db=await ensureWritableSaves(home);
  if(argv.includes('--verify')){if(!state.ok)throw Error(state.reason);stage='verify';await execute(state.node,['scripts/assets/manage.mjs','verify'],{cwd:state.directory,log});event({type:'verified',message:'게임 파일 검사가 완료되었습니다.'});return 0;}
  if(!state.ok||argv.includes('--repair')){stage='install';const setupLog=logger(home,'setup');setupLog.write('Setup start: '+new Date().toISOString());try{state={ok:true,...await install({root,home,config,log:setupLog,event})};log.write('Setup succeeded; log '+setupLog.file);}catch(error){setupLog.write(error.stack??error);throw Object.assign(error,{setupLog:setupLog.file});}}
  else log.write('Fast launch: skip dependencies, full asset hash verification, build and packaging.');
  if(argv.includes('--install-only'))return 0;
  stage='launch';return await startProduction({directory:state.directory,node:state.node,db,log,event,noBrowser:argv.includes('--no-browser'),stopAfterHealth:argv.includes('--stop-after-health')});
 }catch(error){log.write(`Error stage: ${stage}; exit code: ${error.exitCode??1}; ${error.stack??error}`);event({type:'error',stage,code:error.exitCode??1,message:redact(error.message),log:error.setupLog??log.file});return 1;}
 finally{if(lock){await lock.close();await unlink(path.join(home,'.launcher.lock')).catch(()=>{});}}
}
export async function main(argv=process.argv.slice(2)){
 try{return await launch(argv);}catch(error){
  let file='로그를 만들 수 없습니다.';
  try{const log=logger(path.join(tmpdir(),'PokemonTower'),'bootstrap');file=log.file;log.write(error.stack??error);}catch{}
  process.stdout.write(JSON.stringify({type:'error',stage:'bootstrap',code:1,message:redact('실행 준비를 완료하지 못했습니다. '+error.message),log:file})+'\n');return 1;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)process.exitCode=await main();
