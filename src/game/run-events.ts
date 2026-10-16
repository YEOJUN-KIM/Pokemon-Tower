import {eventKinds,eventDefinitions,mysteryChest,type EventReward,type RunEventKind} from '../data/run-events';

export type Roll=(max:number)=>number;

export function selectRunEvent(afterFloor:number,previousFloor:number|null,roll:Roll):RunEventKind|null {
  if(afterFloor%5===0)return null;
  if(previousFloor!==null && afterFloor-previousFloor<=mysteryChest.cooldownFloors)return null;
  if(roll(100)>=mysteryChest.encounterPercent)return null;
  const total=eventKinds.reduce((sum,kind)=>sum+eventDefinitions[kind].weight,0);
  let draw=roll(total);
  return eventKinds.find(kind=>{draw-=eventDefinitions[kind].weight;return draw<0;})!;
}

export function rollEventReward(kind:RunEventKind,roll:Roll):EventReward {
  const rewards=eventDefinitions[kind].rewards;
  // Fixed gifts must not consume a random draw: subsequent gameplay uses the
  // same injected random source as the encounter and reward selection.
  if(rewards.length===1)return {...rewards[0].reward};
  let draw=roll(rewards.reduce((sum,entry)=>sum+entry.weight,0));
  return {...rewards.find(entry=>{draw-=entry.weight;return draw<0;})!.reward};
}
