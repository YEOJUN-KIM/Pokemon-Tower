import test from 'node:test';
import assert from 'node:assert/strict';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {matchesPokemonName} from '../src/web/pokemon-search';
import {spriteUrl} from '../src/web/catalog';

test('archive keeps fully evolved species, the four chosen unevolved exceptions',()=>{
  const entries=pokedexEntries();
  assert.equal(entries.length,615);
  assert.equal(new Set(entries.map(entry=>entry.id)).size,615);
  assert.equal(new Set(entries.map(entry=>entry.species)).size,615);
  assert.equal(entries.filter(entry=>entry.battleReady).length,615);
  assert.equal(entries[0].name,'이상해꽃');
  assert.ok(!entries.some(entry=>entry.id===1 || entry.id===906));
  for(const name of ['폴리곤2','스라크','피카츄','두랄루돈'])assert.ok(entries.some(entry=>entry.name===name));
  assert.equal(entries.at(-1)!.name,'복숭악동');
  for(const entry of entries){assert.ok(entry.generation>=1 && entry.generation<=9);assert.ok(entry.types.length);assert.ok(entry.name);assert.ok(!/-Mega|-Gmax/.test(entry.species));}
  const charizard=entries.find(entry=>entry.id===6)!;
  assert.equal(charizard.species,'Charizard');assert.equal(charizard.ability,'Blaze');assert.equal(charizard.moves.length,4);
});

test('new species accept Korean, initials, keyboard keys and English and use their own sprite IDs',()=>{
  const entries=pokedexEntries();
  const meowscarada=entries.find(entry=>entry.id===908)!;
  assert.equal(meowscarada.name,'마스카나');assert.deepEqual(meowscarada.types,['풀','악']);assert.equal(meowscarada.generation,9);
  for(const query of ['마스카나','ㅁㅅㅋㄴ','aktmzksk','Meowscarada'])assert.ok(matchesPokemonName(meowscarada.name,meowscarada.species,query));
  assert.equal(spriteUrl(meowscarada.species,false,meowscarada.id),'/vendor/showdown/pokemon/gen5/meowscarada.png');
  assert.equal(meowscarada.battleReady,true);assert.equal(meowscarada.moves.length,4);
});
