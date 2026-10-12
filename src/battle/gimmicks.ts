import {allowsGimmick,type BattleRule} from '../data/run-rules';
import type {Battle} from 'pokemon-showdown';
import {DYNAMAX_ITEM,megaStones} from '../data/gimmicks';
// Installed on one battle only. Old saved formats never enter this path.
export function installTowerGimmicks(battle:Battle,teams:Record<'p1'|'p2',{name:string;species:string;item:string}[]>,tickets?:import('../data/tera').TeraTickets,rule:BattleRule='chaos'){
 const baseDex=battle.dex,localDex=Object.create(baseDex) as typeof baseDex,localItems=Object.create(baseDex.items) as typeof baseDex.items;
 const ball=baseDex.items.get('Poke Ball');
 const band=Object.assign(Object.create(Object.getPrototypeOf(ball)),ball,{id:'dynamaxband',name:DYNAMAX_ITEM,fullname:'item: '+DYNAMAX_ITEM,isPokeball:false,gen:8,isNonstandard:null});
 localItems.get=(name:Parameters<typeof baseDex.items.get>[0])=>typeof name==='string' && name.toLowerCase().replace(/[^a-z0-9]/g,'')==='dynamaxband' ? band : baseDex.items.get(name);
 Object.defineProperty(localDex,'items',{value:localItems});battle.dex=localDex;
 const used=new Set<string>();
 const teraUsed=new Set<string>();
 const originalZRequest=battle.actions.canZMove.bind(battle.actions);
 const originalZMove=battle.actions.getZMove.bind(battle.actions);
 const canZ=(pokemon:import('pokemon-showdown').Pokemon)=>allowsGimmick(rule,'zmove') && !pokemon.terastallized && !pokemon.volatiles.dynamax && !pokemon.species.isMega;
 battle.actions.canZMove=pokemon=>canZ(pokemon)?originalZRequest(pokemon):undefined;
 battle.actions.getZMove=(move,pokemon,skipChecks)=>canZ(pokemon)?originalZMove(move,pokemon,skipChecks):undefined;
 const originalStart=battle.start.bind(battle);
 let installed=false;
 battle.start=()=>{
  if(!installed && battle.sides.every(s=>s?.pokemon.length===3)){
   installed=true;
   for(const side of battle.sides){
    side.dynamaxUsed=false;
    side.canDynamaxNow=()=>allowsGimmick(rule,'dynamax') && !side.dynamaxUsed && !used.has(side.id);
    for(const pokemon of side.pokemon){
     // The team owns the ticket; a held mega stone does not block a still-normal Pokemon.
     let tera:string|false|null=pokemon.teraType;
     Object.defineProperty(pokemon,'canTerastallize',{configurable:true,get:()=>
      allowsGimmick(rule,'terastallize') && !pokemon.getItem().zMove && (tickets?.[side.id as 'p1'|'p2'] ?? 0)>0 && !teraUsed.has(side.id) && !pokemon.species.isMega && !pokemon.volatiles.dynamax && !pokemon.terastallized ? tera : null,
      set:(value:string|false|null)=>{tera=value;}});
     const entry=teams[side.id as 'p1'|'p2'].find(s=>(s.name||s.species)===pokemon.name);
     const original=pokemon.getDynamaxRequest.bind(pokemon);
     pokemon.getDynamaxRequest=(skipChecks?:boolean)=>{
      if(!allowsGimmick(rule,'dynamax'))return;
      if(!skipChecks && (pokemon.getItem().id!=='dynamaxband' || used.has(side.id) || pokemon.terastallized))return;
      return original(skipChecks);
     };
     if(!allowsGimmick(rule,'mega') || !entry || !megaStones[entry.item]){pokemon.canMegaEvo=null;pokemon.canMegaEvoX=null;pokemon.canMegaEvoY=null;}
    }
   }
  }
  return originalStart();
 };
 function consume(side:Battle['sides'][number]){
  used.add(side.id);side.dynamaxUsed=true;
  for(const p of side.pokemon){p.canMegaEvo=null;p.canMegaEvoX=null;p.canMegaEvoY=null;}
 }
 battle.onEvent('AfterMega',battle.format,(pokemon:import('pokemon-showdown').Pokemon)=>consume(pokemon.side));
 const add=battle.add.bind(battle);
 battle.add=(...args)=>{
  if(args[0]==='-start' && args[2]==='Dynamax'){
   const p=args[1] as import('pokemon-showdown').Pokemon;consume(p.side);
  }
  if(args[0]==='-terastallize'){
   const p=args[1] as import('pokemon-showdown').Pokemon;teraUsed.add(p.side.id);
   p.canMegaEvo=null;p.canMegaEvoX=null;p.canMegaEvoY=null;
  }
  return add(...args);
 };
}
