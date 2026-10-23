import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presentationFrames} from '../src/web/battle-presentation';
import {currentTypes} from '../src/web/battle-types';
import {effectNotice} from '../src/web/battle-effects';
import {BattleSession} from '../src/server/battle-session';
import {defaultProfile} from '../src/server/training';
import {packTeam} from '../src/data/teams';
import type {BattleView} from '../src/web/contracts';

const before:BattleView={id:'timing',requestId:1,status:'waiting',turn:1,team:[{species:'Meowscarada',types:['Grass','Dark'],condition:'100/100',active:true}],opponent:{species:'Kecleon',types:['Normal'],condition:'50/100'},actions:[],messages:['|turn|1'],winner:null,error:null};

for(const [name,event] of [
  ['Rough Skin','|-damage|p1a: Meowscarada|90/100|[from] ability: Rough Skin|[of] p2a: Kecleon'],
  ['Speed Boost','|-boost|p2a: Kecleon|spe|1|[from] ability: Speed Boost'],
  ['Weak Armor','|-unboost|p2a: Kecleon|def|1|[from] ability: Weak Armor'],
  ['Static','|-status|p1a: Meowscarada|par|[from] ability: Static|[of] p2a: Kecleon'],
  ['Poison Heal','|-heal|p2a: Kecleon|65/100|[from] ability: Poison Heal'],
  ['Color Change','|-start|p2a: Kecleon|typechange|Fire|[from] ability: Color Change'],
  ['Drizzle','|-weather|RainDance|[from] ability: Drizzle|[of] p2a: Kecleon'],
  ['Grassy Surge','|-fieldstart|move: Grassy Terrain|[from] ability: Grassy Surge|[of] p2a: Kecleon'],
] as const)test(`${name} announces activation before its visible effect`,()=>{
  const frames=presentationFrames(before,{...before,messages:[...before.messages,event]});
  assert.equal(frames.length,2);
  assert.equal(frames[0].notice?.name,name);
  assert.equal(frames[1].notice,undefined);
  assert.deepEqual(frames[0].view.team,before.team);
  assert.deepEqual(frames[0].view.opponent,before.opponent);
  assert.deepEqual(frames[0].view.messages,before.messages);
  if(name==='Rough Skin')assert.equal(frames[1].view.team[0].condition,'90/100');
  if(name==='Poison Heal')assert.equal(frames[1].view.opponent?.condition,'65/100');
  if(name==='Color Change')assert.deepEqual(currentTypes(frames[1].view.opponent!),['Fire']);
  if(name==='Static')assert.match(frames[1].view.team[0].condition,/par/);
  if(name==='Speed Boost')assert.equal(frames[1].view.field?.boosts?.p2.spe,1);
  if(name==='Weak Armor')assert.equal(frames[1].view.field?.boosts?.p2.def,-1);
  if(name==='Drizzle'||name==='Grassy Surge'){
    assert.equal(frames[0].view.field?.effects.length ?? 0,0);
    assert.equal(frames[1].view.field?.effects.length,1);
  }
});

test('Regenerator heals the benched owner while remaining private in the public log',async()=>{
  const profile={...defaultProfile('Slowbro'),ability:'Regenerator',moves:['Tackle']};
  const session=new BattleSession(async()=>{},[1,2,3,4],{teams:{p1:packTeam(['Slowbro','Blastoise','Venusaur'],{Slowbro:profile}),p2:packTeam(['Snorlax','Blastoise','Venusaur'])},aiVersion:'damage-policy-v1'});
  try{
    let view=await session.ready();view=await session.submit(view.id,view.requestId,'move 1');
    const damaged=Number(view.team.find(p=>p.species==='Slowbro')!.condition.split('/')[0]);
    view=await session.submit(view.id,view.requestId,'switch 2');
    const benched=view.team.find(p=>p.species==='Slowbro')!;
    assert.equal(Number(benched.condition.split('/')[0])-damaged,Math.floor(Number(benched.condition.split('/')[1])/3));
    assert.equal(benched.active,false);
    assert.equal(view.messages.some(line=>line.includes('Regenerator')),false);
  }finally{await session.dispose();}
});

