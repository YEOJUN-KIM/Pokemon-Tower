import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';

test('favorites persist per account for the full archive without changing unlocks, wallet or battles',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try {
    store.ensurePlayer('a');store.ensurePlayer('b');const id=store.start('a',starters),battle=store.battle(id),before=store.view('a');
    for(const name of ['Garchomp','Gengar','Meowscarada'])store.setFavorite('a',name,true);
    store.setFavorite('a','Garchomp',true);
    assert.deepEqual(store.view('a').favorites,['Garchomp','Gengar','Meowscarada']);assert.deepEqual(store.view('b').favorites,[]);
    assert.deepEqual({...store.view('a'),favorites:[]},before);assert.deepEqual(store.battle(id),battle);
    for(const [name,enabled] of [['Missing',true],['Garchomp','true'],['Garchomp',null]])assert.throws(()=>store.setFavorite('a',name,enabled),/즐겨찾기/);
    store.db.exec('PRAGMA user_version=8');store.close();store=new TowerStore(path);
    assert.deepEqual(store.view('a').favorites,['Garchomp','Gengar','Meowscarada']);assert.deepEqual(store.battle(id),battle);
    store.setFavorite('b','Gengar',true);store.setFavorite('a','Gengar',false);store.setFavorite('a','Gengar',false);
    assert.deepEqual(store.view('a').favorites,['Garchomp','Meowscarada']);assert.deepEqual(store.view('b').favorites,['Gengar']);
  }finally{store.close();}
});
