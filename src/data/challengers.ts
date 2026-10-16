import type {SavedChallengerDefinition as LegacySavedChallenger,ChallengerCandidate} from './legacy-challengers';
import {challengerRewardProfiles as rewards} from './challenger-rewards';
import {npcSamples,npcTacticHints,type NpcSample} from './npc-samples';
import {npcRankNames,challengerRankWeights,drawNpcRank,npcRankTraining,type NpcRank,type NpcRankTraining} from './npc-ranks';
import type {NpcEncounterSnapshot} from '../server/npc-encounters';
import type {RewardOption,RewardSelectionDefinition} from './rewards';

export type ChallengerDefinition=ChallengerCandidate&{rank:NpcRank;sample:NpcSample;training:NpcRankTraining;tactic:NpcSample['tactic'];specialty:string|null;kind:'normal';minFloor:number;weight:number;rewardProfile:'low'|'medium'|'high';rewardDefinition:RewardOption;selections?:readonly RewardSelectionDefinition[];encounter?:NpcEncounterSnapshot};
export type SavedChallengerDefinition=ChallengerDefinition|LegacySavedChallenger;
export type {ChallengerCandidate};
export const challengerSettings={weight:20,minFloor:1} as const;
export function challengerDefinition(sample:NpcSample,rank:NpcRank,floor:number):ChallengerDefinition{
 const rewardProfile=rank==='normal'?'low':rank==='elite'?'medium':'high';
 return {id:sample.id,trainerId:sample.id,title:sample.displayName,portrait:sample.portrait,difficulty:npcRankNames[rank],danger:rank==='normal'?1:rank==='elite'?2:3,battleStyle:npcTacticHints[sample.tactic],rewardPreview:rewardProfile==='low'?'타워 코인 300':rewardProfile==='medium'?'타워 코인 700 · 알 뽑기권 1장':'타워 코인 1,000 · 추가 보상 3개 중 1개',rank,sample:structuredClone(sample),training:npcRankTraining(floor,rank),tactic:sample.tactic,specialty:sample.specialty,kind:'normal',minFloor:sample.minFloor,weight:sample.weight,rewardProfile,...structuredClone(rewards[rewardProfile])};
}
export function drawChallengers(floor:number,random:()=>number,pool:readonly NpcSample[]=npcSamples):ChallengerDefinition[]{
 let eligible=pool.filter(s=>s.pools.includes('challenger')&&s.minFloor<=floor&&s.weight>0);
 const result:ChallengerDefinition[]=[];
 while(result.length<3){
  if(!eligible.length)throw Error('At least three distinct eligible challenger classes are required');
  let ticket=random()*eligible.reduce((sum,s)=>sum+s.weight,0);
  const sample=eligible.find(s=>(ticket-=s.weight)<0)??eligible.at(-1)!;
  result.push(challengerDefinition(sample,drawNpcRank(challengerRankWeights,random),floor));
  eligible=eligible.filter(s=>s.id!==sample.id&&s.displayName!==sample.displayName);
 }
 return result;
}
export function challengerCandidate(definition:SavedChallengerDefinition):ChallengerCandidate{
 const {id,trainerId,title,difficulty,danger,battleStyle,rewardPreview,portrait}=definition;
 return {id,trainerId,title,difficulty,danger,battleStyle,rewardPreview,portrait};
}
