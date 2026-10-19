import items from './z-crystals.json' with {type:'json'};
import {moveInfo} from './move-info';
export type ZCrystal={name:string;type:string;users?:string[];from?:string;move?:string;description:string;price:number;consumable:boolean};
export const zCrystals:Record<string,ZCrystal>={...items,'Ultranecrozium Z':{name:'울트라네크로Z',type:'Psychic',users:['Necrozma-Dusk-Mane','Necrozma-Dawn-Wings','Necrozma-Ultra'],from:'Photon Geyser',move:'Light That Burns the Sky',description:'합체 네크로즈마의 울트라버스트와 전용 Z기술에 사용하는 도구입니다.',price:5000,consumable:false}};
export function canEquipZCrystal(species:string,item:string){return !zCrystals[item]?.users || zCrystals[item].users!.includes(species);}
export function matchingZCrystals(species:string,moves:string[]){return Object.keys(zCrystals).filter(item=>canEquipZCrystal(species,item) && (zCrystals[item].from ? moves.includes(zCrystals[item].from!) : moves.some(move=>moveInfo[move]?.type===zCrystals[item].type)));}
