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
// Candidate metadata is for display. Requests send stable IDs; the server
// looks up persisted effects and commits payment with the selected ID.
export type RewardCandidate={id:string;label:string;description?:string};
// Trusted server snapshots only; never accepted from a client request.
export type RewardSelectionDefinition={id:string;title:string;candidates:readonly (RewardCandidate & {effects:readonly RewardEffect[]})[]};
export type RewardSelection={id:string;title:string;candidates:readonly RewardCandidate[]} & (
 | {state:'pending';selectedId?:never}
 | {state:'selected';selectedId:string}
);
export type RewardResult={optionId:string;title:string;tone:RewardTone;entries:readonly RewardEntry[];selections?:readonly RewardSelection[]};
export type WeightedRewardOption={weight:number;option:RewardOption};
