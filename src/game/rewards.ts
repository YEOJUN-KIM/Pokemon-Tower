import type {RewardOption,RewardResult,RewardEntry} from '../data/rewards';

// Pure resolution against a server-provided wallet snapshot. A later choice UI
// can submit an option ID; it must never submit its own resolved entries.
export function resolveReward(option:RewardOption,coins:number):RewardResult {
 if(!Number.isSafeInteger(coins)||coins<0)throw Error('Invalid reward wallet');
 const entries:RewardEntry[]=option.entries.map(effect=>{
  if(effect.kind==='message')return {...effect};
  if(effect.kind==='coin-loss'){
   if(!Number.isFinite(effect.percent)||effect.percent<0||effect.percent>100)throw Error('Invalid loss percent');
   const amount=Math.min(coins,Math.max(0,Math.floor(coins*effect.percent/100)));
   coins-=amount;return {...effect,amount};
  }
  if(!Number.isSafeInteger(effect.amount)||effect.amount<0)throw Error('Invalid reward amount');
  if(effect.kind==='coins'){
   coins+=effect.amount;if(!Number.isSafeInteger(coins))throw Error('Reward wallet overflow');
  }
  return {...effect};
 });
 return {optionId:option.id,title:option.title,tone:option.tone,entries};
}
