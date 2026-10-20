import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {raidFixture,finishRaidBattle} from './raid-fixture';
import {createRaidSnapshot,RaidEvents} from '../src/server/raid-events';
import {raidBossDefinitions,raidCategoryPresentation,raidEventSettings} from '../src/data/raids';
import {selectRunEvent} from '../src/game/run-events';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {statKeys} from '../src/data/training';
import {npcRankTraining} from '../src/data/npc-ranks';
import {rollEncounterShiny} from '../src/server/shiny';
import {TowerService} from '../src/server/tower-service';
import {TowerStore} from '../src/server/tower-store';
import {randomUUID} from 'node:crypto';
import {snapshotRankReward} from '../src/server/challenger-rewards';
import {grantRunItem,grantStoredReward} from '../src/server/inventory-grants';
import {replayBattle,battleEvents} from '../src/battle/run';
import {packPlayerTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {eventDefinitions} from '../src/data/run-events';

test('raid eligibility shares event gating and exposes only silhouette/category',()=>{
 assert.equal(selectRunEvent(1,null,()=>0,{'raid-encounter':eventDefinitions['raid-encounter']},2),'raid-encounter');
 assert.equal(selectRunEvent(5,null,()=>0,undefined,2),null);
 assert.equal(selectRunEvent(4,3,()=>0,undefined,2),null);
 const f=raidFixture();try{assert.deepEqual(f.event.raid,{spriteId:445,category:'normal'});assert.equal(JSON.stringify(f.event).includes('Garchomp'),false);assert.ok(raidEventSettings.weight>0);assert.equal(Object.keys(raidCategoryPresentation).length,6);}finally{f.store.close();}
});
for(const [bossId,routeId] of [['garchomp','mega'],['mewtwo','x'],['mewtwo','y']]){
 test(`${bossId}/${routeId}: frozen individual, legal engine battle, phases and recruit`,async()=>{
  const f=raidFixture(':memory:','owner',bossId,routeId),{store,owner,run,event,snapshot}=f;
  try{
   const ivs=snapshot.individual.ivs;
   const rewardSet=Showdown.Teams.unpack(snapshot.recruitTeam)![0];
   assert.equal(Object.values(ivs).filter(v=>v===31).length,bossId==='garchomp'?4:3);assert.equal(ivs[routeId==='y'?'spa':'atk'],31);assert.equal(ivs.spe,31);
   assert.equal(statKeys.reduce((sum,k)=>sum+snapshot.individual.evs[k],0),Math.round(npcRankTraining(2,'elite').evBudget*(bossId==='mewtwo'?.57:1)));
   assert.deepEqual(new RaidEvents(store.db).snapshot(new RaidEvents(store.db).row(event.id)!),snapshot);
   store.chooseEvent(owner,run,event.id,'challenge');const battle=store.currentBattle(owner)!;
   store.chooseEvent(owner,run,event.id,'challenge');assert.equal(store.currentBattle(owner)!.id,battle.id);
   assert.throws(()=>store.chooseEvent(owner,run,event.id,'skip'));
   const service=new TowerService(store);try{assert.equal((await service.state(owner)).battle!.status,'waiting');}finally{await service.dispose();}
   const log=await runBattle({teams:{p1:battle.player_team,p2:battle.opponent_team},seed:[1,2,3,4],format:battle.format,rule:battle.rule,raid:snapshot,player:new DamagePolicy(),opponent:new DamagePolicy()});
   assert.ok(log.turns>0);assert.ok(log.publicProtocol.some(l=>l.startsWith('|raid|')));
   assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
   // Walk every phase with a strong legal Ice build below; lifecycle settlement is independent of winner.
   const receipt=finishRaidBattle(store,battle.id);store.complete(battle.id,receipt.log,receipt.view);
   assert.equal(store.view(owner).run!.state,'recruit');assert.deepEqual(store.view(owner).run!.candidates,[snapshot.species]);
   assert.deepEqual(store.view(owner).run!.candidateIVs[snapshot.species],(rewardSet.ivs??{hp:31,atk:31,def:31,spa:31,spd:31,spe:31}));
   const reward=store.db.prepare('SELECT result_json FROM run_events WHERE id=?').get(event.id)!.result_json;
   assert.ok(reward);store.recruit(owner,run,battle.id,snapshot.species,null);
   assert.throws(()=>store.recruit(owner,run,battle.id,snapshot.species,null));
   const profiles=JSON.parse(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(run)!.profiles as string),profile=profiles[snapshot.species];
   assert.deepEqual(profile.ivs,(rewardSet.ivs??{hp:31,atk:31,def:31,spa:31,spd:31,spe:31}));assert.equal(profile.nature,rewardSet.nature);assert.equal(profile.ability,rewardSet.ability);assert.deepEqual(profile.moves,rewardSet.moves);assert.equal(profile.shiny,snapshot.individual.shiny);
   assert.equal((Object.values(profile.evs) as number[]).reduce((n,v)=>n+v,0),66);assert.equal(profile.forme,undefined);
   assert.equal(store.view(owner).run!.floor,2);assert.equal(store.view(owner).run!.event!.result!.title,'특별한 보상');
   store.continueEvent(owner,run,event.id);assert.equal(store.view(owner).run!.event,null);
   const normal=store.enter(owner,run,2,store.view(owner).run!.suggestedTeam);assert.notEqual(normal,battle.id);
  }finally{store.close();}
 });
}
test('skip, loss and retry keep receipts and all snapshot fields stable',()=>{
 const skipped=raidFixture();try{skipped.store.chooseEvent(skipped.owner,skipped.run,skipped.event.id,'skip');assert.equal(skipped.store.view(skipped.owner).run!.event,null);assert.equal(new RaidEvents(skipped.store.db).row(skipped.event.id)!.battle_id,null);}finally{skipped.store.close();}
 const {store,owner,run,event,snapshot}=raidFixture(':memory:','retry','mewtwo','y');try{
  store.db.prepare('UPDATE run_retries SET retry_limit=1 WHERE run_id=?').run(run);
  store.chooseEvent(owner,run,event.id,'challenge');const first=store.currentBattle(owner)!;
  finishRaidBattle(store,first.id,'Tower AI');assert.equal(store.view(owner).run!.state,'lost');assert.equal(store.db.prepare('SELECT result_json FROM run_events WHERE id=?').get(event.id)!.result_json,null);
  store.retry(owner,run,first.id);store.retry(owner,run,first.id);const next=store.enter(owner,run,2,startersFor(store,owner));
  assert.equal(store.battle(next).opponent_team,first.opponent_team);assert.equal(store.battle(next).seed,first.seed);assert.deepEqual(new RaidEvents(store.db).snapshot(new RaidEvents(store.db).forBattle(next)!),snapshot);
  finishRaidBattle(store,next);assert.equal(store.view(owner).run!.state,'recruit');
  assert.throws(()=>store.recruit(owner,run,first.id,'Mewtwo',null),/현재 승리/);
 }finally{store.close();}
});
test('reopening preserves route/shiny/reward and completion/recruitment are atomic receipts',async()=>{
 const path=`.data/tests/raid-${randomUUID()}.sqlite`,f=raidFixture(path,'persist','mewtwo','x');let store=f.store;
 try{
  const raw=store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json;
  store.close();store=new TowerStore(path);
  assert.equal(store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json,raw);
  store.chooseEvent(f.owner,f.run,f.event.id,'challenge');const id=store.currentBattle(f.owner)!.id,before=store.view(f.owner);
  const session=new TowerService(store),initial=await session.state(f.owner);try{assert.equal(initial.battle!.status,'waiting');}finally{await session.dispose();}
  store.close();store=new TowerStore(path);const recovered=new TowerService(store);
  try{const state=(await recovered.state(f.owner)).battle!;assert.deepEqual({...state,messages:battleEvents(state.messages)},{...initial.battle,messages:battleEvents(initial.battle!.messages)});}finally{await recovered.dispose();}
  store.db.exec("CREATE TRIGGER fail_raid BEFORE UPDATE OF result_json ON run_events BEGIN SELECT RAISE(ABORT,'raid receipt failed'); END");
  assert.throws(()=>finishRaidBattle(store,id),/raid receipt failed/);assert.equal(store.battle(id).status,'active');assert.equal(store.view(f.owner).coins,before.coins);
  store.db.exec('DROP TRIGGER fail_raid');const receipt=finishRaidBattle(store,id),after=store.view(f.owner);store.complete(id,receipt.log,receipt.view);assert.deepEqual(store.view(f.owner),after);
  assert.throws(()=>store.continueEvent(f.owner,f.run,f.event.id),/영입/);
  store.db.exec("CREATE TRIGGER fail_raid_recruit BEFORE INSERT ON recruitments BEGIN SELECT RAISE(ABORT,'recruit failed'); END");
  assert.throws(()=>store.recruit(f.owner,f.run,id,'Mewtwo',null),/recruit failed/);assert.equal(store.view(f.owner).run!.state,'recruit');assert.ok(!store.view(f.owner).unlocked.includes('Mewtwo'));
  store.db.exec('DROP TRIGGER fail_raid_recruit');store.recruit(f.owner,f.run,id,'Mewtwo',null);store.close();store=new TowerStore(path);
  assert.equal(store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json,raw);assert.equal(store.view(f.owner).run!.state,'select');
  assert.throws(()=>store.recruit(f.owner,f.run,id,'Mewtwo',null));assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});
for(const kind of ['epic','machine'])test(`raid ${kind}: existing unique ownership fallback pays once without reroll`,()=>{
 const f=raidFixture();try{
  const values=[kind==='epic'?.8:.99,.2],reward=snapshotRankReward(f.store.db,f.run,'elite',()=>values.shift()??0).rewardDefinition;
  f.snapshot.reward={...reward,title:'특별한 보상'};
  f.store.db.prepare('UPDATE raid_encounters SET snapshot_json=? WHERE event_id=?').run(JSON.stringify(f.snapshot),f.event.id);
  const effect=reward.entries[0];
  if(effect.kind==='item-exchange')grantRunItem(f.store.db,f.run,effect.items[0],1);
  else if(effect.kind==='machine')grantStoredReward(f.store.db,f.run,effect);
  else assert.fail('Expected unique effect');
  f.store.chooseEvent(f.owner,f.run,f.event.id,'challenge');const id=f.store.currentBattle(f.owner)!.id,before=f.store.view(f.owner).coins;
  const receipt=finishRaidBattle(f.store,id);f.store.complete(id,receipt.log,receipt.view);
  assert.equal(f.store.view(f.owner).coins,before+1500);assert.deepEqual(JSON.parse(f.store.db.prepare('SELECT result_json FROM run_events WHERE id=?').get(f.event.id)!.result_json as string).entries,[{kind:'coins',amount:1500}]);
 }finally{f.store.close();}
});
function startersFor(store:import('../src/server/tower-store').TowerStore,owner:string){return store.view(owner).run!.suggestedTeam;}
for(const [bossId,routeId] of [['garchomp','mega'],['mewtwo','x'],['mewtwo','y']])test(`${bossId}/${routeId}: full validated battle wins all phases and settles through live session`,async()=>{
 const f=raidFixture(':memory:','live',bossId,routeId),{store,owner,run,event}=f;
 const profiles=Object.fromEntries(['Cloyster','Mewtwo','Kyogre'].map(name=>{const p=defaultProfile(name);p.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};p.runBonuses={hp:100,atk:100,def:100,spa:100,spd:100,spe:100};
  if(name==='Cloyster'){p.moves=['Icicle Spear','Rock Blast','Liquidation','Ice Shard'];p.ability='Skill Link';p.nature='Adamant';p.evs={hp:2,atk:32,def:0,spa:0,spd:0,spe:32};}
  if(name==='Mewtwo')p.moves=['Shadow Ball','Psystrike','Ice Beam','Recover'];
  if(name==='Kyogre')p.moves=['Origin Pulse','Ice Beam','Thunder','Calm Mind'];
  return [name,p];}));
 const service=new TowerService(store);
 try{
  store.chooseEvent(owner,run,event.id,'challenge');const b=store.currentBattle(owner)!;
  store.db.prepare('UPDATE battles SET player_team=?,seed=? WHERE id=?').run(packPlayerTeam(Object.keys(profiles),profiles),'[1,2,3,4]',b.id);
  let state=await service.state(owner),steps=0;
  while(state.battle!.status==='waiting'&&steps++<100){
   const battle=state.battle!,moves=battle.actions.filter(a=>a.command.startsWith('move ')&&!/ (mega|dynamax|terastallize|zmove)/.test(a.command));
   const selected=moves[0]??battle.actions[0];
   state=await service.action(owner,battle.id,battle.requestId,selected.command);
  }
  assert.equal(state.battle!.winner,'Player');assert.equal(state.tower.run!.state,'recruit');
  const saved=JSON.parse(store.battle(b.id).log!) as import('../src/battle/run').BattleLog;
  const messages=saved.publicProtocol.filter(l=>l.startsWith('|message|'));
  assert.deepEqual(messages.slice(1),f.snapshot.phases.slice(1).flatMap(p=>p.messages!.map(m=>'|message|'+m)));
  assert.equal(saved.publicProtocol.filter(l=>l.startsWith('|switch|p2')).length,f.snapshot.phases.length);
  assert.ok(saved.publicProtocol.filter(l=>l.includes('[raid]')).every(l=>!l.startsWith('|move|')));
  assert.equal(state.tower.run!.candidates.length,1);assert.equal(state.battle!.field!.opponentSize,1);
 }finally{await service.dispose();store.close();}
});
test('full roster uses existing replacement and grants premium Raid training',()=>{
 const {store,owner,run,event,snapshot}=raidFixture();try{
  for(const [i,name] of ['Arcanine','Gyarados','Snorlax'].entries())store.db.prepare('INSERT INTO members VALUES (?,?,?)').run(run,i+3,name);
  const p=defaultProfile('Garchomp');p.evs.atk=12;p.evs.spe=8;
  store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1)').run(owner,'Garchomp',JSON.stringify(p));
  const profiles=JSON.parse(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(run)!.profiles as string);profiles.Garchomp=p;store.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),run);
  store.chooseEvent(owner,run,event.id,'challenge');const id=store.currentBattle(owner)!.id;finishRaidBattle(store,id);
  assert.throws(()=>store.recruit(owner,run,id,'Garchomp',null),/6마리/);
  store.recruit(owner,run,id,'Garchomp','Snorlax');const view=store.view(owner);
  assert.equal(view.run!.roster.length,6);assert.ok(!view.run!.roster.includes('Snorlax'));assert.ok(view.run!.roster.includes('Garchomp'));
  const saved=JSON.parse(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(run)!.profiles as string).Garchomp;
  const reward=Showdown.Teams.unpack(snapshot.recruitTeam)![0];assert.deepEqual(saved.evs,reward.evs);assert.deepEqual(saved.ivs,(reward.ivs??{hp:31,atk:31,def:31,spa:31,spd:31,spe:31}));
 }finally{store.close();}
});
test('standard shiny draw can be injected without changing odds or phase/recruit flags',()=>{
 assert.equal(rollEncounterShiny(max=>{assert.equal(max,8192);return 0;}),true);
 const f=raidFixture();try{for(const value of [0,.5]){const s=createRaidSnapshot(f.store.db,f.run,2,()=>value,{bossId:'mewtwo',routeId:'x'});assert.equal(s.individual.shiny,value===0);assert.ok(Showdown.Teams.unpack(s.opponentTeam)!.every(p=>!!p.shiny===(value===0)));assert.equal(!!Showdown.Teams.unpack(s.recruitTeam)![0].shiny,value===0);}}finally{f.store.close();}
});
