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
export type RewardResult={optionId:string;title:string;tone:RewardTone;entries:readonly RewardEntry[]};
export type WeightedRewardOption={weight:number;option:RewardOption};
