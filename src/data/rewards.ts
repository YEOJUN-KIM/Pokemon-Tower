// Options describe effects; results record the exact effects already applied.
export type RewardEffect=
 | {kind:'coins'|'egg-ticket';amount:number}
 | {kind:'coin-loss';percent:number}
 | {kind:'message';text:string};
export type RewardEntry=
 | {kind:'coins'|'egg-ticket';amount:number}
 | {kind:'coin-loss';amount:number;percent:number}
 | {kind:'message';text:string};
export type RewardTone='neutral'|'loss'|'good'|'great';
export type RewardOption={id:string;title:string;tone:RewardTone;entries:readonly RewardEffect[]};
// Candidate metadata is for display. Future requests send stable IDs; the
// server must look up effects and persist the selected ID before granting.
export type RewardCandidate={id:string;label:string;description?:string};
export type RewardSelection={id:string;title:string;candidates:readonly RewardCandidate[]} & (
 | {state:'pending';selectedId?:never}
 | {state:'selected';selectedId:string}
);
export type RewardResult={optionId:string;title:string;tone:RewardTone;entries:readonly RewardEntry[];selections?:readonly RewardSelection[]};
export type WeightedRewardOption={weight:number;option:RewardOption};
