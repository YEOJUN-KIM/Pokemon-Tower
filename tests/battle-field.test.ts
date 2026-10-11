import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceField,emptyField,fieldDuration} from '../src/web/battle-field';
import {battleStatus} from '../src/web/battle-status';
test('entry hazards retain side and layers until removal, without a turn countdown',()=>{
  let field=emptyField();
  for(const line of ['|turn|1',...Array(4).fill('|-sidestart|p2: Enemy|Spikes'),...Array(3).fill('|-sidestart|p1: Player|Toxic Spikes'),'|-sidestart|p1: Player|Stealth Rock','|-sidestart|p2: Enemy|Sticky Web','|turn|9'])field=advanceField(field,line);
  assert.equal(fieldDuration(field.effects.find(e=>e.id==='Spikes')!,9),'3중첩 · 해제될 때까지');
  assert.equal(fieldDuration(field.effects.find(e=>e.id==='ToxicSpikes')!,9),'2중첩 · 해제될 때까지');
  assert.equal(field.effects.find(e=>e.id==='StealthRock')?.scope,'p1');
  assert.equal(fieldDuration(field.effects.find(e=>e.id==='StickyWeb')!,9),'해제될 때까지');
  field=advanceField(field,'|-sideend|p2: Enemy|Spikes');assert.ok(!field.effects.some(e=>e.id==='Spikes'));
});
test('public weather upkeep does not restart its timer; terrain/room/side effects end independently',()=>{
  let field=emptyField();
  for(const line of ['|-weather|Sandstorm|[from] ability: Sand Stream','|turn|1','|-fieldstart|move: Grassy Terrain','|-fieldstart|move: Trick Room','|-sidestart|p1: Player|Reflect','|-weather|Sandstorm|[upkeep]','|turn|2'])field=advanceField(field,line);
  assert.equal(fieldDuration(field.effects.find(effect=>effect.scope==='weather')!,field.turn),'4–7턴 남음');
  assert.equal(fieldDuration(field.effects.find(effect=>effect.id==='TrickRoom')!,field.turn),'4턴 남음');
  field=advanceField(field,'|-fieldend|move: Grassy Terrain');field=advanceField(field,'|-sideend|p1: Player|Reflect');
  assert.deepEqual(field.effects.map(effect=>effect.id),['Sandstorm','TrickRoom']);
  field=advanceField(field,'|-weather|none');assert.deepEqual(field.effects.map(effect=>effect.id),['TrickRoom']);
});

test('public ranks handle clamps, copy/swap, Haze, inversion and switch resets without treating an illusion reveal as a switch',()=>{
  let field=emptyField();
  for(const line of ['|-boost|p1a: Lucario|atk|2','|-unboost|p2a: Pikachu|spe|1','|-boost|p1a: Lucario|atk|6'])field=advanceField(field,line);
  assert.equal(field.boosts?.p1.atk,6);assert.equal(field.boosts?.p2.spe,-1);
  field=advanceField(field,'|replace|p1a: Lucario|Zoroark, L50|100/100');assert.equal(field.boosts?.p1.atk,6);
  field=advanceField(field,'|-copyboost|p2a: Pikachu|p1a: Lucario|[from] move: Psych Up');assert.equal(field.boosts?.p2.atk,6);
  field=advanceField(field,'|-invertboost|p1a: Lucario');assert.equal(field.boosts?.p1.atk,-6);
  field=advanceField(field,'|-swapboost|p1a: Lucario|p2a: Pikachu|atk, spa');assert.equal(field.boosts?.p1.atk,6);assert.equal(field.boosts?.p2.atk,-6);
  field=advanceField(field,'|switch|p1a: Charizard|Charizard, L50|100/100|[from] move: Baton Pass');assert.equal(field.boosts?.p1.atk,6);
  field=advanceField(field,'|switch|p1a: Golem|Golem, L50|100/100');assert.deepEqual(field.boosts?.p1,{});
  field=advanceField(field,'|-clearallboost');assert.deepEqual(field.boosts,{p1:{},p2:{}});
});
test('major status colors are derived from the actual condition, and disappear after curing or fainting',()=>{
  for(const status of ['par','brn','psn','tox','slp','frz'])assert.equal(battleStatus(`50/100 ${status}`),status);
  assert.equal(battleStatus('50/100'),'');assert.equal(battleStatus('0 fnt par'),'');assert.equal(battleStatus('50/100 confusion'),'');
});
test('balls use only public faint/revival events, survive log truncation, and do not expose unseen species',()=>{
  let field=emptyField();for(const line of ['|teamsize|p2|3','|faint|p2a: Pikachu','|faint|p2a: Pikachu',...Array(310).fill('|'), '|faint|p2a: Golem'])field=advanceField(field,line);
  assert.equal(field.opponentSize-field.faintedOpponents.length,1);
  field=advanceField(field,'|-heal|p2a: Pikachu|50/100|[from] move: Revival Blessing');assert.equal(field.opponentSize-field.faintedOpponents.length,2);
  const previous=structuredClone(field);advanceField(field,'|turn|3');assert.deepEqual(field,previous);
});
