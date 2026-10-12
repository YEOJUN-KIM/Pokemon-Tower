import items from './z-crystals.json' with {type:'json'};
import {moveInfo} from './move-info';
export type ZCrystal={name:string;type:string;users?:string[];from?:string;move?:string;description:string;price:number;consumable:boolean};
export const zCrystals:Record<string,ZCrystal>=items;
export function canEquipZCrystal(species:string,item:string){return !zCrystals[item]?.users || zCrystals[item].users!.includes(species);}
export function matchingZCrystals(species:string,moves:string[]){return Object.keys(zCrystals).filter(item=>canEquipZCrystal(species,item) && (zCrystals[item].from ? moves.includes(zCrystals[item].from!) : moves.some(move=>moveInfo[move]?.type===zCrystals[item].type)));}
