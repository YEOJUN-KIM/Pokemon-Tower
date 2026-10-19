import Showdown from 'pokemon-showdown';
import type {Battle,Pokemon} from 'pokemon-showdown';
import type {RaidPhaseDefinition} from '../data/raids';

// Phase data describes the result; sourceSpecies disambiguates fusion origins.
export function raidPhaseSource(phase:RaidPhaseDefinition,dex=Showdown.Dex){
 const target=dex.species.get(phase.species);
 if(phase.sourceSpecies)return dex.species.get(phase.sourceSpecies);
 if(['mega','primal','ultraBurst','gigantamax','stellar'].includes(phase.transformation)||phase.transformation==='terastallize'&&target.forme==='Stellar')return dex.species.get(target.changesFrom||target.baseSpecies);
 return target;
}

export function validateRaidPhase(phase:RaidPhaseDefinition,base:string,dex=Showdown.Dex){
 const target=dex.species.get(phase.species),source=raidPhaseSource(phase,dex),kind=phase.transformation;
 const kinds=['none','aura','form','mega','primal','terastallize','stellar','dynamax','gigantamax','ultraBurst'];
 if(!kinds.includes(kind)||!target.exists||!source.exists||target.baseSpecies!==dex.species.get(base).baseSpecies||source.baseSpecies!==target.baseSpecies||!Object.values(target.abilities).includes(phase.ability)||!Array.isArray(phase.moves)||!phase.moves.length||phase.moves.length>4||phase.persistent!==undefined&&typeof phase.persistent!=='boolean')throw Error('Invalid raid phase form/ability');
 if(kind==='mega'&&!target.isMega||kind==='primal'&&!target.isPrimal||kind==='ultraBurst'&&target.forme!=='Ultra'||kind==='gigantamax'&&target.forme!=='Gmax'||kind==='stellar'&&target.forme!=='Stellar')throw Error('Invalid raid transformation target');
 if(['dynamax','gigantamax'].includes(kind)&&(target.cannotDynamax||target.isMega||target.isPrimal||target.forme==='Ultra')||['stellar','terastallize'].includes(kind)&&(target.isMega||target.isPrimal||target.forme==='Ultra'))throw Error('Incompatible raid battle state');
 if(target.forme==='Stellar'&&!['stellar','terastallize'].includes(kind)||target.forme==='Gmax'&&kind!=='gigantamax')throw Error('Raid form requires battle state');
 if(phase.teraType!==undefined&&!dex.types.isName(phase.teraType))throw Error('Invalid raid Tera type');
 if(['stellar','terastallize'].includes(kind)&&target.forme==='Stellar'&&phase.teraType!==undefined&&phase.teraType!=='Stellar')throw Error('Stellar form requires Stellar Tera');
 // Unlike a player's starting set, a forced Phase is already in its current form.
 // Keep the engine's move/ability/stats validation, bypass only entry prerequisites.
 const validator=new Showdown.TeamValidator('gen9nationaldexag');
 Object.defineProperty(validator,'dex',{value:dex});
 const problems=validator.validateMoves(target,[...phase.moves],validator.allSources(target),{species:target.name,ability:phase.ability});
 if(problems.length)throw Error(problems.join('\n'));
}

export function prepareRaidPhase(battle:Battle,pokemon:Pokemon,phase:RaidPhaseDefinition){
 const source=raidPhaseSource(phase,battle.dex);
 pokemon.setSpecies(source);pokemon.baseSpecies=source;
 const ability=source.name===phase.species?phase.ability:source.abilities[0];
 pokemon.ability=battle.toID(ability);pokemon.baseAbility=pokemon.ability;
 pokemon.details=pokemon.getUpdatedDetails();
 pokemon.baseMaxhp=battle.statModify(source.baseStats,pokemon.set,'hp');
 pokemon.maxhp=pokemon.baseMaxhp;pokemon.hp=pokemon.maxhp;
}

// Use exactly the simulator primitives used by ordinary transformations. These
// server-owned transitions don't ask for an item/button or spend player charges.
export function applyRaidPhaseTransformation(battle:Battle,pokemon:Pokemon,phase:RaidPhaseDefinition){
 const target=battle.dex.species.get(phase.species),kind=phase.transformation;
 if(['terastallize','stellar'].includes(kind)){
  pokemon.teraType=phase.teraType??(target.forme==='Stellar'?'Stellar':pokemon.teraType);
  battle.actions.terastallize(pokemon);
 }else if(kind==='mega'||kind==='ultraBurst'){
  const item=pokemon.item;
  try{
   pokemon.item=battle.toID(target.requiredItem||item);
   pokemon.canMegaEvo=kind==='mega'?target.name:null;
   pokemon.canUltraBurst=kind==='ultraBurst'?target.name:null;
   if(!battle.actions.runMegaEvo(pokemon))throw Error('Raid Mega/Ultra transformation failed');
  }finally{pokemon.item=item;pokemon.canMegaEvo=null;pokemon.canUltraBurst=null;}
 }else if(kind==='dynamax'||kind==='gigantamax'){
  Object.defineProperty(pokemon,'gigantamax',{value:kind==='gigantamax',configurable:true,writable:true});
  if(!pokemon.addVolatile('dynamax'))throw Error('Raid Dynamax failed');
  // The native scheduler expires Dynamax when turns === 3. A per-Pokemon
  // counter override retains all native HP, Max Move and damage behavior.
  if(phase.persistent)Object.defineProperty(pokemon.volatiles.dynamax,'turns',{configurable:true,get:()=>0,set:()=>{}});
 }else if(pokemon.species.name!==target.name&&!(kind==='none'&&pokemon.species.baseSpecies===target.name)){
  const item=battle.dex.items.get(target.requiredItem||'');
  pokemon.formeChange(target,item.exists?item:null,true);
 }
 // Native Tera Shift / Terastallization own Terapagos' entry and Stellar form.
 if(kind!=='dynamax'&&kind!=='gigantamax'&&pokemon.species.name!==target.name&&!(kind==='none'&&pokemon.species.baseSpecies===target.name))throw Error('Raid transformation did not reach its target');
 if(pokemon.species.name===target.name&&pokemon.ability!==battle.toID(phase.ability))pokemon.setAbility(phase.ability,null,null,true);
 pokemon.details=pokemon.getUpdatedDetails();
 pokemon.hp=pokemon.maxhp; // Preserve the existing full-health phase boundary.
}
