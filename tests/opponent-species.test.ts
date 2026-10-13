import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {allowedOpponentSpecies,evolvedOpponentSpecies,retainedUnevolvedOpponents} from '../src/data/opponent-species';
import {opponentProfile} from '../src/server/opponent-training';
import {generateOpponentTeam,encounterPool} from '../src/server/opponent-team';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {pokemonSets} from '../src/data/teams';
import {FORMAT} from '../src/data/battle-rules';

test('first ten floors use six zero IVs and later floors and legacy profiles retain their ranges',()=>{
 const raw={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};
 for(let floor=1;floor<=10;floor++)assert.deepEqual(opponentProfile('Charizard',pokemonSets.Charizard.moves,floor,raw,'hundred-floor-v1').ivs,{hp:0,atk:0,def:0,spa:0,spd:0,spe:0});
 assert.ok(opponentProfile('Charizard',pokemonSets.Charizard.moves,11,raw,'hundred-floor-v1').ivs.atk>0);
 assert.ok(opponentProfile('Charizard',pokemonSets.Charizard.moves,5,raw,'legacy').ivs.atk>0);
});
test('random pools retain exactly the chosen unevolved exceptions and Red alone keeps Pikachu',()=>{
 const pool=encounterPool(100,'hundred-floor-v1');
 assert.deepEqual(new Set(pool.filter(name=>Showdown.Dex.species.get(name).nfe)),retainedUnevolvedOpponents);
 for(const name of ['Doublade','Torracat','Dragonair','Haunter','Pikachu'])assert.ok(!pool.includes(name));
 assert.ok(encounterPool(100,'legacy').includes('Doublade'));assert.equal(evolvedOpponentSpecies('Torracat'),'Incineroar');assert.equal(evolvedOpponentSpecies('Doublade'),'Aegislash');
 assert.equal(evolvedOpponentSpecies('Pikachu',true),'Pikachu');assert.equal(evolvedOpponentSpecies('Pikachu'),'Raichu');
});
test('all named samples have three distinct legal allowed opponents after evolution and deduplication',()=>{
 const validator=new Showdown.TeamValidator(FORMAT);
 for(const sample of namedTrainerSamples){
  const team=generateOpponentTeam(50,[1,2,3,4],[],null,sample,'hundred-floor-v1');assert.equal(new Set(team.map(p=>p.name)).size,3);
  // The fixed Galar roster keeps Duraludon even before its Gmax is unlocked.
  for(const entry of team){assert.ok(allowedOpponentSpecies(entry.name,['named-red','named-red-kanto'].includes(sample.id)) || sample.generation===8 && entry.name==='Duraludon',sample.id+': '+entry.name);assert.equal(validator.validateSet({...structuredClone(pokemonSets[entry.name]),moves:entry.moves,...(entry.ability?{ability:entry.ability}:{}),item:entry.item==='Dynamax Band'?'':entry.item??''},{}),null,sample.id+': '+entry.name);}
 }
});
