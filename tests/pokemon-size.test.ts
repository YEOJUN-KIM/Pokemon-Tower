import test from 'node:test';
import assert from 'node:assert/strict';
import {pokemonBattleScale,pokemonHeights} from '../src/data/pokemon-size';
import {pokedexEntries} from '../src/server/pokedex-entries';
import forms from '../src/data/battle-forms.json' with {type:'json'};

test('all dex species and supported battle forms have finite size data and contained battle scales',()=>{
  for(const name of [...pokedexEntries().map(entry=>entry.species),...Object.keys(forms)]){
    assert.ok(pokemonHeights[name]>0,name);const scale=pokemonBattleScale(name);assert.ok(scale>=.56 && scale<=.92,name);
  }
  assert.equal(pokemonHeights.Tatsugiri,.3);assert.ok(pokemonBattleScale('Tatsugiri')<pokemonBattleScale('Pikachu'));
  assert.ok(pokemonBattleScale('Pikachu')<pokemonBattleScale('Charizard'));assert.ok(pokemonBattleScale('Charizard')<pokemonBattleScale('Wailord'));
});

test('tiny species remain readable while long and giant species leave arena headroom',()=>{
  assert.ok(pokemonBattleScale('Fidough')>=.65);
  assert.ok(pokemonBattleScale('Dachsbun')>=.69);
  assert.ok(pokemonBattleScale('Dudunsparce')<=.86);
  assert.ok(pokemonBattleScale('Fidough')<pokemonBattleScale('Dudunsparce'));
  const ordered=Object.keys(pokemonHeights).sort((a,b)=>pokemonHeights[a]-pokemonHeights[b]);
  for(let i=1;i<ordered.length;i++){
    const previous=ordered[i-1],current=ordered[i];
    if(pokemonHeights[current]>pokemonHeights[previous])assert.ok(pokemonBattleScale(current)>pokemonBattleScale(previous),`${previous} < ${current}`);
    else assert.equal(pokemonBattleScale(current),pokemonBattleScale(previous));
  }
  assert.ok(pokemonBattleScale(ordered.at(-1)!)/pokemonBattleScale(ordered[0])<1.6);
  assert.equal(pokemonBattleScale('Unknown species'),pokemonBattleScale('Ivysaur'));
});
