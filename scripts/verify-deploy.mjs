import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {readdir, mkdir, copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

const packages = (await readdir('dist')).filter(name=>name.startsWith('tower-')).sort();
const directory = resolve(process.argv[2] || `dist/${packages.at(-1)}`);
const data = resolve(`.data/deploy-tests/${randomUUID()}`);
await mkdir(data, {recursive:true});
const probe = createServer();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const port = probe.address().port;
await new Promise(resolve=>probe.close(resolve));
const address = `http://127.0.0.1:${port}`;
// Model an HTTPS reverse proxy terminating TLS in front of this HTTP server.
const publicOrigin = 'https://deployment-check.example';
let server;
let output = '';
const environment = {...process.env, NODE_ENV:'production', HOSTNAME:'127.0.0.1', PORT:String(port), TOWER_DB_PATH:`${data}/tower.sqlite`, TOWER_ORIGIN:publicOrigin};
delete environment.NODE_OPTIONS;
async function boot() {
  output = '';
  server = spawn(process.execPath, ['scripts/start-deploy.mjs'], {cwd:directory, env:environment, windowsHide:true, stdio:['ignore','pipe','pipe']});
  server.stdout.on('data', chunk=>output+=chunk);
  server.stderr.on('data', chunk=>output+=chunk);
  let startupError;
  server.on('error', error=>startupError=error);
  const deadline = Date.now()+20000;
  while(Date.now()<deadline) {
    if(startupError)throw startupError;
    if(server.exitCode!==null)throw new Error(`Server exited: ${output}`);
    try {if((await fetch(`${address}/api/health`, {signal:AbortSignal.timeout(1000)})).ok)return;}
    catch {}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw new Error(`Server startup timed out: ${output}`);
}
async function stop() {
  if(server && server.exitCode===null) {
    const exited=once(server,'exit');
    server.kill();
    await exited;
  }
}
async function state(cookie) {
  const response=await fetch(`${address}/api/battle`, {headers:cookie?{Cookie:cookie}:{}});
  assert.equal(response.status,200,await response.clone().text());
  return {response, body:await response.json()};
}
async function post(cookie, body, origin=publicOrigin) {
  return fetch(`${address}/api/battle`, {method:'POST',headers:{Cookie:cookie, Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
}
function comparable(state) {
  const copy=structuredClone(state);
  // Showdown recreates wall-clock protocol timestamps when replaying saved inputs.
  if(copy.battle)copy.battle.messages=copy.battle.messages.filter(line=>!line.startsWith('|t:|'));
  return copy;
}
try {
  await boot();
  const page=await fetch(address);
  assert.equal(page.status,200);
  const html=await page.text();
  const script=html.match(/src="([^\"]+\/_next\/static\/[^\"]+)"/)?.[1] || html.match(/src="(\/_next\/static\/[^\"]+)"/)?.[1];
  assert.ok(script,'HTML must reference a packaged static script');
  assert.equal((await fetch(new URL(script,address))).status,200);
  const font=await fetch(`${address}/fonts/neodgm.woff2`);
  assert.equal(font.status,200);
  assert.ok((await font.arrayBuffer()).byteLength>1000);
  const sprite=await fetch(`${address}/vendor/showdown/pokemon/gen5ani-back/zygarde.gif`);
  assert.equal(sprite.status,200);
  assert.ok((await sprite.arrayBuffer()).byteLength>100);
  const initial=await state();
  const setCookie=initial.response.headers.get('set-cookie');
  assert.match(setCookie,/; Secure/i);
  const cookie=setCookie.split(';')[0];
  assert.equal((await post(cookie,{type:'start',selected:['Charizard','Blastoise','Venusaur']},'https://wrong.example')).status,403);
  const started=await post(cookie,{type:'start',selected:['Charizard','Blastoise','Venusaur']});
  assert.equal(started.status,200,await started.clone().text());
  const start=await started.json();
  const turn=await post(cookie,{type:'action',battleId:start.battle.id,requestId:start.battle.requestId,action:'move 1'});
  assert.equal(turn.status,200,await turn.clone().text());
  const before=await turn.json();
  assert.ok(before.battle.requestId>start.battle.requestId);
  const backup=spawn(process.execPath,['scripts/backup-db.mjs',`${data}/backup.sqlite`],{cwd:directory,env:environment,windowsHide:true,stdio:'pipe'});
  let backupOutput='';
  backup.stderr.on('data',chunk=>backupOutput+=chunk);
  assert.equal((await once(backup,'exit'))[0],0,backupOutput);
  await stop();
  await boot();
  const restored=(await state(cookie)).body;
  assert.deepEqual(comparable(restored),comparable(before));
  await stop();
  // Restore to a different file, never overwrite a player's actual database.
  await copyFile(`${data}/backup.sqlite`,`${data}/restored.sqlite`);
  environment.TOWER_DB_PATH=`${data}/restored.sqlite`;
  await boot();
  assert.deepEqual(comparable((await state(cookie)).body),comparable(before));
  // Seed only this verifier's isolated restored database, with the packaged server stopped.
  for(const kind of ['breeder-gift','traveling-merchant']){
    await stop();
    const db=new DatabaseSync(environment.TOWER_DB_PATH),eventId=randomUUID();let run;
    try{
      run=db.prepare('SELECT id,player_id FROM runs LIMIT 1').get();
      assert.equal(db.prepare('PRAGMA user_version').get().user_version,33);
      db.prepare("UPDATE runs SET state='select',floor=2 WHERE id=?").run(run.id);
      db.prepare("UPDATE battles SET status='complete' WHERE run_id=?").run(run.id);
      db.prepare('DELETE FROM run_events WHERE run_id=?').run(run.id);
      db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status) VALUES (?,?,1,?,'choice')").run(eventId,run.id,kind);
      db.prepare('UPDATE players SET coins=300 WHERE id=?').run(run.player_id);
    }finally{db.close();}
    await boot();
    const initialEvent=(await state(cookie)).body.tower;
    assert.equal(initialEvent.run.event.kind,kind);
    for(let repeat=0;repeat<2;repeat++)assert.equal((await post(cookie,{type:'event-choice',runId:run.id,eventId,choice:'open'})).status,200);
    const paid=(await state(cookie)).body.tower;
    assert.equal(paid.coins,kind==='traveling-merchant'?0:300);
    assert.equal(paid.permanent.eggTickets,initialEvent.permanent.eggTickets+1);
    await stop();await boot();
    assert.deepEqual((await state(cookie)).body.tower.run.event,paid.run.event);
    assert.equal((await post(cookie,{type:'event-continue',runId:run.id,eventId})).status,200);
    assert.equal((await state(cookie)).body.tower.run.event,null);
  }
  console.log(`PASS: packaged page/static/font, HTTPS cookie, origin protection, battle turn, restart, live backup/restore, event gifts and purchases with idempotency and restart.\nPackage: ${directory}\nIsolated test database: ${data}`);
} catch(error) {
  console.error(output);
  throw error;
} finally {await stop();}
