import type {RewardOption} from './rewards';

export type CampaignState={started:number;clues:number;officer_defeated:number;boss_location_known:number;boss_defeated:number;completed:number};
export const emptyCampaign:CampaignState={started:0,clues:0,officer_defeated:0,boss_location_known:0,boss_defeated:0,completed:0};
// Temporary manual QA: false restores all event candidates and the saved Raid override.
// Only affects the live registry; explicit test registries keep their own candidates.
export const villainEventTestSettings={onlyVillainEvents:true} as const;
// 임시값: 전체 이벤트 구현 완료 후 확률과 보상 재조정 예정.
export const rocketCampaignSettings={organization:'rocket',requiredClues:2,introMaxFloor:30,stages:{
 'rocket-intro':{weight:100,minFloor:1,coins:300,title:'열려 있는 관리 구역',summary:'잠겨 있어야 할 관리 구역의 문이 열려 있다.',intro:'관리 구역의 문이 열려 있다. 들어가 볼까?'},
 'rocket-ambush':{weight:100,minFloor:1,coins:100,title:'로켓단의 기습',summary:'로켓단 조직원이 앞을 가로막았다.',intro:'로켓단 조직원과 마주쳤다.'},
 'rocket-officer':{weight:100,minFloor:1,coins:500,title:'폐쇄된 보안 구역',summary:'통신 기록을 따라 로켓단 간부의 위치에 도착했다.',intro:'폐쇄된 보안 구역.\n로켓단 간부를 발견했다.'},
 'rocket-boss':{weight:100,minFloor:1,coins:1000,title:'로켓단의 임시 지휘실',summary:'타워 깊숙한 폐쇄 구역에서 비주기를 발견했다.',intro:'로켓단의 임시 지휘실.\n비주기를 발견했다.'},
}} as const;
export type RocketStage=keyof typeof rocketCampaignSettings.stages;
export function isRocketStage(kind:string):kind is RocketStage{return Object.hasOwn(rocketCampaignSettings.stages,kind);}
export function campaignEligible(kind:RocketStage,state:CampaignState,floor:number){
 if(state.completed)return false;
 switch(kind){
  case 'rocket-intro':return !state.started&&floor<=rocketCampaignSettings.introMaxFloor;
  case 'rocket-ambush':return !!state.started&&state.clues<rocketCampaignSettings.requiredClues;
  case 'rocket-officer':return !!state.started&&state.clues>=rocketCampaignSettings.requiredClues&&!state.officer_defeated;
  case 'rocket-boss':return !!state.officer_defeated&&!!state.boss_location_known&&!state.boss_defeated;
 }
}
export function campaignRewardTitle(kind:RocketStage,clues:number){
 switch(kind){
  case 'rocket-intro':return '로켓단의 아지트에서 물품을 발견했다. 앞으로 로켓단을 마주칠 것 같은 느낌이 든다.';
  case 'rocket-ambush':return `통신 기록 확보 · 단서 ${clues} / ${rocketCampaignSettings.requiredClues}`;
  case 'rocket-officer':return '비주기의 위치를 확인했다.';
  case 'rocket-boss':return '로켓단 캠페인 완료.';
 }
}
export function campaignReward(kind:RocketStage,clues:number):RewardOption{
 return {id:kind,title:campaignRewardTitle(kind,clues),tone:'good',entries:[{kind:'coins',amount:rocketCampaignSettings.stages[kind].coins}]};
}
