import {normalNpcFloorRules} from './normal-mode-stages';
export type VillainCampaignRank='grunt'|'officer'|'executive'|'boss';
export type VillainTrackStage='grunt-1'|'grunt-2'|'officer'|'executive'|'boss';
// Initial tuning, validated by scripts/simulate-villain-campaigns.ts; not fixed encounter floors.
export const villainTrackSettings={base:5,increment:3,cap:35,minimumGap:3,bossGap:5} as const;
export const villainStageMinFloor={grunt:1,officer:25,executive:45,boss:normalNpcFloorRules.villainBoss} as const;
export const villainRewardSettings={gruntCoins:200,officerCoins:500,executiveCoins:900,bossCoins:2000,officerVitaminPercent:50,bossSuperRareTickets:1} as const;
type Stage={key:VillainTrackStage;rank:VillainCampaignRank;sampleId:string|null;missingName?:string};
const grunts=(id:string):Stage[]=>[{key:'grunt-1',rank:'grunt',sampleId:id},{key:'grunt-2',rank:'grunt',sampleId:id}];
const step=(key:'officer'|'executive'|'boss',sampleId:string|null,missingName?:string):Stage=>({key,rank:key,sampleId,...(missingName?{missingName}:{})});
export const villainCampaignTracks={
 rocket:{name:'로켓단',stages:[...grunts('rocket-grunt'),step('officer','named-ariana'),step('executive','named-archer'),step('boss','named-giovanni')]},
 magma:{name:'마그마단',stages:[...grunts('magma-grunt'),step('executive','magma-executive-tabitha'),step('boss','named-maxie')]},
 aqua:{name:'아쿠아단',stages:[...grunts('aqua-grunt'),step('executive','aqua-executive-shelly'),step('boss','named-archie')]},
 galactic:{name:'갤럭시단',stages:[...grunts('galactic-grunt'),step('officer','galactic-executive-mars'),step('executive','galactic-executive-jupiter'),step('boss','named-cyrus')]},
 plasma:{name:'플라스마단',stages:[...grunts('plasma-grunt'),step('executive','plasma-executive-colress'),step('boss','named-ghetsis')]},
 flare:{name:'플레어단',stages:[...grunts('flare-grunt'),step('officer','flare-executive-aliana'),step('executive','flare-executive-xerosic'),step('boss','named-lysandre')]},
 skull:{name:'스컬단 / 에테르재단',stages:[...grunts('skull-grunt'),step('officer','named-guzma'),step('executive','named-faba'),step('boss','named-lusamine')]},
 macrocosmos:{name:'매크로코스모스',stages:[...grunts('macrocosmos-grunt'),step('executive','named-oleana'),step('boss','named-rose')]},
} as const;
export type VillainOrganization=keyof typeof villainCampaignTracks;
export function isVillainOrganization(id:string):id is VillainOrganization{return Object.hasOwn(villainCampaignTracks,id);}
export function campaignStage(organization:VillainOrganization,index:number):Stage|undefined{return villainCampaignTracks[organization].stages[index];}
export function villainChance(failures:number){return Math.min(villainTrackSettings.cap,villainTrackSettings.base+failures*villainTrackSettings.increment);}
export function villainGap(next:Stage){return next.rank==='boss'?villainTrackSettings.bossGap:villainTrackSettings.minimumGap;}
export function villainTrackEligible(stage:Stage|undefined,floor:number,order:number,lastOrder:number|null){return !!stage&&!!stage.sampleId&&floor>=villainStageMinFloor[stage.rank]&&(lastOrder===null||order-lastOrder>=villainGap(stage));}
export function isVillainAmbush(stage:string){return stage==='rocket-ambush'||stage==='grunt-1'||stage==='grunt-2';}
export function villainStageText(organization:VillainOrganization,stage:VillainTrackStage){
 const name=villainCampaignTracks[organization].name;
 return stage==='grunt-1'?`${name}의 통신 기록을 확보했다.`:stage==='grunt-2'?`${name}의 거점 위치를 확인했다.`:stage==='officer'?organization==='skull'?'스컬단과 에테르재단의 연결을 확인했다.\n재단 내부로 이어지는 기록을 확보했다.':`${name}의 본부 단서를 확보했다.`:stage==='executive'?organization==='skull'?'자오보의 기록에서 루자미네의 위치를 확인했다.':`${name} 보스의 위치를 확인했다.`:`${name}의 활동을 저지했다.`;
}
