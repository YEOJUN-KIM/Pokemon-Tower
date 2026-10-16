// Initial tuning for the first non-combat encounter; amounts and odds live together.
export const mysteryChest = {encounterPercent:10,cooldownFloors:2,coinsPercent:80,coins:150,eggTickets:1} as const;
export type EventReward={kind:'coins'|'egg-ticket';amount:number};
export const merchantTicketPrice=300;
export type WeightedEventReward={weight:number;reward:EventReward};
export type EventChoice={id:string;label:string} & (
 | {outcome:'leave'}
 | {outcome:'reward';cost:number;rewards:readonly WeightedEventReward[];message:string}
);
export type EventDefinition={
 title:string;summary:string;intro:string;weight:number;choices:readonly EventChoice[];
};
export type RunEventRegistry=Readonly<Record<string,EventDefinition>>;
const leave={id:'skip',label:'지나간다',outcome:'leave'} as const;
export const eventDefinitions={
 'mystery-chest':{title:'길에서 발견한 상자',summary:'코인이나 알 뽑기권이 들어 있을지도 모른다.',intro:'길에서 작은 상자를 발견했다. 안쪽에서 달그락거리는 소리가 들린다. 열어볼까?',weight:50,choices:[{id:'open',label:'상자를 연다',outcome:'reward',cost:0,rewards:[{weight:mysteryChest.coinsPercent,reward:{kind:'coins',amount:mysteryChest.coins}},{weight:100-mysteryChest.coinsPercent,reward:{kind:'egg-ticket',amount:mysteryChest.eggTickets}}],message:'{reward}을 발견했다! {detail}'},leave]},
 'breeder-gift':{title:'브리더의 응원',summary:'브리더가 알 뽑기권 1장을 선물하려 한다.',intro:'길에서 만난 브리더가 손을 흔든다. “타워에 도전 중이군요! 새로운 친구를 만나는 데 이 뽑기권이 도움이 될 거예요.”',weight:30,choices:[{id:'open',label:'선물을 받는다',outcome:'reward',cost:0,rewards:[{weight:1,reward:{kind:'egg-ticket',amount:1}}],message:'브리더에게 알 뽑기권 1장을 받았다! 알 뽑기에서 사용할 수 있다.'},leave]},
 'traveling-merchant':{title:'여행 상인의 제안',summary:`${merchantTicketPrice}코인으로 알 뽑기권 1장 구매.`,intro:`커다란 가방을 멘 상인이 말을 건넨다. “알 뽑기권 한 장을 ${merchantTicketPrice}코인에 드리지요. 필요하신가요?”`,weight:20,choices:[{id:'open',label:`${merchantTicketPrice}코인으로 산다`,outcome:'reward',cost:merchantTicketPrice,rewards:[{weight:1,reward:{kind:'egg-ticket',amount:1}}],message:`${merchantTicketPrice}코인을 내고 알 뽑기권 1장을 샀다! 알 뽑기에서 사용할 수 있다.`},leave]},
} as const satisfies RunEventRegistry;
export type RunEventKind=keyof typeof eventDefinitions;
export const eventKinds=Object.keys(eventDefinitions) as RunEventKind[];
export function isRunEventKind(value:unknown,registry:RunEventRegistry=eventDefinitions):value is string {
 return typeof value==='string' && Object.hasOwn(registry,value);
}
export function eventDefinition(kind:string,registry:RunEventRegistry=eventDefinitions):EventDefinition|undefined {
 return isRunEventKind(kind,registry)?registry[kind]:undefined;
}
// Event IDs and choice IDs are content strings, validated against the registry on the server.
export type RunEventView={id:string;kind:string;choiceId?:string|null;afterFloor:number;phase:'choice'|'reward';reward:EventReward|null};

