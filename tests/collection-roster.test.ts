import {test} from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {existsSync} from 'node:fs';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';

test('the dex and egg collection keep only Porygon2 and Scyther among unevolved species',()=>{
 const entries=pokedexEntries();
 assert.deepEqual(new Set(entries.filter(entry=>Showdown.Dex.species.get(entry.species).nfe).map(entry=>entry.species)),new Set(['Porygon2','Scyther']));
 for(const name of ['Clefairy','Weepinbell','Golbat','Pikachu','Charmander'])assert.ok(!entries.some(entry=>entry.species===name));
 for(const id of [4,35,42,70])for(const side of ['','shiny/','back/','back/shiny/'])assert.ok(!existsSync('public/vendor/pokeapi/pokemon/'+side+id+'.png'));
 for(const id of [123,233])assert.ok(existsSync('public/vendor/pokeapi/pokemon/'+id+'.png'));
});

test('old ownership is preserved but excluded unevolved species cannot be selected for a new run',()=>{
 const store=new TowerStore(':memory:');try{
  store.ensurePlayer('collection');for(const name of ['Clefairy','Porygon2','Scyther'])store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run('collection',name);
  assert.ok(!store.view('collection').unlocked.includes('Clefairy'));
  assert.ok(!store.trainingCollection('collection').some(entry=>entry.species==='Clefairy'));
  assert.ok(store.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get('collection','Clefairy'));
  assert.throws(()=>store.start('collection',['Clefairy',...starters.slice(0,2)]),/사용 가능한/);
  assert.ok(store.start('collection',['Porygon2','Scyther',starters[0]]));
 }finally{store.close();}
});
