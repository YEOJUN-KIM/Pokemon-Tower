import {appendFileSync,existsSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {release,tmpdir} from 'node:os';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const logFile=process.argv[2]||join(tmpdir(),'Pokemon-Tower',`setup-${Date.now()}.log`);
mkdirSync(dirname(logFile),{recursive:true});
let stage='environment check',finished=false,activeChild,interrupted=false;
const secrets=Object.entries(process.env).filter(([key,value])=>/TOKEN|PASSWORD|SECRET|CREDENTIAL|API_KEY|AUTH/i.test(key)&&value&&value.length>=4).map(([,value])=>value);
function redact(value){
  let text=String(value);
  for(const secret of secrets)text=text.split(secret).join('[REDACTED]');
  return text.replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi,'$1[REDACTED]@')
    .replace(/((?:_authToken|password|token|authorization)\s*[=:]\s*)(?:Bearer\s+)?[^\s]+/gi,'$1[REDACTED]');
}
function log(message){appendFileSync(logFile,redact(message)+'\n');}
function say(message){const safe=redact(message);log(safe);process.stdout.write(safe+'\n');}
function fail(error){
  if(finished)return;
  finished=true;
  const code=Number.isInteger(error?.code)&&error.code!==0?error.code:1;
  log(`SETUP RESULT: FAILED\nStage: ${stage}\nExit code: ${code}\nReason: ${error?.stack||error}`);
  process.stdout.write(`Pokémon Tower 설치에 실패했습니다.\n실패 단계: ${stage}\n오류 코드: ${code}\n설치 로그: ${logFile}\n이 로그 파일을 전달하면 문제를 확인할 수 있습니다.\n`);
  activeChild?.kill();
  process.exit(code);
}
process.on('uncaughtException',fail);
process.on('unhandledRejection',fail);
process.on('SIGINT',()=>{interrupted=true;if(stage!=='launch')fail(Error('Installation interrupted by user'));});

function findTool(name){
  for(const directory of (process.env.PATH||'').split(';')){
    const clean=directory.trim().replace(/^"|"$/g,'');
    if(clean&&existsSync(resolve(clean,name)))return resolve(clean,name);
  }
  return undefined;
}
async function run(file,args,{batch=false,onStarted}={}){
  log(`Command: ${JSON.stringify([file,...args])}`);
  const command=batch?(process.env.ComSpec||join(process.env.SystemRoot,'System32','cmd.exe')):file;
  const commandArgs=batch?['/d','/s','/c',`""${file}" ${args.join(' ')}"`]:args;
  return await new Promise((resolveRun,reject)=>{
    const child=spawn(command,commandArgs,{cwd:root,env:process.env,stdio:['inherit','pipe','pipe'],windowsVerbatimArguments:batch});
    activeChild=child;
    let output='';
    for(const [kind,stream]of [['stdout',child.stdout],['stderr',child.stderr]]){
      const reader=createInterface({input:stream});
      reader.on('line',line=>{const safe=redact(line);output+=safe+'\n';log(`[${kind}] ${safe}`);process.stdout.write(safe+'\n');});
    }
    child.once('spawn',()=>onStarted?.());
    child.once('error',reject);
    child.once('close',(code,signal)=>{
      activeChild=undefined;
      log(`Exit code: ${code??1}${signal?`; signal: ${signal}`:''}`);
      resolveRun({code:code??1,output});
    });
  });
}
function requireSuccess(result,reason){if(result.code!==0)throw Object.assign(Error(reason),{code:result.code});}

async function main(){
  log(`Started: ${new Date().toISOString()}\nWorking directory: ${process.cwd()}\nScript directory: ${root}\nWindows version: ${release()}\nComSpec: ${process.env.ComSpec||'not set'}\nPATH: omitted for privacy\nNode path: ${process.execPath}\nNode version: ${process.versions.node}`);
  log('[STEP] environment check');
  say('[1/3] Node.js와 설치 도구 확인');
  if(Number(process.versions.node.split('.')[0])<24)throw Error(`현재 Node.js v${process.versions.node}은 지원되지 않습니다. Node.js 24 이상을 설치해 주세요. https://nodejs.org/`);
  const npm=findTool('npm.cmd');
  log(`npm path: ${npm||'not found'}`);
  if(!npm)throw Error('npm을 찾을 수 없습니다. Node.js 공식 설치 프로그램으로 다시 설치해 주세요.');
  // Official Node installers ship npm's CLI beside npm.cmd. Prefer Node directly
  // so batch wrappers cannot terminate the setup process. Custom shims are isolated.
  const npmCli=join(dirname(npm),'node_modules','npm','bin','npm-cli.js');
  const npmRun=args=>existsSync(npmCli)?run(process.execPath,[npmCli,...args]):run(npm,args,{batch:true});
  const npmVersion=await npmRun(['--version']);
  log(`npm version: ${npmVersion.output.trim()}`);
  requireSuccess(npmVersion,'npm을 실행할 수 없습니다. Node.js 공식 설치 프로그램으로 다시 설치해 주세요.');
  const npx=findTool('npx.cmd');
  log(`npx path: ${npx||'not found; npm exec is used instead'}`);
  if(npx){const version=await run(npx,['--version'],{batch:true});log(`npx version: ${version.output.trim()||'unavailable'} (optional)`);}
  else log('npx version: unavailable (optional; npm exec is used)');
  stage='dependency install';log('[STEP] dependency install');
  say('[2/3] 프로젝트 파일 설치');
  requireSuccess(await npmRun(['exec','--yes','--package=pnpm@11.19.0','--','pnpm','install','--frozen-lockfile']),'프로젝트 의존성 설치에 실패했습니다. 인터넷 연결과 위 오류 내용을 확인해 주세요.');
  say('Pokémon Tower 설치가 완료되었습니다.');
  say('다음부터는 포켓몬타워 로컬 실행.cmd만 실행하면 됩니다.');
  log('Dependencies installed successfully.');
  stage='launch';log('[STEP] launch');
  say('[3/3] 게임 실행 시작');
  const launch=await run(join(root,'포켓몬타워 로컬 실행.cmd'),[],{batch:true,onStarted:()=>log('Launcher started.')});
  if(!interrupted)requireSuccess(launch,'로컬 실행 CMD가 실패했습니다.');
  say(`설치 로그: ${logFile}`);
  log('SETUP RESULT: SUCCESS\nDependencies installed successfully.\nLauncher started.');
  finished=true;
}

try{await main();}catch(error){fail(error);}
