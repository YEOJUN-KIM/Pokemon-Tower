import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {TutorialService} from '../src/server/tutorial-service';
import {TutorialStep as S,TUTORIAL_GROWTH_POINTS} from '../src/data/tutorial';
import {transaction} from '../src/server/storage/transaction';
import {initialPartners,starters} from '../src/data/teams';
import {TRAINING_POINT_PRICE} from '../src/data/training';

function setup(path=':memory:') {
  const store=new TowerStore(path),tutorial=new TutorialService(store.db),owner='tutorial';
  store.ensurePlayer(owner);
  const event=(event:string,party?:string[],species?:string)=>transaction(store.db,()=>tutorial.action(owner,event,tutorial.view(owner).step,party,species));
  return {store,tutorial,owner,event};
}
test('new players choose onboarding or skip without changing the normal starting wallet',()=>{
  const f=setup();try{
    assert.equal(f.tutorial.view(f.owner).step,S.NotStarted);assert.equal(f.store.view(f.owner).growthPoints,0);
    f.event('skip');assert.equal(f.tutorial.view(f.owner).step,S.Completed);
    f.event('begin');assert.equal(f.store.view(f.owner).growthPoints,0);
    assert.deepEqual(f.store.view(f.owner).unlocked,initialPartners);
  }finally{f.store.close();}
});
test('onboarding grants exactly 32 stat points once, with stale and repeated requests idempotent',()=>{
  const f=setup();try{
    f.event('begin');transaction(f.store.db,()=>f.tutorial.action(f.owner,'begin',S.NotStarted));
    assert.equal(f.store.view(f.owner).growthPoints,TUTORIAL_GROWTH_POINTS);
    assert.equal(TUTORIAL_GROWTH_POINTS,TRAINING_POINT_PRICE*32);
    f.event('next');f.event('enter-selection');
    assert.throws(()=>f.event('party',['Charizard','Charizard']));
    f.event('party',['Charizard']);assert.equal(f.tutorial.view(f.owner).step,S.RemovePokemon);
    f.event('party',[]);assert.equal(f.tutorial.view(f.owner).step,S.PokemonInfo);
    f.event('info-open',undefined,'Charizard');f.event('next');assert.equal(f.tutorial.view(f.owner).step,S.StatUpgrade);
    f.event('next');assert.equal(f.tutorial.view(f.owner).step,S.StatUpgrade);
    let entry=f.store.trainingCollection(f.owner).find(p=>p.species==='Charizard')!;
    f.store.train(f.owner,entry.species,entry.revision,entry.profile);
    assert.equal(f.tutorial.view(f.owner).step,S.StatUpgrade);
    entry=f.store.trainingCollection(f.owner).find(p=>p.species==='Charizard')!;
    assert.throws(()=>f.store.train(f.owner,entry.species,entry.revision,{...entry.profile,evs:{...entry.profile.evs,hp:32,atk:1}}),/부족/);
    assert.equal(f.tutorial.view(f.owner).step,S.StatUpgrade);
    f.store.train(f.owner,entry.species,entry.revision,{...entry.profile,evs:{...entry.profile.evs,hp:32}});
    assert.equal(f.store.trainingCollection(f.owner).find(p=>p.species===entry.species)!.profile.evs.hp,32);
    assert.equal(f.store.view(f.owner).growthPoints,0);assert.equal(f.tutorial.view(f.owner).step,S.CompleteTeam);
    f.event('party',starters);assert.equal(f.tutorial.view(f.owner).step,S.StartBattle);
    const battle=f.store.start(f.owner,starters);f.tutorial.battleStarted(f.owner);
    assert.equal(f.tutorial.view(f.owner).step,S.TypeGuide);f.event('next');assert.equal(f.tutorial.view(f.owner).step,S.TypeGuide);
    f.tutorial.moveUsed(f.owner);assert.equal(f.tutorial.view(f.owner).step,S.AwaitVictory);
    f.store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(f.store.battle(battle).run_id);
    assert.equal(f.tutorial.view(f.owner).step,S.RecruitmentGuide);
    f.event('next');f.tutorial.recruited(f.owner);assert.equal(f.tutorial.view(f.owner).step,S.Completion);
    f.event('next');assert.equal(f.tutorial.view(f.owner).step,S.Completed);
  }finally{f.store.close();}
});

