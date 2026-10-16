import type {RewardOption,WeightedRewardOption} from '../data/rewards';
import {eventDefinitions,eventDefinition,mysteryChest,type EventReward,type EventChoice,type RunEventRegistry} from '../data/run-events';

export type Roll=(max:number)=>number;

export function selectRunEvent(afterFloor:number,previousFloor:number|null,roll:Roll,registry:RunEventRegistry=eventDefinitions):string|null {
  if(afterFloor%5===0)return null;
  if(previousFloor!==null && afterFloor-previousFloor<=mysteryChest.cooldownFloors)return null;
  if(roll(100)>=mysteryChest.encounterPercent)return null;
  const eventKinds=Object.keys(registry);
  const total=eventKinds.reduce((sum,kind)=>sum+registry[kind].weight,0);
  let draw=roll(total);
  return eventKinds.find(kind=>{draw-=registry[kind].weight;return draw<0;})!;
}

export function findEventChoice(kind:string,id:unknown,registry:RunEventRegistry=eventDefinitions,rulesVersion=1):EventChoice|undefined {
  return typeof id==='string'?eventDefinition(kind,registry,rulesVersion)?.choices.find(choice=>choice.id===id):undefined;
}

// Compatibility helper for the existing public reward API.
export function rollEventReward(kind:string,roll:Roll):EventReward {
  const choice=findEventChoice(kind,'open');
  if(!choice || choice.outcome!=='reward')throw Error('Unknown reward choice');
  return rollChoiceReward(choice,roll);
}

export function rollChoiceReward(choice:Extract<EventChoice,{outcome:'reward'}>,roll:Roll):EventReward {
  const rewards=choice.rewards;
  // Fixed gifts must not consume a random draw: subsequent gameplay uses the
  // same injected random source as the encounter and reward selection.
  if(rewards.length===1)return {...rewards[0].reward};
  let draw=roll(rewards.reduce((sum,entry)=>sum+entry.weight,0));
  return {...rewards.find(entry=>{draw-=entry.weight;return draw<0;})!.reward};
}

export function rollRewardOption(results:readonly WeightedRewardOption[],roll:Roll):RewardOption {
 if(results.length===1)return results[0].option;
 let draw=roll(results.reduce((sum,result)=>sum+result.weight,0));
 const selected=results.find(result=>{draw-=result.weight;return draw<0;});
 if(!selected)throw Error('Invalid reward draw');
 return selected.option;
}
