import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {claimPort} from '../scripts/player/server.mjs';

test('release EXE installs, relaunches, rejects duplicates, reaps children and updates without losing saves',{skip:process.platform!=='win32',timeout:240000},async()=>{
 await claimPort(); // Never stop a previously running game or use a personal save.
 const version=JSON.parse(await readFile('package.json','utf8')).version;
 const directory=path.resolve(process.env.TOWER_RELEASE_DIRECTORY??'dist/PokemonTower-Windows-v'+version);
 const home=path.resolve('artifacts/windows-release',randomUUID()+' 한글 & (QA)','home');
 await mkdir(home,{recursive:true});
 const exe=path.join(directory,'PokemonTower.exe'),marker=path.join(home,'.install-complete.json');
 const dbPath=path.join(home,'saves/tower.sqlite'),results=[];
 const env={...process.env,PATH:path.dirname(process.execPath)+';'+path.join(process.env.WINDIR,'System32'),PYTHON:'missing-python-for-release-test'};
 const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 async function until(fn,label,timeout=10000){const deadline=Date.now()+timeout;do{if(await fn())return;await delay(100);}while(Date.now()<deadline);throw Error('Timed out: '+label);}
 function launch(auto=true){
  const child=spawn(exe,['--headless','--no-browser','--home',home,...(auto?['--stop-after-health']:[])],{env,windowsHide:true,stdio:'ignore'});
  child.done=new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject);});return child;
 }
 async function finish(child,expected=0){let timer;try{const code=await Promise.race([child.done,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('EXE timeout')),90000);})]);assert.equal(code,expected);}finally{clearTimeout(timer);if(alive(child.pid))process.kill(child.pid);}}
 const setupCount=async()=>(await readdir(path.join(home,'logs'))).filter(f=>f.startsWith('setup-')).length;
 const assertFree=()=>claimPort();
 for(let i=0;i<3;i++){
  const previous=i?await readFile(marker,'utf8'):null,count=i?await setupCount():0;
  const child=launch();await finish(child);await assertFree();
  if(i){assert.equal(await readFile(marker,'utf8'),previous);assert.equal(await setupCount(),count);}
  results.push({scenario:i?'fast-relaunch-'+i:'first-install',exit:0});
 }
 const installed=JSON.parse(await readFile(marker,'utf8'));assert.equal(installed.appVersion,version);
 for(const file of (await readdir(path.join(home,'logs'))).filter(f=>f.startsWith('setup-'))){
  const log=await readFile(path.join(home,'logs',file),'utf8');
  assert.ok(log.includes('Stage: verify')&&log.includes('Stage: package'));
  assert.doesNotMatch(log,/Stage: (?:tools|dependencies|assets|build)\b/,'prebuilt release must not use developer install/build tools');
 }
 // Keep one real server running, then exercise the public API and forced-exit path.
 const held=launch(false);let pids=[held.pid];
 try{
  await until(async()=>{try{return (await fetch('http://127.0.0.1:3000/api/health')).ok;}catch{return false;}},'health',30000);
  const engine=Number(await readFile(path.join(home,'.launcher.lock'),'utf8'));pids.push(engine);
  const children=execFileSync('powershell.exe',['-NoProfile','-Command',`Get-CimInstance Win32_Process -Filter "ParentProcessId = ${engine}" | Select-Object -ExpandProperty ProcessId`],{encoding:'utf8',windowsHide:true}).trim().split(/\s+/).map(Number).filter(n=>n>0);
  pids.push(...children);assert.ok(children.length>0,'standalone server PID recorded');
  const headers={Origin:'http://127.0.0.1:3000','Content-Type':'application/json'};
  const account=await fetch('http://127.0.0.1:3000/api/account',{method:'POST',headers,body:JSON.stringify({action:'register',username:'release_qa',password:'release-qa-password-123'})});assert.equal(account.status,200);
  const cookie=account.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
  const skip=await fetch('http://127.0.0.1:3000/api/tutorial',{method:'POST',headers:{...headers,Cookie:cookie},body:JSON.stringify({event:'skip'})});assert.equal(skip.status,200);
  const state=await fetch('http://127.0.0.1:3000/api/battle?view=collection',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(state.tower.growthPoints,256);
  const duplicate=launch();await finish(duplicate,1);assert.ok(pids.every(alive));
  results.push({scenario:'duplicate-rejected',pids,growthPoints:256});
  process.kill(held.pid);await held.done;await until(()=>pids.every(pid=>!alive(pid)),'entire owned process tree exits');await assertFree();
  results.push({scenario:'force-exe-only',pids,remaining:0});
 }finally{if(alive(held.pid))process.kill(held.pid);await held.done;await until(()=>pids.every(pid=>!alive(pid)),'cleanup');}
 await finish(launch());await assertFree();results.push({scenario:'stale-lock-recovery',exit:0});
 const snapshot=()=>{const db=new DatabaseSync(dbPath);try{return {account:db.prepare('SELECT id,username,player_id,password_hash,recovery_hash FROM accounts ORDER BY id').all(),wallet:db.prepare('SELECT * FROM players ORDER BY id').all()};}finally{db.close();}};
 const before=snapshot(),old=JSON.parse(await readFile(marker,'utf8')),count=await setupCount();
 old.appVersion='1.0.0-beta.4';old.buildVersion='1.0.0-beta.4-player.1';await writeFile(marker,JSON.stringify(old));
 await finish(launch());await assertFree();
 const updated=JSON.parse(await readFile(marker,'utf8'));assert.equal(updated.appVersion,version);assert.notEqual(updated.package,old.package);assert.equal(await setupCount(),count+1);assert.deepEqual(snapshot(),before);
 await finish(launch());assert.equal(await setupCount(),count+1);await assertFree();
 results.push({scenario:'beta4-marker-update',savedAccounts:before.account.length,walletPreserved:true,fastRelaunch:true});
 await writeFile(path.join(home,'..','results.json'),JSON.stringify({directory,home,results},null,2));
 console.log(JSON.stringify({home,results}));
});
