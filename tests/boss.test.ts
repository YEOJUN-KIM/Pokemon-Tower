import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import Showdown from 'pokemon-showdown';

test('boss preview becomes a persisted encounter and v2 migration preserves old battles',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;
  let store=new TowerStore(path);
  try {
    store.ensurePlayer('boss-test');
    const first=store.start('boss-test',starters);
    const run=store.battle(first).run_id;
    store.db.prepare('UPDATE run_themes SET theme=? WHERE run_id=?').run('johto',run);
    store.db.prepare("UPDATE runs SET floor=5,state='select' WHERE id=?").run(run);
    const encounter=towerTrainerEncounter(5,run,'johto')!,preview=encounter.boss;
    assert.equal(preview.role,'gym');
    assert.equal(towerTrainerEncounter(10,run,'johto')!.boss.role,'elite');
    assert.deepEqual(store.view('boss-test').run!.boss,preview);
    const id=store.enter('boss-test',run,5,starters);
    const opponents=Showdown.Teams.unpack(store.battle(id).opponent_team)!;
    assert.equal(opponents.length,3);for(const set of opponents)assert.ok(encounter.entries.includes(set.species));
    const saved=store.view('boss-test');
    assert.equal(store.battle(id).reward,450);
    assert.deepEqual(saved.run!.boss,preview);
    store.close();store=new TowerStore(path);
    assert.deepEqual(store.view('boss-test'),saved);
    // An encounter created before bosses retains its old reward and has no boss.
    store.db.exec('ALTER TABLE battles DROP COLUMN boss; PRAGMA user_version=2');
    store.db.prepare('UPDATE battles SET reward=300 WHERE id=?').run(id);
    store.close();store=new TowerStore(path);
    assert.equal(store.battle(id).reward,300);
    assert.equal(store.view('boss-test').run!.boss,null);
    assert.equal((store.db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version,25);
  } finally {store.close();}
});
