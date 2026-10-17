import type {RunEventKind} from '../data/run-events';

type EventPresentation={artwork:'chest'}|{artwork:'teleport'}|{artwork:'raid'}|{artwork:'trainer';sprite:string;alt:string};

// React components stay in web; content and game rules never import this registry.
export const eventPresentation={
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
