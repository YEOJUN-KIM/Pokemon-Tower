import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {mirrorFixture} from './mirror-fixture';
import {finishChallengerBattle} from './challenger-fixture';
import {addMirrorCandidate,snapshotMirrorReward} from '../src/server/mirror-challenger';
import {mirrorChallengerSettings,mirrorRewardProfile} from '../src/data/mirror-challenger';
import {npcRankTraining} from '../src/data/npc-ranks';
import {statKeys} from '../src/data/training';
import {TowerStore} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {BattleSession} from '../src/server/battle-session';
import {starters,POINT_TEAM_MARKER,pointBonuses} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {enhancementCandidates} from '../src/server/pokemon-enhancements';
import {eventKinds} from '../src/data/run-events';

test('Mirror is a rare replacement: 3 classes, at most one, unchanged no-hit and no-source fallback',()=>{
 const f=mirrorFixture();try{
  assert.equal(mirrorChallengerSettings.mirrorCandidateChance,.03);assert.ok(!eventKinds.includes('mirror-match' as never));
  assert.equal(f.candidates.length,3);assert.equal(f.candidates.filter(c=>c.mirror).length,1);assert.equal(new Set(f.candidates.map(c=>c.title)).size,3);
  assert.ok((mirrorChallengerSettings.sampleIds as readonly string[]).includes(f.mirror.sample.id));
  assert.deepEqual(addMirrorCandidate(f.store.db,f.event.id,f.run,20,'basic',f.normal,()=>.03),f.normal);
  f.store.db.prepare('DELETE FROM recruitments WHERE battle_id=?').run(f.mirror.mirror.sourceBattleId);
  assert.deepEqual(addMirrorCandidate(f.store.db,f.event.id,f.run,20,'basic',f.normal,()=>0),f.normal);
 }finally{f.store.close();}
});

test('enhancement targets include the entire six-member roster, not only the last three battlers',()=>{
 const f=mirrorFixture();try{
  for(const [i,species] of ['Infernape','Pikachu','Garchomp'].entries()){
   f.store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(f.owner,species);f.store.db.prepare('INSERT INTO members VALUES (?,?,?)').run(f.run,i+3,species);
  }
  const candidates=enhancementCandidates(f.store.db,f.owner,f.run,'one-iv');assert.equal(new Set(candidates.map(c=>c.species)).size,6);assert.equal(candidates.length,36);
 }finally{f.store.close();}
});

test('pending enhancement selection survives server store restart and a conflicting replay is rejected',()=>{
 const path=`.data/tests/mirror-pending-${randomUUID()}.sqlite`,f=mirrorFixture(path);let store=f.store;try{
  f.save(.92);store.chooseEvent(f.owner,f.run,f.event.id,f.mirror.id);finishChallengerBattle(store,store.currentBattle(f.owner)!.id);
  const result=store.view(f.owner).run!.event!.result!;store.close();store=new TowerStore(path);assert.deepEqual(store.view(f.owner).run!.event!.result,result);
  const selection=result.selections![0];store.selectEventReward(f.owner,f.run,f.event.id,selection.id,selection.candidates[0].id);
  assert.throws(()=>store.selectEventReward(f.owner,f.run,f.event.id,selection.id,selection.candidates[1].id),/이미 다른/);
 }finally{store.close();}
});

test('shiny-locked cartridge species remain valid Tower shiny rewards and Mirror opponents',async()=>{
 const f=mirrorFixture(),service=new TowerService(f.store);try{
  const source=Showdown.Teams.unpack(f.mirror.mirror.sourcePlayerTeam)!;source[0]={...source[0],name:'Ursaluna-Bloodmoon',species:'Ursaluna-Bloodmoon',ability:"Mind's Eye",moves:['Blood Moon','Hyper Voice','Earth Power','Moonlight'],shiny:true};
  f.store.db.prepare('UPDATE battles SET player_team=? WHERE id=?').run(Showdown.Teams.pack(source),f.mirror.mirror.sourceBattleId);
  const candidates=addMirrorCandidate(f.store.db,f.event.id,f.run,20,'basic',f.normal,()=>0),mirror=candidates.find(c=>c.mirror)!;assert.ok(mirror);assert.equal(Showdown.Teams.unpack(mirror.mirror!.opponentTeam)![0].shiny,true);
  f.store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify(candidates),f.event.id);f.store.chooseEvent(f.owner,f.run,f.event.id,mirror.id);assert.ok((await service.state(f.owner)).battle!.opponent);
 }finally{await service.dispose();f.store.close();}
});

