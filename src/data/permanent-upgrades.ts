import type {StatBlock,IVGain} from './training';
import type {EggKind,RareEggCategory} from './egg-kinds';
export const permanentPrices={reroll:[500,1000],retry:[500,1000,1500],shiny:10000,egg:200} as const;
export const permanentResearch={
 allowance:{name:'출발 지원금',prices:[800,1600,2800],coins:[0,150,300,450]},
 eggFocus:{name:'알 탐색 연구',prices:[1000,2000,3500],weights:[50,55,60,65]},
} as const;
export type ResearchProduct=keyof typeof permanentResearch;
export type PermanentProduct='reroll'|'retry'|'shiny'|'egg'|ResearchProduct;
export type PermanentView={allowanceLevel?:number;startingCoins?:number;eggFocusLevel?:number;eggFocusWeight?:number;rewardEggTickets?:Partial<Record<'superRare'|'shiny',number>>;retryLimit:number;rerollLevel:number;rerollLimit:number;shinyTickets:number;eggTickets:number};
export const EGG_SHINY_ODDS=1024;
export type EggResult={eggKind?:EggKind;rareCategory?:RareEggCategory;species:string;ivs:StatBlock;isNew:boolean;ivGain:IVGain;newMoves:string[];shiny:boolean;newShiny:boolean};
export type PermanentResult={message:string;eggs?:EggResult[];eggKind?:EggKind};
