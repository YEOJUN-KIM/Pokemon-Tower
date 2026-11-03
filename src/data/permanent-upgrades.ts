import type {StatBlock,IVGain} from './training';
import {SHINY_CHARM_MAX} from './shiny-odds';
import type {EggKind,RareEggCategory} from './egg-kinds';
export const permanentPrices={reroll:[500,1000],retry:[500,1000,1500],shiny:10000,egg:200} as const;
export const permanentResearch={
 allowance:{name:'출발 지원금',prices:[800,1600,2800],coins:[0,150,300,450]},
} as const;
export type ResearchProduct=keyof typeof permanentResearch;
export type PermanentProduct='reroll'|'retry'|'shiny'|'egg'|ResearchProduct|'shinyCharm';
export type PermanentView={allowanceLevel?:number;startingCoins?:number;shinyCharmLevel?:number;shinyChance?:{egg:number;tower:number;scout:number};rewardEggTickets?:Partial<Record<'superRare'|'shiny',number>>;retryLimit:number;rerollLevel:number;rerollLimit:number;shinyTickets:number;eggTickets:number};
export const EGG_SHINY_ODDS=1024;
// Shiny charm: permanent multi-level upgrade. Odds per use live in shiny-odds.ts.
// icon: slot for a future image under public/ (null = use the built-in placeholder glyph).
export const shinyCharm={name:'빛나는 부적',icon:null as string|null,prices:[1500,3000,5000,8000,12000]} as const;
export {SHINY_CHARM_MAX};
export type EggResult={eggKind?:EggKind;rareCategory?:RareEggCategory;species:string;ivs:StatBlock;isNew:boolean;ivGain:IVGain;newMoves:string[];shiny:boolean;newShiny:boolean};
export type PermanentResult={message:string;eggs?:EggResult[];eggKind?:EggKind};
