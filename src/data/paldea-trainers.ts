import design from '../../scripts/data/npc/paldea-design.json' with {type:'json'};
import type {TrainerSample,TrainerTactic} from './trainer-catalog';
export const paldeaTrainers=design.trainers;
export const paldeaTrainer=(id:string)=>paldeaTrainers.find(t=>t.id===id);
export function paldeaSample(t:(typeof paldeaTrainers)[number]):TrainerSample{
 return {id:t.id,name:t.name,title:t.category==='hidden'?'히든 보스':t.category==='event'?'이벤트 샘플':t.category==='champion'?'챔피언':t.category==='elite'?'사천왕':'체육관 관장',kind:'named',role:t.category==='gym'?'gym':t.category==='elite'?'elite':t.category==='event'?'villain':'champion',generation:9,specialty:t.specialty,tactic:t.tactic as TrainerTactic,portrait:t.id==='named-larry-elite'?'larry':t.id==='named-ai-sada'?'sada-ai':t.id==='named-ai-turo'?'turo-ai':t.id.slice(6),minFloor:t.minFloor,entries:t.entries,ace:t.ace,concept:t.concept,aiCeiling:t.aiCeiling as TrainerSample['aiCeiling']};
}
// Prepared for future event phases; never inserted into random encounter pools.
export const paldeaEventSamples=paldeaTrainers.filter(t=>t.category==='event').map(paldeaSample);
