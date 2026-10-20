import type {RewardOption,RewardSelectionDefinition} from './rewards';

// Rank reward tuning is independent of NPC samples and battle training.
export const rankRewardProfiles={
 normal:{preview:'소소한 보상',pool:[{id:'coins',weight:70},{id:'eggs',weight:30}],coins:300},
 elite:{preview:'희귀한 보상',pool:[{id:'coins',weight:30},{id:'eggs',weight:25},{id:'vitamins',weight:15},{id:'growth',weight:10},{id:'epic',weight:8},{id:'machine',weight:12}],coins:1500,eggMin:1,eggMax:2,vitaminMin:1,vitaminMax:2,growth:120},
 master:{preview:'특별한 보상',categories:['eggs','growth','equipment'],selectionCount:3,eggs:[{id:'normal',weight:60},{id:'superRare',weight:35},{id:'shiny',weight:5}],tickets:3,growth:500,equipmentFallback:500,equipmentFallbackCoins:2500},
} as const;
export type RankRewardSnapshot={rewardSnapshotVersion:2;rewardDefinition:RewardOption;selections?:readonly RewardSelectionDefinition[]};