test('copies the exact floor build and form; Elite IV/EV replace player stats and vitamin metadata',()=>{
 const f=mirrorFixture();try{
  const source=Showdown.Teams.unpack(f.mirror.mirror.sourcePlayerTeam)!;
  for(const p of source){p.nature='Timid';p.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};p.pokeball=POINT_TEAM_MARKER+'boost5x5x5x5x5x5';p.item='Life Orb';}
  source[1]={...source[1],species:'Rotom-Wash',name:'Rotom',ability:'Levitate',moves:['Hydro Pump','Volt Switch','Will-O-Wisp','Protect']};source[2].item='Leftovers';source[1].item='Choice Specs';
  f.store.db.prepare('UPDATE battles SET player_team=? WHERE id=?').run(Showdown.Teams.pack(source),f.mirror.mirror.sourceBattleId);
  const mirror=addMirrorCandidate(f.store.db,f.event.id,f.run,20,'basic',f.normal,()=>0).find(c=>c.mirror)!;assert.ok(mirror);
  const copy=Showdown.Teams.unpack(mirror.mirror!.opponentTeam)!,original=Showdown.Teams.unpack(mirror.mirror!.sourcePlayerTeam)!,training=npcRankTraining(20,'elite');
  for(let i=0;i<3;i++){
   for(const key of ['species','nature','item','moves','ability','teraType'] as const)assert.deepEqual(copy[i][key],original[i][key]);
   assert.equal(Showdown.toID(copy[i].pokeball),POINT_TEAM_MARKER);assert.deepEqual(pointBonuses(copy[i].pokeball??''),{});
   assert.ok(statKeys.every(stat=>copy[i].ivs![stat]>=training.ivRange[0]&&copy[i].ivs![stat]<=training.ivRange[1]));
   assert.notDeepEqual(copy[i].ivs,original[i].ivs);assert.equal(statKeys.reduce((n,s)=>n+copy[i].evs![s],0),training.evBudget);
  }
 }finally{f.store.close();}
});

test('source excludes extra challenger battles and freezes opponents, rewards and retries across reopening',()=>{
 const path=`.data/tests/mirror-${randomUUID()}.sqlite`,f=mirrorFixture(path);let store=f.store;try{
  const snapshot=JSON.stringify(f.mirror),raw=store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json;
  store.close();store=new TowerStore(path);assert.equal(store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json,raw);
  const view=store.view(f.owner).run!.event!.challengers!.find(c=>c.mirror)!;assert.equal(view.rewardPreview,'특별한 보상');assert.equal(view.title,f.mirror.title);assert.ok(!JSON.stringify(view).includes('sourcePlayerTeam'));
  store.db.prepare('UPDATE run_retries SET retry_limit=1 WHERE run_id=?').run(f.run);
  store.chooseEvent(f.owner,f.run,f.event.id,f.mirror.id);const battle=store.currentBattle(f.owner)!;assert.equal(battle.opponent_team,f.mirror.mirror.opponentTeam);
  finishChallengerBattle(store,battle.id,'Opponent');store.retry(f.owner,f.run,battle.id);
  const profiles=JSON.parse(String(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(f.run)!.profiles));profiles[starters[0]].moves=['Protect'];store.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),f.run);
  store.enter(f.owner,f.run,20,starters);const retried=store.currentBattle(f.owner)!;assert.equal(retried.opponent_team,battle.opponent_team);assert.equal(retried.seed,battle.seed);
  finishChallengerBattle(store,retried.id);assert.equal(store.view(f.owner).run!.event!.phase,'reward');assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM recruitments WHERE battle_id=?').get(retried.id)!.n,0);
  assert.equal(store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json,raw);assert.equal(JSON.stringify(f.mirror),snapshot);
 }finally{store.close();}
});

for(const [roll,kind] of [[0,'eggs'],[.30,'superRare'],[.45,'shiny-ticket'],[.47,'growth'],[.77,'equipment'],[.92,'one-iv'],[.99,'six-iv'],[.995,'shiny']] as const)test(`random reward ${kind}: one saved category, exact-once payout/target selection`,()=>{
 const f=mirrorFixture();try{
  f.save(roll);assert.equal(f.mirror.mirror.rewardKind,kind);f.store.chooseEvent(f.owner,f.run,f.event.id,f.mirror.id);const battle=f.store.currentBattle(f.owner)!;
  finishChallengerBattle(f.store,battle.id);finishChallengerBattle(f.store,battle.id);
  const result=f.store.view(f.owner).run!.event!.result!;
  if(['one-iv','six-iv','shiny'].includes(kind)){
   assert.equal(result.entries.length,0);assert.equal(result.selections!.length,1);
   assert.throws(()=>f.store.continueEvent(f.owner,f.run,f.event.id),/선택/);
   const selection=result.selections![0],candidate=selection.candidates[0];f.store.selectEventReward(f.owner,f.run,f.event.id,selection.id,candidate.id);
   const once=f.store.view(f.owner);f.store.selectEventReward(f.owner,f.run,f.event.id,selection.id,candidate.id);assert.deepEqual(f.store.view(f.owner),once);
   const saved=f.store.trainingCollection(f.owner).find(t=>t.species===candidate.species)!.profile;
   if(kind==='shiny')assert.ok(saved.shiny);else if(kind==='six-iv')assert.ok(statKeys.every(s=>saved.ivs[s]===31));else assert.equal(saved.ivs[candidate.stat!],31);
   const current=JSON.parse(String(f.store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(f.run)!.profiles))[candidate.species!];assert.equal(current.shiny,saved.shiny);if(kind!=='shiny')assert.equal(current.ivs[candidate.stat??'hp'],31);
  }else{assert.equal(result.selections,undefined);assert.equal(result.entries.length,1);}
  f.store.continueEvent(f.owner,f.run,f.event.id);assert.equal(f.store.view(f.owner).run!.event,null);assert.equal(f.store.view(f.owner).run!.floor,20);
 }finally{f.store.close();}
});

