import Showdown from 'pokemon-showdown';
import {pokemonSets} from '../data/teams';
import {species} from '../data/pokemon-catalog';
import type {PokedexEntry,PokemonFormPreview} from '../shared/pokedex';
import nationalDex from '../data/pokedex.json' with {type:'json'};
import {isCollectibleSpecies} from '../data/pokedex-roster';
import megaForms from '../data/mega-preview-forms.json' with {type:'json'};
import gigantamaxForms from '../data/gigantamax-forms.json' with {type:'json'};
import {moveTypeNames} from '../data/move-info';
import {primalOrbs} from '../data/primal-forms';
import {familyForms,separateForms,baseFormName} from '../data/selectable-forms';
import battleForms from '../data/battle-forms.json' with {type:'json'};
import {battlePreviewForms} from '../data/battle-preview-forms';
import {previewAbility} from '../data/mega-abilities';

function formPreviews(name:string,displayName:string):PokemonFormPreview[]{
 const data=Showdown.Dex.species.get(name);
 const primal=Object.values(primalOrbs).find(p=>p.species===name);
 const selectableSpecies=new Set([name,...familyForms(name).map(([species])=>species)]);
 const gmax=Object.entries(gigantamaxForms).filter(([species,form])=>form.baseSpecies===name&&selectableSpecies.has(species.replace(/-Gmax$/,''))).map(([species])=>species);
 const names=[...(data.otherFormes??[]).filter(form=>form.includes('-Mega')),...gmax,...(primal?[primal.forme]:[])];
 const selectable=familyForms(name).map(([species,form])=>({species,name:form.name,kind:'selectable' as const,spriteKey:String(form.id),types:form.displayTypes,baseStats:form.baseStats,ability:form.ability}));
 const battle=Object.entries(battlePreviewForms).flatMap(([species,preview])=>{
  const form=Showdown.Dex.species.get(species),source=(battleForms as Record<string,{id:number;spriteKey?:string}>)[species];
  if(!source||!form.exists||form.baseSpecies!==name)return [];
  return [{species:form.name,...preview,kind:'battle' as const,spriteKey:source.spriteKey??String(source.id),types:form.types.map(type=>moveTypeNames[type]??type),baseStats:{...form.baseStats},ability:previewAbility(form.name,form.abilities[0])}];
 });
 return [...selectable,...battle,...names.flatMap(name=>{
  const form=Showdown.Dex.species.get(name),kind=name.endsWith('-Primal')?'primal' as const:name.endsWith('-Gmax')?'gigantamax' as const:'mega' as const;
  const source=kind==='primal'?primal:kind==='mega'?(megaForms as Record<string,{spriteKey:string}>)[name]:(gigantamaxForms as Record<string,{spriteKey:string}>)[name];
  if(!source||!form.exists)return [];
  const label=name==='Urshifu-Rapid-Strike-Gmax'?'우라오스 연격의 태세':baseFormName(data.name,displayName);
  return [{species:form.name,name:kind==='primal'?'원시'+displayName:kind==='mega'?'메가'+displayName+(name.match(/-Mega-([XYZ])$/)?.[1]??''):'거다이맥스 '+label,kind,spriteKey:source.spriteKey,types:form.types.map(type=>moveTypeNames[type]??type),baseStats:{...form.baseStats},ability:previewAbility(form.name,form.abilities[0])}];
 })];
}

export function pokedexEntries():PokedexEntry[] {
  const playable=new Map(Object.entries(pokemonSets).map(([name,set])=>[species[name].id,{name,set}]));
  // Old battle sets stay available internally; collection uses the current roster policy.
  const separate=Object.entries(separateForms).map(([species,form])=>({id:form.id,nationalId:form.nationalId,species,name:form.name,region:form.regionLabel??form.region,aliases:[species,form.baseSpecies,...(form.regionLabel?[form.name+' ('+form.regionLabel+')',form.regionLabel]:[]),...(form.region?[form.region+' '+form.name,form.regionLabel??form.region]:[])],types:form.displayTypes,generation:form.generation,ability:form.ability,canMega:false,canGigantamax:false}));
  const entries:(typeof nationalDex[number]&{nationalId?:number})[]=[...nationalDex,...separate];
  return entries.sort((a,b)=>(a.nationalId??a.id)-(b.nationalId??b.id)||a.id-b.id).filter(entry=>isCollectibleSpecies(entry.aliases[0])).map(entry=>{
    const available=playable.get(entry.id);
    if(!available)return {...entry,forms:formPreviews(entry.aliases[0],entry.name),baseStats:{...Showdown.Dex.species.get(entry.aliases[0]).baseStats},moves:[],level:50,battleReady:false};
    const {name,set}=available,data=Showdown.Dex.species.get(name);
    return {...entry,aliases:[...entry.aliases,...familyForms(name).flatMap(([name,form])=>[name,form.name])],forms:formPreviews(name,species[name].name),baseStats:{...data.baseStats},species:name,name:species[name].name,types:species[name].types,
      ability:set.ability,moves:set.moves,level:set.level,battleReady:true,
      canPrimal:Object.values(primalOrbs).some(p=>p.species===name),canMega:data.otherFormes?.some(form=>form.includes('-Mega')) ?? false,canGigantamax:!!data.canGigantamax};
  });
}
