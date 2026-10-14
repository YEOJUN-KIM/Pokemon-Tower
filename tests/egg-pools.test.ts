import test from 'node:test';
import assert from 'node:assert/strict';
import {eggSpeciesGrade,buildEggSpeciesPools,rareEggSpeciesCategory} from '../src/server/egg-pool';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {eggGradeWeights,superRareCategoryWeights,superRareSpeciesCategory} from '../src/data/egg-grades';

test('starters and pseudo-legendaries stay ordinary; special groups have exclusive grades',()=>{
 for(const name of ['Charizard','Garchomp','Dragonite','Tyranitar','Metagross','Dragapult'])assert.equal(eggSpeciesGrade(name),'normal',name);
 for(const name of ['Urshifu','Articuno-Galar','Flutter Mane','Walking Wake','Nihilego','Naganadel'])assert.equal(eggSpeciesGrade(name),'rare',name);
 for(const name of ['Mewtwo','Rayquaza','Koraidon','Miraidon','Mew','Arceus','Pecharunt','Dialga-Origin','Giratina-Origin'])assert.equal(eggSpeciesGrade(name),'superRare',name);
 assert.throws(()=>eggSpeciesGrade('not-a-pokemon'),/Unknown egg species/);
});

test('all hatchable entries belong to exactly one pool; no special species leak into normal',()=>{
 const names=pokedexEntries().filter(entry=>entry.battleReady!==false).map(entry=>entry.species);
 const pools=buildEggSpeciesPools([...names,...names]),union=Object.values(pools).flat();
 assert.equal(union.length,new Set(names).size);assert.equal(new Set(union).size,union.length);
 assert.deepEqual(new Set(union),new Set(names));
 for(const name of pools.normal)assert.equal(rareEggSpeciesCategory(name),null,name);
 for(const name of pools.rare)assert.ok(['sublegendary','paradox','ultrabeast'].includes(rareEggSpeciesCategory(name)??''),name);
 for(const name of pools.superRare)assert.ok(['legendary','mythical'].includes(rareEggSpeciesCategory(name)??''),name);
 assert.deepEqual(Object.values(pools).map(pool=>pool.length),[496,71,48]);
});

test('grade weights total 100%, with 2.5% legendary and 0.5% mythical',()=>{
 assert.equal(Object.values(eggGradeWeights).reduce((sum,value)=>sum+value,0),10000);
 assert.equal(Object.values(superRareCategoryWeights).reduce((sum,value)=>sum+value,0),eggGradeWeights.superRare);
 assert.deepEqual(eggGradeWeights,{normal:8500,rare:1200,superRare:300});
 assert.deepEqual(superRareCategoryWeights,{legendary:250,mythical:50});
 const counts={legendary:0,mythical:0};
 for(let roll=0;roll<300;roll++)counts[superRareSpeciesCategory(roll)]++;
 assert.deepEqual(counts,superRareCategoryWeights);
 for(const roll of [-1,300,NaN,1.5])assert.throws(()=>superRareSpeciesCategory(roll));
});
