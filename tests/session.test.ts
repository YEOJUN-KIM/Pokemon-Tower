import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleRequestError, BattleSession } from '../src/server/battle-session.js';
import type { BattleLog } from '../src/battle/run.js';
import Showdown from 'pokemon-showdown';
import {packTeam} from '../src/data/teams';

test('web session rejects invalid, concurrent and stale actions; saves once at completion', async () => {
  const saved: BattleLog[] = [];
  const session = new BattleSession(async log => { saved.push(log); }, [1, 2, 3, 4]);
  let state = await session.ready();
  assert.equal(state.turn, 1);
  assert.equal(state.status, 'waiting');
  assert.equal(state.team.length, 3);
  assert.ok(!JSON.stringify(state).includes('estimatedDamage'));
  assert.ok(!JSON.stringify(state).includes('Intimidate'));
  assert.ok(state.team.every(pokemon=>pokemon.stats && pokemon.stats.hp>0));
  assert.ok(state.movePP?.every(move=>move.pp>0 && move.maxpp>=move.pp));
  assert.ok(!('stats' in state.opponent!));
  assert.ok(!('moves' in state.opponent!));
  assert.ok(!('ability' in state.opponent!));
  assert.match(state.opponent!.condition, /\/100/);
  assert.throws(() => session.submit(state.id, state.requestId, 'move 1 terastallize'), (error: unknown) => error instanceof BattleRequestError && error.status === 400);
  assert.throws(() => session.submit('another-battle', state.requestId, 'move 1'), (error: unknown) => error instanceof BattleRequestError && error.status === 409);
  const original = state;
  const first = session.submit(state.id, state.requestId, state.actions[0].command);
  assert.throws(() => session.submit(original.id, original.requestId, original.actions[0].command), /이미 처리/);
  state = await first;
  assert.throws(() => session.submit(original.id, original.requestId, original.actions[0].command), /이미 처리/);
  let actions = 1;
  while (state.status === 'waiting') {
    assert.ok(actions++ < 200);
    state = await session.submit(state.id, state.requestId, state.actions[0].command);
  }
  assert.equal(state.status, 'complete');
  assert.equal(state.actions.length, 0);
  assert.ok(state.winner);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].winner, state.winner);
  assert.throws(() => session.submit(state.id, state.requestId, 'move 1'), /이미 처리/);
  assert.equal(saved.length, 1);
});

test('real terrain and weather activation reach the field snapshot with own-only inspection data',async()=>{
  const team=Showdown.Teams.unpack(packTeam(['Rillaboom','Charizard','Blastoise']))!;team[0].ability='Grassy Surge';team[0].moves[0]='Swords Dance';
  const session=new BattleSession(async()=>{},[1,2,3,4],{teams:{p1:Showdown.Teams.pack(team),p2:packTeam(['Tyranitar','Pikachu','Golem'])}});
  try{const view=await session.ready();assert.ok(view.field?.effects.some(effect=>effect.id==='GrassyTerrain'));assert.ok(view.field?.effects.some(effect=>effect.id==='Sandstorm'));assert.equal(view.field?.opponentSize,3);assert.equal(view.team[0].ability,'Grassy Surge');assert.equal(view.team[0].nature,'Serious');assert.ok(view.team[0].moves?.length);assert.ok(view.team[0].stats?.hp);assert.ok(!('moves' in view.opponent!));const boosted=await session.submit(view.id,view.requestId,'move 1');assert.equal(boosted.field?.boosts?.p1.atk,2);}
  finally{await session.dispose();}
});
