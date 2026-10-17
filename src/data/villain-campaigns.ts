import type {RewardOption} from './rewards';

export type CampaignState={started:number;clues:number;officer_defeated:number;boss_location_known:number;boss_defeated:number;completed:number};
export const emptyCampaign:CampaignState={started:0,clues:0,officer_defeated:0,boss_location_known:0,boss_defeated:0,completed:0};
// 임시값: 전체 이벤트 구현 완료 후 확률과 보상 재조정 예정.
export const rocketCampaignSettings={organization:'rocket',requiredClues:2,introMaxFloor:30,stages:{
 'rocket-intro':{weight:100,minFloor:1,coins:300,title:'열려 있는 관리 구역',summary:'잠겨 있어야 할 관리 구역의 문이 열려 있다.',intro:'타워를 이동하던 중, 관리 구역의 열린 문을 발견했다. 안쪽에서 사람들의 목소리와 기계음이 들린다. 들어가 볼까?'},
 'rocket-ambush':{weight:100,minFloor:1,coins:100,title:'로켓단의 기습',summary:'“잠깐!” 누군가 앞을 가로막았다.',intro:'로켓단 조직원: “찾았다! 우리 시설을 턴 녀석이 바로 너지?”'},
 'rocket-officer':{weight:100,minFloor:1,coins:500,title:'폐쇄된 보안 구역',summary:'통신 기록을 따라 로켓단 간부의 위치에 도착했다.',intro:'평소에는 접근할 수 없는 타워 보안 구역. 안쪽에서 익숙한 문양이 보인다. 로켓단 간부: “여기까지 찾아오다니 제법이군. 하지만 이 이상은 보내줄 수 없다.”'},
 'rocket-boss':{weight:100,minFloor:1,coins:1000,title:'로켓단의 임시 지휘실',summary:'타워 깊숙한 폐쇄 구역에서 비주기를 발견했다.',intro:'비주기: “내 부하들을 계속 방해한 녀석이 자네인가. 로켓단의 일에 손을 댄 이상, 그냥 돌아갈 수 있을 거라 생각하지는 않았겠지.”'},
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
export function campaignReward(kind:RocketStage,clues:number):RewardOption{
 const title=kind==='rocket-intro'?'“칫… 이건 그냥 넘어갈 일이 아니라고!” 조직원이 떠난 뒤 로켓단의 물품을 발견했다. “침입자가 물품까지 가져갔다고? 얼굴을 기억해 둬.” 로켓단의 표적이 되었다. === 로켓단 캠페인 시작 ===':kind==='rocket-ambush'?clues<2?'“간부님한테 뭐라고 보고하지…” 도망친 조직원이 떨어뜨린 통신 기록을 발견했다. 단서 1 / 2':'보안 카드와 통신 기록을 발견했다. 단서 2 / 2. 로켓단 간부가 타워의 폐쇄 구역을 사용하고 있다.':kind==='rocket-officer'?'“이 정도까지 쫓아올 줄은 몰랐군…” 단말기에서 임시 지휘실의 기록을 발견했다. 비주기의 위치를 알아냈다.':'비주기: “…흥미롭군. 오늘은 물러나도록 하지.” 조직원들이 시설을 빠져나갔다. 로켓단의 활동을 저지했다. === 로켓단 캠페인 완료 ===';
 return {id:kind,title,tone:'good',entries:[{kind:'coins',amount:rocketCampaignSettings.stages[kind].coins}]};
}
