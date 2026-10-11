import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newLines,presentationFrames} from '../src/web/battle-presentation';
import type {BattleView} from '../src/web/contracts';
import {describeLine} from '../src/web/catalog';
const before:BattleView={id:'battle',requestId:1,status:'waiting',turn:1,team:[{species:'Charizard',condition:'155/155',active:true},{species:'Blastoise',condition:'155/155',active:false}],opponent:{species:'Pikachu',condition:'100/100'},actions:[],messages:['|turn|1'],winner:null,error:null};
test('presentation orders attacks, damage, faint and replacement without publishing final result early',()=>{
  const after:BattleView={...before,status:'complete',winner:'Player',requestId:2,messages:[...before.messages,'|move|p1a: Charizard|Flamethrower|p2a: Pikachu','|-damage|p2a: Pikachu|0 fnt','|faint|p2a: Pikachu','|win|Player']};
  const frames=presentationFrames(before,after);
  assert.deepEqual(frames.map(f=>f.motion?.kind??null),['move','hit','faint',null]);
  assert.equal(frames[0].view.opponent?.condition,'100/100');
  assert.equal(frames[1].view.opponent?.condition,'0 fnt');
  assert.ok(frames.every(f=>f.view.status==='waiting'&&f.view.winner===null));
  assert.equal(before.opponent?.condition,'100/100');
  assert.equal(frames[0].motion?.color,'fire');
});
test('rolling public log and repeated events are matched by ordered overlap',()=>{
  assert.deepEqual(newLines(['a','a','b'],['a','b','c']),['c']);
  const old=Array.from({length:300},(_,i)=>String(i));
  assert.deepEqual(newLines(old,[...old.slice(2),'move','damage']),['move','damage']);
});

test('illusion reveal preserves HP and a new switch clears the old transformed appearance',()=>{
  const illusion:BattleView={...before,team:[{species:'Zoroark',displaySpecies:'Blastoise',condition:'100/100',active:true},{species:'Blastoise',condition:'100/100',active:false}],opponent:{species:'Zoroark',displaySpecies:'Pikachu',condition:'42/100'}};
  const reveal=presentationFrames(illusion,{...illusion,messages:[...illusion.messages,'|replace|p2a: Zoroark|Zoroark, L50']});
  assert.equal(reveal[0].view.opponent?.condition,'42/100');
  assert.equal(reveal[0].view.opponent?.species,'Zoroark');
  const after:BattleView={...illusion,team:[{species:'Zoroark',displaySpecies:'Blastoise',condition:'100/100',active:false},{species:'Blastoise',condition:'100/100',active:true}],messages:[...illusion.messages,'|switch|p1a: Blastoise|Blastoise, L50|100/100']};
  assert.equal(presentationFrames(illusion,after)[0].view.team.find(p=>p.active)?.species,'Blastoise');
});
test('switch, own spectator HP and status update only the observed participant',()=>{
  const frames=presentationFrames(before,{...before,messages:[...before.messages,'|switch|p1a: Blastoise|Blastoise, L50, M|100/100','|-damage|p1a: Blastoise|60/100','|-status|p1a: Blastoise|par']});
  assert.equal(frames[2].view.team.find(p=>p.active)?.condition,'60/100 par');
  assert.equal(frames[2].view.team[0].condition,'155/155');
  assert.equal(frames[2].view.opponent?.condition,'100/100');
  assert.deepEqual(presentationFrames(before,{...before,id:'other'}),[]);
});

test('readable dialogue holds each event and reveals messages with HP in protocol order',()=>{
  const messages = ['|move|p1a: Charizard|Flamethrower|p2a: Pikachu','|-supereffective|p2a: Pikachu','|-damage|p2a: Pikachu|40/100','|-status|p2a: Pikachu|brn','|turn|2'];
  const frames = presentationFrames(before,{...before,messages:[...before.messages,...messages]});
  assert.ok(frames.slice(0,4).every(frame=>frame.duration >= 750));
  assert.equal(frames[1].view.opponent?.condition,'100/100');
  assert.equal(frames[2].view.opponent?.condition,'40/100');
  assert.deepEqual(frames[0].view.messages,[...before.messages,messages[0]]);
  assert.equal(describeLine(messages[2]),'상대 피카츄의 HP가 줄었다. (남은 HP 40%)');
  assert.equal(describeLine('|-unboost|p1a: Charizard|def|1'),'리자몽의 방어 하락!');
  assert.equal(frames[4].duration,0);
});

test('impact sound strength resets after the target takes damage',()=>{
 const frames=presentationFrames(before,{...before,messages:[...before.messages,'|move|p1a: Charizard|Flamethrower|p2a: Pikachu','|-supereffective|p2a: Pikachu','|-crit|p2a: Pikachu','|-damage|p2a: Pikachu|40/100','|-damage|p1a: Charizard|140/155|[from] item: Rocky Helmet','|move|p2a: Pikachu|Thunderbolt|p1a: Charizard','|-resisted|p1a: Charizard','|-damage|p1a: Charizard|100/155']});
 assert.deepEqual(frames.filter(f=>f.motion?.kind==='hit').map(f=>f.motion?.impact),['critical',undefined,'weak']);
});
