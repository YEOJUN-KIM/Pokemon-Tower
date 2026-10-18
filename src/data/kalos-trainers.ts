import design from '../../scripts/data/npc/kalos-design.json' with {type:'json'};
import type {TrainerTactic} from './trainer-catalog';

export type KalosTrainer={id:string;name:string;category:'gym'|'elite'|'champion'|'grunt'|'executive'|'boss';power:string;ace:string;entries:string[];mega:string|null;concept:string;tactic:TrainerTactic;aiCeiling:'tactical'|'expert'};
export const kalosTrainers=design.trainers as KalosTrainer[];
export const kalosTrainer=(id:string)=>kalosTrainers.find(t=>t.id===id);
