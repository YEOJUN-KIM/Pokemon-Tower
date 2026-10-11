import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {johtoReferences,johtoOriginalBuild} from '../src/data/johto-builds';
import {namedTrainerSamples} from '../src/data/trainer-catalog';
import {pokemonSets} from '../src/data/teams';
import {FORMAT} from '../src/data/battle-rules';
import {generateOpponentTeam} from '../src/server/opponent-team';

test('all fourteen Johto trainers retain HGSS candidate species with legal original abilities and builds',()=>{
 const validator=new Showdown.TeamValidator(FORMAT);
 assert.equal(Object.keys(johtoReferences).length,14);
 for(const [id,reference] of Object.entries(johtoReferences)){
  const sample=namedTrainerSamples.find(s=>s.id==='named-'+id)!;
  assert.deepEqual(new Set(sample.entries),new Set(reference.sets.map(s=>s.species)),id);
  for(const name of sample.entries!){
   const build=johtoOriginalBuild(sample.id,name)!;
   assert.equal(build.moves.length,4);
   assert.equal(validator.validateSet({...structuredClone(pokemonSets[name]),...build},{}),null,id+': '+name);
  }
 }
 const red=namedTrainerSamples.find(s=>s.id==='named-red')!;
 assert.ok(red.entries!.includes('Lapras'));assert.ok(!red.entries!.includes('Espeon'));
 assert.equal(johtoOriginalBuild('named-bruno','Machamp')!.ability,'No Guard');
 assert.equal(johtoOriginalBuild('named-falkner','Swellow')!.item,'Flame Orb');
 assert.equal(johtoOriginalBuild('named-chuck','Breloom')!.item,'Toxic Orb');
 assert.equal(johtoOriginalBuild('named-red','Pikachu')!.item,'Light Ball');
 const original=johtoOriginalBuild('named-red','Pikachu')!;
 original.moves[0]='Tackle';original.item='';
 assert.equal(johtoOriginalBuild('named-red','Pikachu')!.moves[0],'Volt Tackle');
});

test('duplicate original berries are resolved without equipping every empty original slot',()=>{
 const bugsy=namedTrainerSamples.find(s=>s.id==='named-bugsy')!;
 let tested=false;
 for(let i=0;i<100;i++){
  const team=generateOpponentTeam(5,[i,2,3,4],[],null,bugsy);
  if(!team.some(s=>s.name==='Vespiquen'))continue;
  assert.equal(team.find(s=>s.name==='Scizor')!.item,'Sitrus Berry');
  assert.notEqual(team.find(s=>s.name==='Vespiquen')!.item,'Sitrus Berry');
  tested=true;break;
 }
 assert.ok(tested);
 const original=johtoOriginalBuild('named-clair','Aerodactyl')!;
 assert.equal(original.item,'');
});
