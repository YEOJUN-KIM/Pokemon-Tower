import type {StatBlock,IVGain} from './training';
import type {EggKind,RareEggCategory} from './egg-kinds';
export const permanentPrices={reroll:[500,1000],retry:[500,1000,1500],shiny:10000,egg:200} as const;
export type PermanentProduct='reroll'|'retry'|'shiny'|'egg';
export type PermanentView={retryLimit:number;rerollLevel:number;rerollLimit:number;shinyTickets:number;eggTickets:number};
export const EGG_SHINY_ODDS=1024;
export type EggResult={eggKind?:EggKind;rareCategory?:RareEggCategory;species:string;ivs:StatBlock;isNew:boolean;ivGain:IVGain;newMoves:string[];shiny:boolean;newShiny:boolean};
export type PermanentResult={message:string;eggs?:EggResult[];eggKind?:EggKind};