test('already V/6V/Shiny excluded, no eligible target has snapshotted growth fallback, wrong species/stat rejected and receipt failure rolls back',()=>{
 const f=mirrorFixture();try{
  const profiles=JSON.parse(String(f.store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(f.run)!.profiles));
  profiles[starters[0]].ivs.hp=31;f.store.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),f.run);
  assert.ok(!enhancementCandidates(f.store.db,f.owner,f.run,'one-iv').some(c=>c.id===`${starters[0]}:hp`));
  f.save(.92);f.store.chooseEvent(f.owner,f.run,f.event.id,f.mirror.id);finishChallengerBattle(f.store,f.store.currentBattle(f.owner)!.id);
  const before=f.store.view(f.owner),selection=before.run!.event!.result!.selections![0];
  assert.throws(()=>f.store.selectEventReward(f.owner,f.run,f.event.id,selection.id,`${starters[0]}:hp`),/후보/);
  assert.throws(()=>f.store.selectEventReward(f.owner,f.run,f.event.id,selection.id,'Fake:atk'),/후보/);
  f.store.db.exec("CREATE TRIGGER fail_mirror_receipt BEFORE UPDATE ON run_events BEGIN SELECT RAISE(ABORT,'receipt failure'); END;");
  assert.throws(()=>f.store.selectEventReward(f.owner,f.run,f.event.id,selection.id,selection.candidates[0].id),/receipt failure/);assert.deepEqual(f.store.view(f.owner),before);
 }finally{f.store.close();}
 const all=mirrorFixture();try{
  const profiles=JSON.parse(String(all.store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(all.run)!.profiles));
  for(const name of starters){profiles[name].ivs=Object.fromEntries(statKeys.map(s=>[s,31]));profiles[name].shiny=true;}
  all.store.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),all.run);
  for(const mode of ['one-iv','six-iv','shiny'] as const)assert.equal(enhancementCandidates(all.store.db,all.owner,all.run,mode).length,0);
  assert.equal(snapshotMirrorReward(all.store.db,all.run,()=>.995).rewardDefinition.entries[0].kind,'growth-points');
 }finally{all.store.close();}
});

for(const rule of ['basic','mega','z','dynamax','tera','chaos'] as const)test(`Mirror enters existing engine under ${rule}, preserves held items and available trainer equipment`,async()=>{
 const f=mirrorFixture(':memory:','owner',20,rule);const service=new TowerService(f.store);try{
  if(rule!=='basic'){
   if(rule==='mega'||rule==='z'){
    const source=Showdown.Teams.unpack(f.mirror.mirror.sourcePlayerTeam)!;source[0].item=rule==='mega'?'Charizardite X':'Firium Z';f.store.db.prepare('UPDATE battles SET player_team=? WHERE id=?').run(Showdown.Teams.pack(source),f.mirror.mirror.sourceBattleId);
   }else f.store.db.prepare('UPDATE battles SET trainer_equipment=? WHERE id=?').run(JSON.stringify(rule==='dynamax'?['Dynamax Band']:['Tera Orb']),f.mirror.mirror.sourceBattleId);
   const next=addMirrorCandidate(f.store.db,f.event.id,f.run,20,rule,f.normal,()=>0);const mirrored=next.find(c=>c.mirror)!;f.store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify(next),f.event.id);Object.assign(f.mirror,mirrored);
  }
  f.store.chooseEvent(f.owner,f.run,f.event.id,f.mirror.id);const state=await service.state(f.owner);assert.equal(state.battle!.team.length,3);assert.ok(state.battle!.opponent);assert.equal(f.store.currentBattle(f.owner)!.opponent_team,f.mirror.mirror.opponentTeam);
  if(rule==='dynamax')assert.equal(state.battle!.opponentRule,'dynamax');if(rule==='tera')assert.equal(state.battle!.opponentRule,'tera');
  if(rule==='mega'||rule==='z'){assert.equal(state.battle!.opponentRule,rule);assert.equal(Showdown.Teams.unpack(f.mirror.mirror.opponentTeam)![0].item,rule==='mega'?'Charizardite X':'Firium Z');}
  const action=state.battle!.actions.find(a=>a.command.startsWith('move '));assert.ok(action);await service.action(f.owner,state.battle!.id,state.battle!.requestId,action.command);
 }finally{await service.dispose();f.store.close();}
});
