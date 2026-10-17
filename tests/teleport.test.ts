import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {TowerStore} from '../src/server/tower-store';
import {RunEvents} from '../src/server/run-events';
import {transaction} from '../src/server/storage/transaction';
import {eventDefinitions} from '../src/data/run-events';
import {createTeleportSnapshot,teleportSegment} from '../src/data/teleport';
import {starters,packTeam} from '../src/data/teams';
import {schema} from '../src/server/schema';
import {recentEncounters} from '../src/server/encounter-history';
import {finishChallengerBattle} from './challenger-fixture';

const registry={'random-teleport':eventDefinitions['random-teleport']};
function fixture(origin:number,destination:number,path=':memory:'){
 const store=new TowerStore(path,max=>max===50?(destination-1)%50:0,registry);
 store.ensurePlayer('p');const first=store.start('p',starters,'basic',{events:true}),run=store.battle(first).run_id;
 store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(first);
 store.db.prepare("UPDATE runs SET state='select',floor=? WHERE id=?").run(origin+1,run);
 store.db.prepare('INSERT INTO run_encounter_progress VALUES (?,?)').run(run,origin);
 const events=new RunEvents(store.db,max=>max===50?(destination-1)%50:0,registry);
 transaction(store.db,()=>events.encounter(run,origin));
 return {store,run,events,event:events.view(run)};
}
function finish(store:TowerStore,run:string,id:string){
 store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(id);
 store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run);
 store.recruit('p',run,id,null,null);
}
test('every destination is reachable in each segment, including the origin and endpoints',()=>{
 for(let origin=1;origin<=100;origin++){
  const segment=teleportSegment(origin);
  if(!segment){assert.throws(()=>createTeleportSnapshot(origin,()=>0));continue;}
  for(let draw=0;draw<50;draw++){
   const snapshot=createTeleportSnapshot(origin,max=>{assert.equal(max,50);return draw;});
   assert.equal(snapshot.destinationFloor,(segment===1?1:51)+draw);
   assert.equal(snapshot.originFloor,origin);assert.equal(snapshot.segment,segment);
  }
 }
});
for(const origin of [49,50,99,100])test(`teleport cannot spawn after floor ${origin}`,()=>{
 const f=fixture(origin,1);try{assert.equal(f.event,null);}finally{f.store.close();}
});
for(const [origin,destination] of [[3,41],[39,8],[53,53],[72,58],[48,50],[87,100]])test(`${origin} → ${destination}: snapshot, arrival, preparation and existing battle flow`,()=>{
 const f=fixture(origin,destination),{store,run}=f;
 try{
  const event=f.event!;assert.equal(event.kind,'random-teleport');assert.equal(event.teleport,undefined);
  assert.equal(JSON.stringify(event).includes('destinationFloor'),false);
  const before=store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(run);
  store.db.prepare('UPDATE players SET coins=321 WHERE id=?').run('p');
  store.db.prepare('INSERT INTO run_item_bag VALUES (?,?,2)').run(run,'Focus Sash');
  store.chooseEvent('p',run,event.id,'teleport');store.chooseEvent('p',run,event.id,'teleport');
  const arrived=store.view('p').run!;assert.equal(arrived.floor,destination);assert.equal(arrived.state,'select');
  assert.equal(arrived.event!.result!.title,`${destination}층에 도착했다!`);
  assert.equal(store.currentBattle('p'),null);assert.throws(()=>store.enter('p',run,destination,starters),/이벤트/);
  assert.deepEqual(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(run),before);
  assert.equal(store.view('p').coins,321);assert.equal(store.db.prepare('SELECT quantity FROM run_item_bag WHERE run_id=?').get(run)!.quantity,2);
  store.continueEvent('p',run,event.id);store.continueEvent('p',run,event.id);
  assert.equal(store.view('p').run!.event,null);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM run_events WHERE run_id=?').get(run)!.n,1);
  const id=store.enter('p',run,destination,starters);assert.equal(store.battle(id).floor,destination);
  assert.equal(store.currentBattle('p')!.id,id);
  if(destination===50||destination===100)assert.ok(store.battle(id).boss);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});
for(const choice of ['skip','teleport'])test(`both segment encounters are consumed on ${choice}, including after restart`,()=>{
 const path=`.data/tests/teleport-${randomUUID()}.sqlite`,f=fixture(8,8,path);let store=f.store;
 try{
  const saved=store.db.prepare('SELECT * FROM teleport_events').get();const event=f.event!;
  store.close();store=new TowerStore(path,()=>{throw Error('Snapshot must never reroll');},registry);
  assert.deepEqual(store.db.prepare('SELECT * FROM teleport_events').get(),saved);assert.equal(store.view('p').run!.event!.teleport,undefined);
  store.chooseEvent('p',f.run,event.id,choice);if(choice==='teleport')store.continueEvent('p',f.run,event.id);
  store.close();store=new TowerStore(path,()=>0,registry);
  const events=new RunEvents(store.db,()=>0,registry);
  for(const origin of [11,48,51,53,98]){
   store.db.prepare("UPDATE runs SET state='select',floor=? WHERE id=?").run(origin+1,f.run);
   store.db.prepare('UPDATE run_encounter_progress SET cleared_count=cleared_count+10 WHERE run_id=?').run(f.run);
   transaction(store.db,()=>events.encounter(f.run,origin));
   const next=events.view(f.run);
   if(origin===51){assert.ok(next);store.chooseEvent('p',f.run,next.id,choice);if(choice==='teleport')store.continueEvent('p',f.run,next.id);}
   else assert.equal(next,null);
  }
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM teleport_events').get()!.n,2);
 }finally{store.close();}
});
test('revisits create fresh battles, named placement stays fixed and retry retains its visit',()=>{
 const store=new TowerStore(':memory:',()=>99,registry);store.ensurePlayer('p');
 store.db.prepare('UPDATE players SET growth_points=500 WHERE id=?').run('p');
 store.permanentAction('p',randomUUID(),'buy','retry',1,null);
 const first=store.start('p',starters),run=store.battle(first).run_id;
 try{
  const visits=[];
  for(const floor of [11,40,11,15,30,15]){
   store.db.prepare("UPDATE runs SET state='select',floor=? WHERE id=?").run(floor,run);
   visits.push(store.battle(store.enter('p',run,floor,starters)));
  }
  assert.notEqual(visits[0].id,visits[2].id);assert.notEqual(visits[0].seed,visits[2].seed);
  assert.ok(visits[2].encounter_order>visits[1].encounter_order);
  assert.deepEqual(JSON.parse(visits[3].boss!),JSON.parse(visits[5].boss!));
  const last=visits[5];store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(last.id);
  store.db.prepare("UPDATE runs SET state='lost' WHERE id=?").run(run);store.retry('p',run,last.id);
  const retry=store.battle(store.enter('p',run,15,starters));
  assert.equal(retry.encounter_order,last.encounter_order);assert.equal(retry.seed,last.seed);assert.equal(retry.opponent_team,last.opponent_team);
  assert.equal(store.currentBattle('p')!.id,retry.id);
  assert.deepEqual(recentEncounters(store.db,run).map(row=>row.opponent_team),[retry.opponent_team,visits[4].opponent_team,visits[3].opponent_team]);
 }finally{store.close();}
});
test('recent opponents follow 38,39,40 → 11 visit order, rather than floor magnitude',()=>{
 const store=new TowerStore(':memory:');store.ensurePlayer('p');const first=store.start('p',starters),run=store.battle(first).run_id;
 try{
  const opponents:string[]=[];
  for(const floor of [38,39,40,11]){
   store.db.prepare("UPDATE runs SET state='select',floor=? WHERE id=?").run(floor,run);
   if(floor===11)assert.deepEqual(recentEncounters(store.db,run).map(row=>row.opponent_team),opponents.slice(-3).reverse());
   const battle=store.battle(store.enter('p',run,floor,starters));opponents.push(battle.opponent_team);
  }
  assert.deepEqual(recentEncounters(store.db,run).map(row=>row.opponent_team),opponents.slice(-3).reverse());
 }finally{store.close();}
});
test('a completed 53rd floor can teleport to 53 and pay/recruit as a distinct new encounter',()=>{
 const store=new TowerStore(':memory:',max=>max===50?2:0,registry);store.ensurePlayer('p');
 const first=store.start('p',starters,'basic',{events:true}),run=store.battle(first).run_id;
 try{
  store.db.prepare('UPDATE battles SET floor=53 WHERE id=?').run(first);
  store.db.prepare('UPDATE runs SET floor=53 WHERE id=?').run(run);
  finishChallengerBattle(store,first);store.recruit('p',run,first,null,null);const event=store.view('p').run!.event!;
  store.chooseEvent('p',run,event.id,'teleport');store.continueEvent('p',run,event.id);
  const second=store.enter('p',run,53,starters);assert.notEqual(second,first);
  assert.ok(store.battle(second).encounter_order>store.battle(first).encounter_order);
  assert.notEqual(store.battle(second).seed,store.battle(first).seed);
  assert.throws(()=>store.recruit('p',run,first,null,null),/이미 처리/);
  finishChallengerBattle(store,second);store.recruit('p',run,second,null,null);
  assert.equal(store.view('p').run!.floor,54);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM recruitments r JOIN battles b ON b.id=r.battle_id WHERE b.run_id=? AND b.floor=53').get(run)!.n,2);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM rewards r JOIN battles b ON b.id=r.battle_id WHERE b.run_id=? AND b.floor=53').get(run)!.n,2);
 }finally{store.close();}
});
test('cooldown counts cleared encounters after backward travel; repeated floor events are independent',()=>{
 const f=fixture(39,11),{store,run}=f;
 try{
  store.chooseEvent('p',run,f.event!.id,'teleport');store.continueEvent('p',run,f.event!.id);
  const chestRegistry={'mystery-chest':eventDefinitions['mystery-chest']};
  const events=new RunEvents(store.db,()=>0,chestRegistry);
  for(const floor of [11,12,13]){
   const id=store.enter('p',run,floor,starters);finish(store,run,id);
   transaction(store.db,()=>events.encounter(run,floor));
   assert.equal(events.view(run)?.kind,floor===13?'mystery-chest':undefined);
  }
  const event=events.view(run)!;transaction(store.db,()=>events.choose('p',run,event.id,'skip'));
  store.db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status,encounter_order) VALUES (?,?,13,'mystery-chest','complete',99)").run(randomUUID(),run);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM run_events WHERE run_id=? AND after_floor=13').get(run)!.n,2);
 }finally{store.close();}
});
test('real v42 parent-table migration preserves saved battle/actions/event and reopens idempotently',()=>{
 const path=`.data/tests/teleport-v42-${randomUUID()}.sqlite`,old=new DatabaseSync(path);
 const oldSchema=schema.replaceAll(/\s*encounter_order INTEGER NOT NULL DEFAULT 0 CHECK\(encounter_order>=0\),/g,'').replace('UNIQUE(run_id, encounter_order, stage, attempt)','UNIQUE(run_id, floor, stage, attempt)').replace('amount>=0),\n CHECK','amount>=0),UNIQUE(run_id,after_floor),\n CHECK').replace('user_version = 44','user_version = 42');
 old.exec(oldSchema);old.exec("INSERT INTO players(id) VALUES ('p'); INSERT INTO runs(id,player_id,floor,state,created_at) VALUES ('run','p',12,'battle',1)");
 old.prepare("INSERT INTO battles(id,run_id,floor,player_team,opponent_team,seed,engine_version,format,ai_version,status,reward,candidates) VALUES ('battle','run',12,?,?,'[1,2,3,4]','old','old','old','active',100,'[]')").run(packTeam(starters),packTeam(starters));
 old.exec("INSERT INTO actions VALUES ('battle',1,'move 1'); INSERT INTO run_events(id,run_id,after_floor,status) VALUES ('event','run',8,'complete')");old.close();
 let store=new TowerStore(path);try{
  assert.equal(store.battle('battle').encounter_order,1);assert.deepEqual(store.history('battle'),['move 1']);
  assert.equal(store.db.prepare('SELECT encounter_order FROM run_events').get()!.encounter_order,8);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
  store.close();store=new TowerStore(path);assert.equal(store.currentBattle('p')!.id,'battle');
 }finally{store.close();}
});