for(const [species,ability,move,type] of [['Meowscarada','Protean','Quick Attack','Normal'],['Cinderace','Libero','Low Kick','Fighting']] as const)
test(`${ability}: real engine activation plays before attack and persists across turns/recovery`,async()=>{
  const profile={...defaultProfile(species),ability,moves:[move,'Protect']};
  const options={teams:{p1:packTeam([species,'Blastoise','Venusaur'],{[species]:profile}),p2:packTeam(['Snorlax','Blastoise','Venusaur'])},aiVersion:'damage-policy-v1'};
  const session=new BattleSession(async()=>{},[1,2,3,4],options);
  try{
    const initial=await session.ready();
    const changed=await session.submit(initial.id,initial.requestId,'move 1');
    const frames=presentationFrames(initial,changed);
    const protocol=[...changed.messages];
    presentationFrames({...initial,messages:[]},changed);
    assert.deepEqual(changed.messages,protocol);
    const activation=frames.findIndex(f=>f.notice?.name===ability),attack=frames.findIndex(f=>f.motion?.move===move);
    assert.ok(activation>=0 && attack>activation);
    assert.match(frames[activation].announcement??'',ability==='Libero'?/리베로/:/변환자재/);
    assert.deepEqual(currentTypes(frames[activation].view.team.find(p=>p.active)!),species==='Meowscarada'?['Grass','Dark']:['Fire']);
    assert.deepEqual(currentTypes(frames[activation+1].view.team.find(p=>p.active)!),[type]);
    assert.deepEqual(currentTypes(frames[attack].view.team.find(p=>p.active)!),[type]);
    assert.equal(frames.filter(f=>f.notice?.name===ability).length,1);
    const next=await session.submit(changed.id,changed.requestId,'move 2');
    assert.deepEqual(currentTypes(next.team.find(p=>p.active)!),[type]);
    assert.equal(presentationFrames(changed,next).some(f=>f.notice?.name===ability),false);
    const restored=new BattleSession(async()=>{},[1,2,3,4],{...options,history:['move 1','move 2']});
    try{assert.deepEqual(currentTypes((await restored.ready()).team.find(p=>p.active)!),[type]);}finally{await restored.dispose();}
  }finally{await session.dispose();}
});

for(const [species,ability,own,move,expected] of [
  ['Gyarados','Intimidate','Charizard','Protect','-unboost'],
  ['Pelipper','Drizzle','Charizard','Protect','-weather'],
  ['Torkoal','Drought','Charizard','Protect','-weather'],
  ['Blaziken','Speed Boost','Charizard','Protect','-boost'],
  ['Garchomp','Rough Skin','Charizard','Dragon Claw','-damage'],
  ['Vaporeon','Water Absorb','Blastoise','Water Gun','-immune'],
  ['Kecleon','Color Change','Charizard','Ember','-start'],
] as const)test(`real ${ability} activates at the engine's intended stage`,async()=>{
  const ownProfile={...defaultProfile(own),moves:[move]},enemyProfile={...defaultProfile(species),ability,moves:['Protect']};
  const session=new BattleSession(async()=>{},[1,2,3,4],{teams:{p1:packTeam([own,own==='Blastoise'?'Charizard':'Blastoise','Venusaur'],{[own]:ownProfile}),p2:packTeam([species,'Snorlax','Venusaur'],{[species]:enemyProfile})},aiVersion:'damage-policy-v1'});
  try{
    let view=await session.ready();
    if(!['Intimidate','Drizzle','Drought'].includes(ability)){
      // Enemy Protect blocks the first attack; its consecutive attempts can fail.
      for(let i=0;i<5 && !view.messages.some(line=>effectNotice(line)?.name===ability);i++)view=await session.submit(view.id,view.requestId,'move 1');
    }
    assert.ok(view.messages.some(line=>effectNotice(line)?.name===ability),`Missing ${ability}`);
    assert.ok(view.messages.some(line=>line.startsWith('|'+expected+'|')),`Missing ${expected}`);
  }finally{await session.dispose();}
});
