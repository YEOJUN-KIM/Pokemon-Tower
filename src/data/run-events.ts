import {challengerSettings,type ChallengerCandidate} from './challengers';
import {raidEventSettings,type RaidEventView} from './raids';
import {hiddenShopEventSettings,type HiddenShopView} from './hidden-shop';
import type {RewardResult,WeightedRewardOption} from './rewards';
// Initial tuning for the first non-combat encounter; amounts and odds live together.
export const mysteryChest = {encounterPercent:90,cooldownFloors:2,coinsPercent:80,coins:150,eggTickets:1} as const;
export type EventReward={kind:'coins'|'egg-ticket';amount:number};
export const merchantTicketPrice=300;
export type WeightedEventReward={weight:number;reward:EventReward};
export type EventChoice={id:string;label:string} & (
 | {outcome:'leave'}
 | {outcome:'raid'}
 | {outcome:'challenger';challengerId:string}
 | {outcome:'reward-result';cost:number;results:readonly WeightedRewardOption[]}
 | {outcome:'reward';cost:number;rewards:readonly WeightedEventReward[];message:string}
);
export type EventDefinition={
 title:string;summary:string;intro:string;weight:number;minFloor?:number;minRulesVersion?:number;choices:readonly EventChoice[];
};
export type RunEventRegistry=Readonly<Record<string,EventDefinition>>;
const leave={id:'skip',label:'지나간다',outcome:'leave'} as const;
export const eventDefinitions={
 'mystery-chest':{title:'길에서 발견한 상자',summary:'코인이나 알 뽑기권이 들어 있을지도 모른다.',intro:'길에서 작은 상자를 발견했다. 안쪽에서 달그락거리는 소리가 들린다. 열어볼까?',weight:50,choices:[{id:'open',label:'상자를 연다',outcome:'reward',cost:0,rewards:[{weight:mysteryChest.coinsPercent,reward:{kind:'coins',amount:mysteryChest.coins}},{weight:100-mysteryChest.coinsPercent,reward:{kind:'egg-ticket',amount:mysteryChest.eggTickets}}],message:'{reward}을 발견했다! {detail}'},leave]},
 'breeder-gift':{title:'브리더의 응원',summary:'브리더가 알 뽑기권 1장을 선물하려 한다.',intro:'길에서 만난 브리더가 손을 흔든다. “타워에 도전 중이군요! 새로운 친구를 만나는 데 이 뽑기권이 도움이 될 거예요.”',weight:30,choices:[{id:'open',label:'선물을 받는다',outcome:'reward',cost:0,rewards:[{weight:1,reward:{kind:'egg-ticket',amount:1}}],message:'브리더에게 알 뽑기권 1장을 받았다!'},leave]},
 'traveling-merchant':{title:'여행 상인의 제안',summary:`${merchantTicketPrice}코인으로 알 뽑기권 1장 구매.`,intro:`커다란 가방을 멘 상인이 말을 건넨다. “알 뽑기권 한 장을 ${merchantTicketPrice}코인에 드리지요. 필요하신가요?”`,weight:20,choices:[{id:'open',label:`${merchantTicketPrice}코인으로 산다`,outcome:'reward',cost:merchantTicketPrice,rewards:[{weight:1,reward:{kind:'egg-ticket',amount:1}}],message:`${merchantTicketPrice}코인을 내고 알 뽑기권 1장을 샀다! 알 뽑기에서 사용할 수 있다.`},leave]},
 'challenger-selection':{title:'도전자 선택전',summary:'상대와 보상을 살펴보고 도전할 트레이너를 고르자.',intro:'세 명의 도전자가 승부를 기다리고 있다. 돌아가도 괜찮다.',weight:challengerSettings.weight,minFloor:challengerSettings.minFloor,minRulesVersion:2,choices:[{id:'back',label:'돌아간다',outcome:'leave'}]},
 'hidden-shop':{title:'수상한 상인',summary:'희귀한 상품 중 무엇을 가져갈까? 구매 한도와 결제 재화를 확인하자.',intro:'“흔히 볼 수 없는 물건들이야.” 상인이 조용히 진열대를 펼쳤다.',weight:hiddenShopEventSettings.weight,minFloor:hiddenShopEventSettings.minFloor,minRulesVersion:hiddenShopEventSettings.minRulesVersion,choices:[{id:'leave',label:'나가기',outcome:'leave'}]},
 'raid-encounter':{title:'정체불명의 강적',summary:'강한 기척이 느껴진다.',intro:'강한 기척이 느껴진다.',...raidEventSettings,choices:[{id:'challenge',label:'도전한다',outcome:'raid'},leave]},
} as const satisfies RunEventRegistry;
// Initial v2 tuning only. The original table above remains frozen for v1 runs.
export const mysteryChestResults=[
 {weight:25,option:{id:'empty',title:'상자는 비어 있었다.',tone:'neutral',entries:[{kind:'message',text:'아무것도 얻지 못했다.'}]}},
 {weight:25,option:{id:'trap',title:'상자에서 함정이 발동했다!',tone:'loss',entries:[{kind:'coin-loss',percent:15}]}},
 {weight:15,option:{id:'coins',title:'전리품',tone:'good',entries:[{kind:'coins',amount:300}]}},
 {weight:15,option:{id:'ticket',title:'전리품',tone:'good',entries:[{kind:'egg-ticket',amount:1}]}},
 {weight:10,option:{id:'treasure',title:'상자에서 대박 보상을 발견했다!',tone:'great',entries:[{kind:'coins',amount:1000},{kind:'egg-ticket',amount:1}]}},
 {weight:10,option:{id:'tickets',title:'상자에서 대박 보상을 발견했다!',tone:'great',entries:[{kind:'egg-ticket',amount:3}]}},
] as const satisfies readonly WeightedRewardOption[];
export const currentEventRulesVersion=2;
const mysteryChestV2:EventDefinition={
 title:'미스터리 상자',summary:'보물일까, 함정일까? 코인을 잃거나 아무것도 얻지 못할 수도 있다.',
 intro:'길에서 수상한 상자를 발견했다. 보물이 들어 있을 수도 있지만, 코인을 잃는 함정일지도 모른다. 열어볼까?',
 weight:eventDefinitions['mystery-chest'].weight,
 choices:[{id:'open',label:'상자를 연다',outcome:'reward-result',cost:0,results:mysteryChestResults},leave],
};
export type RunEventKind=keyof typeof eventDefinitions;
export const eventKinds=Object.keys(eventDefinitions) as RunEventKind[];
export function isRunEventKind(value:unknown,registry:RunEventRegistry=eventDefinitions):value is string {
 return typeof value==='string' && Object.hasOwn(registry,value);
}
export function eventDefinition(kind:string,registry:RunEventRegistry=eventDefinitions,rulesVersion=1):EventDefinition|undefined {
 if(rulesVersion>=2 && kind==='mystery-chest' && registry===eventDefinitions)return mysteryChestV2;
 return isRunEventKind(kind,registry)?registry[kind]:undefined;
}
// Event IDs and choice IDs are content strings, validated against the registry on the server.
export type RunEventView={id:string;kind:string;choiceId?:string|null;rulesVersion?:number;result?:RewardResult;afterFloor:number;raid?:RaidEventView;challengers?:readonly ChallengerCandidate[];hiddenShop?:HiddenShopView;phase:'choice'|'battle'|'reward';reward:EventReward|null};

