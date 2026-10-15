// Initial tuning for the first non-combat encounter; amounts and odds live together.
export const mysteryChest = {encounterPercent:10,cooldownFloors:2,coinsPercent:80,coins:150,eggTickets:1} as const;
export type EventReward={kind:'coins'|'egg-ticket';amount:number};
export const eventKinds=['mystery-chest','breeder-gift','traveling-merchant'] as const;
export type RunEventKind=typeof eventKinds[number];
export const merchantTicketPrice=300;
export const eventDefinitions={
 'mystery-chest':{title:'길에서 발견한 상자',summary:'코인이나 알 뽑기권이 들어 있을지도 모른다.',intro:'길에서 작은 상자를 발견했다. 안쪽에서 달그락거리는 소리가 들린다. 열어볼까?',accept:'상자를 연다',reward:'상자에서 선물을 발견했다!',weight:50},
 'breeder-gift':{title:'브리더의 응원',summary:'브리더가 알 뽑기권 1장을 선물하려 한다.',intro:'길에서 만난 브리더가 손을 흔든다. “타워에 도전 중이군요! 새로운 친구를 만나는 데 이 뽑기권이 도움이 될 거예요.”',accept:'선물을 받는다',reward:'브리더에게 알 뽑기권 1장을 받았다!',weight:30},
 'traveling-merchant':{title:'여행 상인의 제안',summary:`${merchantTicketPrice}코인으로 알 뽑기권 1장 구매.`,intro:`커다란 가방을 멘 상인이 말을 건넨다. “알 뽑기권 한 장을 ${merchantTicketPrice}코인에 드리지요. 필요하신가요?”`,accept:`${merchantTicketPrice}코인으로 산다`,reward:`${merchantTicketPrice}코인을 내고 알 뽑기권 1장을 샀다!`,weight:20},
} as const;
export type RunEventView={id:string;kind:RunEventKind;afterFloor:number;phase:'choice'|'reward';reward:EventReward|null};

