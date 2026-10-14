import {allowsGimmick,type BattleRule} from '../data/run-rules';
import type {Battle} from 'pokemon-showdown';
import {DYNAMAX_ITEM,megaStones} from '../data/gimmicks';
// Installed on one battle only. Old saved formats never enter this path.
export function installTowerGimmicks(battle:Battle,teams:Record<'p1'|'p2',{name:string;species:string;item:string}[]>,tickets?:import('../data/tera').TeraTickets,rule:BattleRule='chaos',opponentRule:BattleRule=rule,opponentTeraSpecies?:string,equipment?:readonly import('../data/trainer-equipment').TrainerEquipment[]){
 const ruleFor=(side:string)=>side==='p2'?opponentRule:rule;
 const baseDex=battle.dex,localDex=Object.create(baseDex) as typeof baseDex,localItems=Object.create(baseDex.items) as typeof baseDex.items;
 const ball=baseDex.items.get('Poke Ball');
 const band=Object.assign(Object.create(Object.getPrototypeOf(ball)),ball,{id:'dynamaxband',name:DYNAMAX_ITEM,fullname:'item: '+DYNAMAX_ITEM,isPokeball:false,gen:8,isNonstandard:null});
 localItems.get=(name:Parameters<typeof baseDex.items.get>[0])=>{
  const id=typeof name==='string'?name.toLowerCase().replace(/[^a-z0-9]/g,''):'';
  return id==='dynamaxband'?band:baseDex.items.get(name);
 };
 Object.defineProperty(localDex,'items',{value:localItems});battle.dex=localDex;
 const used=new Set<string>();
 const transformed=new WeakSet<import('pokemon-showdown').Pokemon>();
 const teraUsed=new Set<string>();
 const originalZRequest=battle.actions.canZMove.bind(battle.actions);
 const originalZMove=battle.actions.getZMove.bind(battle.actions);
 const canZ=(pokemon:import('pokemon-showdown').Pokemon)=>allowsGimmick(ruleFor(pokemon.side.id),'zmove') && !(pokemon.side.id==='p1'&&equipment!==undefined&&transformed.has(pokemon)) && !pokemon.terastallized && !pokemon.volatiles.dynamax && !pokemon.species.isMega && !pokemon.species.isPrimal;
 battle.actions.canZMove=pokemon=>canZ(pokemon)?originalZRequest(pokemon):undefined;
 battle.actions.getZMove=(move,pokemon,skipChecks)=>canZ(pokemon)?originalZMove(move,pokemon,skipChecks):undefined;
 const originalStart=battle.start.bind(battle);
 let installed=false;
 battle.start=()=>{
  if(!installed && battle.sides.every(s=>s?.pokemon.length===3)){
   installed=true;
   for(const side of battle.sides){
    side.dynamaxUsed=false;
    side.canDynamaxNow=()=>allowsGimmick(ruleFor(side.id),'dynamax') && !side.dynamaxUsed && (side.id==='p1'&&equipment!==undefined||!used.has(side.id));
    for(const pokemon of side.pokemon){
     const trainerEquipment=side.id==='p1'&&equipment!==undefined;
     // Enable G-Max after validation so a held Mega Stone remains a valid alternative.
     if(trainerEquipment&&equipment.includes('Dynamax Band')&&pokemon.canGigantamax)Object.defineProperty(pokemon,'gigantamax',{value:true,writable:true,configurable:true});
     const changeForm=pokemon.formeChange.bind(pokemon);
     pokemon.formeChange=(...args)=>{
      const form=typeof args[0]==='string'?baseDex.species.get(args[0]):args[0];
      if(form.isPrimal && side.id==='p1' && (!allowsGimmick(rule,'mega') || used.has(side.id) && !pokemon.species.isPrimal))return false;
      const result=changeForm(...args);
      if(result && form.isPrimal)consume(side,'mega',pokemon);
      return result;
     };
     // Old battles/NPCs retain their frozen tickets and held-band rules.
     let tera:string|false|null=pokemon.teraType;
     Object.defineProperty(pokemon,'canTerastallize',{configurable:true,get:()=>
      allowsGimmick(ruleFor(side.id),'terastallize') && (side.id!=='p2' || !opponentTeraSpecies || pokemon.baseSpecies.name===opponentTeraSpecies) && (trainerEquipment||!pokemon.getItem().zMove) && (trainerEquipment?equipment.includes('Tera Orb'):(tickets?.[side.id as 'p1'|'p2'] ?? 0)>0) && !teraUsed.has(side.id) && !transformed.has(pokemon) && !pokemon.species.isMega && !pokemon.species.isPrimal && !pokemon.volatiles.dynamax && !pokemon.terastallized ? trainerEquipment?pokemon.teraType:tera : null,
      set:(value:string|false|null)=>{tera=value;}});
     const entry=teams[side.id as 'p1'|'p2'].find(s=>(s.name||s.species)===pokemon.name);
     const original=pokemon.getDynamaxRequest.bind(pokemon);
     pokemon.getDynamaxRequest=(skipChecks?:boolean)=>{
      if(!allowsGimmick(ruleFor(side.id),'dynamax'))return;
      const hasBand=side.id==='p1'&&equipment!==undefined?equipment.includes('Dynamax Band'):pokemon.getItem().id==='dynamaxband';
      if(!skipChecks && (!hasBand || !trainerEquipment&&used.has(side.id) || pokemon.terastallized || transformed.has(pokemon)))return;
      if(trainerEquipment){
       if(!skipChecks&&(!side.canDynamaxNow()||pokemon.species.cannotDynamax||pokemon.illusion?.species.cannotDynamax||pokemon.species.isMega||pokemon.species.isPrimal||pokemon.species.forme==='Ultra'))return;
       // Trainer equipment permits choosing D-Max while holding a Mega Stone or Z crystal.
       return original(true);
      }
      return original(skipChecks);
     };
     if(!allowsGimmick(ruleFor(side.id),'mega') || !entry || !megaStones[entry.item]){pokemon.canMegaEvo=null;pokemon.canMegaEvoX=null;pokemon.canMegaEvoY=null;}
    }
   }
  }
  return originalStart();
 };
 function consume(side:Battle['sides'][number],kind:'mega'|'dynamax'='mega',pokemon?:import('pokemon-showdown').Pokemon){
  if(side.id==='p1'&&equipment!==undefined){
   if(pokemon)transformed.add(pokemon);
   if(kind==='dynamax'){
    side.dynamaxUsed=true;
    if(pokemon){pokemon.canMegaEvo=null;pokemon.canMegaEvoX=null;pokemon.canMegaEvoY=null;}
    return;
   }
   used.add(side.id);
   for(const p of side.pokemon){p.canMegaEvo=null;p.canMegaEvoX=null;p.canMegaEvoY=null;}
   return;
  }
  used.add(side.id);side.dynamaxUsed=true;
  for(const p of side.pokemon){p.canMegaEvo=null;p.canMegaEvoX=null;p.canMegaEvoY=null;}
 }
 battle.onEvent('AfterMega',battle.format,(pokemon:import('pokemon-showdown').Pokemon)=>consume(pokemon.side,'mega',pokemon));
 const add=battle.add.bind(battle);
 battle.add=(...args)=>{
  if(args[0]==='-primal'){const p=args[1] as import('pokemon-showdown').Pokemon;consume(p.side,'mega',p);}
  if(args[0]==='-start' && args[2]==='Dynamax'){
   const p=args[1] as import('pokemon-showdown').Pokemon;consume(p.side,'dynamax',p);
  }
  if(args[0]==='-terastallize'){
   const p=args[1] as import('pokemon-showdown').Pokemon;teraUsed.add(p.side.id);
   p.canMegaEvo=null;p.canMegaEvoX=null;p.canMegaEvoY=null;
  }
  if(args[0]==='-zpower'){
   const p=args[1] as import('pokemon-showdown').Pokemon;
   if(p.side.id==='p1'&&equipment!==undefined){
    transformed.add(p);
    p.canMegaEvo=null;p.canMegaEvoX=null;p.canMegaEvoY=null;
   }
  }
  return add(...args);
 };
}
