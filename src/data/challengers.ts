import type {SavedChallengerDefinition as LegacySavedChallenger,ChallengerCandidate} from './legacy-challengers';
import {rankRewardProfiles} from './challenger-rewards';
import {npcSamples,npcTacticHints,type NpcSample,type LegacyNpcSample} from './npc-samples';
import {npcRankNames,sampleRankWeights,drawNpcRank,npcRankTraining,type NpcRank,type NpcRankTraining} from './npc-ranks';
import type {NpcEncounterSnapshot} from '../server/npc-encounters';
import type {RewardOption,RewardSelectionDefinition} from './rewards';

export type ChallengerDefinition=ChallengerCandidate&{rank:NpcRank;sample:NpcSample;training:NpcRankTraining;tactic:NpcSample['tactic'];specialty:string|null;kind:'normal';minFloor:number;weight:number;rewardProfile:NpcRank;rewardDefinition:RewardOption;selections?:readonly RewardSelectionDefinition[];rewardSnapshotVersion?:2;encounter?:NpcEncounterSnapshot};
export type SavedRankedChallengerDefinition=Omit<ChallengerDefinition,'sample'|'training'|'rewardProfile'>&{rewardProfile:NpcRank|'low'|'medium'|'high';sample:NpcSample|LegacyNpcSample;training:NpcRankTraining|Omit<NpcRankTraining,'itemSlots'>};
export type SavedChallengerDefinition=SavedRankedChallengerDefinition|LegacySavedChallenger;
export type {ChallengerCandidate};
export const challengerSettings={weight:20,minFloor:1} as const;
export function challengerDefinition(sample:NpcSample,rank:NpcRank,floor:number):ChallengerDefinition{
 const rewardProfile=rank;
 return {id:sample.id,trainerId:sample.id,title:sample.displayName,portrait:sample.portrait,difficulty:npcRankNames[rank],danger:rank==='normal'?1:rank==='elite'?2:3,battleStyle:npcTacticHints[sample.tactic],rewardPreview:rankRewardProfiles[rank].preview,rank,sample:structuredClone(sample),training:npcRankTraining(floor,rank),tactic:sample.tactic,specialty:sample.specialty,kind:'normal',minFloor:sample.minFloor,weight:sample.weight,rewardProfile,rewardDefinition:{id:'snapshot-pending',title:rankRewardProfiles[rank].preview,tone:rank==='master'?'great':'good',entries:[]}};
}
export function drawChallengers(floor:number,random:()=>number,pool:readonly NpcSample[]=npcSamples):ChallengerDefinition[]{
 let eligible=pool.filter(s=>s.pools.includes('challenger')&&s.minFloor<=floor&&s.weight>0);
 const result:ChallengerDefinition[]=[];
 while(result.length<3){
  if(!eligible.length)throw Error('At least three distinct eligible challenger classes are required');
  let ticket=random()*eligible.reduce((sum,s)=>sum+s.weight,0);
  const sample=eligible.find(s=>(ticket-=s.weight)<0)??eligible.at(-1)!;
  result.push(challengerDefinition(sample,drawNpcRank(sampleRankWeights(sample,floor,'challenger'),random),floor));
  eligible=eligible.filter(s=>s.id!==sample.id&&s.displayName!==sample.displayName);
 }
 return result;
}
export function challengerCandidate(definition:SavedChallengerDefinition):ChallengerCandidate{
 const {id,trainerId,title,difficulty,danger,battleStyle,rewardPreview,portrait}=definition;
 const rank='rank' in definition?definition.rank:danger===3?'master':danger===2?'elite':'normal';
 return {id,trainerId,title,difficulty,danger,battleStyle,rewardPreview:rankRewardProfiles[rank].preview,portrait};
}
