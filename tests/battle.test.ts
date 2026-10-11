import test from 'node:test';
import assert from 'node:assert/strict';
import { DamagePolicy, estimateDamage, legalActions, type OwnPokemon } from '../src/battle/policy.js';
import { battleEvents, replayBattle, runBattle } from '../src/battle/run.js';

test('3v3 finishes, forces replacement, and replays exactly', async () => {
  const log = await runBattle({player: new DamagePolicy(), opponent: new DamagePolicy()});
  assert.ok(['Player', 'Tower AI', 'tie'].includes(log.winner!));
  assert.ok(log.turns > 0 && log.turns < 200);
  assert.ok(log.decisions.some(d => d.action.startsWith('switch')));
  // Force a different timestamp to verify replay across processes/different times.
  log.publicProtocol = log.publicProtocol.map(line => line.startsWith('|t:|') ? '|t:|0' : line);
  const replay = await replayBattle(log);
  assert.deepEqual(battleEvents(replay.publicProtocol), battleEvents(log.publicProtocol));
  assert.equal(replay.winner, log.winner);
  const tampered = structuredClone(log);
  tampered.winner = 'tampered';
  await assert.rejects(replayBattle(tampered), /Replay result mismatch/);
});

test('observations contain only own team, public opponent, and legal actions', async () => {
  const log = await runBattle({player: new DamagePolicy(), opponent: new DamagePolicy()});
  for (const {side, observation} of log.decisions) {
    assert.deepEqual(Object.keys(observation).sort(), ['lastOpponentMove','legalActions', 'opponent', 'ownTeam', 'turn']);
    assert.ok(observation.ownTeam.every(p => p.ident.startsWith(side)));
    if (observation.opponent) {
      assert.deepEqual(Object.keys(observation.opponent).sort(), ['condition', 'species']);
      assert.match(observation.opponent.condition, /^(\d+\/100|0 fnt)/);
    }
    assert.ok(observation.legalActions.every(a => !/mega|zmove|dynamax|terastallize/.test(a.command)));
  }
});

test('unlisted actions and invalid seeds are rejected', async () => {
  await assert.rejects(runBattle({player: {choose: () => 'move 1 terastallize'}, opponent: new DamagePolicy()}), /Illegal action/);
  await assert.rejects(runBattle({player: new DamagePolicy(), opponent: new DamagePolicy(), seed: [-1, 2, 3, 4]}), /Invalid seed/);
});

test('damage estimate respects immunity and type effectiveness', () => {
  const own: OwnPokemon = {ident: 'p1: Pikachu', details: 'Pikachu, L50', condition: '100/100', active: true,
    stats: {atk: 80, def: 80, spa: 80, spd: 80, spe: 80}};
  assert.equal(estimateDamage('thunderbolt', own, 'Garchomp'), 0);
  assert.ok(estimateDamage('thunderbolt', own, 'Gyarados') > estimateDamage('quickattack', own, 'Gyarados'));
  const actions = legalActions({side: {pokemon: [own]}, active: [{trapped: true, moves: [
    {id: 'thunderbolt', move: 'Thunderbolt', pp: 0}, {id: 'quickattack', move: 'Quick Attack', pp: 5, disabled: true},
  ]}]});
  assert.equal(actions.length, 0);
});

test('multiple seeded battles finish without hanging', async () => {
  for (let i = 1; i <= 8; i++) {
    const log = await runBattle({player: new DamagePolicy(), opponent: new DamagePolicy(), seed: [i, 22, 333, 4444]});
    assert.ok(log.winner);
  }
});
