import test from 'node:test';
import assert from 'node:assert/strict';
import {pokemonBattleScale,pokemonHeights} from '../src/data/pokemon-size';
import {pokedexEntries} from '../src/server/pokedex-entries';
import forms from '../src/data/battle-forms.json' with {type:'json'};

test('all dex species and supported battle forms have finite size data and contained battle scales',()=>{
  for(const name of [...pokedexEntries().map(entry=>entry.species),...Object.keys(forms)]){
    assert.ok(pokemonHeights[name]>0,name);const scale=pokemonBattleScale(name);assert.ok(scale>=.32 && scale<=1,name);
  }
  assert.equal(pokemonHeights.Tatsugiri,.3);assert.ok(pokemonBattleScale('Tatsugiri')<pokemonBattleScale('Pikachu'));
  assert.ok(pokemonBattleScale('Pikachu')<pokemonBattleScale('Charizard'));assert.ok(pokemonBattleScale('Charizard')<pokemonBattleScale('Wailord'));
});
