import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,unlink} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {runTasks,tasks} from '../scripts/assets/manage.mjs';
import {readMarker,publishMarker,ensureWritableSaves,requireNode,sentinels,requiredRoots,childPath} from '../scripts/player/state.mjs';
import {checkPython,install} from '../scripts/player/install.mjs';
import {claimPort,startProduction} from '../scripts/player/server.mjs';
import {createServer} from 'node:net';
import {PassThrough} from 'node:stream';
import {waitForManagedStart} from '../scripts/player/managed-start.mjs';
import {spawn} from 'node:child_process';
const config={schemaVersion:1,launcherVersion:'1',appVersion:'1',assetVersion:'1',buildVersion:'1'};
const result=(ok:boolean)=>({ok,matching:ok?1:0,missing:ok?[]:['missing'],extra:[],mismatched:[]});

test('managed entry waits for ownership before starting and preserves buffered stop commands',async()=>{
 const input=new PassThrough();const ready=waitForManagedStart(input,1000);
 input.write('sta');input.write('rt\r\nstop\n');assert.equal(await ready,true);assert.equal(input.read().toString(),'stop\n');input.destroy();
 const closed=new PassThrough();const ended=waitForManagedStart(closed,1000);closed.end();assert.equal(await ended,false);
 const wrong=new PassThrough();const rejected=waitForManagedStart(wrong,1000);wrong.end('other\n');assert.equal(await rejected,false);
 const silent=new PassThrough();assert.equal(await waitForManagedStart(silent,10),false);silent.destroy();
});

test('managed early failure exits even while the EXE input pipe stays open',async()=>{
 const home=await mkdtemp(path.join(tmpdir(),'tower-managed-failure-'));
 const child=spawn(process.execPath,['scripts/player-launcher.mjs','--check','--home',home],{cwd:process.cwd(),env:{...process.env,TOWER_LAUNCHER_MANAGED:'1'},stdio:['pipe','pipe','pipe'],windowsHide:true});
 let output='',timeout;child.stdout.on('data',data=>{output+=data;});child.stderr.resume();
 try{
  child.stdin.on('error',()=>{});child.stdin.write('start\n'); // Intentionally keep it open like the EXE.
  const exit=new Promise<number|null>((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  const code=await Promise.race([exit,new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('Managed error left an input pipe alive')),3000);})]);
  assert.equal(code,1);assert.match(output,/"type":"error"/);
 }finally{clearTimeout(timeout);if(child.exitCode===null)child.kill();child.stdin.destroy();await rm(home,{recursive:true,force:true});}
});

