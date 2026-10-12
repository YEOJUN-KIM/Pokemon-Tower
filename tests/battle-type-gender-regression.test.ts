import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyPublicTypes,currentTypes} from '../src/web/battle-types';
import type {BattleView} from '../src/web/contracts';
import {BattleSession} from '../src/server/battle-session';
import {defaultProfile,validateProfile} from '../src/server/training';
import {packTeam,starters} from '../src/data/teams';

test('current types follow Protean/Libero, added types, switches and Terastallization',()=>{
  const view={team:[{species:'Cinderace',condition:'100/100',active:true}],opponent:{species:'Greninja',condition:'100/100'}} as BattleView;
  assert.deepEqual(currentTypes(view.team[0]),['Fire']);
  applyPublicTypes(view,'|-start|p1a: Cinderace|typechange|Fighting|[from] ability: Libero');
  assert.deepEqual(currentTypes(view.team[0]),['Fighting']);
  applyPublicTypes(view,'|-start|p2a: Greninja|typechange|Ice|[from] ability: Protean');
  assert.deepEqual(currentTypes(view.opponent!),['Ice']);
  applyPublicTypes(view,'|-start|p2a: Greninja|typeadd|Ghost');
  assert.deepEqual(currentTypes(view.opponent!),['Ice','Ghost']);
  applyPublicTypes(view,'|-end|p2a: Greninja|typeadd|Ghost');
  assert.deepEqual(currentTypes(view.opponent!),['Ice']);
  applyPublicTypes(view,'|switch|p1a: Cinderace|Cinderace, L50, F|100/100');
  assert.deepEqual(currentTypes(view.team[0]),['Fire']);
  view.team[0].terastallized='Water';
  assert.deepEqual(currentTypes(view.team[0]),['Water']);
  view.team[0].terastallized='Stellar';
  assert.deepEqual(currentTypes(view.team[0]),['Fire']);
});

test('saved female Orthworm with Headbutt resumes without changing its battle sex',async()=>{
  const profile={...defaultProfile('Orthworm'),gender:'F' as const,moves:['Headbutt','Iron Head','Earthquake','Protect']};
  assert.equal(validateProfile('Orthworm',profile).gender,'F');
  const teams={p1:packTeam(starters),p2:packTeam(['Orthworm','Blastoise','Venusaur'],{Orthworm:profile})};
  const session=new BattleSession(async()=>{},[1,2,3,4],{teams,aiVersion:'damage-policy-v1'});
  try {
    const view=await session.ready();
    assert.equal(view.status,'waiting');
    assert.equal(view.error,null);
    assert.equal(view.opponent?.species,'Orthworm');
    assert.equal(view.opponent?.gender,'F');
    assert.deepEqual(currentTypes(view.opponent!),['Steel']);
  } finally {await session.dispose();}
});

test('server keeps Libero current types after the type-change line leaves the UI log window',async()=>{
  const profile={...defaultProfile('Cinderace'),ability:'Libero',moves:['Low Kick','Ember','Quick Attack','Protect']};
  const session=new BattleSession(async()=>{},[1,2,3,4],{teams:{p1:packTeam(['Cinderace','Blastoise','Venusaur'],{Cinderace:profile}),p2:packTeam(['Snorlax','Blastoise','Venusaur'])},aiVersion:'damage-policy-v1'});
  try {
    let view=await session.ready();
    view=await session.submit(view.id,view.requestId,'move 1');
    assert.equal(view.status,'waiting');
    assert.deepEqual(currentTypes(view.team.find(p=>p.active)!),['Fighting']);
    // Simulate a long session while preserving the full public event history.
    (session as unknown as {messages:string[]}).messages.push(...Array(310).fill('|turn|2'));
    view=await session.ready();
    assert.equal(view.messages.some(line=>line.includes('|typechange|')),false);
    assert.deepEqual(currentTypes(view.team.find(p=>p.active)!),['Fighting']);
  } finally {await session.dispose();}
});
