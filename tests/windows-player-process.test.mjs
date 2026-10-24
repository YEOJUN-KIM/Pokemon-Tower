import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm,access} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
async function until(predicate,label){for(let i=0;i<200;i++){if(await predicate())return;await delay(25);}throw Error('Timed out: '+label);}

test('Windows EXE owns its entire Node tree through repeated stops, forced exit and child failures',{skip:process.platform!=='win32',timeout:60000},async()=>{
 const root=process.cwd(),directory=await mkdtemp(path.join(tmpdir(),'tower-job-test-'));
 try{
  await access(path.join(root,'PokemonTower.exe')); // Run pnpm launcher:build first.
  await copyFile(path.join(root,'PokemonTower.exe'),path.join(directory,'PokemonTower.exe'));
  await mkdir(path.join(directory,'home/runtime'),{recursive:true});await mkdir(path.join(directory,'scripts'));
  await copyFile(process.execPath,path.join(directory,'home/runtime/node.exe'));
  const managed=pathToFileURL(path.join(root,'scripts/player/managed-start.mjs')).href;
  const server=pathToFileURL(path.join(root,'scripts/player/server.mjs')).href;
  // Deliberately leave a worker behind when the server is killed: the EXE job must still collect it.
  await writeFile(path.join(directory,'scripts/start-deploy.mjs'),`
import {spawn} from 'node:child_process';import {writeFileSync} from 'node:fs';import http from 'node:http';
const worker=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true});
writeFileSync('server-pids.json',JSON.stringify({server:process.pid,worker:worker.pid}));
http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'ok'}));}).listen(Number(process.env.PORT),'127.0.0.1');
`);
  await writeFile(path.join(directory,'scripts/player-launcher.mjs'),`
import {waitForManagedStart} from ${JSON.stringify(managed)};import {startProduction} from ${JSON.stringify(server)};
import {readFileSync,writeFileSync} from 'node:fs';import net from 'node:net';
if(!await waitForManagedStart())process.exit(1);
const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.exitCode=await startProduction({directory:process.cwd(),node:process.execPath,db:'unused.sqlite',log:{write:()=>{}},noBrowser:true,stopAfterHealth:process.env.TOWER_JOB_TEST_MODE==='normal',port,event:item=>{
 if(item.type==='ready')writeFileSync('pids.json',JSON.stringify({exe:process.ppid,engine:process.pid,...JSON.parse(readFileSync('server-pids.json','utf8'))}));
 process.stdout.write(JSON.stringify(item)+'\\n');
}});
`);
  for(const mode of ['normal','normal','normal','forced-exe','forced-engine','failed-server']){
   await rm(path.join(directory,'pids.json'),{force:true});
   const child=spawn(path.join(directory,'PokemonTower.exe'),['--headless','--home',path.join(directory,'home')],{cwd:directory,windowsHide:true,stdio:'ignore',env:{...process.env,TOWER_JOB_TEST_MODE:mode}});
   const exit=new Promise(resolve=>{child.once('error',error=>resolve(error));child.once('exit',code=>resolve(code));});
   let pids;
   try{
    await until(async()=>{try{pids=JSON.parse(await readFile(path.join(directory,'pids.json'),'utf8'));return true;}catch{return false;}},mode+' ready');
    assert.equal(pids.exe,child.pid);assert.ok(Number.isInteger(pids.worker));
    if(mode==='forced-exe')process.kill(child.pid); // Only EXE, intentionally not taskkill /T.
    if(mode==='forced-engine')process.kill(pids.engine);
    if(mode==='failed-server')process.kill(pids.server);
    let timeout;let code;
    try{code=await Promise.race([exit,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('EXE did not exit: '+mode)),10000);})]);}finally{clearTimeout(timeout);}
    if(mode==='normal')assert.equal(code,0);
    else if(mode!=='forced-exe')assert.notEqual(code,0);
    await until(()=>Object.values(pids).every(pid=>!alive(pid)),mode+' complete tree cleanup');
   }finally{
    for(const pid of [...Object.values(pids??{}),child.pid])if(alive(pid))try{process.kill(pid);}catch{}
    await exit;
   }
  }
 }finally{await rm(directory,{recursive:true,force:true});}
});
