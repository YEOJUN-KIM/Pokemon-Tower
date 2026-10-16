import Showdown from 'pokemon-showdown';
import type {Seed} from '../battle/run';
import type {NpcSample,LegacyNpcSample} from '../data/npc-samples';
import {npcRankTraining,npcTeamQualityRules,sampleRankWeights,drawNpcRank,type NpcRank,type NpcRankTraining} from '../data/npc-ranks';
import {CURRENT_PROGRESSION,type TowerProgression} from '../data/tower-progression';
import {allowsGimmick,type BattleRule} from '../data/run-rules';
import {megaStones,DYNAMAX_ITEM,canEquipGimmick} from '../data/gimmicks';
import {matchingZCrystals} from '../data/z-crystals';
import type {NpcGimmick} from '../data/npc-gimmicks';
import {encounterPool,normalOpponentSpecies,encounterRandom,selectNamedEntries,type OpponentEntry} from './opponent-team';
import {trainNpcTeam} from './npc-training';
import {statKeys} from '../data/training';

type EncounterBase={rank:NpcRank;floor:number;seed:Seed;team:OpponentEntry[];gimmick:NpcGimmick|null};
export type NpcEncounterSnapshotV1=EncounterBase&{version:1;sample:LegacyNpcSample;training:Omit<NpcRankTraining,'itemSlots'>};
export type NpcComposition={themeAvailable:number;themeRequired:number;themeUsed:number;fallback:boolean;candidateCount:number;itemSlots:number};
export type NpcEncounterSnapshotV2=EncounterBase&{version:2;sample:NpcSample;training:NpcRankTraining;composition:NpcComposition};
export type NpcEncounterSnapshot=NpcEncounterSnapshotV1|NpcEncounterSnapshotV2;

function equipRankGimmick(team:OpponentEntry[],rank:NpcRank,random:()=>number,rule:BattleRule,chance:number):NpcGimmick|null{
 if(rank==='normal'||rule==='basic'||random()>=chance)return null;
 const options:NpcGimmick[]=[];
 for(const entry of team){
  if(allowsGimmick(rule,'mega'))for(const item of Object.keys(megaStones))if(canEquipGimmick(entry.name,item))options.push({rule:'mega',species:entry.name,item});
  if(allowsGimmick(rule,'terastallize'))options.push({rule:'tera',species:entry.name});
  if(allowsGimmick(rule,'dynamax')&&canEquipGimmick(entry.name,DYNAMAX_ITEM))options.push({rule:'dynamax',species:entry.name,item:DYNAMAX_ITEM});
  if(allowsGimmick(rule,'zmove')){
   for(const item of matchingZCrystals(entry.name,entry.moves))options.push({rule:'z',species:entry.name,item});
  }
 }
 if(!options.length)return null;
 const selected=options[Math.floor(random()*options.length)],carrier=team.find(e=>e.name===selected.species)!;
 if(selected.item)carrier.item=selected.item;
 if(selected.rule==='tera')carrier.profile!.teraType=Showdown.Dex.species.get(carrier.name).types[0] as import('../data/tera').TeraType;
 if(selected.rule==='dynamax'&&Showdown.Dex.species.get(carrier.name).canGigantamax)carrier.gigantamax=true;
 return selected;
}

function weightedMembers(pool:readonly string[],count:number,rank:NpcRank,random:()=>number):string[]{
 let available=[...pool];const result:string[]=[],bias=npcTeamQualityRules[rank].bstBias;
 while(result.length<count&&available.length){
  const weighted=available.map(name=>({name,weight:Math.pow(statKeys.reduce((sum,key)=>sum+Showdown.Dex.species.get(name).baseStats[key],0)/500,bias)}));
  let ticket=random()*weighted.reduce((sum,e)=>sum+e.weight,0);
  const chosen=weighted.find(e=>(ticket-=e.weight)<0)??weighted.at(-1)!;
  result.push(chosen.name);available=available.filter(name=>name!==chosen.name);
 }
 return result;
}

// The pool is supplied explicitly so scarcity can be tested without widening the floor pool.
export function selectNpcMembers(pool:readonly string[],sample:NpcSample,rank:NpcRank,random:()=>number,rule:BattleRule='basic'){
 const ordinary=[...new Set(pool)];if(ordinary.length<3)throw Error('NPC floor pool requires three distinct species');
 const concept=sample.teamConcept;
 const matches=(name:string)=>concept.mode==='specialty'&&Showdown.Dex.species.get(name).types.some(type=>concept.types.includes(type));
 const themed=ordinary.filter(matches),requested=concept.mode==='specialty'?concept.requiredCount:0,required=Math.min(requested,themed.length);
 // A full specialty team never borrows a stronger off-theme partner, including for Mega.
 const allowed=required===3?themed:ordinary;
 const count=npcTeamQualityRules[rank].candidates;
 const candidates=weightedMembers(themed,Math.min(count,Math.max(required,rank==='normal'?required:count)),rank,random);
 const others=weightedMembers(allowed.filter(name=>!candidates.includes(name)),Math.max(0,count-candidates.length),rank,random);
 candidates.push(...others);
 let carrier:string|undefined;
 if(rank==='master'&&rule==='mega'){
  carrier=allowed.find(name=>Object.keys(megaStones).some(item=>canEquipGimmick(name,item)));
  if(carrier&&!candidates.includes(carrier))candidates.push(carrier);
 }
 const members=rank==='normal'&&concept.mode!=='competitive'?candidates.slice(0,3):selectNamedEntries(candidates,random,undefined,carrier,{accept:names=>names.filter(matches).length>=required,quality:rank==='normal'?undefined:rank,tactic:sample.tactic});
 // Shuffle the lead without changing the specialty count.
 if(rank==='normal')for(let i=members.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[members[i],members[j]]=[members[j],members[i]];}
 return {members,composition:{themeAvailable:themed.length,themeRequired:requested,themeUsed:members.filter(matches).length,fallback:themed.length<requested,candidateCount:candidates.length}};
}

export function generateNpcEncounter(floor:number,seed:Seed,sample:NpcSample,rank?:NpcRank,rule:BattleRule='basic',progression:TowerProgression=CURRENT_PROGRESSION):NpcEncounterSnapshotV2{
 const random=encounterRandom(seed);
 // Explicit ranks are reserved for fixtures/QA; live encounter draws use class weights.
 rank??=drawNpcRank(sampleRankWeights(sample,floor),random);
 const training=npcRankTraining(floor,rank);
 const ordinary=encounterPool(floor,progression).filter(normalOpponentSpecies);
 const selected=selectNpcMembers(ordinary,sample,rank,random,rule);
 const [minItems,maxItems]=training.itemSlots,itemSlots=minItems+Math.floor(random()*(maxItems-minItems+1));
 const team=trainNpcTeam(selected.members.map(name=>({name,moves:[]})),floor,'standard',sample.tactic,seed,rule,training,{itemSlots});
 // A gimmick replaces an equipped item's slot; Elite cannot gain a fourth budgeted slot.
 const equipped=team.filter(entry=>entry.item);
 const gimmick=equipRankGimmick(equipped,rank,random,rule,training.gimmickChance);
 return {version:2,sample:structuredClone(sample),rank,floor,seed:[...seed] as Seed,training,team,gimmick,composition:{...selected.composition,itemSlots}};
}
