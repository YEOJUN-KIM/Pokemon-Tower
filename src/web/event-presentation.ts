import type {RunEventKind} from '../data/run-events';
import type {RunEventView} from '../data/run-events';

export type RewardRevealPresentation={message:string;action:string;object:'chest'|'drop'|'gift'|'sparkle'};
const rewardRevealPresentations={
 exploration:{message:'근처에서 보물상자를 발견했다!',action:'열어보기',object:'chest'},
 raid:{message:'쓰러진 포켓몬이 무언가를 떨어뜨렸다!',action:'확인하기',object:'drop'},
 npc:{message:'승리의 대가로 특별한 물건을 받았다!',action:'확인하기',object:'gift'},
 rare:{message:'반짝이는 무언가가 떨어져 있다...',action:'살펴보기',object:'sparkle'},
} as const satisfies Record<string,RewardRevealPresentation>;
export function rewardRevealPresentation(event:RunEventView):RewardRevealPresentation{
 return rewardRevealPresentations[event.raid?'raid':event.hiddenBoss?'rare':event.villain||event.challengers||['breeder-gift','traveling-merchant'].includes(event.kind)?'npc':'exploration'];
}

type EventPresentation={artwork:'chest'}|{artwork:'teleport'}|{artwork:'raid'}|{artwork:'trainer';sprite:string;alt:string};

// React components stay in web; content and game rules never import this registry.
export const eventPresentation={
 'villain-campaign':{artwork:'trainer',sprite:'rocketgrunt',alt:'조직원'},
 'hidden-boss':{artwork:'trainer',sprite:'red',alt:'히든보스'},
 'rocket-intro':{artwork:'trainer',sprite:'rocketgrunt',alt:'로켓단 조직원'},
 'rocket-ambush':{artwork:'trainer',sprite:'rocketgrunt',alt:'로켓단 조직원'},
 'rocket-officer':{artwork:'trainer',sprite:'archer',alt:'로켓단 간부'},
 'rocket-boss':{artwork:'trainer',sprite:'giovanni',alt:'비주기'},
 'random-teleport':{artwork:'teleport'},
 'raid-encounter':{artwork:'raid'},
 'challenger-selection':{artwork:'trainer',sprite:'acetrainer-gen4',alt:'도전자'},
 'mystery-chest':{artwork:'chest'},
 'breeder-gift':{artwork:'trainer',sprite:'aromalady-gen4',alt:'브리더'},
 'traveling-merchant':{artwork:'trainer',sprite:'hiker-gen4',alt:'여행 상인'},
 'hidden-shop':{artwork:'trainer',sprite:'hiker-gen4',alt:'수상한 상인'},
} as const satisfies Record<RunEventKind,EventPresentation>;

export function getEventPresentation(kind:string):EventPresentation|undefined {
 return Object.hasOwn(eventPresentation,kind)?eventPresentation[kind as RunEventKind]:undefined;
}
