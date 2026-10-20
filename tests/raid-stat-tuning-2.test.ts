import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {raidBossDefinitions} from '../src/data/raids';
import {statKeys} from '../src/data/training';
import {createRaidSnapshot} from '../src/server/raid-events';
import {encounterRandom} from '../src/server/opponent-team';
import {TowerStore} from '../src/server/tower-store';
import {raidFixture,finishRaidBattle} from './raid-fixture';

const changes=[['mewtwo',23,'raid-top'],['zacian',0,'raid-very-strong'],['rayquaza',24,'raid-top'],['kyogre',24,'raid-very-strong'],['groudon',25,'raid-very-strong']] as const;
test('five Raid core IV overrides retain every other IV, bulk points, RNG and premium reward',()=>{
 const f=raidFixture();try{
  for(const [id,iv,oldTraining] of changes){
   const boss=raidBossDefinitions.find(b=>b.id===id)!;
   for(const route of boss.routes)for(const floor of [85,95])for(let index=0;index<50;index++){
    const random=()=>encounterRandom([index+1,23,45,67]);
    const after=createRaidSnapshot(f.store.db,f.run,floor,random(),{bossId:id,routeId:route.id});
    const currentTraining=boss.battleTraining,currentRule=boss.ivRule;
    let before:typeof after;
    try{
     boss.battleTraining=oldTraining;boss.ivRule={perfect:currentRule.perfect,protected:currentRule.protected};
     before=createRaidSnapshot(f.store.db,f.run,floor,random(),{bossId:id,routeId:route.id});
    }finally{boss.battleTraining=currentTraining;boss.ivRule=currentRule;}
    const core=id==='mewtwo'?[route.attack,'spe']:boss.ivRule.protected;
    for(const stat of statKeys){
     if(core.includes(stat)){assert.equal(before.individual.ivs[stat],31);assert.equal(after.individual.ivs[stat],iv);}
     else assert.equal(after.individual.ivs[stat],before.individual.ivs[stat]);
     assert.ok(after.individual.evs[stat]<=before.individual.evs[stat]);
    }
    for(const stat of ['hp','def','spd'] as const)assert.equal(after.individual.evs[stat],before.individual.evs[stat]);
    assert.ok(after.individual.ivs.hp>=16);
    assert.equal(after.recruitTeam,before.recruitTeam);assert.deepEqual(after.reward,before.reward);
    assert.equal(after.individual.gender,before.individual.gender);assert.equal(after.individual.shiny,before.individual.shiny);
   }
  }
 }finally{f.store.close();}
});

test('Mewtwo X and Y use only the half-bar Mega gate without Aura or entry ranks',()=>{
 const boss=raidBossDefinitions.find(b=>b.id==='mewtwo')!;
 for(const route of boss.routes){
  assert.equal(route.phases.length,2);assert.deepEqual(route.phases.map(p=>p.hpRatio),[.5,.5]);
  assert.ok(route.phases.every(p=>!p.buffs&&p.transformation!=='aura'));
  assert.equal(route.phases[1].messages?.length,2);
 }
});

for(const [id] of changes)for(const route of raidBossDefinitions.find(b=>b.id===id)!.routes)test(`${id}/${route.id}: premium IV/nature/66 points survive preview, disk reconnect, recruitment and reload`,()=>{
 const path=`.data/tests/raid-tune2-${randomUUID()}.sqlite`,f=raidFixture(path,'reward2',id,route.id);
 let store=f.store;
 try{
  const expected=Showdown.Teams.unpack(f.snapshot.recruitTeam)![0],ivs=expected.ivs??Object.fromEntries(statKeys.map(k=>[k,31]));
  assert.ok(statKeys.every(k=>ivs[k]===31));assert.equal(statKeys.reduce((sum,k)=>sum+(expected.evs?.[k]??0),0),66);
  assert.equal(expected.nature,route.recruit.nature);
  assert.notEqual(f.snapshot.individual.ivs[route.attack],31);
  store.chooseEvent(f.owner,f.run,f.event.id,'challenge');const battle=store.currentBattle(f.owner)!.id;finishRaidBattle(store,battle);
  store.close();store=new TowerStore(path);
  const preview=store.view(f.owner).run!;
  assert.deepEqual(preview.candidateIVs[expected.species],ivs);assert.deepEqual(preview.candidateDetails![expected.species].evs,expected.evs);
  store.recruit(f.owner,f.run,battle,expected.species,null);
  store.close();store=new TowerStore(path);
  const runProfile=JSON.parse(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(f.run)!.profiles as string)[expected.species];
  const collected=store.trainingCollection(f.owner).find(p=>p.species===expected.species)!.profile;
  for(const p of [runProfile,collected]){assert.deepEqual(p.ivs,ivs);assert.deepEqual(p.evs,expected.evs);assert.equal(p.nature,expected.nature);}
 }finally{store.close();}
});
