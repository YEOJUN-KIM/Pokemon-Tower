import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {raidFixture,finishRaidBattle} from './raid-fixture';
import {raidBossDefinitions} from '../src/data/raids';
import {raidBattleTuning,raidBattleTrainingProfiles} from '../src/data/raid-training';
import {createRaidSnapshot} from '../src/server/raid-events';
import {raidRecruitmentTeam} from '../src/server/raid-recruitment';
import {raidTrainingPoints} from '../src/server/raid-training';
import {npcTrainingProfile} from '../src/server/npc-training';
import {npcRankTraining} from '../src/data/npc-ranks';
import {statKeys} from '../src/data/training';
import {collectionSpecies} from '../src/data/selectable-forms';
import {validateProfile,defaultProfile} from '../src/server/training';
import {encounterRandom} from '../src/server/opponent-team';

test('only the requested eight Bosses have reduced battle profiles, with exact legal budgets',()=>{
 assert.deepEqual(raidBossDefinitions.filter(b=>b.battleTraining!=='elite').map(b=>b.id).sort(),Object.keys(raidBattleTuning).sort());
 const f=raidFixture();try{
  for(const floor of [1,2,50,85,95,100])for(const boss of raidBossDefinitions)for(const route of boss.routes){
   const s=createRaidSnapshot(f.store.db,f.run,floor,encounterRandom([1,2,3,4]),{bossId:boss.id,routeId:route.id});
   const elite=npcTrainingProfile(boss.species,[...route.recruit.moves],floor,'elite',route.attack==='atk'?'physical':'special',()=>.5,npcRankTraining(floor,'elite'));
   assert.deepEqual(s.individual.evs,raidTrainingPoints(elite.evs,boss.battleTraining));
   const ratio=boss.battleTraining==='elite'?1:raidBattleTrainingProfiles[boss.battleTraining].eliteRatio;
   assert.equal(Object.values(s.individual.evs).reduce((a,b)=>a+b,0),Math.round(npcRankTraining(floor,'elite').evBudget*ratio));
   const protectedStats=boss.id==='mewtwo'?[route.attack,'spe'] as const:boss.ivRule.protected;
   assert.equal(Object.values(s.individual.ivs).filter(v=>v===31).length,boss.ivRule.perfect-(boss.ivRule.protectedIv===undefined?0:protectedStats.length));
   if(boss.battleTraining!=='elite'){
    assert.ok(s.individual.ivs.hp>=16);
    for(const stat of ['hp','def','spd'] as const)assert.equal(s.individual.evs[stat],elite.evs[stat]);
    for(const stat of protectedStats)assert.equal(s.individual.ivs[stat],boss.ivRule.protectedIv??31);
   }
   const reward=Showdown.Teams.unpack(s.recruitTeam)![0];
   assert.ok(statKeys.every(k=>(reward.ivs??{hp:31,atk:31,def:31,spa:31,spd:31,spe:31})[k]===31));
   assert.equal(statKeys.reduce((sum,k)=>sum+(reward.evs?.[k]??0),0),66);assert.ok(statKeys.every(k=>(reward.evs?.[k]??0)<=32));
   const base=collectionSpecies(reward.species),form=base===reward.species?undefined:reward.species;
   const profile={...defaultProfile(base,form),ivs:(reward.ivs??{hp:31,atk:31,def:31,spa:31,spd:31,spe:31}),evs:reward.evs!,nature:reward.nature,ability:reward.ability,moves:reward.moves};
   validateProfile(base,profile);
   const frozen=s.recruitTeam; s.individual.ivs.atk=0;s.individual.evs.spe=0;
   assert.equal(s.recruitTeam,frozen);assert.deepEqual(raidRecruitmentTeam(JSON.parse(JSON.stringify(s))),raidRecruitmentTeam(s));
  }
 }finally{f.store.close();}
});

test('Mewtwo premium preview matches collection and run after recruitment, independent of battle IVs',()=>{
 const f=raidFixture(':memory:','premium','mewtwo','x');try{
  const {store,owner,run,event,snapshot}=f,reward=Showdown.Teams.unpack(snapshot.recruitTeam)![0];
  assert.ok(reward.moves.every(move=>Showdown.Dex.moves.get(move).category==='Physical'));
  assert.notDeepEqual(reward.moves,snapshot.phases[0].moves);
  store.chooseEvent(owner,run,event.id,'challenge');const id=store.currentBattle(owner)!.id;finishRaidBattle(store,id);
  const preview=store.view(owner).run!;
  assert.deepEqual(preview.candidateIVs.Mewtwo,(reward.ivs??{hp:31,atk:31,def:31,spa:31,spd:31,spe:31}));assert.deepEqual(preview.candidateDetails!.Mewtwo.evs,reward.evs);
  store.recruit(owner,run,id,'Mewtwo',null);
  const current=JSON.parse(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(run)!.profiles as string).Mewtwo;
  const saved=store.trainingCollection(owner).find(p=>p.species==='Mewtwo')!.profile;
  for(const p of [current,saved]){assert.deepEqual(p.ivs,(reward.ivs??{hp:31,atk:31,def:31,spa:31,spd:31,spe:31}));assert.deepEqual(p.evs,reward.evs);assert.equal(p.nature,reward.nature);}
  assert.equal(snapshot.individual.ivs.atk,23);assert.equal(snapshot.individual.ivs.spe,23);
 }finally{f.store.close();}
});
