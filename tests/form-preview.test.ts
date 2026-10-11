import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {pokedexEntries} from '../src/server/pokedex-entries';

test('every advertised transformation has a preview with the transformed species data',()=>{
 for(const entry of pokedexEntries()){
  if(entry.canMega)assert.ok(entry.forms?.some(form=>form.kind==='mega'),entry.species+' Mega preview');
  if(entry.canGigantamax)assert.ok(entry.forms?.some(form=>form.kind==='gigantamax'),entry.species+' Gigantamax preview');
  for(const form of entry.forms??[]){
   const transformed=Showdown.Dex.species.get(form.species);
   assert.deepEqual(form.baseStats,transformed.baseStats);
   assert.equal(form.ability,transformed.abilities[0]);
   assert.match(form.spriteKey,/^\d+$/);
  }
 }
});
