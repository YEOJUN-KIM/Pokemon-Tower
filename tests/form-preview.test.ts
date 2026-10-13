import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {battlePreviewForms} from '../src/data/battle-preview-forms';
import {familyForms} from '../src/data/selectable-forms';
import {previewAbility} from '../src/data/mega-abilities';

test('every advertised transformation has a preview with the transformed species data',()=>{
 for(const entry of pokedexEntries()){
  if(entry.canMega)assert.ok(entry.forms?.some(form=>form.kind==='mega'),entry.species+' Mega preview');
  if(entry.canGigantamax)assert.ok(entry.forms?.some(form=>form.kind==='gigantamax'),entry.species+' Gigantamax preview');
  for(const form of entry.forms??[]){
   const transformed=Showdown.Dex.species.get(form.species);
   assert.deepEqual(form.baseStats,transformed.baseStats);
   assert.equal(form.ability,previewAbility(form.species,transformed.abilities[0]));
   assert.match(form.spriteKey,/^\d+$/);
  }
 }
});

test('stat-changing battle forms are informational previews with native stats and conditions',()=>{
 const entries=pokedexEntries(),previews=entries.flatMap(entry=>(entry.forms??[]).filter(form=>form.kind==='battle').map(form=>({entry,form})));
 assert.equal(previews.length,Object.keys(battlePreviewForms).length);
 for(const {entry,form} of previews){
  assert.ok(form.condition,form.species+' transformation condition');
  assert.equal(Showdown.Dex.species.get(form.species).baseSpecies,entry.species);
  assert.notDeepEqual(form.baseStats,entry.baseStats,form.species+' different stats');
  assert.ok(!familyForms(entry.species).some(([name])=>name===form.species),form.species+' must not be selectable');
 }
 const palafin=previews.find(({form})=>form.species==='Palafin-Hero')!;
 assert.equal(palafin.entry.baseStats.atk,70);assert.equal(palafin.form.baseStats.atk,160);
 assert.equal(Object.values(palafin.form.baseStats).reduce((a,b)=>a+b,0),650);
 assert.ok(!entries.flatMap(entry=>entry.forms??[]).some(form=>['Mimikyu-Busted','Castform-Sunny','Greninja-Ash'].includes(form.species)));
});
