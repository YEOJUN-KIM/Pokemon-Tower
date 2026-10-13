import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {selectableForms,familyForms,separateForms} from '../src/data/selectable-forms';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {pokemonSets,packTeam} from '../src/data/teams';
import {defaultProfile,validateProfile,trainingOptions} from '../src/server/training';
import {TowerStore} from '../src/server/tower-store';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {encounterPool} from '../src/server/opponent-team';
import {pokemonRarity} from '../src/data/pokemon-rarity';

test('five Rotom forms are separate playable dex entries with the shared national number and distinct types',()=>{
 const dex=pokedexEntries();
 const rotomForms=Object.entries(separateForms).filter(([,form])=>form.baseSpecies==='Rotom');assert.equal(rotomForms.length,5);
 for(const [name,form] of rotomForms){
  const entry=dex.find(p=>p.species===name)!;assert.ok(entry);assert.equal(entry.nationalId,479);assert.equal(entry.id,form.id);
  assert.deepEqual(entry.types,form.displayTypes);assert.equal(entry.battleReady,true);assert.equal(pokemonRarity(name),'normal');
  assert.ok(encounterPool(50,'hundred-floor-v1').includes(name));
  assert.equal(validateProfile(name,defaultProfile(name)).ability,'Levitate');
 }
 assert.equal(dex.filter(p=>p.species==='Rotom').length,1);
});

test('26 family forms expose real dex stats and exclude automatic and all-type form lists',()=>{
 const dex=pokedexEntries();assert.equal(Object.values(selectableForms).filter(form=>form.collection==='family').length,26);
 for(const [name,form] of Object.entries(selectableForms)){
  assert.ok(existsSync(`public/vendor/pokeapi/pokemon/${form.id}.png`),name);
  if(form.collection==='separate')continue;
  const base=dex.find(p=>p.species===form.baseSpecies)!,preview=base.forms!.find(p=>p.species===name)!;
  assert.ok(preview,name);assert.equal(preview.kind,'selectable');assert.deepEqual(preview.baseStats,Showdown.Dex.species.get(name).baseStats);
  assert.equal(preview.ability,Showdown.Dex.species.get(name).abilities[0]);assert.equal(dex.some(p=>p.species===name),false);
 }
 for(const name of ['Arceus','Silvally','Palafin','Terapagos'])assert.equal(familyForms(name).length,0);
});

test('owning one base unlocks every family choice; changing forms is free and preserves shared training across restart',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);try{
  store.ensurePlayer('forms');store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('forms','Calyrex');
  const before=defaultProfile('Calyrex');before.ivs={hp:12,atk:13,def:14,spa:15,spd:16,spe:17};before.evs={hp:10,atk:0,def:0,spa:32,spd:0,spe:24};before.nature='Modest';
  store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?)').run('forms','Calyrex',JSON.stringify(before),1);
  for(const name of ['Calyrex-Shadow','Calyrex-Ice','Calyrex']){
   const entry=store.trainingCollection('forms').find(p=>p.species==='Calyrex')!;assert.equal(entry.formOptions!.length,3);
   const next={...defaultProfile('Calyrex',name==='Calyrex'?undefined:name),ivs:before.ivs,evs:before.evs,nature:before.nature};
   store.train('forms','Calyrex',entry.revision,next);
   const saved=store.trainingCollection('forms').find(p=>p.species==='Calyrex')!;
   assert.equal(saved.profile.forme,name==='Calyrex'?undefined:name);assert.deepEqual(saved.profile.ivs,before.ivs);assert.deepEqual(saved.profile.evs,before.evs);
   assert.equal(store.view('forms').growthPoints,0);assert.equal(saved.baseStats.spa,Showdown.Dex.species.get(name).baseStats.spa);
   store.close();store=new TowerStore(path);assert.deepEqual(store.trainingCollection('forms').find(p=>p.species==='Calyrex')!.profile,saved.profile);
  }
  assert.throws(()=>validateProfile('Kyurem',{...defaultProfile('Kyurem'),forme:'Calyrex-Shadow'}),/모습/);
 }finally{store.close();}
});

test('all family forms make legal real battles, with native required tools and replayed effects',async()=>{
 for(const [name,form] of Object.entries(selectableForms)){
  if(form.collection!=='family')continue;
  const profile=defaultProfile(form.baseSpecies,name);validateProfile(form.baseSpecies,profile);
  const packed=packTeam([form.baseSpecies,'Blastoise','Venusaur'],{[form.baseSpecies]:profile});
  const set=Showdown.Teams.unpack(packed)![0];assert.equal(set.species,name);assert.equal(set.name,form.baseSpecies==='Tauros-Paldea-Combat'?'Tauros-Paldea':form.baseSpecies);assert.equal(set.item,form.requiredItem??'');
  const log=await runBattle({rule:'basic',teams:{p1:packed,p2:packTeam(['Unown','Luvdisc','Delibird'])},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});assert.ok(log.winner,name);
  if(['Calyrex-Shadow','Kyurem-White','Ogerpon-Wellspring'].includes(name))assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 }
});

test('selected form is frozen into a run; later collection changes affect only the next run',()=>{
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('snapshot');for(const name of ['Calyrex','Ogerpon'])store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('snapshot',name);
  for(const [base,form] of [['Calyrex','Calyrex-Shadow'],['Ogerpon','Ogerpon-Hearthflame']]){const before=store.trainingCollection('snapshot').find(p=>p.species===base)!;store.train('snapshot',base,before.revision,defaultProfile(base,form));}
  const row=store.battle(store.start('snapshot',['Calyrex','Ogerpon','Blastoise'],'basic'));
  assert.equal(Showdown.Teams.unpack(row.player_team)![0].species,'Calyrex-Shadow');assert.equal(Showdown.Teams.unpack(row.player_team)![1].item,'Hearthflame Mask');
  const entry=store.trainingCollection('snapshot').find(p=>p.species==='Calyrex')!;store.train('snapshot','Calyrex',entry.revision,defaultProfile('Calyrex','Calyrex-Ice'));
  assert.equal(store.battle(row.id).player_team,row.player_team);
  store.db.prepare("UPDATE runs SET state='select',floor=2 WHERE id=?").run(row.run_id);
  const next=store.battle(store.enter('snapshot',row.run_id,2,['Calyrex','Ogerpon','Blastoise']));assert.equal(Showdown.Teams.unpack(next.player_team)![0].species,'Calyrex-Shadow');
 }finally{store.close();}
});
