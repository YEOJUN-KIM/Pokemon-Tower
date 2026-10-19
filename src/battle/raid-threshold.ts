import type {Battle,Pokemon} from 'pokemon-showdown';
import type {RaidSnapshot} from '../data/raids';
import {prepareRaidPhase,applyRaidPhaseTransformation} from './raid-transformation';
import {clampRaidDamage,raidPhaseEnd,raidGateHP,resizeRaidHP} from './raid-hp';

// One living Pokemon owns the entire bar. Saved later slots are build templates,
// never extra lives. The unversioned installer remains available for old replays.
export function installThresholdRaid(battle:Battle,raid:RaidSnapshot,legacy:(battle:Battle,raid:RaidSnapshot)=>void){
 legacy(battle,{...raid,hpMode:undefined,raidHpMultiplier:undefined,phases:[raid.phases[0]]});
 let boss:Pokemon,index=0,pending=false;
 let slots:Pokemon['moveSlots'][]=[];
 const start=battle.start.bind(battle);
 battle.start=()=>{
  const side=battle.sides[1];boss=side.pokemon[0];slots=side.pokemon.map(p=>structuredClone(p.moveSlots));
  for(const pokemon of side.pokemon.slice(1)){pokemon.hp=0;pokemon.fainted=true;}
  side.pokemonLeft=1;
  const damage=boss.damage.bind(boss),faint=boss.faint.bind(boss);
  boss.damage=(amount,source,effect)=>{
   if(index===raid.phases.length-1)return damage(amount,source,effect);
   const end=raidPhaseEnd(raid,index),dealt=damage(clampRaidDamage(boss.hp,boss.maxhp,end,amount),source,effect);
   if(boss.hp<=raidGateHP(boss.maxhp,end))pending=true;
   return dealt;
  };
  // Direct faint effects cannot bypass a Phase gate either (Perish/Destiny Bond).
  boss.faint=(source,effect)=>{
   if(index===raid.phases.length-1)return faint(source,effect);
   const before=boss.hp;boss.hp=raidGateHP(boss.maxhp,raidPhaseEnd(raid,index));pending=true;
   battle.add('-damage',boss,boss.getHealth);return Math.max(0,before-boss.hp);
  };
  return start();
 };
 const runAction=battle.runAction.bind(battle);
 battle.runAction=(...args)=>{
  const result=runAction(...args);
  if(args[0].choice==='start')boss.side.pokemonLeft=1;
  // Finish the whole action, including all multi-hits and recoil. Excess damage
  // is discarded while pending; it cannot spill into the newly entered phase.
  if(pending&&!battle.ended&&boss.hp>0){
   pending=false;const previousHP=boss.hp,previousMax=boss.maxhp,phase=raid.phases[++index];
   if(phase.messages)battle.add('message',phase.messages[0]);
   const entry=phase.transformation==='stellar'&&!phase.sourceSpecies?{...phase,sourceSpecies:boss.species.name}:phase;
   prepareRaidPhase(battle,boss,entry);boss.hp=resizeRaidHP(previousHP,previousMax,boss.maxhp);
   applyRaidPhaseTransformation(battle,boss,phase,true);
   // Generic formeChange does not always recalculate native max HP. This is
   // the same current-form stat rule as ordinary Raid entry, plus native D-Max.
   const native=battle.statModify(boss.species.baseStats,boss.set,'hp');
   if(!boss.volatiles.dynamax){boss.baseMaxhp=native;boss.maxhp=native;}
   boss.hp=resizeRaidHP(previousHP,previousMax,boss.maxhp);
   boss.moveSlots=structuredClone(slots[index]);boss.baseMoveSlots.splice(0,boss.baseMoveSlots.length,...structuredClone(slots[index]));
   boss.set.moves=[...phase.moves];
   for(const [stat,value]of Object.entries(phase.buffs??{}))boss.boosts[stat as keyof typeof boss.boosts]=battle.clampIntRange(boss.boosts[stat as keyof typeof boss.boosts]+value!,-6,6);
   battle.add('switch',boss,boss.getFullDetails,'[raid]','[raid-adapter]','[raid-threshold]');
   if(phase.messages)battle.add('message',phase.messages[1]);
  }
  return result;
 };
}
