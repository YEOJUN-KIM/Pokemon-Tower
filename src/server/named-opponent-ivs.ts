import Showdown from 'pokemon-showdown';
import type {Seed} from '../battle/run';
import {statKeys,type StatBlock,type TrainingProfile} from '../data/training';
import {towerDifficulty} from '../data/tower-progression';

export type NamedOpponentRole='physical'|'special'|'mixed'|'wall';

export function namedOpponentRole(name:string,moves:string[],profile?:TrainingProfile):NamedOpponentRole{
 const base=Showdown.Dex.species.get(profile?.forme??name).baseStats;
 const attacks=moves.map(move=>Showdown.Dex.moves.get(move)).filter(move=>move.category!=='Status');
 const defenses=(profile?.evs.def??0)+(profile?.evs.spd??0),offense=(profile?.evs.atk??0)+(profile?.evs.spa??0);
 const recovery=new Set(['Recover','Roost','Soft-Boiled','Slack Off','Strength Sap','Wish','Rest','Synthesis','Moonlight','Morning Sun','Leech Seed']);
 const support=moves.filter(move=>Showdown.Dex.moves.get(move).category==='Status').length;
 if(!attacks.length || defenses>0&&defenses>=offense || support>=2&&moves.some(move=>recovery.has(move))&&(Math.max(base.def,base.spd)>=120||base.hp+base.def+base.spd>=300))return 'wall';
 const score=(category:string)=>attacks.filter(move=>move.category===category).reduce((sum,move)=>sum+(move.basePower||40)*(move.accuracy===true?1:move.accuracy/100),0);
 const physical=score('Physical')*base.atk,special=score('Special')*base.spa;
 if(physical>0&&special>0&&Math.min(physical,special)>Math.max(physical,special)*.45)return 'mixed';
 return physical>=special?'physical':'special';
}

export function namedOpponentIVBudget(floor:number){
 const baseline=towerDifficulty(floor).ivCap*6;
 // Above the old ordinary/elite ceiling through most of the climb. Leave room
 // below the six-stat maximum so late named opponents can still vary by role.
 const min=Math.min(175,baseline+2),max=Math.min(180,min+Math.max(4,towerDifficulty(floor).ivCap));
 return {min,max};
}

function ivRandom(name:string,floor:number,seed:Seed){
 let state=seed.reduce((value,part)=>(Math.imul(value,31)+part)>>>0,2166136261^floor);
 for(const character of 'named-ivs-v1:'+name)state=(Math.imul(state,16777619)^character.charCodeAt(0))>>>0;
 return ()=>{state=(state+0x6d2b79f5)>>>0;let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return ((value^(value>>>14))>>>0)/4294967296;};
}

export function namedOpponentIVs(name:string,moves:string[],floor:number,seed:Seed,profile?:TrainingProfile):StatBlock{
 const random=ivRandom(name,floor,seed),role=namedOpponentRole(name,moves,profile);
 const base=Showdown.Dex.species.get(profile?.forme??name).baseStats;
 const weights:StatBlock=role==='physical'?{hp:2,atk:6,def:1.5,spa:.35,spd:1.5,spe:5}
  :role==='special'?{hp:2,atk:.35,def:1.5,spa:6,spd:1.5,spe:5}
  :role==='mixed'?{hp:2,atk:4,def:1,spa:4,spd:1,spe:5}
  :{hp:4,atk:.4,def:base.def>=base.spd?6:4.5,spa:.4,spd:base.spd>=base.def?6:4.5,spe:.4};
 // A native Trick Room build deliberately keeps its Speed IV at zero.
 if(moves.includes('Trick Room')){weights.spe=0;weights.hp+=3;}
 for(const stat of statKeys)weights[stat]*=.85+random()*.3;
 const range=namedOpponentIVBudget(floor);
 const budget=Math.min(statKeys.filter(stat=>weights[stat]>0).length*31,range.min+Math.floor(random()*(range.max-range.min+1)));
 const ivs=Object.fromEntries(statKeys.map(stat=>[stat,0])) as StatBlock;
 for(let point=0;point<budget;point++){
  const available=statKeys.filter(stat=>ivs[stat]<31&&weights[stat]>0);
  let ticket=random()*available.reduce((sum,stat)=>sum+weights[stat],0);
  const chosen=available.find(stat=>(ticket-=weights[stat])<0)??available[available.length-1];
  ivs[chosen]++;
 }
 if(budget>0&&new Set(Object.values(ivs)).size===1){
  const order=[...statKeys].sort((a,b)=>weights[b]-weights[a]);
  const high=order.find(stat=>ivs[stat]<31)!,low=[...order].reverse().find(stat=>stat!==high&&ivs[stat]>0)!;
  ivs[high]++;ivs[low]--;
 }
 return ivs;
}
