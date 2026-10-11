import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {packTeam,starters} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';

test('archive-only choice owns the Pokemon, moves and IVs without joining or changing this run',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try {
    store.ensurePlayer('collector');const id=store.start('collector',starters),runId=store.battle(id).run_id;
    const incoming=defaultProfile('Piloswine');incoming.ivs.hp=31;
    store.db.prepare("UPDATE battles SET status='complete',opponent_team=? WHERE id=?").run(packTeam(['Piloswine'],{Piloswine:incoming}),id);
    store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(runId);
    const before=store.view('collector'),profiles=store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(runId);
    store.recruit('collector',runId,id,'Piloswine',null,undefined,true);
    assert.ok(store.view('collector').unlocked.includes('Piloswine'));
    assert.deepEqual(store.view('collector').run!.roster,before.run!.roster);
    assert.deepEqual(store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(runId),profiles);
    const collected=store.trainingCollection('collector').find(entry=>entry.species==='Piloswine')!;
    assert.equal(collected.profile.ivs.hp,31);assert.ok(incoming.moves.every(move=>collected.unlockedMoves.includes(move)));
    assert.throws(()=>store.recruit('collector',runId,id,'Piloswine',null,undefined,true),/처리/);
    // Emulate an earlier save with moves recorded but the ownership row omitted.
    store.db.prepare('DELETE FROM unlocks WHERE player_id=? AND species=?').run('collector','Piloswine');
    store.close();store=new TowerStore(path);
    assert.ok(store.view('collector').unlocked.includes('Piloswine'));
    assert.deepEqual(store.view('collector').run!.roster,before.run!.roster);
    store.abandon('collector',runId);store.start('collector',['Piloswine',...starters.slice(0,2)]);
  } finally {store.close();}
});
