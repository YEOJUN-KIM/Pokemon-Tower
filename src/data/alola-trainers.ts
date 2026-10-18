import design from '../../scripts/data/npc/alola-design.json' with {type:'json'};
import type {TrainerSample,TrainerTactic} from './trainer-catalog';

export const alolaTrainers=design.trainers;
export const alolaTrainer=(id:string)=>alolaTrainers.find(t=>t.id===id);
export const alolaVillainSequence=['skull-grunt','named-guzma','aether-grunt','named-faba','named-lusamine'] as const;
// Reviewed aliases removed from the source; legacy saved snapshots remain intact.
export const alolaScopeIds=new Set([...alolaTrainers.map(t=>t.id),'named-acerola-captain','skull-executive-plumeria','skull-boss-guzma','aether-executive-faba','aether-boss-lusamine']);
export function alolaSample(t:(typeof alolaTrainers)[number]):TrainerSample {
 const role=t.category==='captain'||t.category==='kahuna'?'gym':t.category==='grunt'||t.category==='executive'||t.category==='boss'?'villain':t.category as 'elite'|'champion';
 const titles:Record<string,string>={captain:'캡틴',kahuna:'섬의 왕',elite:'사천왕',champion:'리그 최종 상대',grunt:'조직원',executive:'간부',boss:'최종 보스'};
 return {id:t.id,name:t.name,title:t.category==='grunt'?(t.id==='skull-grunt'?'스컬단':'에테르재단'):titles[t.category]!,kind:t.category==='grunt'?'normal':'named',role,generation:7,specialty:t.specialty,tactic:t.tactic as TrainerTactic,portrait:t.id==='skull-grunt'?'skullgrunt':t.id==='aether-grunt'?'aetherfoundation':t.id.slice(6),minFloor:t.minFloor,entries:t.entries,ace:t.category==='grunt'?undefined:t.ace,concept:t.concept,aiCeiling:t.aiCeiling as TrainerSample['aiCeiling']};
}
