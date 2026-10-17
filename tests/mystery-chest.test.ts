import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {mysteryChestResults,eventDefinition} from '../src/data/run-events';
import {rollRewardOption} from '../src/game/run-events';
import {resolveReward} from '../src/game/rewards';
import {applyRewardOption} from '../src/server/rewards';
import {transaction} from '../src/server/storage/transaction';
import {schema} from '../src/server/schema';

function setup(path=':memory:',coins=1000){
 let draw=0,calls=0;
 const store=new TowerStore(path,()=>{calls++;return draw;});store.ensurePlayer('owner');
 const battle=store.start('owner',starters,'basic',{events:true}),run=store.battle(battle).run_id;
 store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(battle);
 store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run);
 store.recruit('owner',run,battle,null,null);
 store.db.prepare('UPDATE players SET coins=? WHERE id=?').run(coins,'owner');
 const event=store.view('owner').run!.event!;
 return {store,run,event,battle,setDraw:(value:number)=>{draw=value;calls=0;},calls:()=>calls};
}

test('v2 chest table partitions every draw into 50/30/20 without changing encounter draws',()=>{
 const ids=['empty','trap','coins','ticket','treasure','tickets'];const expected=[25,25,15,15,10,10];
 const counts=new Map<string,number>();
 for(let draw=0;draw<100;draw++){
  const calls:number[]=[];
  const option=rollRewardOption(mysteryChestResults,max=>{calls.push(max);return draw;});
  assert.deepEqual(calls,[100]);counts.set(option.id,(counts.get(option.id)??0)+1);
 }
 assert.deepEqual(ids.map(id=>counts.get(id)),expected);
 assert.equal(eventDefinition('mystery-chest',undefined,1)!.title,'길에서 발견한 상자');
 assert.equal(eventDefinition('mystery-chest',undefined,2)!.title,'미스터리 상자');
});

