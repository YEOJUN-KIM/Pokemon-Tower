import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {EventDefinition,RunEventView} from '../src/data/run-events';
import {eventKinds} from '../src/data/run-events';
import {getEventPresentation} from '../src/web/event-presentation';

test('choice buttons render arbitrary IDs and counts, keeping the selected ID in the request contract',async()=>{
 // CSS is a bundler concern; exercise the actual React buttons with a neutral module in Node.
 const hooks=registerHooks({load(url,context,next){
  return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,context);
 }});
 try{
  const {EventChoiceButtons,eventDialogue}=await import('../src/web/run-event');
  const definition:EventDefinition={title:'fixture',summary:'fixture',intro:'fixture',weight:1,choices:[
   {id:'help',label:'도와준다',outcome:'reward',cost:0,rewards:[{weight:1,reward:{kind:'coins',amount:5}}],message:'보상'},
   {id:'pay',label:'돈을 지불한다',outcome:'reward',cost:10,rewards:[{weight:1,reward:{kind:'egg-ticket',amount:1}}],message:'보상'},
   {id:'leave',label:'떠난다',outcome:'leave'},
  ]};
  for(const choices of [definition.choices.slice(0,1),definition.choices]){
   const html=renderToStaticMarkup(createElement(EventChoiceButtons,{choices,busy:false,onSelect:()=>{}}));
   assert.equal((html.match(/<button /g)??[]).length,choices.length);
   assert.equal((html.match(/data-initial-focus/g)??[]).length,1);
   for(const choice of choices){assert.ok(html.includes(`data-event-choice="${choice.id}"`));assert.ok(html.includes(choice.label));}
  }
  const requests:Record<string,unknown>[]=[];
  const buttons=EventChoiceButtons({choices:definition.choices,busy:false,onSelect:choice=>requests.push({type:'event-choice',runId:'run',eventId:'saved',choice})});
  for(const button of buttons.props.children)button.props.onClick();
  assert.deepEqual(requests.map(request=>request.choice),['help','pay','leave']);
  assert.ok(requests.every(request=>request.type==='event-choice' && request.eventId==='saved'));
  const base:RunEventView={id:'saved',kind:'mystery-chest',afterFloor:1,phase:'reward',reward:{kind:'coins',amount:150},choiceId:'open'};
  assert.equal(eventDialogue(base),'150코인을 발견했다! 타워 코인에 더해졌다.');
  assert.equal(eventDialogue({...base,reward:{kind:'egg-ticket',amount:1}}),'알 뽑기권 1장을 발견했다! 알 뽑기에서 사용할 수 있다.');
  for(const kind of eventKinds)assert.ok(getEventPresentation(kind));
  assert.equal(getEventPresentation('__proto__'),undefined);
 }finally{hooks.deregister();}
});

test('challenger detail only exposes optional special hint, rank and reward category',async()=>{
 const hooks=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,context);}});
 try{
  const {ChallengerDetail}=await import('../src/web/challenger-candidates');
  const {challengerCandidate,challengerDefinition}=await import('../src/data/challengers');
  const {npcSamples}=await import('../src/data/npc-samples');
  const definition=challengerDefinition(npcSamples[0],'elite',20),candidate=challengerCandidate(definition);
  const normal=renderToStaticMarkup(createElement(ChallengerDetail,{candidate}));
  assert.ok(normal.includes(candidate.title));assert.ok(normal.includes('엘리트 ★★'));assert.ok(normal.includes(candidate.rewardPreview));
  assert.ok(!normal.includes(candidate.battleStyle));assert.ok(!normal.includes('challenger-special-hint'));assert.ok(!normal.includes('위험도'));
  const future=challengerCandidate({...definition,specialHint:'특별한 만남이다.'});assert.equal(future.specialHint,'특별한 만남이다.');
  const special=renderToStaticMarkup(createElement(ChallengerDetail,{candidate:future}));assert.ok(special.includes('특별한 만남이다.'));assert.ok(special.includes('challenger-special-hint'));
  assert.equal(renderToStaticMarkup(createElement(ChallengerDetail,{candidate:undefined})),'');
 }finally{hooks.deregister();}
});
