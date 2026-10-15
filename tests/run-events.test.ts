import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {mysteryChest,merchantTicketPrice} from '../src/data/run-events';

function setup(path=':memory:'){
 let rolled=0;const store=new TowerStore(path,max=>Math.min(rolled,max-1));store.ensurePlayer('owner');
 const battle=store.start('owner',starters,'basic',{events:true}),run=store.battle(battle).run_id;
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
  assert.equal(store.view('owner').coins,mysteryChest.coins);assert.equal(store.view('owner').run!.earnedCoins,mysteryChest.coins);assert.equal(store.view('owner').run!.victories,0);
  assert.deepEqual(store.view('owner').run!.event?.reward,{kind:'coins',amount:mysteryChest.coins});
  assert.throws(()=>store.chooseEvent('owner',run,event.id,'skip'),/이미 다른/);
  assert.throws(()=>store.enter('owner',run,2,starters),/이벤트를 먼저/);
  store.continueEvent('owner',run,event.id);store.continueEvent('owner',run,event.id);
  assert.equal(store.view('owner').run!.event,null);assert.equal(store.view('owner').run!.floor,2);
  store.chooseEvent('owner',run,event.id,'open');assert.equal(store.view('owner').coins,mysteryChest.coins);
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
  roll(mysteryChest.encounterPercent);assert.equal(finishFloor(store,run,battle),null);roll(mysteryChest.encounterPercent-1);
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
  store.db.exec('DROP TRIGGER fail_chest');store.chooseEvent('owner',run,event.id,'open');assert.equal(store.view('owner').coins,mysteryChest.coins);
 }finally{store.close();}
});
test('legacy runs are left unchanged by event schema migration',()=>{
 const path=`.data/tests/event-migration-${randomUUID()}.sqlite`;let store=new TowerStore(path,()=>0);
 try{store.ensurePlayer('owner');const id=store.start('owner',starters),run=store.battle(id).run_id;
  store.db.exec('DROP TABLE run_events;DROP TABLE run_event_rules;PRAGMA user_version=31');store.close();store=new TowerStore(path,()=>0);
  assert.equal(finishFloor(store,run,id),null);assert.equal(store.view('owner').run!.floor,2);assert.equal((store.db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version,33);
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
  store.chooseEvent('owner',fixture.run,event.id,'open');assert.equal(store.view('owner').coins,mysteryChest.coins);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});

test('event kind weights partition the encounter without increasing its frequency',async()=>{
 const {RunEvents}=await import('../src/server/run-events');
 for(const [draw,expected] of [[0,'mystery-chest'],[49,'mystery-chest'],[50,'breeder-gift'],[79,'breeder-gift'],[80,'traveling-merchant'],[99,'traveling-merchant']] as const){
  const {store,run}=setup();try{let call=0;new RunEvents(store.db,()=>call++===0?0:draw).encounter(run,1);assert.equal(new RunEvents(store.db,()=>0).view(run)!.kind,expected);}finally{store.close();}
 }
});
