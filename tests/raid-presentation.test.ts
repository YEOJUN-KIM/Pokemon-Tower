import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {presentationFrames} from '../src/web/battle-presentation';
import {playbackDuration} from '../src/web/playback-settings';
import {battleMessageEntries} from '../src/web/battle-message-data';
import {emptyField} from '../src/battle/public-field';
import {raidBossDefinitions} from '../src/data/raids';
import type {BattleView} from '../src/shared/contracts';
import type {RunEventView} from '../src/data/run-events';

for(const boss of raidBossDefinitions)for(const route of boss.routes)for(let i=1;i<route.phases.length;i++)test(`${boss.id}/${route.id} transition ${i}: public frames, HP reset, two messages and 4x timing`,()=>{
 const previous=route.phases[i-1],next=route.phases[i],messages=next.messages!;
 const before:BattleView={id:'raid',requestId:1,status:'waiting',turn:1,actions:[],error:null,messages:['|turn|1'],winner:null,team:[{species:'Cloyster',active:true,condition:'100/200 brn'}],opponent:{species:previous.species,condition:'10/100 par'},field:{...emptyField(),raid:true,opponentSize:1,boosts:{p1:{def:2},p2:{atk:2}}}};
 const lines=['|move|p1a: Cloyster|Icicle Spear|p2a: '+boss.species,`|-damage|p2a: ${boss.species}|0 fnt`,`|faint|p2a: ${boss.species}|[raid]`,'|message|'+messages[0],`|switch|p2a: ${boss.species}|${next.species}, L50|100/100|[raid]`,'|message|'+messages[1],'|turn|2'];
 const after:BattleView={...structuredClone(before),requestId:2,turn:2,messages:[...before.messages,...lines],opponent:{species:next.species,condition:'100/100'}};
 const frames=presentationFrames(before,after),transitions=frames.filter(f=>f.motion?.raidPhase),revealed=transitions.find(f=>f.motion?.hpReset)!;
 assert.deepEqual(transitions.map(f=>f.motion!.kind),next.transformation==='mega'?['mega-charge','mega-shell','mega-burst','mega-flash','mega-reveal']:['raid-aura-charge','raid-aura-burst','raid-aura-reveal']);
 const first=frames.findIndex(f=>f.announcement===messages[0]),reveal=frames.indexOf(revealed),second=frames.findIndex(f=>f.announcement===messages[1]);
 assert.ok(first>0&&first<reveal);assert.equal(second,reveal);assert.ok(frames.findIndex(f=>f.view.turn===2)>reveal);
 assert.equal(frames[first-1].view.opponent!.condition,'0 fnt');assert.ok(frames[first-1].minimumDuration!>=200);
 for(const frame of frames.slice(first,reveal)){assert.equal(frame.view.opponent!.species,previous.species);assert.equal(frame.view.opponent!.condition,'0 fnt');}
 assert.equal(revealed.view.opponent!.species,next.species);assert.equal(revealed.view.opponent!.condition,'100/100');
 assert.equal(revealed.view.field!.boosts!.p1.def,2);assert.deepEqual(revealed.view.field!.boosts!.p2,{});
 assert.deepEqual(revealed.view.team,before.team);assert.deepEqual(before.opponent,{species:previous.species,condition:'10/100 par'});
 const log=battleMessageEntries(frames.at(-1)!.view.messages);
 assert.deepEqual(log.filter(e=>e.event==='message').map(e=>e.text),messages);
 assert.ok(!log.some(e=>['switch','faint'].includes(e.event)));
 assert.ok(!frames.some(f=>/키스톤|페이즈|부활|내보냈/.test(f.announcement??'')));
 for(const frame of transitions){
  const duration=playbackDuration(frame.duration,4,false,'',{minimumDuration:frame.minimumDuration});
  assert.ok(duration>=frame.duration/2);assert.ok(duration>frame.duration/4);
 }
 assert.ok(playbackDuration(revealed.duration,4,false,'',{minimumDuration:revealed.minimumDuration})>=700);
});

test('Raid discovery renders only for an unchallenged choice, rewards use a victory backdrop',async()=>{
 const hooks=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,context);}});
 try{
  const {RunEventScene}=await import('../src/web/run-event');
  const base:RunEventView={id:'event',kind:'raid-encounter',afterFloor:2,phase:'choice',reward:null,raid:{spriteId:445,category:'normal'}};
  const render=(event:RunEventView)=>renderToStaticMarkup(createElement(RunEventScene,{event}));
  assert.ok(render(base).includes('data-testid="raid-encounter"'));
  for(const event of [{...base,choiceId:'challenge'},{...base,phase:'battle' as const},{...base,phase:'reward' as const}])assert.ok(!render(event).includes('raid-silhouette'));
  const reward=render({...base,phase:'reward',choiceId:'challenge'});
  assert.ok(reward.includes('data-testid="raid-victory"'));assert.ok(reward.includes('레이드 승리!'));assert.ok(!reward.includes('정체불명의 강적'));
 }finally{hooks.deregister();}
});
