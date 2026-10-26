import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import Showdown from 'pokemon-showdown';
import {TowerStore, type BattleRow} from '../src/server/tower-store';
import {TowerService} from '../src/server/tower-service';
import {SwitchingPolicy} from '../src/battle/switch-policy';
import {DamagePolicy} from '../src/battle/policy';
import {runBattle, replayBattle, type BattleLog, type Seed} from '../src/battle/run';
import {floors} from '../src/data/floors';
import {classicCollection} from './classic-team-fixture';
import {starters,initialPartners,packTeam} from '../src/data/teams';
import type {BattleView} from '../src/web/contracts';

const fakeView = (id: string, log: BattleLog): BattleView => ({id, status: 'complete', requestId: 1, turn: log.turns,
  team: [], opponent: null, actions: [], messages: log.publicProtocol, winner: log.winner, error: null});
async function winningResult(store: TowerStore, row: BattleRow) {
  row.opponent_team=packTeam([...floors[row.floor-1].opponents]);
  store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(row.opponent_team,row.id);
  for (let n = 1; n <= 30; n++) {
    const seed: Seed = [n, 2, 3, 4];
    const log = await runBattle({trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),teams: {p1: row.player_team, p2: row.opponent_team}, seed, player: new DamagePolicy(), opponent: new DamagePolicy()});
    if (log.winner === 'Player') {
      store.db.prepare('UPDATE battles SET seed = ? WHERE id = ?').run(JSON.stringify(seed), row.id);
      return log;
    }
  }
  throw new Error('Test fixture could not win');
}

test('selection validation, reward transaction rollback, idempotency, recruitment and next team', async () => {
  const store = new TowerStore(':memory:');
  try {
    store.ensurePlayer('alice'); classicCollection(store,'alice'); store.ensurePlayer('bob');
    assert.equal(store.view('alice').coins, 0);
    assert.throws(() => store.start('alice', ['Charizard','Blastoise','Snorlax']), /3마리/);
    assert.throws(() => store.start('alice', ['Charizard','Charizard','Venusaur']), /3마리/);
    assert.throws(() => store.start('alice', ['Charizard']), /3마리/);
    const id = store.start('alice', starters);
    const row = store.battle(id);
    assert.throws(() => store.start('alice', starters), /진행 중/);
    assert.throws(() => store.enter('bob', row.run_id, 1, starters), /찾을 수/);
    assert.throws(() => store.recruit('alice', row.run_id, id, 'Pikachu', null), /영입할 수/);
    const log = await winningResult(store, row);
    store.db.exec("CREATE TRIGGER fail_payment BEFORE UPDATE OF coins ON players BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;");
    assert.throws(() => store.complete(id, log, fakeView(id, log)), /simulated failure/);
    assert.equal(store.battle(id).status, 'active');
    assert.equal(store.view('alice').coins, 0);
    assert.equal(store.view('alice').run!.state, 'battle');
    assert.equal((store.db.prepare('SELECT COUNT(*) n FROM rewards').get() as {n:number}).n, 0);
    store.db.exec('DROP TRIGGER fail_payment');
    store.complete(id, log, fakeView(id, log));
    store.complete(id, log, fakeView(id, log));
    assert.equal(store.view('alice').coins, row.reward);
    assert.equal(store.view('alice').run!.state, 'recruit');
    assert.throws(() => store.recruit('alice', row.run_id, id, 'Arcanine', null), /상대 팀/);
    store.recruit('alice', row.run_id, id, 'Pikachu', null);
    assert.deepEqual(store.view('alice').run!.suggestedTeam,starters);
    assert.equal(store.view('alice').unlocked.includes('Pikachu'), true);
    assert.equal(store.view('alice').run!.roster.length, 4);
    assert.equal(store.view('alice').run!.floor, 2);
    assert.throws(() => store.recruit('alice', row.run_id, id, 'Gyarados', null), /이미 처리/);
    const second = store.enter('alice', row.run_id, 2, ['Pikachu', 'Blastoise', 'Venusaur']);
    const team = Showdown.Teams.unpack(store.battle(second).player_team)!;
    assert.equal(team[0].species, 'Pikachu');
    assert.throws(() => store.enter('alice', row.run_id, 2, starters), /이미 진행/);
    store.abandon('alice', row.run_id);
    assert.equal(store.view('alice').coins, 0);
    assert.equal(store.view('alice').growthPoints,20);
    assert.ok(store.view('alice').unlocked.includes('Pikachu'));
    assert.ok(store.start('alice', ['Pikachu', 'Charizard', 'Blastoise']));
  } finally { store.close(); }
});

