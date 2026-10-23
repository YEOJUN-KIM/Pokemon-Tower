import {assertSpriteFiles} from './helpers/runtime-assets';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {separateForms} from '../src/data/selectable-forms';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {defaultProfile,validateProfile} from '../src/server/training';
import {TowerStore} from '../src/server/tower-store';
import {packTeam} from '../src/data/teams';
import {pokemonRarity} from '../src/data/pokemon-rarity';
import {FORMAT} from '../src/data/battle-rules';
import {familyForms} from '../src/data/selectable-forms';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

test('30 regional entries and two family forms are playable beside their original national number',()=>{
 const entries=pokedexEntries(),regional=Object.entries(separateForms).filter(([,form])=>form.region);
 assert.equal(regional.length,30);
 for(const [name,form] of regional){
  const native=Showdown.Dex.species.get(name),index=entries.findIndex(entry=>entry.species===name),entry=entries[index];
  assert.ok(entry,name);assert.equal(entry.battleReady,true);assert.equal(entry.nationalId,native.num);
  assert.equal(entries[index-1].nationalId??entries[index-1].id,native.num,name+' adjacent number');
  assert.equal(entry.name,entries.find(p=>p.species===form.baseSpecies)!.name);assert.equal(entry.generation,{'알로라':7,'가라르':8,'히스이':8,'팔데아':9}[form.region!]);assert.deepEqual(entry.baseStats,native.baseStats);assert.deepEqual(entry.types,form.displayTypes);
  assertSpriteFiles([`/vendor/pokeapi/pokemon/${form.id}.png`],name);
  validateProfile(name,defaultProfile(name));
  assert.equal(new Showdown.TeamValidator(FORMAT).validateTeam(Showdown.Teams.unpack(packTeam([name,'Blastoise','Venusaur']))!),null,name);
 }
 const golem=entries.findIndex(entry=>entry.species==='Golem');assert.equal(entries[golem+1].species,'Golem-Alola');
 assert.equal(pokemonRarity('Articuno-Galar'),'sublegendary');
 assert.ok(!entries.some(entry=>entry.species==='Pikachu-Alola'||entry.species==='Vulpix-Alola'));
});

test('Paldean Tauros has one dex entry and three shared training choices',()=>{
 const base='Tauros-Paldea-Combat',entries=pokedexEntries();
 assert.equal(entries.filter(entry=>entry.species.startsWith('Tauros-Paldea')).length,1);
 assert.equal(familyForms(base).length,2);
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('tauros');store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('tauros',base);
  for(const name of [base,'Tauros-Paldea-Blaze','Tauros-Paldea-Aqua']){
   const entry=store.trainingCollection('tauros').find(p=>p.species===base)!;assert.equal(entry.formOptions!.length,3);
   assert.equal(entry.formOptions![0].spriteKey,String(separateForms[base].id));
   store.train('tauros',base,entry.revision,defaultProfile(base,name===base?undefined:name));
   assert.equal(Showdown.Teams.unpack(packTeam([base],{[base]:store.trainingCollection('tauros').find(p=>p.species===base)!.profile}))![0].species,name);
  }
 }finally{store.close();}
});

test('regional training and ownership stay independent from the original, including in real battles',async()=>{
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('regional');store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('regional','Golem-Alola');
  store.db.prepare('UPDATE players SET growth_points=100 WHERE id=?').run('regional');
  assert.ok(!store.view('regional').unlocked.includes('Golem'));
  store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('regional','Golem');
  const before=store.trainingCollection('regional').find(entry=>entry.species==='Golem')!.profile;
  const regional=store.trainingCollection('regional').find(entry=>entry.species==='Golem-Alola')!;
  store.train('regional','Golem-Alola',regional.revision,{...regional.profile,nature:'Adamant',ability:'Galvanize'});
  const after=store.trainingCollection('regional');
  assert.deepEqual(after.find(entry=>entry.species==='Golem')!.profile,before);
  const profile=after.find(entry=>entry.species==='Golem-Alola')!.profile;assert.equal(profile.ability,'Galvanize');
  const log=await runBattle({rule:'basic',teams:{p1:packTeam(['Golem-Alola','Blastoise','Venusaur'],{'Golem-Alola':profile}),p2:packTeam(['Unown','Luvdisc','Delibird'])},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
  assert.ok(log.winner);assert.ok(log.publicProtocol.some(line=>line.includes('Golem-Alola')));
 }finally{store.close();}
});
