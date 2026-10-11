import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {randomUUID} from 'node:crypto';

const probe=createServer();
probe.listen(0,'127.0.0.1');
await once(probe,'listening');
const port=probe.address().port;
await new Promise(resolve=>probe.close(resolve));
const address=`http://127.0.0.1:${port}`;
const origin='https://container-check.example';
const env={...process.env,TOWER_PORT:String(port),TOWER_ORIGIN:origin};
const backup=`/data/backups/verify-${randomUUID()}.sqlite`;
async function compose(...args) {
  const child=spawn('docker',['compose','-p','tower-package-check',...args],{env,windowsHide:true,stdio:'pipe'});
  let output='';
  child.stdout.on('data',chunk=>output+=chunk);
  child.stderr.on('data',chunk=>output+=chunk);
  const [code]=await once(child,'exit');
  assert.equal(code,0,output);
  return output;
}
async function ready() {
  const deadline=Date.now()+30000;
  while(Date.now()<deadline) {
    try {if((await fetch(`${address}/api/health`,{signal:AbortSignal.timeout(1000)})).ok)return;}
    catch {}
    await new Promise(resolve=>setTimeout(resolve,300));
  }
  throw new Error(`Container startup timed out:\n${await compose('logs','--tail=50','game')}`);
}
async function json(response) {
  assert.equal(response.status,200,await response.clone().text());
  return response.json();
}
function comparable(state) {
  const copy=structuredClone(state);
  copy.battle.messages=copy.battle.messages.filter(line=>!line.startsWith('|t:|'));
  return copy;
}
try {
  await compose('up','-d','--no-build');
  await ready();
  assert.equal((await fetch(address)).status,200);
  assert.equal((await fetch(`${address}/fonts/neodgm.woff2`)).status,200);
  assert.equal((await fetch(`${address}/vendor/showdown/pokemon/gen5ani-back/zygarde.gif`)).status,200);
  const first=await fetch(`${address}/api/battle`);
  await json(first.clone());
  const cookieHeader=first.headers.get('set-cookie');
  assert.match(cookieHeader,/; Secure/i);
  const cookie=cookieHeader.split(';')[0];
  const headers={Cookie:cookie,Origin:origin,'Content-Type':'application/json'};
  const post=body=>fetch(`${address}/api/battle`,{method:'POST',headers,body:JSON.stringify(body)}).then(json);
  const start=await post({type:'start',selected:['Charizard','Blastoise','Venusaur']});
  const before=await post({type:'action',battleId:start.battle.id,requestId:start.battle.requestId,action:'move 1'});
  assert.ok(before.battle.requestId>start.battle.requestId);
  await compose('exec','-T','game','node','scripts/backup-db.mjs',backup);
  // Recreate the container, verifying the named volume outlives the container itself.
  await compose('up','-d','--no-build','--force-recreate');
  await ready();
  assert.deepEqual(comparable(await json(await fetch(`${address}/api/battle`,{headers}))),comparable(before));
  await compose('stop','game');
  // This project owns a separate test volume; never access the local player's database.
  await compose('run','--rm','--no-deps','--entrypoint','node','game','-e',`const fs=require('node:fs');fs.copyFileSync(${JSON.stringify(backup)},'/data/tower.sqlite');for(const suffix of ['-wal','-shm'])fs.rmSync('/data/tower.sqlite'+suffix,{force:true});`);
  await compose('up','-d','--no-build');
  await ready();
  assert.deepEqual(comparable(await json(await fetch(`${address}/api/battle`,{headers}))),comparable(before));
  console.log('PASS: Linux Docker page/assets, HTTPS cookie, battle turn, container replacement with persistent volume, live backup and restore.');
} finally {
  await compose('down');
}
