import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {starters} from '../src/data/teams';
import {challengers} from '../src/data/legacy-challengers';
import {selectRunEvent} from '../src/game/run-events';
import Showdown from 'pokemon-showdown';
import {challengerFixture,finishChallengerBattle} from './challenger-fixture';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {mysteryChest} from '../src/data/run-events';

test('challenger encounter preserves shared encounter chance, legacy weights and floor eligibility',()=>{
 for(const version of [1,2])for(let draw=mysteryChest.encounterPercent;draw<100;draw++)assert.equal(selectRunEvent(4,null,()=>draw,undefined,version),null);
 assert.equal(selectRunEvent(4,null,max=>max===100?0:100,undefined,2),'challenger-selection');
 let call=0;assert.equal(selectRunEvent(1,null,()=>call++===0?0:99,undefined,1),'traveling-merchant');
 assert.equal(selectRunEvent(5,null,()=>0,undefined,2),null);
 assert.equal(selectRunEvent(4,3,()=>0,undefined,2),null);
});
test('three persisted candidates, ownership, invalid choice and penalty-free back',()=>{
 const {store,owner,run,event}=challengerFixture();try{
  assert.deepEqual(event.challengers?.map(c=>c.id),['easy','medium','hard']);
  assert.ok(event.challengers!.every(c=>c.battleStyle&&c.rewardPreview));
  assert.equal(JSON.stringify(event).includes('effects'),false);
  store.ensurePlayer('other');assert.throws(()=>store.chooseEvent('other',run,event.id,'hard'));
  assert.throws(()=>store.chooseEvent(owner,run,event.id,'forged'));
  const before=store.view(owner);store.chooseEvent(owner,run,event.id,'back');store.chooseEvent(owner,run,event.id,'back');
  assert.equal(store.view(owner).coins,before.coins);assert.equal(store.view(owner).run!.floor,2);
  assert.equal(store.view(owner).run!.event,null);assert.equal(store.currentBattle(owner),null);
  store.enter(owner,run,2,starters);assert.equal(store.view(owner).run!.state,'battle');
 }finally{store.close();}
});
for(const definition of challengers)test(`${definition.id}: selected 3v3, restore, win bypasses recruitment, atomic reward and next normal floor`,async()=>{
 const path=`.data/tests/challenger-${randomUUID()}.sqlite`,fixture=challengerFixture(path,'owner',2,definition.id);let store=fixture.store;
 const {owner,run,event}=fixture;let battleId:string;
 try{
  const candidates=store.view(owner).run!.event!.challengers;store.close();store=new TowerStore(path);
  assert.deepEqual(store.view(owner).run!.event!.challengers,candidates);
  store.chooseEvent(owner,run,event.id,definition.id);battleId=store.currentBattle(owner)!.id;
  const battle=store.battle(battleId);assert.equal(JSON.parse(battle.trainer!).id,definition.trainerId);
  assert.equal(Showdown.Teams.unpack(battle.player_team)!.length,3);assert.equal(Showdown.Teams.unpack(battle.opponent_team)!.length,3);
  store.chooseEvent(owner,run,event.id,definition.id);assert.equal(store.currentBattle(owner)!.id,battleId);
  assert.throws(()=>store.chooseEvent(owner,run,event.id,'back'));assert.throws(()=>store.chooseEvent(owner,run,event.id,'forged'));
  store.close();store=new TowerStore(path);assert.equal(store.currentBattle(owner)!.opponent_team,battle.opponent_team);
  const service=new TowerService(store);const state=await service.state(owner);assert.equal(state.battle!.status,'waiting');await service.dispose();
  const before=store.view(owner),receipt=finishChallengerBattle(store,battleId);
  store.complete(battleId,receipt.log,receipt.view);
  const view=store.view(owner);assert.equal(view.run!.state,'select');assert.equal(view.run!.floor,2);assert.equal(view.run!.candidates.length,0);
  assert.throws(()=>store.recruit(owner,run,battleId,null,null));assert.equal(view.run!.victories,before.run!.victories);
  assert.deepEqual(view.run!.event!.result!.entries,definition.rewardDefinition.entries);
  assert.throws(()=>store.enter(owner,run,2,starters));
  if(definition.selections){
   assert.throws(()=>store.continueEvent(owner,run,event.id),/먼저 선택/);
   assert.throws(()=>store.selectEventReward(owner,run,event.id,'bonus','forged'));
   const saved=view.run!.event!.result;store.close();store=new TowerStore(path);assert.deepEqual(store.view(owner).run!.event!.result,saved);
   store.db.exec("CREATE TRIGGER fail_selection BEFORE UPDATE OF result_json ON run_events BEGIN SELECT RAISE(ABORT,'receipt failed'); END");
   const coins=store.view(owner).coins;assert.throws(()=>store.selectEventReward(owner,run,event.id,'bonus','mixed'),/receipt failed/);assert.equal(store.view(owner).coins,coins);assert.equal(store.permanentView(owner).eggTickets,0);
   store.db.exec('DROP TRIGGER fail_selection');store.selectEventReward(owner,run,event.id,'bonus','mixed');store.selectEventReward(owner,run,event.id,'bonus','mixed');
   assert.equal(store.view(owner).coins,coins+500);assert.equal(store.permanentView(owner).eggTickets,1);
   assert.throws(()=>store.selectEventReward(owner,run,event.id,'bonus','coins'),/이미 다른/);
   const selected=store.view(owner).run!.event!.result;store.close();store=new TowerStore(path);assert.deepEqual(store.view(owner).run!.event!.result,selected);
  }
  store.continueEvent(owner,run,event.id);store.continueEvent(owner,run,event.id);
  const normal=store.enter(owner,run,2,starters);assert.notEqual(normal,battleId);assert.equal(store.battle(battleId).status,'complete');assert.equal(store.battle(normal).floor,2);
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});
test('challenger loss uses the existing retry and restores the exact opponent',()=>{
 const {store,owner,run,event}=challengerFixture();try{
  store.db.prepare('UPDATE run_retries SET retry_limit=1 WHERE run_id=?').run(run);
  store.chooseEvent(owner,run,event.id,'hard');const first=store.currentBattle(owner)!;
  finishChallengerBattle(store,first.id,'Tower AI');assert.equal(store.view(owner).run!.state,'lost');
  store.retry(owner,run,first.id);store.retry(owner,run,first.id);assert.equal(store.view(owner).run!.event,null);
  const second=store.enter(owner,run,2,starters);assert.equal(store.battle(second).opponent_team,first.opponent_team);assert.equal(store.battle(second).seed,first.seed);
  assert.equal(store.currentBattle(owner)!.id,second);finishChallengerBattle(store,second);
  assert.equal(store.view(owner).run!.event!.phase,'reward');assert.equal(store.view(owner).run!.retries!.used,1);
 }finally{store.close();}
});
test('challenger training scales with floors and stays within the normal point and IV caps',()=>{
 for(const floor of [5,40,99])for(const definition of challengers){const {store,owner,run,event}=challengerFixture(':memory:','owner',floor,definition.id);try{
  store.chooseEvent(owner,run,event.id,definition.id);const team=Showdown.Teams.unpack(store.currentBattle(owner)!.opponent_team)!;
  for(const set of team){assert.ok((Object.values(set.ivs!) as number[]).every(value=>value>=0&&value<=31));assert.ok((Object.values(set.evs??{}) as number[]).every(value=>value>=0&&value<=32));assert.ok((Object.values(set.evs??{}) as number[]).reduce((a,b)=>a+b,0)<=66);}
 }finally{store.close();}}
});

for(const candidate of ['coins','tickets','mixed'])test(`hard bonus ${candidate}: exact server effects and duplicate receipt`,()=>{
 const {store,owner,run,event}=challengerFixture();try{
  store.chooseEvent(owner,run,event.id,'hard');finishChallengerBattle(store,store.currentBattle(owner)!.id);
  const before=store.view(owner);store.selectEventReward(owner,run,event.id,'bonus',candidate);store.selectEventReward(owner,run,event.id,'bonus',candidate);
  assert.equal(store.view(owner).coins,before.coins+(candidate==='coins'?1000:candidate==='mixed'?500:0));
  assert.equal(store.permanentView(owner).eggTickets,candidate==='tickets'?3:candidate==='mixed'?1:0);
 }finally{store.close();}
});
test('victory receipt failure rolls back battle completion and grants together',()=>{
 const {store,owner,run,event}=challengerFixture();try{
  store.chooseEvent(owner,run,event.id,'medium');const battle=store.currentBattle(owner)!,before=store.view(owner);
  store.db.exec("CREATE TRIGGER fail_victory BEFORE UPDATE OF result_json ON run_events BEGIN SELECT RAISE(ABORT,'victory failed'); END");
  assert.throws(()=>finishChallengerBattle(store,battle.id),/victory failed/);assert.equal(store.battle(battle.id).status,'active');assert.equal(store.view(owner).coins,before.coins);assert.equal(store.permanentView(owner).eggTickets,0);
  store.db.exec('DROP TRIGGER fail_victory');finishChallengerBattle(store,battle.id);assert.equal(store.view(owner).coins,before.coins+700);
 }finally{store.close();}
});
test('event on the 50th floor leaves the normal battle slot and hidden boss stage available',()=>{
 const {store,owner,run,event}=challengerFixture(':memory:','owner',50);try{
  store.chooseEvent(owner,run,event.id,'easy');const eventBattle=store.currentBattle(owner)!.id;finishChallengerBattle(store,eventBattle);store.continueEvent(owner,run,event.id);
  const normal=store.enter(owner,run,50,starters);assert.notEqual(normal,eventBattle);assert.equal(store.currentBattle(owner)!.id,normal);
  assert.equal(store.db.prepare('SELECT stage FROM battles WHERE id=?').get(normal)!.stage,0);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM battles WHERE run_id=? AND floor=50').get(run)!.n,2);
 }finally{store.close();}
});
for(const floor of [5,40])for(const {id:role} of challengers)test(`real engine battle at floor ${floor} with ${role} is legal and settles through the existing callback`,async()=>{
 const {store,owner,run,event}=challengerFixture(':memory:','owner',floor,role);try{
  store.chooseEvent(owner,run,event.id,role);const battle=store.currentBattle(owner)!;
  const log=await runBattle({teams:{p1:battle.player_team,p2:battle.opponent_team},seed:JSON.parse(battle.seed),format:battle.format,rule:battle.rule,upgrades:JSON.parse(battle.upgrades),teraTickets:JSON.parse(battle.tera_tickets),trainerEquipment:JSON.parse(battle.trainer_equipment!),player:new DamagePolicy(),opponent:new DamagePolicy()});
  assert.ok(log.turns>0);assert.ok(['Player','Tower AI'].includes(log.winner!));
  store.complete(battle.id,log,{id:battle.id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:[],winner:log.winner,error:null});
  assert.equal(store.view(owner).run!.state,log.winner==='Player'?'select':'lost');
 }finally{store.close();}
});
