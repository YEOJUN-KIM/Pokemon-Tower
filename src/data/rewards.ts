import type {StatKey} from './training';
import type {TrainerEquipment} from './trainer-equipment';
export type InventoryReward=
 | {kind:'growth-points';amount:number}
 | {kind:'vitamin';stat:StatKey;amount:number}
 | {kind:'item-exchange';items:readonly string[];amount:number;fallbackCoins:number;direct?:true}
 | {kind:'machine';move:string;amount:number;fallbackCoins?:number}
 | {kind:'trainer-equipment';item:TrainerEquipment;amount:number;fallbackPoints:number}
 | {kind:'typed-egg-ticket';eggKind:'superRare'|'shiny';amount:number};
// Options describe effects; results record the exact effects already applied.
export type RewardEffect= InventoryReward
 | {kind:'pokemon-enhancement';mode:'one-iv'|'six-iv'|'shiny';species:string;stat?:StatKey;amount:number}
 | {kind:'coins'|'egg-ticket';amount:number}
 | {kind:'coin-loss';percent:number}
 | {kind:'message';text:string};
export type RewardEntry= InventoryReward
 | Extract<RewardEffect,{kind:'pokemon-enhancement'}>
 | {kind:'coins'|'egg-ticket';amount:number}
 | {kind:'coin-loss';amount:number;percent:number}
 | {kind:'message';text:string};
export type RewardTone='neutral'|'loss'|'good'|'great';
export type RewardOption={id:string;title:string;tone:RewardTone;entries:readonly RewardEffect[]};
// Candidate metadata is for display. Requests send stable IDs; the server
// looks up persisted effects and commits payment with the selected ID.
export type RewardCandidate={id:string;label:string;description?:string;species?:string;stat?:StatKey};
// Trusted server snapshots only; never accepted from a client request.
export type RewardSelectionDefinition={id:string;title:string;expanded?:boolean;targetMode?:'one-iv'|'six-iv'|'shiny';candidates:readonly (RewardCandidate & {effects:readonly RewardEffect[]})[]};
export type RewardSelection={id:string;title:string;expanded?:boolean;targetMode?:RewardSelectionDefinition['targetMode'];candidates:readonly RewardCandidate[]} & (
 | {state:'pending';selectedId?:never}
 | {state:'selected';selectedId:string}
);
export type RewardResult={optionId:string;title:string;tone:RewardTone;entries:readonly RewardEntry[];selections?:readonly RewardSelection[]};
export type WeightedRewardOption={weight:number;option:RewardOption};
