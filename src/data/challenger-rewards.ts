import type {RewardOption,RewardSelectionDefinition} from './rewards';

export type ChallengerRewardProfile='low'|'medium'|'high';
export const challengerRewardProfiles:Record<ChallengerRewardProfile,{rewardDefinition:RewardOption;selections?:readonly RewardSelectionDefinition[]}>= {
 low:{rewardDefinition:{id:'challenger-low',title:'전투 보상',tone:'good',entries:[{kind:'coins',amount:300}]}},
 medium:{rewardDefinition:{id:'challenger-medium',title:'전투 보상',tone:'good',entries:[{kind:'coins',amount:700},{kind:'egg-ticket',amount:1}]}},
 high:{rewardDefinition:{id:'challenger-high',title:'전투 보상',tone:'great',entries:[{kind:'coins',amount:1000}]},selections:[{id:'bonus',title:'고급 추가 보상',candidates:[
  {id:'coins',label:'타워 코인 1,000',effects:[{kind:'coins',amount:1000}]},
  {id:'tickets',label:'알 뽑기권 3장',effects:[{kind:'egg-ticket',amount:3}]},
  {id:'mixed',label:'타워 코인 500 + 알 뽑기권 1장',effects:[{kind:'coins',amount:500},{kind:'egg-ticket',amount:1}]},
 ]}]},
};
