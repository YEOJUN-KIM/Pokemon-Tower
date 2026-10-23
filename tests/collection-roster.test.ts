import {assertSpriteFiles} from './helpers/runtime-assets';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {existsSync} from 'node:fs';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';

test('the dex and egg collection retain four approved unevolved species, including Gigantamax partners',()=>{
 const entries=pokedexEntries();
 assert.deepEqual(new Set(entries.filter(entry=>Showdown.Dex.species.get(entry.species).nfe).map(entry=>entry.species)),new Set(['Porygon2','Scyther','Pikachu','Duraludon']));
 for(const name of ['Clefairy','Weepinbell','Golbat','Gligar','Chansey','Dusclops','Charmander'])assert.ok(!entries.some(entry=>entry.species===name));
 for(const name of ['Pikachu','Duraludon'])assert.ok(entries.find(entry=>entry.species===name)!.canGigantamax);
 for(const id of [4,35,42,70])for(const side of ['','shiny/','back/','back/shiny/'])assert.ok(!existsSync('public/vendor/pokeapi/pokemon/'+side+id+'.png'));
 for(const id of [123,233])assertSpriteFiles(['/vendor/pokeapi/pokemon/'+id+'.png']);
});

test('old ownership is preserved but excluded unevolved species cannot be selected for a new run',()=>{
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('collection');for(const name of ['Clefairy','Porygon2','Scyther','Pikachu','Duraludon'])store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('collection',name);
  assert.ok(!store.view('collection').unlocked.includes('Clefairy'));
  assert.ok(!store.trainingCollection('collection').some(entry=>entry.species==='Clefairy'));
  assert.ok(store.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get('collection','Clefairy'));
  assert.throws(()=>store.start('collection',['Clefairy',...starters.slice(0,2)]),/사용 가능한/);
  assert.ok(store.start('collection',['Porygon2','Scyther',starters[0]]));
  store.abandon('collection',store.view('collection').run!.id);
  assert.ok(store.start('collection',['Pikachu','Duraludon',starters[0]],'dynamax'));
 }finally{store.close();}
});
