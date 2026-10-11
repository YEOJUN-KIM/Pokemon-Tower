import megaItems from './mega-items.json' with {type:'json'};
export const megaStones:Record<string,{name:string;species:string;forme:string;description:string;price:number;consumable:boolean}>=megaItems;
export type Gimmick='mega'|'dynamax'|'terastallize';
export const DYNAMAX_ITEM='Dynamax Band';
export function canEquipGimmick(species:string,item:string){
 const mega=megaStones[item];if(mega)return mega.species===species;
 if(item===DYNAMAX_ITEM)return !['Zacian','Zamazenta','Eternatus'].includes(species);
 return true;
}
