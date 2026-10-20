import {eggMachineTuningRules} from '../data/egg-machine-tuning';

export function selectWeightedEggPool<T>(groups:readonly {candidates:readonly T[];weight:number}[],roll:(max:number)=>number):readonly T[] {
  const available=groups.filter(group=>group.candidates.length>0&&group.weight>0);
  if(!available.length)throw new Error('Empty egg candidate pool');
  if(available.length===1)return available[0].candidates;
  let draw=roll(available.reduce((sum,group)=>sum+group.weight,0));
  return available.find(group=>{draw-=group.weight;return draw<0;})!.candidates;
}

// This selects only within the already drawn rarity. No rarity or
// shiny rolls, prices, persistence, or species metadata belong in this function.
export function selectFocusedEggPool<T>(
  candidates:readonly T[],matches:((candidate:T)=>boolean)|null,roll:(max:number)=>number,focusWeight:number=eggMachineTuningRules.focusWeight,
):readonly T[] {
  if(!candidates.length)throw new Error('Empty egg candidate pool');
  if(!matches)return candidates;
  const focused:T[]=[],other:T[]=[];
  for(const candidate of candidates)(matches(candidate)?focused:other).push(candidate);
  // Missing groups never trigger retries or reroll the rarity. With one
  // available group, no focus roll is needed.
  return selectWeightedEggPool([
    {candidates:focused,weight:focusWeight},
    {candidates:other,weight:100-focusWeight},
  ],roll);
}

export function selectEggCandidate<T>(candidates:readonly T[],matches:((candidate:T)=>boolean)|null,roll:(max:number)=>number):T {
  const group=selectFocusedEggPool(candidates,matches,roll);
  return group[roll(group.length)];
}
