import Showdown from 'pokemon-showdown';
import {pokemonSets} from '../data/teams';
import {species} from '../web/catalog';
import type {PokedexEntry,PokemonFormPreview} from '../web/pokedex-data';
import nationalDex from '../data/pokedex.json' with {type:'json'};
import {evioliteSpecies} from '../data/pokedex-roster';
import megaForms from '../data/mega-preview-forms.json' with {type:'json'};
import gigantamaxForms from '../data/gigantamax-forms.json' with {type:'json'};
import {moveTypeNames} from '../data/move-info';

function formPreviews(name:string,displayName:string):PokemonFormPreview[]{
 const data=Showdown.Dex.species.get(name);
 const names=[...(data.otherFormes??[]).filter(form=>form.includes('-Mega')),...(data.canGigantamax?[data.name+'-Gmax']:[])];
 return names.flatMap(name=>{
  const form=Showdown.Dex.species.get(name),kind=name.endsWith('-Gmax')?'gigantamax' as const:'mega' as const;
  const source=kind==='mega'?(megaForms as Record<string,{spriteKey:string}>)[name]:(gigantamaxForms as Record<string,{spriteKey:string}>)[name];
  if(!source||!form.exists)return [];
  return [{species:form.name,name:kind==='mega'?'메가'+displayName+(name.match(/-Mega-([XYZ])$/)?.[1]??''):'거다이맥스 '+displayName,kind,spriteKey:source.spriteKey,types:form.types.map(type=>moveTypeNames[type]??type),baseStats:{...form.baseStats},ability:form.abilities[0]}];
 });
}

export function pokedexEntries():PokedexEntry[] {
  const playable=new Map(Object.entries(pokemonSets).map(([name,set])=>[species[name].id,{name,set}]));
  // Preserve existing playable species (including Pikachu) and their saved accounts.
  return nationalDex.filter(entry=>playable.has(entry.id) || evioliteSpecies.has(entry.species)
    || !Showdown.Dex.species.get(entry.aliases[0]).nfe).map(entry=>{
    const available=playable.get(entry.id);
    if(!available)return {...entry,forms:formPreviews(entry.aliases[0],entry.name),baseStats:{...Showdown.Dex.species.get(entry.aliases[0]).baseStats},moves:[],level:50,battleReady:false};
    const {name,set}=available,data=Showdown.Dex.species.get(name);
    return {...entry,forms:formPreviews(name,species[name].name),baseStats:{...data.baseStats},species:name,name:species[name].name,types:species[name].types,
      ability:set.ability,moves:set.moves,level:set.level,battleReady:true,
      canMega:data.otherFormes?.some(form=>form.includes('-Mega')) ?? false,canGigantamax:!!data.canGigantamax};
  });
}
