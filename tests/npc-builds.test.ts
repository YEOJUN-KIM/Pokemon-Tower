import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {randomUUID} from 'node:crypto';
import {improveNpcMoves,npcAttackStyle,npcBuildIssues} from '../src/server/npc-builds';
import {generateNpcEncounter} from '../src/server/npc-encounters';
import {npcSamples} from '../src/data/npc-samples';
import {npcRankTraining} from '../src/data/npc-ranks';
import type {TrainerTactic} from '../src/data/trainer-catalog';
import {trainNpcTeam} from '../src/server/npc-training';
import {opponentMoves,encounterRandom} from '../src/server/opponent-team';
import {FORMAT} from '../src/data/battle-rules';
import {pokemonSets,starters} from '../src/data/teams';
import {challengerDefinition} from '../src/data/challengers';
import type {NpcEncounterSnapshotV2} from '../src/server/npc-encounters';
import {challengerFixture,finishChallengerBattle} from './challenger-fixture';
import {TowerStore} from '../src/server/tower-store';
import {moveLearnsets} from '../src/server/move-learnsets';
import frozenV2 from './fixtures/npc-encounter-v2-before-builds.json' with {type:'json'};
const seed:[number,number,number,number]=[17,29,43,71],dex=Showdown.Dex;
const tactics:TrainerTactic[]=['balanced','physical','special','setup','bulk','status','speed'];
const validator=new Showdown.TeamValidator(FORMAT);

// Independent assertions read move effects rather than reproducing the optimizer's setup table.
function coherent(name:string,moves:string[]){
 const selected=moves.map(m=>dex.moves.get(m)),attacks=selected.filter(m=>m.category!=='Status');
 assert.ok(attacks.length,`${name}: no attack`);
 const types=dex.species.get(name).types;
 const legalStab=moveLearnsets[name].legalMoves.map(m=>dex.moves.get(m)).some(m=>types.includes(m.type)&&m.category!=='Status'&&m.basePower>=60&&!m.flags.charge&&!m.flags.recharge&&!m.selfdestruct&&!m.mindBlownRecoil);
 if(legalStab)assert.ok(attacks.some(m=>types.includes(m.type)),`${name}: no STAB`);
 for(const m of selected.filter(m=>m.category==='Status'&&m.boosts)){
  const {atk=0,spa=0}=m.boosts!;
  if(atk>0||spa>0)assert.ok(attacks.filter(a=>a.category==='Physical'?atk>0:spa>0).length>=2,`${name}: ${moves.join(', ')}`);
 }
 assert.deepEqual(npcBuildIssues(name,moves),[],`${name}: ${moves.join(', ')}`);
 assert.equal(validator.validateSet({...structuredClone(pokemonSets[name]),moves},{}),null,`${name}: illegal moves`);
}

test('the four reported special attackers receive coherent legal builds even with physical/setup tactics',()=>{
 for(const name of ['Ludicolo','Charizard','Ursaluna-Bloodmoon','Walrein']){
  assert.equal(npcAttackStyle(name),'special');
  for(const tactic of tactics)for(const rank of ['elite','master'] as const){
   const original=opponentMoves(name,encounterRandom(seed),tactic),moves=improveNpcMoves(name,original,rank,tactic);
   coherent(name,moves);assert.ok(moves.every(m=>dex.moves.get(m).category!=='Physical'));
   assert.deepEqual(moves,improveNpcMoves(name,original,rank,tactic));
  }
 }
});

test('physical/special setup has at least two matching attacks; bulk/status retain attacks and at most one recovery',()=>{
 const names=['Garchomp','Scizor','Dragonite','Gyarados','Machamp','Cloyster','Alakazam','Gengar','Gardevoir','Volcarona','Blastoise','Snorlax','Toxapex','Corviknight','Slowbro','Infernape','Lucario','Shiftry'];
 let physical=0,special=0,fourAttacks=0;
 for(const name of names)for(const tactic of tactics)for(const rank of ['elite','master'] as const){
  const moves=improveNpcMoves(name,opponentMoves(name,encounterRandom(seed),tactic),rank,tactic);coherent(name,moves);
  if(moves.every(m=>dex.moves.get(m).category!=='Status'))fourAttacks++;
  for(const m of moves.map(m=>dex.moves.get(m)))if(m.category==='Status'&&m.boosts){if((m.boosts.atk??0)>0)physical++;if((m.boosts.spa??0)>0)special++;}
 }
 assert.ok(physical>0&&special>0&&fourAttacks>0);
 assert.notEqual(npcAttackStyle('Lucario'),'mixed','learning both categories alone must not imply Mixed');
 assert.equal(npcAttackStyle('Medicham'),'physical','Pure Power should not produce an accidental Mixed attacker');
 assert.equal(npcAttackStyle('Wyrdeer'),'mixed','close stats and complementary STAB can justify Mixed');
});