for(const [draw,id,coins,tickets] of [[0,'empty',1000,0],[25,'trap',850,0],[50,'coins',1300,0],[65,'ticket',1000,1],[80,'treasure',2000,1],[90,'tickets',1000,3]] as const){
 test(`v2 ${id}: exact reward, one draw, duplicate delivery, reload and confirmation`,()=>{
  const path=`.data/tests/mystery-${randomUUID()}.sqlite`,f=setup(path);let store=f.store;
  try{
   assert.equal(f.event.rulesVersion,2);f.setDraw(draw);
   store.chooseEvent('owner',f.run,f.event.id,'open');
   const saved=store.view('owner');assert.equal(saved.coins,coins);assert.equal(saved.permanent!.eggTickets,tickets);
   const result=saved.run!.event!.result!;assert.equal(result.optionId,id);assert.equal(f.calls(),1);
   assert.equal(saved.run!.earnedCoins,id==='coins'?300:id==='treasure'?1000:0);
   assert.throws(()=>store.enter('owner',f.run,2,starters),/이벤트를 먼저/);
   store.chooseEvent('owner',f.run,f.event.id,'open');assert.equal(f.calls(),1);
   assert.throws(()=>store.chooseEvent('owner',f.run,f.event.id,'skip'),/이미 다른/);
   let entering=false;store.close();store=new TowerStore(path,()=>{if(!entering)throw Error('Saved results must not reroll');return 0;});
   assert.deepEqual(store.view('owner').run!.event!.result,result);
   store.chooseEvent('owner',f.run,f.event.id,'open');
   assert.equal(store.view('owner').coins,coins);assert.equal(store.permanentView('owner').eggTickets,tickets);
   store.continueEvent('owner',f.run,f.event.id);store.continueEvent('owner',f.run,f.event.id);
   store.chooseEvent('owner',f.run,f.event.id,'open');assert.equal(store.view('owner').coins,coins);
   assert.equal(store.view('owner').run!.event,null);assert.equal(store.view('owner').run!.floor,2);
   entering=true;store.enter('owner',f.run,2,starters);
   assert.throws(()=>store.chooseEvent('owner',f.run,f.event.id,'open'),/이미 지나간/);
   assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{store.close();}
 });
}

test('loss uses floor rounding, never exceeds wallet and is safe at zero and tiny balances',()=>{
 for(const [coins,loss] of [[0,0],[1,0],[6,0],[7,1],[101,15]]){
  const f=setup(':memory:',coins);try{
   f.setDraw(25);f.store.chooseEvent('owner',f.run,f.event.id,'open');
   assert.deepEqual(f.store.view('owner').run!.event!.result!.entries,[{kind:'coin-loss',percent:15,amount:loss}]);
   f.store.chooseEvent('owner',f.run,f.event.id,'open');assert.equal(f.store.view('owner').coins,coins-loss);
  }finally{f.store.close();}
 }
 assert.deepEqual(resolveReward({id:'all',title:'all',tone:'loss',entries:[{kind:'coin-loss',percent:100}]},7).entries,[{kind:'coin-loss',percent:100,amount:7}]);
 assert.throws(()=>resolveReward({id:'bad',title:'bad',tone:'loss',entries:[{kind:'coin-loss',percent:101}]},7),/Invalid loss/);
});

test('v2 skipping preserves the wallet, grants nothing and consumes no reward draw',()=>{
 const f=setup();try{
  f.setDraw(90);f.store.chooseEvent('owner',f.run,f.event.id,'skip');
  assert.equal(f.calls(),0);assert.equal(f.store.view('owner').coins,1000);
  assert.equal(f.store.permanentView('owner').eggTickets,0);assert.equal(f.store.view('owner').run!.event,null);
  f.store.enter('owner',f.run,2,starters);
 }finally{f.store.close();}
});

test('multi-entry grant and result receipt failures roll back the whole transaction, including coin loss',()=>{
 for(const [draw,trigger] of [[80,"CREATE TRIGGER fail_ticket BEFORE INSERT ON permanent_upgrades BEGIN SELECT RAISE(ABORT,'grant failed'); END"],[25,"CREATE TRIGGER fail_receipt BEFORE UPDATE OF result_json ON run_events BEGIN SELECT RAISE(ABORT,'receipt failed'); END"]] as const){
  const f=setup();try{
   f.setDraw(draw);f.store.db.exec(trigger);
   assert.throws(()=>f.store.chooseEvent('owner',f.run,f.event.id,'open'),/failed/);
   assert.equal(f.store.view('owner').coins,1000);assert.equal(f.store.permanentView('owner').eggTickets,0);
   assert.equal(f.store.view('owner').run!.event!.phase,'choice');assert.equal(f.store.view('owner').run!.event!.result,undefined);
   f.store.db.exec(draw===80?'DROP TRIGGER fail_ticket':'DROP TRIGGER fail_receipt');
   f.store.chooseEvent('owner',f.run,f.event.id,'open');assert.equal(f.store.view('owner').coins,draw===80?2000:850);
  }finally{f.store.close();}
 }
 // Another event can reuse the same application path under its own transaction.
 const f=setup();try{
  transaction(f.store.db,()=>applyRewardOption(f.store.db,'owner',{id:'fixture',title:'fixture',tone:'good',entries:[{kind:'coins',amount:10},{kind:'egg-ticket',amount:2}]}));
  assert.equal(f.store.view('owner').coins,1010);assert.equal(f.store.permanentView('owner').eggTickets,2);
 }finally{f.store.close();}
});

test('v34 saves preserve pending v1 choices, paid rewards and completed events across v35 migration',()=>{
 for(const status of ['choice','reward','complete','skip']){
  const path=`.data/tests/mystery-migration-${randomUUID()}.sqlite`,f=setup(path);let store=f.store;
  try{
   store.db.prepare('UPDATE run_event_rules SET version=1 WHERE run_id=?').run(f.run);
   if(status==='reward'||status==='complete'){f.setDraw(80);store.chooseEvent('owner',f.run,f.event.id,'open');}
   if(status==='complete')store.continueEvent('owner',f.run,f.event.id);
   if(status==='skip')store.chooseEvent('owner',f.run,f.event.id,'skip');
   const before=store.view('owner');
   const old=schema.match(/CREATE TABLE IF NOT EXISTS run_events\s*\([\s\S]*?\) STRICT;/)![0]
    .replace('IF NOT EXISTS run_events','run_events_v34').replace('choice_id TEXT,result_json TEXT,','choice_id TEXT,')
    .replace(/CHECK\(\(result_json[\s\S]*?(?=\n\) STRICT)/,"CHECK((reward_kind IS NULL AND amount=0 AND status!='reward') OR (reward_kind IS NOT NULL AND amount>0 AND status!='choice'))");
   store.db.exec(`${old} INSERT INTO run_events_v34(id,run_id,after_floor,kind,choice_id,status,reward_kind,amount) SELECT id,run_id,after_floor,kind,choice_id,status,reward_kind,amount FROM run_events;
    DROP TABLE run_events; ALTER TABLE run_events_v34 RENAME TO run_events;
    CREATE UNIQUE INDEX one_pending_run_event ON run_events(run_id) WHERE status!='complete';
    CREATE TABLE run_event_rules_v34(run_id TEXT PRIMARY KEY REFERENCES runs(id),version INTEGER NOT NULL CHECK(version=1)) STRICT;
    INSERT INTO run_event_rules_v34 SELECT * FROM run_event_rules; DROP TABLE run_event_rules; ALTER TABLE run_event_rules_v34 RENAME TO run_event_rules; PRAGMA user_version=34;`);
   store.close();store=new TowerStore(path,()=>{if(status==='choice')return 80;throw Error('Migration cannot draw');});
   assert.deepEqual(store.view('owner'),before);
   assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,41);
   if(status==='choice'){store.chooseEvent('owner',f.run,f.event.id,'open');assert.deepEqual(store.view('owner').run!.event!.reward,{kind:'egg-ticket',amount:1});}
   else store.chooseEvent('owner',f.run,f.event.id,status==='skip'?'skip':'open');
   assert.equal(store.permanentView('owner').eggTickets,status==='skip'?0:1);
   assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{store.close();}
 }
});
