import type {Battle,Pokemon} from 'pokemon-showdown';
import {raidCategoryPresentation,type RaidSnapshot} from '../data/raids';
import {applyRaidPhaseTransformation,prepareRaidPhase} from './raid-transformation';

// Consecutive server-owned slots retain the simulator's KO, multi-hit and turn scheduler.
export function installRaid(battle:Battle,raid:RaidSnapshot){
 const phaseOf=new WeakMap<Pokemon,number>();
 const applied=new WeakSet<Pokemon>();
 const originalStart=battle.start.bind(battle);
 battle.start=()=>{
  for(const [index,pokemon] of (battle.sides[1]?.pokemon??[]).entries())phaseOf.set(pokemon,index);
  return originalStart();
 };
 const add=battle.add.bind(battle);
 battle.add=((...args:Parameters<Battle['add']>)=>{
  const pokemon=args[1] as Pokemon|undefined,index=pokemon&&typeof pokemon==='object'?phaseOf.get(pokemon):undefined;
  if(args[0]==='poke'&&args[1]==='p2')return;
  if(index!==undefined&&((args[0]==='faint'&&index<raid.phases.length-1)||(args[0]==='switch'&&index>0)))args.push('[raid]');
  if(index!==undefined&&args[0]==='switch'&&index>0&&raid.transformationAdapter)args.push('[raid-adapter]');
  return add(...args);
 }) as Battle['add'];
 const switchIn=battle.actions.switchIn.bind(battle.actions);
 battle.actions.switchIn=(pokemon,pos,sourceEffect,isDrag)=>{
  const index=phaseOf.get(pokemon);
  if(index===undefined)return switchIn(pokemon,pos,sourceEffect,isDrag);
  const phase=raid.phases[index];
  if(index===0){battle.add('raid',raid.category);battle.add('message',raidCategoryPresentation[raid.category].entry);}
  else if(phase.messages)battle.add('message',phase.messages[0]);
  // A fresh slot owns HP/status/volatiles/PP. Apply its saved form before entry/ability activation.
  if(raid.transformationAdapter)prepareRaidPhase(battle,pokemon,phase);
  else {
  pokemon.setSpecies(battle.dex.species.get(phase.species));
  pokemon.baseSpecies=pokemon.species;
  pokemon.ability=battle.toID(phase.ability);pokemon.baseAbility=pokemon.ability;
  pokemon.details=pokemon.getUpdatedDetails();
  pokemon.baseMaxhp=battle.statModify(pokemon.species.baseStats,pokemon.set,'hp');
  pokemon.maxhp=pokemon.baseMaxhp;pokemon.hp=pokemon.maxhp;
  }
  for(const [stat,value] of Object.entries(phase.buffs??{}))pokemon.boosts[stat as keyof typeof pokemon.boosts]=value!;
  const result=switchIn(pokemon,pos,sourceEffect,isDrag);
  if(!raid.transformationAdapter&&index>0&&phase.messages)battle.add('message',phase.messages[1]);
  return result;
 };
 const runSwitch=battle.actions.runSwitch.bind(battle.actions);
 battle.actions.runSwitch=pokemon=>{
  if(!raid.transformationAdapter&&(phaseOf.get(pokemon)??0)===0)return runSwitch(pokemon);
  // A transformation isn't a fresh entry onto the opponent's hazards.
  const hazards=['stealthrock','spikes','toxicspikes','stickyweb'],side=battle.sides[1];
  const saved=hazards.map(id=>[id,side.sideConditions[id]] as const);
  // Initial and simultaneous player/boss switches may be batched together.
  if(side.active.some(boss=>(phaseOf.get(boss)??0)>0))for(const id of hazards)delete side.sideConditions[id];
  try{
   const newlyApplied:Pokemon[]=[];
   const apply=(afterEntry:boolean)=>{
    if(!raid.transformationAdapter)return;
    for(const boss of side.active){
     const index=phaseOf.get(boss);if(index===undefined||applied.has(boss)||!boss.hp)continue;
     const phase=raid.phases[index];
     // Entry-driven forms (Tera Shift) must finish before native Tera runs.
     const tera=['stellar','terastallize'].includes(phase.transformation);
     if(tera!==afterEntry)continue;
     applied.add(boss);newlyApplied.push(boss);applyRaidPhaseTransformation(battle,boss,phase);
    }
   };
   // Resolve forced result abilities before SwitchIn, avoiding accidental
   // activation of the source form's Intimidate/Drizzle/etc.
   apply(false);
   const result=runSwitch(pokemon);
   // runSwitch batches entrants (including p1+p2 on the initial turn).
   apply(true);
   if(raid.transformationAdapter)for(const boss of newlyApplied){
    const index=phaseOf.get(boss);if(index===undefined||index===0||!applied.has(boss))continue;
    const phase=raid.phases[index];
    if(phase.messages)battle.add('message',phase.messages[1]);
   }
   return result;
  }finally{for(const [id,state] of saved)if(state)side.sideConditions[id]=state;}
 };
 // Boss slots are phases, never tactical reserves or phazing targets.
 battle.onEvent('DragOut',battle.format,(_pokemon:Pokemon)=>_pokemon.side.id==='p2'?false:undefined);
 battle.onEvent('SwitchOut',battle.format,(pokemon:Pokemon)=>pokemon.side.id==='p2'&&pokemon.hp>0?false:undefined);
}
