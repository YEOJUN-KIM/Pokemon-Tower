import type {StatBlock,IVGain} from './training';
export const permanentPrices={reroll:[500,1000],shiny:10000,egg:200} as const;
export type PermanentProduct='reroll'|'shiny'|'egg';
export type PermanentView={rerollLevel:number;rerollLimit:number;shinyTickets:number;eggTickets:number};
export const EGG_SHINY_ODDS=1024;
export type EggResult={species:string;ivs:StatBlock;isNew:boolean;ivGain:IVGain;newMoves:string[];shiny:boolean;newShiny:boolean};
export type PermanentResult={message:string;eggs?:EggResult[]};
