import {assertSpriteFiles} from './helpers/runtime-assets';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {selectedPokedexEntry} from '../src/web/pokedex-data';
import {familyForms,baseFormName} from '../src/data/selectable-forms';
import {pokemonImageSources} from '../src/web/pokemon-image';
import {species} from '../src/web/catalog';

test('every selectable family form keeps its collection name and renders its own types, stats and sprite',()=>{
 for(const entry of pokedexEntries())for(const [forme,data] of familyForms(entry.species)){
  const shown=selectedPokedexEntry(entry,forme);
  assert.equal(shown.name,entry.name);assert.equal(shown.id,entry.id);
  assert.equal(shown.species,forme);assert.deepEqual(shown.types,data.displayTypes);assert.deepEqual(shown.baseStats,data.baseStats);
  const sources=pokemonImageSources(entry.id,false,true,species[shown.species].spriteKey??entry.id);
  assertSpriteFiles(sources,forme);
 }
});

test('Urshifu is named generically in the dex but both styles have named normal and Gigantamax previews',()=>{
 const entry=pokedexEntries().find(p=>p.species==='Urshifu')!;
 assert.equal(entry.name,'우라오스');assert.equal(selectedPokedexEntry(entry,'Urshifu-Rapid-Strike').name,'우라오스');
 assert.equal(baseFormName('Urshifu',entry.name),'우라오스 일격의 태세');
 const rapid=entry.forms!.find(p=>p.species==='Urshifu-Rapid-Strike')!;
 assert.equal(rapid.name,'우라오스 연격의 태세');assert.deepEqual(rapid.types,['격투','물']);
 const single=entry.forms!.find(p=>p.species==='Urshifu-Gmax')!,gmax=entry.forms!.find(p=>p.species==='Urshifu-Rapid-Strike-Gmax')!;
 assert.equal(single.name,'거다이맥스 우라오스 일격의 태세');assert.deepEqual(single.types,['격투','악']);
 assert.equal(gmax.name,'거다이맥스 우라오스 연격의 태세');assert.deepEqual(gmax.types,['격투','물']);
 assert.notEqual(single.spriteKey,gmax.spriteKey);
 for(const preview of [single,gmax])assertSpriteFiles(pokemonImageSources(entry.id,false,false,preview.spriteKey));
});
