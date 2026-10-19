import Showdown from 'pokemon-showdown';
import type {Observation,OwnPokemon} from './policy';
import {ownHp,ownTypes,npcAttackDamage,pivotEntryCosts} from './pivot-policy';

export type PublicThreat={type:string;power:number;category:string;weight:number;priority:number;multihit:boolean};
export function publicThreats(o:Observation,revealed:Iterable<string>):PublicThreat[]{
 if(!o.opponent)return [];
 const dex=Showdown.Dex,last=dex.moves.get(o.lastOpponentMove??''),out:PublicThreat[]=[];
 for(const name of new Set([...revealed,...(last.exists?[last.name]:[])])){
  const m=dex.moves.get(name);if(m.category==='Status')continue;
  out.push({type:m.type,power:m.basePower||75,category:m.category,weight:m.id===last.id?1:.65,priority:m.priority,multihit:!!m.multihit});
 }
 const foe=dex.species.get(o.opponent.species);
 for(const type of o.switching?.opponentTypes.length?o.switching.opponentTypes:foe.types)out.push({type,power:80,category:foe.baseStats.atk>=foe.baseStats.spa?'Physical':'Special',weight:.35,priority:0,multihit:false});
 return out;
}
export function publicIncomingRisk(p:OwnPokemon,o:Observation,threats:PublicThreat[]){
 if(!o.opponent)return 0;
 const dex=Showdown.Dex,foe=dex.species.get(o.opponent.species),types=ownTypes(p),ability=Showdown.toID(p.ability),item=Showdown.toID(p.item);
 const maxHp=Number(p.condition.split(' ')[0].split('/')[1])||100;
 return Math.max(0,...threats.map(t=>{
  if(t.type==='Ground'&&(ability==='levitate'||item==='airballoon')||t.type==='Fire'&&['flashfire','wellbakedbody'].includes(ability)||t.type==='Water'&&['waterabsorb','stormdrain','dryskin'].includes(ability)||t.type==='Electric'&&['voltabsorb','lightningrod','motordrive'].includes(ability)||t.type==='Grass'&&ability==='sapsipper')return 0;
  const factor=dex.getImmunity(t.type,types)?2**dex.getEffectiveness(t.type,types):0;
  return ((22*t.power*((t.category==='Physical'?foe.baseStats.atk:foe.baseStats.spa)+20)/Math.max(1,t.category==='Physical'?p.stats.def:p.stats.spd))/50+2)*(foe.types.includes(t.type)?1.5:1)*factor*t.weight/maxHp;
 }));
}
/** Shared by safe pivots and ordinary voluntary switches. Only own requests and
 * public opponent information enter this function. No opposing set is accepted. */
export function evaluateSwitchCandidates(o:Observation,revealed:Iterable<string>=[],options:{aggressive?:boolean;reserveLast?:boolean}={}){
 const current=o.ownTeam.find(p=>p.active&&ownHp(p)>0),threats=publicThreats(o,revealed);
 const currentRisk=current?publicIncomingRisk(current,o,threats):0;
 const dangerous=!!current&&(currentRisk>=(options.aggressive?.18:.22)||currentRisk>=ownHp(current)*.85);
 const reserve=options.reserveLast&&o.ownTeam.slice(0,-1).some(p=>!p.active&&ownHp(p)>0);
 const candidates=o.legalActions.filter(a=>a.command.startsWith('switch ')).map(action=>({action,pokemon:o.ownTeam[Number(action.command.split(' ')[1])-1]})).filter(r=>r.pokemon&&ownHp(r.pokemon)>0&&(!reserve||r.pokemon!==o.ownTeam.at(-1))).map(r=>{
  const entry=pivotEntryCosts(r.pokemon,o),risk=publicIncomingRisk(r.pokemon,o,threats),offensivePressure=Math.max(0,...(r.pokemon.moves??[]).map(m=>npcAttackDamage(m,r.pokemon,o)));
  const remainingHP=ownHp(r.pokemon)-entry.damage,netImprovement=currentRisk-risk-entry.total;
  return {...r,entry,risk,offensivePressure,remainingHP,netImprovement,score:risk+entry.total-Math.min(.15,offensivePressure/500)};
 }).filter(r=>r.remainingHP>.25&&r.remainingHP>r.risk&&r.risk<=currentRisk*(options.aggressive?.72:.65)&&currentRisk-r.risk>=(options.aggressive?.12:.15)&&r.netImprovement>0&&r.offensivePressure>0).sort((a,b)=>a.score-b.score||b.offensivePressure-a.offensivePressure);
 return {current,currentRisk,dangerous,threats,candidates,recommended:candidates[0]};
}