test('asset setup restores the six aggregates once in order and skips complete packs',async()=>{
 const calls:string[][]=[],log:string[]=[];let inspected=0;
 await runTasks('setup',{offline:true,python:'selected-python'},{inspect:async()=>Array.from({length:6},()=>result(inspected++>5)),run:async(args:string[])=>calls.push(args),log:(line:string)=>log.push(line)});
 assert.equal(calls.length,6);assert.deepEqual(calls.map(c=>c[0]),['scripts/assets/pokerogue/restore.mjs','scripts/assets/showdown-pokemon/restore.mjs','scripts/assets/pokeapi/restore.mjs',...Array(3).fill('scripts/assets/mixed/runtime.mjs')]);
 assert.deepEqual(calls.slice(3).map(c=>c[2]),['trainers','gimmicks','items']);assert.ok(calls.every(c=>c.includes('--offline')));assert.ok(calls[0].includes('selected-python'));
 await runTasks('setup',{}, {inspect:async()=>tasks.map(()=>result(true)),run:async()=>{throw Error('Unexpected reinstall');},log:()=>{}});
});
test('verify reports all failed packs and setup stops at a failed provider',async()=>{
 const lines:string[]=[];await assert.rejects(runTasks('verify',{}, {inspect:async()=>tasks.map(()=>result(false)),log:(v:string)=>lines.push(v)}),/incomplete/);assert.equal(lines.filter(v=>v.includes('FAILED')).length,6);
 let calls=0;await assert.rejects(runTasks('setup',{}, {inspect:async()=>tasks.map(()=>result(false)),run:async()=>{calls++;throw Error('network failed');},log:()=>{}}),/network failed/);assert.equal(calls,1);
});
test('marker validates versions and a constant-size sentinel set without full asset hashing',async()=>{
 const home=await mkdtemp(path.join(tmpdir(),'tower-player-state-')),directory=path.join(home,'packages/game'),node=path.join(home,'runtime/node.exe');
 try{
  assert.equal((await readMarker(home,config)).ok,false);
  await mkdir(path.dirname(node),{recursive:true});await writeFile(node,'node');
  for(const dir of requiredRoots)await mkdir(path.join(directory,dir),{recursive:true});
  for(const file of ['server.js','scripts/start-deploy.mjs','scripts/dependency-links.json','.next/BUILD_ID','package.json',...sentinels]){await mkdir(path.dirname(path.join(directory,file)),{recursive:true});await writeFile(path.join(directory,file),'fixture');}
  await publishMarker(home,config,directory,node);assert.equal((await readMarker(home,config)).ok,true);
  assert.equal((await readMarker(home,{...config,appVersion:'2'})).ok,false);
  await unlink(path.join(directory,sentinels[0]));assert.equal((await readMarker(home,config)).ok,false);
  await writeFile(path.join(home,'.install-complete.json'),'broken');assert.equal((await readMarker(home,config)).ok,false);
  assert.throws(()=>childPath(home,'../outside'),/설치 경로/);
 }finally{await rm(home,{recursive:true,force:true});}
});
test('save checks preserve an existing DB; write errors, old Node and missing image tool explain the remedy',async()=>{
 const home=await mkdtemp(path.join(tmpdir(),'tower-player-save-'));
 try{
  const db=await ensureWritableSaves(home);await writeFile(db,'save sentinel');await ensureWritableSaves(home);assert.equal(await readFile(db,'utf8'),'save sentinel');
  const blocked=path.join(home,'blocked');await mkdir(blocked);await writeFile(path.join(blocked,'saves'),'not a directory');await assert.rejects(ensureWritableSaves(blocked));
  assert.throws(()=>requireNode('22.0.0'),/24/);await assert.rejects(checkPython('definitely-missing-pokemon-python'),/Pillow==12.3.0/);
 }finally{await rm(home,{recursive:true,force:true});}
});
test('port conflict fails without opening an unrelated service',async()=>{
 const server=createServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const address=server.address() as {port:number};await assert.rejects(claimPort(address.port),/포트가 사용 중/);}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('failed source install writes no success marker and leaves save data intact',async()=>{
 const home=await mkdtemp(path.join(tmpdir(),'tower-player-failure-'));try{
  const db=await ensureWritableSaves(home);await writeFile(db,'save sentinel');
  await assert.rejects(install({root:process.cwd(),home,config,log:{write:()=>{},file:'test'},event:()=>{}},{checkPython:async()=>{},run:async()=>{throw Error('Network unavailable');}}),/Network unavailable/);
  assert.equal((await readMarker(home,config)).ok,false);assert.equal(await readFile(db,'utf8'),'save sentinel');
 }finally{await rm(home,{recursive:true,force:true});}
});
test('an intentional game shutdown returns success rather than a startup error',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'tower-player-shutdown-'));
 const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=(probe.address() as {port:number}).port;await new Promise<void>(resolve=>probe.close(()=>resolve()));
 try{
  await mkdir(path.join(directory,'scripts'));
  await writeFile(path.join(directory,'scripts/start-deploy.mjs'),"import http from 'node:http';http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'ok'}));}).listen(Number(process.env.PORT),'127.0.0.1');");
  const code=await startProduction({directory,node:process.execPath,db:path.join(directory,'unused.sqlite'),log:{write:()=>{}},event:()=>{process.stdin.emit('data',Buffer.from('stop\n'));},noBrowser:true,port});
  assert.equal(code,0);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('tray open commands reuse the healthy server, preserve UTF-8 messages and never restart it',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'tower-player-reopen-'));
 const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=(probe.address() as {port:number}).port;await new Promise<void>(resolve=>probe.close(()=>resolve()));
 const opened:string[]=[],events:{type:string,message?:string}[]=[],logs:string[]=[];
 const waitFor=async(predicate:()=>boolean)=>{for(let i=0;i<200&&!predicate();i++)await new Promise(r=>setTimeout(r,10));assert.ok(predicate(),'Expected launcher response');};
 try{
  await mkdir(path.join(directory,'scripts'));
  await writeFile(path.join(directory,'scripts/start-deploy.mjs'),"import http from 'node:http';let healthy=true;http.createServer((req,res)=>{if(req.url==='/fail')healthy=false;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:healthy?'ok':'failed',pid:process.pid}));}).listen(Number(process.env.PORT),'127.0.0.1');");
  const running=startProduction({directory,node:process.execPath,db:path.join(directory,'unused.sqlite'),log:{write:(line:string)=>logs.push(line)},event:(item:{type:string,message?:string})=>events.push(item),noBrowser:true,port,browse:(url:string)=>opened.push(url)});
  try{
   await waitFor(()=>events.some(e=>e.type==='ready'));
   const origin=`http://127.0.0.1:${port}`,before=await (await fetch(origin+'/api/health')).json();
   assert.equal(events[0].message,'게임을 시작했습니다.');
   // A partial pipe write is not a command until the newline arrives.
   process.stdin.emit('data',Buffer.from('op'));await new Promise(r=>setTimeout(r,20));assert.equal(opened.length,0);
   process.stdin.emit('data',Buffer.from('en\r\n'));await waitFor(()=>opened.length===1);
   for(let i=2;i<=4;i++){process.stdin.emit('data',Buffer.from('open\n'));await waitFor(()=>opened.length===i);}
   assert.deepEqual(opened,Array(4).fill(origin+'/'));
   assert.equal((await (await fetch(origin+'/api/health')).json()).pid,before.pid);
   assert.equal(logs.filter(line=>line.startsWith('Server start:')).length,1);
   await fetch(origin+'/fail');process.stdin.emit('data',Buffer.from('open\n'));await waitFor(()=>events.some(e=>e.type==='warning'));
   assert.equal(opened.length,4);assert.match(events.find(e=>e.type==='warning')!.message!,/게임 서버에 연결하지 못했습니다/);
  }finally{process.stdin.emit('data',Buffer.from('stop\n'));assert.equal(await running,0);}
 }finally{await rm(directory,{recursive:true,force:true});}
});
