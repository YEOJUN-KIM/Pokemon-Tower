import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {battleCoinReward} from '../src/data/economy';
import {heldItems} from '../src/data/held-items';
import megaItems from '../src/data/mega-items.json' with {type:'json'};
import {eventDefinitions,eventEncounterSettings} from '../src/data/run-events';
import {selectRunEvent} from '../src/game/run-events';
import {raidFixture} from './raid-fixture';
import {orderBattlePresentationEvents} from '../src/web/battle-event-order';

test('shared encounter gate accepts exactly twenty of one hundred rolls',()=>{
 assert.equal(eventEncounterSettings.encounterPercent,20);
 let encounters=0;
 for(let draw=0;draw<100;draw++){let calls=0;if(selectRunEvent(1,null,()=>calls++===0?draw:0))encounters++;}
 assert.equal(encounters,20);
});
test('new battle economy increases baseline by 25% and pays elite/master ranks more',()=>{
 for(const base of [180,195,225,315]){
  assert.equal(battleCoinReward(base),Math.round(base*1.25));
  assert.equal(battleCoinReward(base,'elite'),Math.round(base*1.25*1.5));
  assert.equal(battleCoinReward(base,'master'),Math.round(base*1.25*2));
 }
});
test('system tools and all mega stones are discounted, ordinary equipment is unchanged',()=>{
 for(const id of ['Dynamax Band','Tera Orb','Red Orb','Blue Orb'])assert.equal(heldItems[id].price,3750);
 for(const [id,item] of Object.entries(megaItems))assert.equal(heldItems[id].price,Math.round(item.price*.75));
 assert.equal(heldItems['Normalium Z'].price,2250);
 assert.equal(heldItems.Leftovers.price,600);assert.equal(heldItems['Life Orb'].price,1350);
});
test('raid skip gives no reward and cannot start the skipped battle',()=>{
 const f=raidFixture();try{
  const coins=f.store.view(f.owner).coins;
  f.store.chooseEvent(f.owner,f.run,f.event.id,'skip');
  assert.equal(f.store.view(f.owner).coins,coins);
  assert.equal(f.store.db.prepare('SELECT battle_id FROM raid_encounters WHERE event_id=?').get(f.event.id)!.battle_id,null);
  assert.throws(()=>f.store.chooseEvent(f.owner,f.run,f.event.id,'challenge'));
 }finally{f.store.close();}
});
test('villain definitions never offer a leave choice',()=>{
 for(const kind of ['villain-campaign','rocket-intro','rocket-ambush','rocket-officer','rocket-boss'] as const)
  assert.ok(eventDefinitions[kind].choices.every(choice=>choice.outcome==='villain'));
});
test('before-move presentation preserves effect groups, other actors and reactions',()=>{
 const move='|move|p1a: Cinderace|Iron Head|p2a: Kecleon';
 const ability='|-ability|p1a: Cinderace|Libero';
 const change='|-start|p1a: Cinderace|typechange|Steel|[from] ability: Libero';
 const damage='|-damage|p2a: Kecleon|50/100';
 const reaction='|-start|p2a: Kecleon|typechange|Steel|[from] ability: Color Change';
 const source=[move,ability,change,damage,reaction];
 assert.deepEqual(orderBattlePresentationEvents(source),[ability,change,move,damage,reaction]);
 assert.deepEqual(source,[move,ability,change,damage,reaction]);
 assert.deepEqual(orderBattlePresentationEvents([move,reaction]),[move,reaction]);
});
test('raid UI exposes challenge and skip, reward introduction conceals contents',async()=>{
 const hooks=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,context);}});
 const f=raidFixture();try{
  const {RunEventPanel}=await import('../src/web/run-event');
  const props={event:f.event,runId:f.run,busy:false,selecting:false,onChoose:()=>{},submit:async()=>{}};
  const html=renderToStaticMarkup(createElement(RunEventPanel,props));
  assert.match(html,/data-event-choice="challenge"/);assert.match(html,/data-event-choice="skip"/);
  const reward=renderToStaticMarkup(createElement(RunEventPanel,{...props,event:{...f.event,phase:'reward',result:{optionId:'secret',title:'비밀 보상',tone:'great',entries:[{kind:'machine',move:'Scald',amount:1}]}}}));
  assert.ok(!reward.includes('열탕'));assert.ok(!reward.includes('비밀 보상'));assert.ok(!reward.includes('reward-panel'));
 }finally{f.store.close();hooks.deregister();}
});