test('setup payoff uses the actual attacking stat: Foul Play/Body Press do not justify Swords Dance',()=>{
 assert.ok(npcBuildIssues('Garchomp',['Swords Dance','Foul Play','Body Press','Earthquake']).includes('setup without aligned attacks'));
});

test('Master/Elite common teams obey build invariants across classes, floors and independent seeds',()=>{
 let checked=0,mixed=0;
 for(const floor of [5,20,40,99])for(const n of [1,17,83])for(const sample of npcSamples)for(const rank of ['elite','master'] as const){
  const encounter=generateNpcEncounter(floor,[n,29,43,71],sample,rank);
  for(const entry of encounter.team){coherent(entry.name,entry.moves);checked++;if(npcAttackStyle(entry.name)==='mixed')mixed++;}
 }
 assert.equal(checked,1440);assert.ok(mixed/checked<.15,`Mixed should be rare: ${mixed}/${checked}`);
});

test('new build correction is opt-in: Normal and legacy training retain exact moves/profiles and IV RNG',()=>{
 for(const floor of [5,20,40])for(const sample of npcSamples){
  const normal=generateNpcEncounter(floor,seed,sample,'normal');
  assert.deepEqual(normal.team,trainNpcTeam(normal.team,floor,'standard',sample.tactic,seed,'basic',normal.training,{itemSlots:normal.composition.itemSlots}));
  const elite=generateNpcEncounter(floor,seed,sample,'elite'),old=trainNpcTeam(elite.team,floor,'standard',sample.tactic,seed,'basic',npcRankTraining(floor,'elite'),{itemSlots:elite.composition.itemSlots});
  for(let i=0;i<3;i++){
   assert.deepEqual(elite.team[i].profile!.ivs,old[i].profile!.ivs);
   assert.equal(Object.values(elite.team[i].profile!.evs).reduce((a,b)=>a+b,0),Object.values(old[i].profile!.evs).reduce((a,b)=>a+b,0));
   for(const stat of ['hp','def','spd','spe'] as const)assert.equal(elite.team[i].profile!.evs[stat],old[i].profile!.evs[stat]);
  }
 }
 for(const name of ['Ditto','Unown','Wobbuffet','Pyukumuku']){
  const moves=opponentMoves(name,encounterRandom(seed),'setup');assert.deepEqual(improveNpcMoves(name,moves,'master','setup'),moves);
 }
});

test('a pre-change v2 Master snapshot keeps even its old incoherent moves after reopen, selection and retry',()=>{
 const snapshot=frozenV2 as unknown as NpcEncounterSnapshotV2;
 assert.ok(snapshot.team.some(p=>npcBuildIssues(p.name,p.moves).length>0),'fixture must predate correction');
 const fresh=generateNpcEncounter(snapshot.floor,snapshot.seed,snapshot.sample,snapshot.rank);
 assert.deepEqual(fresh.team.map(p=>p.name),snapshot.team.map(p=>p.name));
 assert.deepEqual(fresh.sample,snapshot.sample);assert.deepEqual(fresh.training,snapshot.training);assert.deepEqual(fresh.composition,snapshot.composition);
 for(let i=0;i<3;i++){assert.deepEqual(fresh.team[i].profile!.ivs,snapshot.team[i].profile!.ivs);assert.deepEqual(fresh.team[i].profile!.evs,snapshot.team[i].profile!.evs);}
 const path=`.data/tests/npc-build-v2-${randomUUID()}.sqlite`;
 let {store,run,event,owner}=challengerFixture(path,'owner',40,'random');
 try{
  const offer={...challengerDefinition(snapshot.sample,snapshot.rank,40),encounter:snapshot};
  store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify([offer]),event.id);
  store.close();store=new TowerStore(path);
  store.chooseEvent(owner,run,event.id,offer.id);
  const original=store.currentBattle(owner)!,sets=Showdown.Teams.unpack(original.opponent_team)!;
  for(const set of sets){const saved=snapshot.team.find(p=>p.name===set.species)!;assert.deepEqual(set.moves.map(m=>dex.moves.get(m).name),saved.moves);assert.deepEqual(set.ivs,saved.profile!.ivs);assert.deepEqual(set.evs,saved.profile!.evs);assert.equal(set.item,saved.item??'');}
  store.db.prepare('UPDATE run_retries SET retry_limit=1 WHERE run_id=?').run(run);
  finishChallengerBattle(store,original.id,'Tower AI');store.retry(owner,run,original.id);
  const retry=store.enter(owner,run,40,starters);assert.equal(store.battle(retry).opponent_team,original.opponent_team);
 }finally{store.close();}
});
