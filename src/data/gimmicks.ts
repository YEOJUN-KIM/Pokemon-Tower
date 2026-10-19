import {zCrystals,canEquipZCrystal} from './z-crystals';
import {primalOrbs} from './primal-forms';
import megaItems from './mega-items.json' with {type:'json'};
import {canEquipFormItem,equipmentBase} from './form-items';
export const megaStones:Record<string,{name:string;species:string;forme:string;description:string;price:number;consumable:boolean}>=megaItems;
export type Gimmick='mega'|'dynamax'|'terastallize'|'zmove'|'ultra';
export const DYNAMAX_ITEM='Dynamax Band';
export function canEquipGimmick(species:string,item:string,forme?:string){
 if(!canEquipFormItem(species,item,forme))return false;
 if(item==='Ultranecrozium Z')return true;
 species=equipmentBase(species);
 if(primalOrbs[item])return species===primalOrbs[item].species;
 if(zCrystals[item])return canEquipZCrystal(species,item);
 const mega=megaStones[item];if(mega)return mega.species===species||item==='Zygardite'&&species==='Zygarde-10%';
 if(item===DYNAMAX_ITEM)return !['Zacian','Zamazenta','Eternatus'].includes(species);
 return true;
}
