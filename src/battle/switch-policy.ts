import Showdown from 'pokemon-showdown';
import {TeraPolicy} from './gimmick-policy';
import {estimateDamage,type Observation,type OwnPokemon} from './policy';

const fraction=(condition:string)=>{const [hp,max]=condition.split(' ')[0].split('/').map(Number);return max>0?hp/max:0;};
const types=(p:OwnPokemon)=>p.terastallized && p.terastallized!=='Stellar'?[p.terastallized]:Showdown.Dex.species.get(p.details.split(',')[0]).types;
const multiplier=(type:string,defending:string[])=>Showdown.Dex.getImmunity(type,defending)?2**Showdown.Dex.getEffectiveness(type,defending):0;
const id=(text:string|undefined)=>Showdown.toID(text??'');

// v6: own team requests, revealed opponent information and bounded voluntary switches.
export class SwitchingPolicy extends TeraPolicy {
 readonly switchingInformation=true;
 private voluntary=0;
 private lastSwitchTurn=-10;
 private departed=new Map<string,number>();
 protected override checkpointDecisionState():()=>void {
  const parent=super.checkpointDecisionState(),voluntary=this.voluntary,last=this.lastSwitchTurn,departed=new Map(this.departed);
  return ()=>{parent();this.voluntary=voluntary;this.lastSwitchTurn=last;this.departed=departed;};
 }
 override choose(o:Observation):string {
  const own=o.ownTeam.find(p=>p.active),enemy=o.opponent;
  const switches=o.legalActions.filter(a=>a.command.startsWith('switch '));
  const moves=o.legalActions.filter(a=>/^move \d+$/.test(a.command));
  if(!enemy || !switches.length)return super.choose(o);
  const candidates=switches.map(action=>({action,p:o.ownTeam[Number(action.command.split(' ')[1])-1]})).filter(({p})=>p && fraction(p.condition)>0);
  const best=candidates.map(c=>({...c,score:this.matchup(c.p,o),entry:this.entryCost(c.p,o)})).filter(c=>c.entry<fraction(c.p.condition)).sort((a,b)=>b.score-a.score || a.action.command.localeCompare(b.action.command));
  // Forced replacement is legal even when entry hazards will KO every remaining member.
  if(!moves.length || !own || fraction(own.condition)<=0)return (best[0]??candidates.sort((a,b)=>fraction(b.p.condition)-fraction(a.p.condition))[0])?.action.command??super.choose(o);
  if(this.voluntary>=4 || o.turn-this.lastSwitchTurn<3 || o.switching?.dynamax)return super.choose(o);
  const attacks=moves.filter(a=>Showdown.Dex.moves.get(a.label).category!=='Status');
  const offense=Math.max(0,...attacks.map(a=>this.offense(a.label,own,o)));
  const target=Showdown.Dex.species.get(enemy.species),targetHP=target.baseStats.hp+91;
  // Stay for a plausible finishing hit or to retain a significant offensive/speed boost.
  if(offense>=targetHP*fraction(enemy.condition) || ['atk','spa','spe'].some(stat=>(o.switching?.boosts[stat]??0)>=2))return super.choose(o);
  const risk=this.risk(own,o),stuck=attacks.length>0 && offense===0;
  const fallbackTypes=o.switching?.opponentTypes.length?o.switching.opponentTypes:target.types;
  const exposed=fallbackTypes.some(type=>multiplier(type,types(own))>=2);
  if(!stuck && !(exposed && risk>=.4))return super.choose(o);
  const option=best.find(c=>fraction(c.p.condition)-c.entry>=.25 && o.turn-(this.departed.get(c.p.ident)??-10)>=5
    && c.score>=this.matchup(own,o)+.55 && this.risk(c.p,o)<=risk*.65 && this.bestOffense(c.p,o)>0);
  if(!option)return super.choose(o);
  this.voluntary++;this.lastSwitchTurn=o.turn;this.departed.set(own.ident,o.turn);
  return option.action.command;
 }
 private offense(name:string,p:OwnPokemon,o:Observation){
  const target=Showdown.Dex.species.get(o.opponent!.species),move=Showdown.Dex.moves.get(name),native=multiplier(move.type,target.types),visible=multiplier(move.type,o.switching?.opponentTypes.length?o.switching.opponentTypes:target.types);
  if(!visible)return 0;
  const estimate=estimateDamage(name,p,o.opponent!.species);
  // Recompute when public tera/type changes turn a native immunity into a hittable type.
  if(!native){const attack=move.category==='Physical'?p.stats.atk:p.stats.spa,defense=(move.category==='Physical'?target.baseStats.def:target.baseStats.spd)+20;return move.category==='Status'?0:((22*move.basePower*attack/defense)/50+2)*visible;}
  return estimate*visible/native;
 }
 private bestOffense(p:OwnPokemon,o:Observation){return Math.max(0,...(p.moves??[]).map(move=>this.offense(move,p,o)));}
 private risk(p:OwnPokemon,o:Observation){
  const enemy=Showdown.Dex.species.get(o.opponent!.species),revealed=Showdown.Dex.moves.get(o.lastOpponentMove??''),defending=types(p);
  const threats=revealed.exists && revealed.category!=='Status'?[{type:revealed.type,power:revealed.basePower||70,category:revealed.category}]:
   (o.switching?.opponentTypes.length?o.switching.opponentTypes:enemy.types).map(type=>({type,power:80,category:enemy.baseStats.atk>=enemy.baseStats.spa?'Physical':'Special'}));
  const maxHP=Number(p.condition.split(' ')[0].split('/')[1])||100;
  return Math.max(...threats.map(move=>{
   if((id(p.ability)==='levitate' || id(p.item)==='airballoon') && move.type==='Ground')return 0;
   if((id(p.ability)==='flashfire' && move.type==='Fire') || (['waterabsorb','stormdrain','dryskin'].includes(id(p.ability)) && move.type==='Water') || (['voltabsorb','lightningrod','motordrive'].includes(id(p.ability)) && move.type==='Electric'))return 0;
   const attack=(move.category==='Physical'?enemy.baseStats.atk:enemy.baseStats.spa)+20,defense=move.category==='Physical'?p.stats.def:p.stats.spd;
   return ((22*move.power*attack/Math.max(1,defense))/50+2)*1.5*multiplier(move.type,defending)/maxHP;
  }));
 }
 private entryCost(p:OwnPokemon,o:Observation){
  const hazards=o.switching?.hazards;if(!hazards || ['heavydutyboots'].includes(id(p.item)) || id(p.ability)==='magicguard')return 0;
  const defending=types(p),grounded=!defending.includes('Flying') && id(p.ability)!=='levitate' && id(p.item)!=='airballoon';
  return (hazards.stealthRock?multiplier('Rock',defending)/8:0)+(grounded?[0,1/8,1/6,1/4][hazards.spikes]:0);
 }
 private matchup(p:OwnPokemon,o:Observation){
  const hp=fraction(p.condition)-this.entryCost(p,o),status=p.condition.split(' ')[1],hazards=o.switching?.hazards;
  const grounded=!types(p).includes('Flying') && id(p.ability)!=='levitate' && id(p.item)!=='airballoon';
  const vulnerable=grounded && id(p.item)!=='heavydutyboots';
  const poison=vulnerable && !status && !types(p).some(t=>['Poison','Steel'].includes(t)) && !['immunity','pastelveil'].includes(id(p.ability)) && hazards?.toxicSpikes;
  return Math.min(1.5,this.bestOffense(p,o)/90)+hp*.5-this.risk(p,o)*1.5-(status?.includes('slp') ? .35 : 0)-(poison ? .2 : 0)-(vulnerable && hazards?.stickyWeb ? .1 : 0);
 }
}

// v7 avoids gambling a voluntary switch when the own request warns of an unrevealed trap.
// v6 remains unchanged for accepted actions and saved opponent replays.
export class CautiousSwitchingPolicy extends SwitchingPolicy {
 readonly uncertainSwitchingInformation=true;
 override choose(o:Observation):string {
  if(o.switching?.maybeTrapped && o.legalActions.some(a=>a.command.startsWith('move ')))return super.choose({...o,legalActions:o.legalActions.filter(a=>!a.command.startsWith('switch '))});
  return super.choose(o);
 }
}
