import design from '../../scripts/data/npc/galar-design.json' with {type:'json'};
import type {TrainerSample,TrainerTactic} from './trainer-catalog';
export const galarTrainers=design.trainers;
export function galarTrainer(id:string){
 const canonical=id.startsWith('macrocosmos-executive-')?'named-oleana':id.startsWith('macrocosmos-boss-')?'named-rose':id;
 return galarTrainers.find(t=>t.id===canonical);
}
export function galarSample(t:(typeof galarTrainers)[number]):TrainerSample{
 const villain=['grunt','executive','boss'].includes(t.category);
 return {id:t.id,name:t.name,title:t.category==='grunt'?'매크로코스모스':t.category==='executive'?'간부':t.category==='boss'?'보스':t.category==='champion'?'챔피언':'체육관 관장',kind:t.category==='grunt'?'normal':'named',role:villain?'villain':t.category==='champion'?'champion':'gym',generation:8,specialty:t.specialty,tactic:t.tactic as TrainerTactic,portrait:t.category==='grunt'?'officeworker':t.id.slice(6),minFloor:t.minFloor,entries:t.entries,ace:t.category==='grunt'?undefined:t.ace,concept:t.concept,aiCeiling:t.aiCeiling as TrainerSample['aiCeiling']};
}