test('tutorial points can be distributed freely and old granted rewards are not topped up',()=>{
  const f=setup();try{
    f.event('begin');
    const entry=f.store.trainingCollection(f.owner).find(p=>p.species==='Charizard')!;
    f.store.train(f.owner,entry.species,entry.revision,{...entry.profile,evs:{...entry.profile.evs,hp:12,spa:20}});
    assert.equal(f.store.view(f.owner).growthPoints,0);
    f.event('begin');assert.equal(f.store.view(f.owner).growthPoints,0);
    f.store.db.prepare('UPDATE players SET growth_points=? WHERE id=?').run(TRAINING_POINT_PRICE,f.owner);
    f.event('begin');assert.equal(f.store.view(f.owner).growthPoints,TRAINING_POINT_PRICE);
  }finally{f.store.close();}
});
test('state, selected party and reward survive restart; skip keeps the actual run and roster',()=>{
  const path=`.data/tests/tutorial-${randomUUID()}.sqlite`;
  let f=setup(path);f.event('begin');f.event('next');f.event('enter-selection');f.event('party',['Charizard']);f.store.close();
  f=setup(path);try{
    assert.deepEqual(f.tutorial.view(f.owner),{step:S.RemovePokemon,rewardGranted:true,party:['Charizard'],selectedSpecies:'Charizard'});
    assert.equal(f.store.view(f.owner).growthPoints,TUTORIAL_GROWTH_POINTS);
    f.store.start(f.owner,starters);const before=f.store.view(f.owner);
    f.event('skip');assert.deepEqual(f.store.view(f.owner),before);assert.equal(f.tutorial.view(f.owner).step,S.Completed);
  }finally{f.store.close();}
});
test('existing saves default safely to completed without wallet, training or battle changes',()=>{
  for(const progress of ['run','training','wallet','collection']){
    const f=setup();try{
      if(progress==='run')f.store.start(f.owner,starters);
      if(progress==='training'){const p=f.store.trainingCollection(f.owner)[0];f.store.train(f.owner,p.species,p.revision,p.profile);}
      if(progress==='wallet')f.store.db.prepare('UPDATE players SET coins=1 WHERE id=?').run(f.owner);
      if(progress==='collection')f.store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(f.owner,'Pikachu');
      const before=f.store.view(f.owner);
      assert.equal(f.tutorial.view(f.owner).step,S.Completed,progress);
      assert.deepEqual(f.store.view(f.owner),before);
    }finally{f.store.close();}
  }
});
for(const chosen of ['Blaziken','Venusaur'])test(`tutorial follows ${chosen} through removal, information and actual stat growth`,()=>{
  const f=setup();try{
    f.event('begin');f.event('next');f.event('enter-selection');
    f.event('party',[chosen]);
    assert.equal(f.tutorial.view(f.owner).selectedSpecies,chosen);
    f.event('party',[]);
    assert.equal(f.tutorial.view(f.owner).step,S.PokemonInfo);
    assert.equal(f.tutorial.view(f.owner).selectedSpecies,chosen);
    f.event('select-target',undefined,'Skeledirge');
    assert.equal(f.tutorial.view(f.owner).selectedSpecies,chosen);
    f.event('info-open',undefined,'Skeledirge');
    assert.equal(f.tutorial.view(f.owner).step,S.PokemonInfo);
    f.event('info-open',undefined,chosen);f.event('next');
    assert.equal(f.tutorial.view(f.owner).step,S.StatUpgrade);
    const other=f.store.trainingCollection(f.owner).find(p=>p.species==='Charizard')!;
    f.store.train(f.owner,other.species,other.revision,{...other.profile,evs:{...other.profile.evs,hp:1}});
    assert.equal(f.tutorial.view(f.owner).step,S.StatUpgrade);
    let partner=f.store.trainingCollection(f.owner).find(p=>p.species===chosen)!;
    f.store.train(f.owner,partner.species,partner.revision,partner.profile);
    assert.equal(f.tutorial.view(f.owner).step,S.StatUpgrade);
    partner=f.store.trainingCollection(f.owner).find(p=>p.species===chosen)!;
    f.store.train(f.owner,partner.species,partner.revision,{...partner.profile,evs:{...partner.profile.evs,hp:1}});
    assert.equal(f.tutorial.view(f.owner).step,S.CompleteTeam);
    assert.equal(f.tutorial.view(f.owner).selectedSpecies,chosen);
    assert.equal(f.store.trainingCollection(f.owner).find(p=>p.species==='Skeledirge')!.profile.evs.hp,0);
  }finally{f.store.close();}
});

test('target remains saved after removal and restart, including the stat-upgrade stage',()=>{
  const path=`.data/tests/tutorial-target-${randomUUID()}.sqlite`;
  let f=setup(path);f.event('begin');f.event('next');f.event('enter-selection');
  f.event('party',['Blaziken']);f.event('party',[]);f.store.close();
  f=setup(path);
  assert.equal(f.tutorial.view(f.owner).selectedSpecies,'Blaziken');
  assert.equal(f.tutorial.view(f.owner).step,S.PokemonInfo);
  f.event('info-open',undefined,'Blaziken');f.event('next');f.store.close();
  f=setup(path);try{
    assert.equal(f.tutorial.view(f.owner).selectedSpecies,'Blaziken');
    assert.equal(f.tutorial.view(f.owner).step,S.StatUpgrade);
    assert.deepEqual(f.tutorial.view(f.owner).party,[]);
  }finally{f.store.close();}
});

test('v46 tutorial migration recovers a known party without inventing a removed target',()=>{
  const path=`.data/tests/tutorial-v46-${randomUUID()}.sqlite`;
  let f=setup(path);f.event('begin');f.event('next');f.event('enter-selection');f.event('party',['Venusaur']);
  f.store.db.exec('ALTER TABLE player_tutorial DROP COLUMN selected_species; PRAGMA user_version=46;');f.store.close();
  f=setup(path);
  assert.equal(f.tutorial.view(f.owner).selectedSpecies,'Venusaur');
  f.event('party',[]);
  f.store.db.exec('ALTER TABLE player_tutorial DROP COLUMN selected_species; PRAGMA user_version=46;');f.store.close();
  f=setup(path);try{
    assert.equal(f.tutorial.view(f.owner).selectedSpecies,null);
    f.event('select-target',undefined,'Blaziken');
    assert.equal(f.tutorial.view(f.owner).selectedSpecies,'Blaziken');
    f.event('info-open',undefined,'Blaziken');
    assert.equal(f.tutorial.view(f.owner).step,S.PokemonInfoViewed);
  }finally{f.store.close();}
});
