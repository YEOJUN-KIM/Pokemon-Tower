import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';

test('v4 permanent wallet migrates once and a new climb starts with zero coins',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try {
    store.ensurePlayer('legacy');store.db.prepare('UPDATE players SET coins=1450 WHERE id=?').run('legacy');
    store.db.exec('ALTER TABLE players DROP COLUMN growth_points; PRAGMA user_version=4');
    store.close();store=new TowerStore(path);
    assert.equal(store.view('legacy').growthPoints,1450);assert.equal(store.view('legacy').coins,0);
    store.close();store=new TowerStore(path);assert.equal(store.view('legacy').growthPoints,1450);
    const id=store.start('legacy',starters);assert.equal(store.view('legacy').coins,0);
    const run=store.battle(id).run_id;store.abandon('legacy',run);
    assert.equal(store.view('legacy').growthPoints,1450);assert.equal(store.view('legacy').run!.growthReward,0);
    assert.throws(()=>store.abandon('legacy',run),/진행 중/);
  } finally {store.close();}
});
