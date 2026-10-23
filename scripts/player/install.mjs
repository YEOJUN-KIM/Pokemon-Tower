import {access,mkdir,copyFile,cp,rename,lstat} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {execute} from './process.mjs';
import {publishMarker,markerName,ensureWritableSaves} from './state.mjs';
const exists=async file=>access(file).then(()=>true,()=>false);
export async function checkPython(python=process.env.PYTHON??'python'){
 const r=spawnSync(python,['-c','import sys,PIL; print(str(sys.version_info[0])+"."+str(sys.version_info[1])); print(PIL.__version__)'],{encoding:'utf8',windowsHide:true});
 const [version,pillow]=(r.stdout??'').trim().split(/\r?\n/);const [major,minor]=(version??'').split('.').map(Number);
 if(r.error||r.status!==0||major!==3||minor<10||pillow!=='12.3.0')throw Error('리소스 준비 도구가 필요합니다. Python 3.10 이상을 설치하고 python -m pip install Pillow==12.3.0 을 실행한 뒤 다시 열어 주세요. 이미 완성된 배포 묶음에서는 이 도구가 필요하지 않습니다.');
}
export async function findNpm(){
 const candidates=[path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js')];
 for(const entry of (process.env.PATH??'').split(path.delimiter))candidates.push(path.join(entry.replace(/^"|"$/g,''),'node_modules/npm/bin/npm-cli.js'));
 for(const file of candidates)if(await exists(file))return file;
 throw Error('최초 설치 도구를 찾을 수 없습니다. Node.js 공식 설치 프로그램으로 다시 설치해 주세요. https://nodejs.org/');
}
export async function install({root,home,config,log,event},dependencies={}){
 const run=dependencies.run??execute,python=dependencies.checkPython??checkPython;
 const step=(stage,progress,message)=>{log.write('Stage: '+stage);event({type:'install',stage,progress,message,log:log.file});};
 await mkdir(home,{recursive:true});await ensureWritableSaves(home);
 // A stale/corrupt marker is preserved for diagnosis but cannot signal success.
 if(await exists(path.join(home,markerName)))await rename(path.join(home,markerName),path.join(home,markerName+'.previous-'+randomUUID()));
 let directory;const distributed=await exists(path.join(root,'server.js'));
 if(distributed){
  const within=path.relative(root,home);
  if(!within||(!within.startsWith('..')&&!path.isAbsolute(within)))throw Error('설치 폴더는 배포 폴더 밖으로 지정해 주세요.');
  step('verify',25,'게임 파일을 확인하고 있습니다.');await run(process.execPath,[path.join(root,'scripts/assets/manage.mjs'),'verify'],{cwd:root,log});
  step('package',75,'실행 파일을 준비하고 있습니다.');directory=path.join(home,'packages','tower-'+randomUUID());await mkdir(path.dirname(directory),{recursive:true});
  await cp(root,directory,{recursive:true,filter:async source=>{
   const name=path.basename(source);
   return !['.data','logs','.install-complete.json','.launcher.lock'].includes(name)&&(!name.startsWith('.env')||name==='.env.example')&&!(await lstat(source)).isSymbolicLink();
  }});
 }else{
  step('tools',0,'처음 실행할 준비를 확인하고 있습니다.');
  // Python is only needed when the generated PokéRogue pack needs conversion.
  // loadDefinition is rooted in this checkout, never a developer's .data cache.
  const {loadDefinition}=await import('../assets/pokerogue/common.mjs');const {verifyOutput}=await import('../assets/pokerogue/verify.mjs');
  if(!(await verifyOutput(path.join(root,'public/vendor/pokerogue'),(await loadDefinition()).manifest)).ok)await python();
  const npm=await findNpm();
  step('dependencies',10,'처음 실행에 필요한 프로그램을 준비하고 있습니다.');
  await run(process.execPath,[npm,'exec','--yes','--package=pnpm@11.19.0','--','pnpm','install','--frozen-lockfile'],{cwd:root,log});
  step('assets',30,'게임 리소스를 준비하고 있습니다.');await run(process.execPath,['scripts/assets/manage.mjs','setup'],{cwd:root,log});
  step('verify',55,'게임 파일을 확인하고 있습니다.');await run(process.execPath,['scripts/assets/manage.mjs','verify'],{cwd:root,log});
  step('build',65,'게임 실행 파일을 만들고 있습니다.');await run(process.execPath,['--require','./scripts/windows-build-links.cjs','node_modules/next/dist/bin/next','build'],{cwd:root,log});
  step('package',85,'설치를 마무리하고 있습니다.');directory=path.join(home,'packages','tower-'+randomUUID());
  await run(process.execPath,['scripts/package-deploy.mjs','--output',directory],{cwd:root,log});
 }
 for(const file of ['server.js','scripts/start-deploy.mjs','scripts/dependency-links.json','.next/BUILD_ID'])await access(path.join(directory,file));
 await mkdir(path.join(home,'runtime'),{recursive:true});const node=path.join(home,'runtime','node.exe');
 if(!(await exists(node)))await copyFile(process.execPath,node,1);
 const marker=await publishMarker(home,config,directory,node);step('complete',100,'게임 준비가 완료되었습니다.');log.write('Install marker committed last: '+path.join(home,markerName));return {directory,node,marker};
}
