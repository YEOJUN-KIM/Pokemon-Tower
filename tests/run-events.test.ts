import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {eventEncounterSettings,legacyChestRewards,merchantTicketPrice} from '../src/data/run-events';
import {RunEvents} from '../src/server/run-events';
import {schema} from '../src/server/schema';
import {transaction} from '../src/server/storage/transaction';
import {eventDefinitions,isRunEventKind,type RunEventRegistry} from '../src/data/run-events';

function setup(path=':memory:'){
 let rolled=0;const store=new TowerStore(path,max=>Math.min(rolled,max-1),{...eventDefinitions});store.ensurePlayer('owner');
 const battle=store.start('owner',starters,'basic',{events:true}),run=store.battle(battle).run_id;
 store.db.prepare('UPDATE run_event_rules SET version=1 WHERE run_id=?').run(run);
 return {store,run,battle,roll:(value:number)=>{rolled=value;}};
}
function finishFloor(store:TowerStore,run:string,battle:string,floor=1){
 store.db.prepare("UPDATE runs SET state='recruit',floor=? WHERE id=?").run(floor,run);
 store.db.prepare("UPDATE battles SET status='complete',floor=? WHERE id=?").run(floor,battle);
 store.recruit('owner',run,battle,null,null);
 return store.view('owner').run!.event;
}
test('chest is an extra encounter, coins pay once, and next battle waits for confirmation',()=>{
 const {store,run,battle}=setup();try{
  const event=finishFloor(store,run,battle)!;assert.equal(event.afterFloor,1);assert.equal(event.phase,'choice');assert.equal(event.reward,null);
  assert.equal(store.view('owner').run!.floor,2);assert.equal(store.view('owner').run!.state,'select');assert.equal(store.currentBattle('owner'),null);
  assert.throws(()=>store.enter('owner',run,2,starters),/이벤트를 먼저/);
  assert.throws(()=>store.continueEvent('owner',run,event.id),/먼저 선택/);
  assert.throws(()=>store.chooseEvent('stranger',run,event.id,'open'),/이 도전/);
  assert.throws(()=>store.chooseEvent('owner',run,event.id,'other'),/진행하거나/);
  store.chooseEvent('owner',run,event.id,'open');store.chooseEvent('owner',run,event.id,'open');
  assert.equal(store.view('owner').coins,legacyChestRewards.coins);assert.equal(store.view('owner').run!.earnedCoins,legacyChestRewards.coins);assert.equal(store.view('owner').run!.victories,0);
  assert.deepEqual(store.view('owner').run!.event?.reward,{kind:'coins',amount:legacyChestRewards.coins});
  assert.throws(()=>store.chooseEvent('owner',run,event.id,'skip'),/이미 다른/);
  assert.throws(()=>store.enter('owner',run,2,starters),/이벤트를 먼저/);
  store.continueEvent('owner',run,event.id);store.continueEvent('owner',run,event.id);
  assert.equal(store.view('owner').run!.event,null);assert.equal(store.view('owner').run!.floor,2);
  store.chooseEvent('owner',run,event.id,'open');assert.equal(store.view('owner').coins,legacyChestRewards.coins);
  store.enter('owner',run,2,starters);assert.throws(()=>store.chooseEvent('owner',run,event.id,'open'),/이미 지나간/);
 }finally{store.close();}
});
test('ticket reward persists across reopening and cannot be claimed again',()=>{
 const path=`.data/tests/event-${randomUUID()}.sqlite`,fixture=setup(path);let store=fixture.store;
 try{
  const event=finishFloor(store,fixture.run,fixture.battle)!;fixture.roll(80);
  store.chooseEvent('owner',fixture.run,event.id,'open');assert.equal(store.permanentView('owner').eggTickets,1);assert.equal(store.view('owner').coins,0);
  store.close();store=new TowerStore(path,()=>0);
  assert.deepEqual(store.view('owner').run!.event?.reward,{kind:'egg-ticket',amount:1});
  store.chooseEvent('owner',fixture.run,event.id,'open');assert.equal(store.permanentView('owner').eggTickets,1);
  store.continueEvent('owner',fixture.run,event.id);store.abandon('owner',fixture.run);store.start('owner',starters);assert.equal(store.permanentView('owner').eggTickets,1);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});
test('skipping grants nothing and choice survives reload without another encounter roll',()=>{
 const {store,run,battle}=setup();try{
  const event=finishFloor(store,run,battle)!;assert.equal(store.view('owner').run!.event?.id,event.id);
  store.chooseEvent('owner',run,event.id,'skip');store.chooseEvent('owner',run,event.id,'skip');
  assert.equal(store.view('owner').run!.event,null);assert.equal(store.view('owner').coins,0);assert.equal(store.permanentView('owner').eggTickets,0);
  assert.throws(()=>store.chooseEvent('owner',run,event.id,'open'),/이미 다른/);
  assert.equal(store.view('owner').run!.floor,2);store.enter('owner',run,2,starters);
 }finally{store.close();}
});
test('encounter threshold, cooldown, named gates and final clear keep their original floors',()=>{
 const {store,run,battle,roll}=setup();try{
  roll(eventEncounterSettings.encounterPercent);assert.equal(finishFloor(store,run,battle),null);roll(eventEncounterSettings.encounterPercent-1);
  const b2=store.enter('owner',run,2,starters),event=finishFloor(store,run,b2,2)!;assert.ok(event);store.chooseEvent('owner',run,event.id,'skip');
  for(const floor of [3,4]){const id=store.enter('owner',run,floor,starters);assert.equal(finishFloor(store,run,id,floor),null);}
  const b5=store.enter('owner',run,5,starters);assert.equal(finishFloor(store,run,b5,5),null);
  const b6=store.enter('owner',run,6,starters);assert.ok(finishFloor(store,run,b6,6));
 }finally{store.close();}
 const final=setup();try{
  final.store.db.prepare('DELETE FROM run_routes WHERE run_id=?').run(final.run);
  final.store.db.prepare('UPDATE runs SET total_floors=3 WHERE id=?').run(final.run);
  assert.equal(finishFloor(final.store,final.run,final.battle,3),null);assert.equal(final.store.view('owner').run!.state,'cleared');
 }finally{final.store.close();}
});
test('coin payment failure rolls back the receipt, allowing a safe retry',()=>{
 const {store,run,battle}=setup();try{
  const event=finishFloor(store,run,battle)!;
  store.db.exec("CREATE TRIGGER fail_chest BEFORE UPDATE OF coins ON players BEGIN SELECT RAISE(ABORT,'payment failed'); END");
  assert.throws(()=>store.chooseEvent('owner',run,event.id,'open'),/payment failed/);assert.equal(store.view('owner').run!.event?.phase,'choice');assert.equal(store.view('owner').coins,0);
  store.db.exec('DROP TRIGGER fail_chest');store.chooseEvent('owner',run,event.id,'open');assert.equal(store.view('owner').coins,legacyChestRewards.coins);
 }finally{store.close();}
});
test('legacy runs are left unchanged by event schema migration',()=>{
 const path=`.data/tests/event-migration-${randomUUID()}.sqlite`;let store=new TowerStore(path,()=>0);
 try{store.ensurePlayer('owner');const id=store.start('owner',starters),run=store.battle(id).run_id;
  store.db.exec('DROP TABLE run_events;DROP TABLE run_event_rules;PRAGMA user_version=31');store.close();store=new TowerStore(path,()=>0);
  assert.equal(finishFloor(store,run,id),null);assert.equal(store.view('owner').run!.floor,2);assert.equal((store.db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version,45);
 }finally{store.close();}
});

test('breeder gifts one permanent ticket, persists its identity and supports declining',()=>{
 const {store,run,battle}=setup();try{
  const event=finishFloor(store,run,battle)!;
  store.db.prepare("UPDATE run_events SET kind='breeder-gift' WHERE id=?").run(event.id);
  assert.equal(store.view('owner').run!.event!.kind,'breeder-gift');
  store.chooseEvent('owner',run,event.id,'open');store.chooseEvent('owner',run,event.id,'open');
  assert.equal(store.permanentView('owner').eggTickets,1);assert.equal(store.view('owner').coins,0);
  assert.equal(store.view('owner').run!.floor,2);
 }finally{store.close();}
 const declined=setup();try{
  const event=finishFloor(declined.store,declined.run,declined.battle)!;
  declined.store.db.prepare("UPDATE run_events SET kind='breeder-gift' WHERE id=?").run(event.id);
  declined.store.chooseEvent('owner',declined.run,event.id,'skip');assert.equal(declined.store.permanentView('owner').eggTickets,0);
 }finally{declined.store.close();}
});

test('merchant atomically charges coins once, rejects insufficient funds, and rolls back a failed ticket grant',()=>{
 const {store,run,battle}=setup();try{
  const event=finishFloor(store,run,battle)!;store.db.prepare("UPDATE run_events SET kind='traveling-merchant' WHERE id=?").run(event.id);
  assert.throws(()=>store.chooseEvent('owner',run,event.id,'open'),/300코인/);
  assert.equal(store.view('owner').run!.event!.phase,'choice');assert.equal(store.permanentView('owner').eggTickets,0);
  store.db.prepare('UPDATE players SET coins=? WHERE id=?').run(merchantTicketPrice,'owner');
  store.db.exec("CREATE TRIGGER fail_ticket BEFORE INSERT ON permanent_upgrades BEGIN SELECT RAISE(ABORT,'ticket failed'); END");
  assert.throws(()=>store.chooseEvent('owner',run,event.id,'open'),/ticket failed/);
  assert.equal(store.view('owner').coins,merchantTicketPrice);assert.equal(store.view('owner').run!.event!.phase,'choice');
  store.db.exec('DROP TRIGGER fail_ticket');store.chooseEvent('owner',run,event.id,'open');store.chooseEvent('owner',run,event.id,'open');
  assert.equal(store.view('owner').coins,0);assert.equal(store.permanentView('owner').eggTickets,1);assert.equal(store.view('owner').run!.earnedCoins,0);
 }finally{store.close();}
});

test('v32 migration preserves a pending chest and its paid reward',()=>{
 const path=`.data/tests/event-kind-migration-${randomUUID()}.sqlite`,fixture=setup(path);let store=fixture.store;
 try{
  const event=finishFloor(store,fixture.run,fixture.battle)!;store.chooseEvent('owner',fixture.run,event.id,'open');
  const before=store.view('owner');store.db.exec('ALTER TABLE run_events DROP COLUMN kind;PRAGMA user_version=32');store.close();store=new TowerStore(path,()=>0);
  assert.deepEqual(store.view('owner'),before);assert.equal(store.view('owner').run!.event!.kind,'mystery-chest');
  store.chooseEvent('owner',fixture.run,event.id,'open');assert.equal(store.view('owner').coins,legacyChestRewards.coins);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});

test('event kind weights partition the encounter without increasing its frequency',async()=>{
 const {RunEvents}=await import('../src/server/run-events');
 for(const [draw,expected] of [[0,'mystery-chest'],[49,'mystery-chest'],[50,'breeder-gift'],[79,'breeder-gift'],[80,'traveling-merchant'],[99,'traveling-merchant']] as const){
  const {store,run}=setup();try{let call=0;new RunEvents(store.db,()=>call++===0?0:draw,{...eventDefinitions}).encounter(run,1);assert.equal(new RunEvents(store.db,()=>0).view(run)!.kind,expected);}finally{store.close();}
 }
});

test('new content with three choices stores without schema changes and commits the selected ID once',()=>{
 const registry:RunEventRegistry={...eventDefinitions,'test-scientist':{
  title:'fixture',summary:'fixture',intro:'fixture',weight:1,choices:[
   {id:'help',label:'돕는다',outcome:'reward',cost:0,rewards:[{weight:1,reward:{kind:'coins',amount:7}}],message:'보상'},
   {id:'trade',label:'거래한다',outcome:'reward',cost:30,rewards:[{weight:1,reward:{kind:'egg-ticket',amount:2}}],message:'보상'},
   {id:'leave',label:'떠난다',outcome:'leave'},
  ],
 }};
 for(const id of ['help','trade','leave']){
  const {store,run,battle}=setup();try{
   finishFloor(store,run,battle);
   const version=store.db.prepare('PRAGMA user_version').get()!.user_version;
   store.db.prepare('DELETE FROM run_events WHERE run_id=?').run(run);
   const encounterCalls:number[]=[];
   const content=new RunEvents(store.db,max=>{encounterCalls.push(max);return 0;},{'test-scientist':registry['test-scientist']});
   content.encounter(run,1);
   const event=content.view(run)!;
   assert.equal(event.kind,'test-scientist');assert.deepEqual(encounterCalls,[100,1]);
   store.db.prepare('UPDATE players SET coins=30 WHERE id=?').run('owner');
   const events=new RunEvents(store.db,()=>{throw Error('Fixed choices must not draw');},registry);
   assert.equal(isRunEventKind('test-scientist',registry),true);
   assert.equal(isRunEventKind('__proto__',registry),false);
   assert.throws(()=>events.choose('owner',run,event.id,'open'),/유효하지 않은/);
   transaction(store.db,()=>events.choose('owner',run,event.id,id));
   transaction(store.db,()=>events.choose('owner',run,event.id,id));
   assert.throws(()=>events.choose('owner',run,event.id,id==='help'?'trade':'help'),/이미 다른/);
   assert.equal(store.db.prepare('SELECT choice_id FROM run_events WHERE id=?').get(event.id)!.choice_id,id);
   assert.equal(store.db.prepare('SELECT coins FROM players WHERE id=?').get('owner')!.coins,id==='help'?37:id==='trade'?0:30);
   assert.equal(store.permanentView('owner').eggTickets,id==='trade'?2:0);
   if(id!=='leave')assert.equal(events.view(run)!.choiceId,id);
   events.continue('owner',run,event.id);
   transaction(store.db,()=>events.choose('owner',run,event.id,id));
   assert.equal(store.permanentView('owner').eggTickets,id==='trade'?2:0);
   assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,version);
   assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{store.close();}
 }
});

test('unknown stored event IDs fail safely before rendering, charging or granting',()=>{
 const {store,run,battle}=setup();try{
  const event=finishFloor(store,run,battle)!;
  for(const kind of ['missing-event','__proto__','constructor']){
   store.db.prepare('UPDATE run_events SET kind=? WHERE id=?').run(kind,event.id);
   assert.throws(()=>store.view('owner'),/알 수 없는 이벤트/);
   assert.throws(()=>store.chooseEvent('owner',run,event.id,'open'),/알 수 없는 이벤트/);
   assert.throws(()=>store.continueEvent('owner',run,event.id),/알 수 없는 이벤트/);
   assert.equal(store.db.prepare('SELECT coins FROM players WHERE id=?').get('owner')!.coins,0);
   assert.equal(store.permanentView('owner').eggTickets,0);
  }
 }finally{store.close();}
});

test('v33 migration preserves choices, paid rewards, completed history and wallet without granting again',()=>{
 for(const status of ['choice','reward','complete-paid','complete-skipped']){
  const path=`.data/tests/event-v33-${randomUUID()}.sqlite`,fixture=setup(path);let store=fixture.store;
  try{
   const event=finishFloor(store,fixture.run,fixture.battle)!;
   if(status==='reward'||status==='complete-paid')store.chooseEvent('owner',fixture.run,event.id,'open');
   if(status==='complete-paid')store.continueEvent('owner',fixture.run,event.id);
   if(status==='complete-skipped')store.chooseEvent('owner',fixture.run,event.id,'skip');
   store.db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status,reward_kind,amount) VALUES (?,?,10,'breeder-gift','complete','egg-ticket',1),(?,?,11,'traveling-merchant','complete',NULL,0)").run(randomUUID(),fixture.run,randomUUID(),fixture.run);
   const columns='id,run_id,after_floor,kind,status,reward_kind,amount';
   const old=schema.match(/CREATE TABLE IF NOT EXISTS run_events\s*\([\s\S]*?\) STRICT;/)![0]
    .replace('IF NOT EXISTS run_events','run_events_v33')
    .replace(/CHECK\(\(result_json[\s\S]*?(?=\n\) STRICT)/,"CHECK((reward_kind IS NULL AND amount=0 AND status!='reward') OR (reward_kind IS NOT NULL AND amount>0 AND status!='choice'))")
    .replace("kind TEXT NOT NULL DEFAULT 'mystery-chest',choice_id TEXT,result_json TEXT,","kind TEXT NOT NULL DEFAULT 'mystery-chest' CHECK(kind IN ('mystery-chest','breeder-gift','traveling-merchant')),");
   store.db.exec(`${old} INSERT INTO run_events_v33(${columns}) SELECT ${columns} FROM run_events; DROP TABLE run_events; ALTER TABLE run_events_v33 RENAME TO run_events; CREATE UNIQUE INDEX one_pending_run_event ON run_events(run_id) WHERE status!='complete'; PRAGMA user_version=33;`);
   const before=store.db.prepare(`SELECT ${columns} FROM run_events ORDER BY id`).all();
   const coins=store.db.prepare('SELECT coins FROM players WHERE id=?').get('owner')!.coins;
   store.close();store=new TowerStore(path,()=>{throw Error('Migration/retry must not draw');});
   assert.deepEqual(store.db.prepare(`SELECT ${columns} FROM run_events ORDER BY id`).all(),before);
   assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,45);
   assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
   assert.equal(store.view('owner').run!.event?.phase,status==='choice'?'choice':status==='reward'?'reward':undefined);
   if(status!=='choice')store.chooseEvent('owner',fixture.run,event.id,status==='complete-skipped'?'skip':'open');
   assert.equal(store.db.prepare('SELECT coins FROM players WHERE id=?').get('owner')!.coins,coins);
   // Content CHECK is gone; state, reward and uniqueness checks remain.
   assert.throws(()=>store.db.prepare("UPDATE run_events SET status='invalid' WHERE id=?").run(event.id),/CHECK/);
   assert.throws(()=>store.db.prepare('UPDATE run_events SET amount=-1 WHERE id=?').run(event.id),/CHECK/);
   if(status==='choice'||status==='reward')assert.throws(()=>store.db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status) VALUES (?,?,12,'new-content','choice')").run(randomUUID(),fixture.run),/UNIQUE/);
  }finally{store.close();}
 }
});
