import Showdown from 'pokemon-showdown';
import {equipmentBase,equipmentFormSpecies,formItems,heldForm} from './form-items';
// Normalize the complete set before validation and packing, never the running simulator.
export function equippedFormSet<T extends {species:string;item:string;ability:string;moves:string[];teraType?:string}>(set:T):T{
 if(set.item==='Zygardite'&&['Zygarde','Zygarde-10%'].includes(set.species))return {...set,ability:'Power Construct'};
 const base=equipmentBase(set.species);if(!equipmentFormSpecies.has(base))return set;
 const species=heldForm(base,set.item),native=Showdown.Dex.species.get(species);
 const itemData=formItems[set.item]?.species===base?formItems[set.item]:undefined;
 const result={...set,species,ability:itemData?.ability??Showdown.Dex.species.get(base).abilities[0]};
 if(base==='Ogerpon')result.teraType=formItems[set.item]?.type??'Grass';
 if(base==='Zacian'||base==='Zamazenta')result.moves=set.moves.map(m=>['Iron Head','Behemoth Blade','Behemoth Bash'].includes(m)?set.item===(base==='Zacian'?'Rusted Sword':'Rusted Shield')?(base==='Zacian'?'Behemoth Blade':'Behemoth Bash'):'Iron Head':m);
 if(!native.exists)throw Error('Unknown equipped form');
 return result;
}