test('six-member replacement and final floor clear keep permanent unlocks', async () => {
  const store = new TowerStore(':memory:');
  try {
    store.ensurePlayer('alice'); classicCollection(store,'alice');
    const id = store.start('alice', starters);
    const row = store.battle(id);
    // Exercise a migrated three-floor run separately from newly created ten-floor runs.
    store.db.prepare('UPDATE runs SET total_floors = 3 WHERE id = ?').run(row.run_id);
    const log = await winningResult(store, row);
    store.complete(id, log, fakeView(id, log));
    store.recruit('alice', row.run_id, id, null, null);
    // Set up the six-member boundary directly for this legacy three-floor fixture.
    ['Pikachu','Gyarados','Snorlax'].forEach((name, i) => store.db.prepare('INSERT INTO members VALUES (?, ?, ?)').run(row.run_id, i + 3, name));
    store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(row.run_id,'Pikachu','Charcoal');
    // Seven permanent unlocks do not grant a seventh member during an active run.
    ['Pikachu','Gyarados','Snorlax','Arcanine'].forEach(name => store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?, ?)').run('alice', name));
    assert.equal(store.view('alice').unlocked.length, initialPartners.length+4);
    assert.throws(() => store.enter('alice', row.run_id, 2, ['Arcanine', 'Charizard', 'Blastoise']), /3마리/);
    const second = store.enter('alice', row.run_id, 2, ['Blastoise','Pikachu','Venusaur']);
    const log2 = await winningResult(store, store.battle(second));
    store.complete(second, log2, fakeView(second, log2));
    assert.throws(() => store.recruit('alice', row.run_id, second, 'Arcanine', null), /보유 한도/);
    assert.equal(store.roster(row.run_id).length, 6);
    assert.throws(() => store.recruit('alice', row.run_id, second, 'Arcanine', 'Mew'), /보유 한도/);
    store.recruit('alice', row.run_id, second, 'Arcanine', 'Pikachu');
    assert.equal(store.view('alice').run!.heldItems!.Pikachu,undefined);
    assert.equal(store.view('alice').run!.itemBag!.Charcoal,1);
    assert.deepEqual(store.view('alice').run!.suggestedTeam,['Blastoise','Arcanine','Venusaur']);
    assert.equal(store.view('alice').run!.roster.length, 6);
    assert.ok(store.view('alice').unlocked.includes('Arcanine'));
    assert.ok(!store.view('alice').run!.roster.includes('Pikachu'));
    assert.ok(store.view('alice').unlocked.includes('Pikachu'));
    assert.throws(() => store.enter('alice', row.run_id, 3, ['Pikachu', 'Charizard', 'Blastoise']), /3마리/);
    const third = store.enter('alice', row.run_id, 3, ['Snorlax', 'Gyarados', 'Blastoise']);
    const log3 = await winningResult(store, store.battle(third));
    store.complete(third, log3, fakeView(third, log3));
    store.recruit('alice', row.run_id, third, null, null);
    assert.equal(store.view('alice').run!.state, 'cleared');
    assert.equal(store.view('alice').coins, 0);
    assert.throws(() => store.enter('alice', row.run_id, 4, starters), /잘못된 층/);
  } finally { store.close(); }
});

