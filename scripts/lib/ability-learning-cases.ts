import Showdown from 'pokemon-showdown';
import {packTeam} from '../../src/data/teams';
import {CoverageFactorPolicy} from '../../src/battle/coverage-factor-policy';
import {DamagePolicy,type Observation} from '../../src/battle/policy';
import {runBattle,type Seed} from '../../src/battle/run';

// Deliberately probe once: this measures recovery from a revealed immunity,
// not how frequently an unmodified policy would choose that first attack.
export const abilityLearningCases = [
 {target:'Bronzong',ability:'Levitate',control:'Heatproof',attacker:'Garchomp',moves:['Earthquake','Fire Fang','Dragon Claw','Rock Slide'],blockedType:'Ground'},
 {target:'Quagsire',ability:'Water Absorb',control:'Unaware',attacker:'Starmie',moves:['Surf','Psychic','Ice Beam','Thunderbolt'],blockedType:'Water'},
 {target:'Raichu',ability:'Lightning Rod',control:'Static',attacker:'Starmie',moves:['Thunderbolt','Surf','Psychic','Ice Beam'],blockedType:'Electric'},
 {target:'Gastrodon',ability:'Storm Drain',control:'Sticky Hold',attacker:'Starmie',moves:['Surf','Psychic','Ice Beam','Thunderbolt'],blockedType:'Water'},
 {target:'Arcanine',ability:'Flash Fire',control:'Intimidate',attacker:'Charizard',moves:['Flamethrower','Air Slash','Dragon Pulse','Slash'],blockedType:'Fire'},
 {target:'Jolteon',ability:'Volt Absorb',control:'Quick Feet',attacker:'Raichu',moves:['Thunderbolt','Surf','Grass Knot','Quick Attack'],blockedType:'Electric'},
 {target:'Electivire',ability:'Motor Drive',control:'Vital Spirit',attacker:'Starmie',moves:['Thunderbolt','Surf','Psychic','Ice Beam'],blockedType:'Electric'},
 {target:'Sawsbuck',ability:'Sap Sipper',control:'Chlorophyll',attacker:'Venusaur',moves:['Energy Ball','Sludge Bomb','Earth Power','Tackle'],blockedType:'Grass'},
 {target:'Orthworm',ability:'Earth Eater',control:'Sand Veil',attacker:'Garchomp',moves:['Earthquake','Fire Fang','Dragon Claw','Rock Slide'],blockedType:'Ground'},
 {target:'Dachsbun',ability:'Well-Baked Body',control:'Aroma Veil',attacker:'Charizard',moves:['Flamethrower','Air Slash','Dragon Pulse','Slash'],blockedType:'Fire'},
] as const;

function fixtureTeam(names:string[],first:{ability?:string;moves?:readonly string[]}) {
 const sets=Showdown.Teams.unpack(packTeam(names))!;
 if(first.ability)sets[0].ability=first.ability;
 if(first.moves)sets[0].moves=[...first.moves];
 return Showdown.Teams.pack(sets);
}

export async function runAbilityLearningCase(index:number,seed:Seed,control=false){
 const fixture=abilityLearningCases[index];
 const policy=new CoverageFactorPolicy({immunity:true,switching:false});
 const lines:string[]=[],choices:{turn:number;action:string;reason:string;observation:Observation}[]=[];
 let probed=false;
 const log=await runBattle({rule:'basic',seed,
  teams:{p1:fixtureTeam([fixture.attacker,'Snorlax','Scizor'],{moves:fixture.moves}),p2:fixtureTeam([fixture.target,'Blastoise','Snorlax'],{ability:control?fixture.control:fixture.ability})},
  player:{switchingInformation:true,uncertainSwitchingInformation:true,choose(o){
   const chosen=policy.choose(o);
   const action=!probed&&o.turn===1&&o.legalActions.some(a=>a.command==='move 1')?'move 1':chosen;
   if(o.turn===1&&action==='move 1')probed=true;
   choices.push({turn:o.turn,action,reason:action!==chosen?'scripted-first-probe':policy.decisionReason,observation:structuredClone(o)});
   return action;
  }},opponent:new DamagePolicy(),onPlayerLine(line){
   // Requests contain only our own private information. The learning component
   // receives battle events, never raw requests or opponent fixture sets.
   if(line.startsWith('|request|'))return;
   lines.push(line);policy.consumePublicLine(line);
  }});
 return {fixture,control,choices,lines,log};
}
