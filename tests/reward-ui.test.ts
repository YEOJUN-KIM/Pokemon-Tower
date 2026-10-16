import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {RewardResult,RewardSelection} from '../src/data/rewards';
import {mysteryChestResults} from '../src/data/run-events';
import {resolveReward} from '../src/game/rewards';

test('reward content supports all tones and stable pending/selected candidate IDs without changing immediate results',async()=>{
 const hooks=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,context);}});
 try{
  const {RewardPanel,RewardChoiceList}=await import('../src/web/reward-panel');
  for(const {option} of mysteryChestResults){
   const result=resolveReward(option,1000),before=JSON.stringify(result);
   const html=renderToStaticMarkup(createElement(RewardPanel,{result,busy:false,onConfirm:()=>{throw Error('Rendering cannot confirm');}}));
   assert.ok(html.includes(`data-reward-tone="${result.tone}"`));
   assert.ok(html.includes(result.title));assert.ok(!html.includes('game-dialogue'));
   assert.equal((html.match(/<li /g)??[]).length,result.entries.length);
   assert.equal(JSON.stringify(result),before);
  }
  const selection:RewardSelection={id:'epic-tool',title:'에픽 도구 선택',state:'pending',candidates:[
   {id:'orb',label:'생명의구슬'},{id:'sash',label:'기합의띠'},
   {id:'scarf',label:'구애스카프'},{id:'vest',label:'돌격조끼'},
  ]};
  const result:RewardResult={optionId:'fixture',title:'전투 보상',tone:'great',entries:[{kind:'coins',amount:500}],selections:[selection]};
  const pending=renderToStaticMarkup(createElement(RewardPanel,{result,busy:false,onConfirm:()=>{}}));
  assert.ok(pending.includes('data-selection-state="pending"'));
  assert.ok(pending.includes('선택 기능 준비 중'));assert.ok(pending.includes('보상을 선택한 뒤'));
  assert.equal((pending.match(/disabled=""/g)??[]).length,2);
  const ready=renderToStaticMarkup(createElement(RewardChoiceList,{selections:[selection],busy:false,onSelect:()=>{}}));
  assert.ok(ready.includes('선택하기'));assert.ok(!ready.includes('disabled=""'));
  const selected:RewardResult={...result,selections:[{...selection,state:'selected',selectedId:'sash'}]};
  const completed=renderToStaticMarkup(createElement(RewardPanel,{result:selected,busy:false,onConfirm:()=>{}}));
  assert.ok(completed.includes('기합의띠'));assert.ok(completed.includes('선택 완료'));
  assert.ok(!completed.includes('disabled=""'));
  assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
 }finally{hooks.deregister();}
});
