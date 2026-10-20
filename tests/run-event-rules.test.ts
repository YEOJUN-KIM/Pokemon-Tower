import assert from 'node:assert/strict';
import test from 'node:test';
import {selectRunEvent,rollEventReward} from '../src/game/run-events';
import {eventEncounterSettings,legacyChestRewards,merchantTicketPrice,eventDefinitions} from '../src/data/run-events';

test('event selection partitions the rebalanced weights and preserves random call order',()=>{
  for(let draw=0;draw<85;draw++){
    const calls:number[]=[];
    const selected=selectRunEvent(1,null,max=>{calls.push(max);return calls.length===1?9:draw;});
    assert.equal(selected,draw<50?'mystery-chest':draw<65?'breeder-gift':'traveling-merchant');
    assert.deepEqual(calls,[100,85]);
  }
});

test('checkpoint, cooldown and missed encounters consume only their original draws',()=>{
  const noDraw=()=>{throw Error('Unexpected random draw');};
  assert.equal(selectRunEvent(5,null,noDraw),null);
  assert.equal(selectRunEvent(3,1,noDraw),null);
  const calls:number[]=[];
  assert.equal(selectRunEvent(4,1,max=>{calls.push(max);return eventEncounterSettings.encounterPercent;}),null);
  assert.deepEqual(calls,[100]);
  assert.equal(selectRunEvent(4,1,()=>0),'mystery-chest');
});

test('reward tables preserve the chest threshold and fixed gifts never advance randomness',()=>{
  for(let draw=0;draw<100;draw++){
    const calls:number[]=[];
    assert.deepEqual(rollEventReward('mystery-chest',max=>{calls.push(max);return draw;}),draw<80?{kind:'coins',amount:legacyChestRewards.coins}:{kind:'egg-ticket',amount:legacyChestRewards.eggTickets});
    assert.deepEqual(calls,[100]);
  }
  for(const kind of ['breeder-gift','traveling-merchant'] as const){
    const reward=rollEventReward(kind,()=>{throw Error('Fixed gifts must not draw');});
    assert.deepEqual(reward,{kind:'egg-ticket',amount:1});
    reward.amount=999;
    assert.equal(eventDefinitions[kind].choices[0].rewards[0].reward.amount,1);
  }
  assert.equal(eventDefinitions['traveling-merchant'].choices[0].cost,merchantTicketPrice);
});
