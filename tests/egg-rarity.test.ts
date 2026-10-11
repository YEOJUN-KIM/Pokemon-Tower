import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eggRarity,eggRarityWeights,pokemonRarity} from '../src/data/pokemon-rarity';
import {pokedexEntries} from '../src/server/pokedex-entries';
test('all 10000 rarity tickets match the published rates and have playable candidates',()=>{
 const counts={normal:0,sublegendary:0,legendary:0,mythical:0};
 for(let roll=0;roll<10000;roll++)counts[eggRarity(roll)]++;
 assert.deepEqual(counts,eggRarityWeights);
 const playable=pokedexEntries().filter(e=>e.battleReady!==false);
 for(const kind of Object.keys(counts))assert.ok(playable.some(e=>pokemonRarity(e.species)===kind));
 assert.equal(pokemonRarity('Charizard'),'normal');assert.equal(pokemonRarity('Articuno'),'sublegendary');assert.equal(pokemonRarity('Yveltal'),'legendary');assert.equal(pokemonRarity('Mew'),'mythical');
});