test('disk restart replays accepted actions and recovers an uncommitted final result once', async () => {
  const path = resolve('.data/tests', `${randomUUID()}.sqlite`);
  let store = new TowerStore(path);
  store.ensurePlayer('alice'); classicCollection(store,'alice');
  const id = store.start('alice', starters);
  store.db.prepare('UPDATE battles SET seed = ?,opponent_team=? WHERE id = ?').run('[1,2,3,4]',packTeam([...floors[0].opponents]), id);
  let service = new TowerService(store);
  let response = await service.state('alice');
  await service.action('alice', id, response.battle!.requestId, 'move 1');
  response = await service.state('alice');
  const snapshot = response.battle!;
  await service.dispose(); store.close();
  store = new TowerStore(path); service = new TowerService(store);
  try {
    const restored = (await service.state('alice')).battle!;
    assert.equal(restored.requestId, snapshot.requestId);
    assert.deepEqual(restored.team, snapshot.team);
    assert.deepEqual(restored.opponent, snapshot.opponent);
    await assert.rejects(service.action('alice', id, 1, 'move 1'), /이미 처리/);
    await service.dispose();
    const row = store.battle(id);
    const log = await runBattle({seed:[1,2,3,4], trainerEquipment:row.trainer_equipment==null?undefined:JSON.parse(row.trainer_equipment),teams:{p1:row.player_team,p2:row.opponent_team},teraTickets:JSON.parse(row.tera_tickets), player:new DamagePolicy(), opponent:new SwitchingPolicy()});
    // Simulate a crash after journal commits but before the completion transaction.
    store.db.prepare('DELETE FROM actions WHERE battle_id = ?').run(id);
    log.decisions.filter(d => d.side === 'p1' && !d.action.startsWith('team')).forEach((d, index) => store.input('alice', id, index + 1, d.action));
    service = new TowerService(store);
    const recovered = await service.state('alice');
    assert.equal(recovered.battle!.status, 'complete');
    assert.equal(recovered.tower.coins, row.reward);
    assert.equal((await service.state('alice')).tower.coins, row.reward);
    const saved = JSON.parse(store.battle(id).log!) as BattleLog;
    assert.equal((await replayBattle(saved)).winner, 'Player');
  } finally { await service.dispose(); store.close(); }
});

test('loss ends the run without erasing earned money or unlocks', async () => {
  const store = new TowerStore(':memory:');
  try {
    store.ensurePlayer('alice'); classicCollection(store,'alice');
    const first = store.start('alice', starters);
    const row = store.battle(first);
    const win = await winningResult(store, row);
    store.complete(first, win, fakeView(first, win));
    store.recruit('alice', row.run_id, first, 'Pikachu', null);
    const second = store.enter('alice', row.run_id, 2, starters);
    store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam([...floors[1].opponents]),second);
    const battle = store.battle(second);
    const seed: Seed = [1,2,3,4];
    store.db.prepare('UPDATE battles SET seed = ? WHERE id = ?').run(JSON.stringify(seed), second);
    const loss = await runBattle({trainerEquipment:battle.trainer_equipment==null?undefined:JSON.parse(battle.trainer_equipment),teams:{p1:battle.player_team,p2:battle.opponent_team},seed,opponent:new DamagePolicy(),
      player:{choose: o => o.legalActions.filter(a => a.command.startsWith('move')).at(-1)?.command ?? o.legalActions[0].command}});
    assert.equal(loss.winner, 'Tower AI');
    store.complete(second, loss, fakeView(second, loss));
    const state = store.view('alice');
    assert.equal(state.run!.state, 'lost');
    assert.equal(state.coins, 0);
    assert.equal(state.growthPoints,30);
    assert.ok(state.unlocked.includes('Pikachu'));
    assert.ok(store.start('alice', ['Pikachu','Blastoise','Venusaur']));
  } finally {store.close();}
});
