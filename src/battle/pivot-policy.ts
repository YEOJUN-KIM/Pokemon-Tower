import Showdown from 'pokemon-showdown';
import {estimateDamage,type Action,type Observation,type OwnPokemon,type Policy} from './policy';
import {PublicImmunityV2} from './public-immunity-v2';
import {hpFraction} from './z-decision';

const dex=Showdown.Dex;
export const ownHp=(p:OwnPokemon)=>hpFraction(p.condition)??0;
export const ownTypes=(p:OwnPokemon)=>p.terastallized&&p.terastallized!=='Stellar'?[p.terastallized]:p.revealedTypes??dex.species.get(p.details.split(',')[0]).types;
const factor=(type:string,types:string[])=>dex.getImmunity(type,types)?2**dex.getEffectiveness(type,types):0;
const maxHp=(p:OwnPokemon)=>Number(p.condition.split(' ')[0].split('/')[1])||100;
const stage=(n:number)=>n>=0?(2+n)/2:2/(2-n);

/** Immediate HP loss is separate from future status/speed costs. Own items and
 * abilities are known; opposing undisclosed sets are never consulted. */
export function pivotEntryCosts(p:OwnPokemon,o:Observation){
 const h=o.switching?.hazards,types=ownTypes(p),item=Showdown.toID(p.item),ability=Showdown.toID(p.ability);
 const grounded=item==='ironball'||!types.includes('Flying')&&ability!=='levitate'&&item!=='airballoon';
 const boots=item==='heavydutyboots',guard=ability==='magicguard';
 let damage=0,statusCost=0,speedCost=0,absorbBenefit=0;
 if(h){
  if(!boots&&!guard)damage=(h.stealthRock?factor('Rock',types)/8:0)+(grounded?[0,1/8,1/6,1/4][h.spikes]:0);
  // Grounded Poison types remove Toxic Spikes even while wearing Boots.
  if(grounded&&h.toxicSpikes&&types.includes('Poison'))absorbBenefit=.06*h.toxicSpikes;
  else if(grounded&&h.toxicSpikes&&!boots&&!types.includes('Steel')&&!p.condition.split(' ')[1]&&!['immunity','pastelveil','purifyingsalt','comatose','magicguard','poisonheal'].includes(ability))statusCost=h.toxicSpikes>=2?.16:.08;
  if(grounded&&h.stickyWeb&&!boots&&item!=='clearamulet'&&!['clearbody','whitesmoke','fullmetalbody','mirrorarmor','contrary'].includes(ability)){
   const speed=p.stats.spe*(item==='choicescarf'?1.5:1)*(p.condition.includes('par')?.5:1),foeSpeed=Showdown.Dex.species.get(o.opponent?.species??'').baseStats.spe+20;
   speedCost=speed>=foeSpeed&&speed*2/3<foeSpeed?.14:.05;
  }
 }
 return {grounded,damage,statusCost,speedCost,absorbBenefit,total:damage+statusCost+speedCost-absorbBenefit};
}

/** Conservative public-information estimates, not knowledge of an opposing set. */
export function npcAttackDamage(name:string,p:OwnPokemon,o:Observation){
 const m=dex.moves.get(name);
 if(m.category==='Status'||m.flags.charge||!o.opponent)return 0;
 let n=estimateDamage(name,p,o.opponent.species);
 if(p.revealedTypes){const native=dex.species.get(p.details.split(',')[0]).types;n*=(ownTypes(p).includes(m.type)?1.5:1)/(native.includes(m.type)?1.5:1);}
 if(m.multihit)n*=Array.isArray(m.multihit)?m.multihit[0]:m.multihit;
 const native=dex.species.get(o.opponent.species).types,visible=o.switching?.opponentTypes.length?o.switching.opponentTypes:native;
 const before=factor(m.type,native),after=factor(m.type,visible);
 if(before)n*=after/before;else if(after){const enemy=dex.species.get(o.opponent.species),attack=m.category==='Physical'?p.stats.atk:p.stats.spa,def=(m.category==='Physical'?enemy.baseStats.def:enemy.baseStats.spd)+20;n=((22*m.basePower*attack/def)/50+2)*after*(ownTypes(p).includes(m.type)?1.5:1)*.925;}
 if(p.active)n*=stage(o.switching?.boosts[m.category==='Physical'?'atk':'spa']??0);
 if(Showdown.toID(p.item)==='lifeorb')n*=1.3;
 return n;
}
export function npcCanFinish(o:Observation,p:OwnPokemon,actions=o.legalActions){
 if(!o.opponent)return false;
 const targetHP=(dex.species.get(o.opponent.species).baseStats.hp+91)*(hpFraction(o.opponent.condition)??1);
 return actions.some(a=>/^move \d+$/.test(a.command)&&!['fakeout','firstimpression','suckerpunch'].includes(dex.moves.get(a.label).id)&&!dex.moves.get(a.label).flags.charge&&(dex.moves.get(a.label).accuracy===true||Number(dex.moves.get(a.label).accuracy)>=90)&&npcAttackDamage(a.label,p,o)*.85>=targetHP);
}
type Threat={type:string;power:number;category:string;weight:number;priority:number;multihit:boolean};
export type PivotEvaluation={mode:'pivot'|'switch'|'ko';risk?:number;receiverRisk?:number;entryCost?:number;entryDamage?:number;statusCost?:number;speedCost?:number;absorbBenefit?:number;receiver?:string;koAvailable:boolean};

/** Opt-in, species-independent U-turn/Volt Switch decisions for upper-tier AI.
 * The inner policy remains the fallback. No engine or opposing request is read. */
export class PivotPolicy implements Policy {
 readonly switchingInformation=true;readonly uncertainSwitchingInformation=true;readonly fixedOrder:boolean|undefined;
 private immunity=new PublicImmunityV2();private revealed=new Set<string>();
 private lastExit=-10;private pivots=0;private lastPivot=-10;private pending:string|undefined;
 private evaluation:PivotEvaluation|undefined;
 get lastEvaluation(){return this.evaluation?{...this.evaluation}:undefined;}
 constructor(private inner:Policy){this.fixedOrder=inner.fixedOrder;}
 observePublicLine(line:string){
  this.inner.observePublicLine?.(line);
  this.immunity.consume(line.replace(/\bp([12])(?=[a-z]?:)/g,(_,n)=>'p'+(n==='1'?'2':'1')));
  const p=line.split('|');
  if(['switch','drag','replace'].includes(p[1])&&p[2]?.startsWith('p1'))this.revealed.clear();
  if(p[1]==='move'&&p[2]?.startsWith('p1')&&dex.moves.get(p[3]).category!=='Status')this.revealed.add(p[3]);
 }
 private threats(o:Observation):Threat[]{
  const result:Threat[]=[],last=dex.moves.get(o.lastOpponentMove??'');
  for(const name of new Set([...this.revealed,...last.exists?[last.name]:[]])){
   const m=dex.moves.get(name);if(m.category==='Status')continue;
   result.push({type:m.type,power:m.basePower||75,category:m.category,weight:m.id===last.id?1:.65,priority:m.priority,multihit:!!m.multihit});
  }
  const foe=dex.species.get(o.opponent!.species),types=o.switching?.opponentTypes.length?o.switching.opponentTypes:foe.types;
  for(const type of types)result.push({type,power:80,category:foe.baseStats.atk>=foe.baseStats.spa?'Physical':'Special',weight:.35,priority:0,multihit:false});
  return result;
 }
 private risk(p:OwnPokemon,o:Observation,threats:Threat[]){
  const foe=dex.species.get(o.opponent!.species),ability=Showdown.toID(p.ability),types=ownTypes(p);
  return Math.max(0,...threats.map(t=>{
   if(t.type==='Ground'&&['levitate'].includes(ability)||t.type==='Fire'&&['flashfire','wellbakedbody'].includes(ability)||t.type==='Water'&&['waterabsorb','stormdrain','dryskin'].includes(ability)||t.type==='Electric'&&['voltabsorb','lightningrod','motordrive'].includes(ability)||t.type==='Grass'&&ability==='sapsipper')return 0;
   const atk=(t.category==='Physical'?foe.baseStats.atk:foe.baseStats.spa)+20,def=Math.max(1,t.category==='Physical'?p.stats.def:p.stats.spd);
   return ((22*t.power*atk/def)/50+2)*(foe.types.includes(t.type)?1.5:1)*factor(t.type,types)*t.weight/maxHp(p);
  }));
 }
 choose(original:Observation):string|Promise<string>{
  this.evaluation=undefined;
  const moving=original.legalActions.some(a=>a.command.startsWith('move '));
  if(!moving&&this.pending){const index=original.ownTeam.findIndex(p=>p.ident===this.pending),target=original.legalActions.find(a=>a.command===`switch ${index+1}`);this.pending=undefined;if(target)return target.command;}
  this.pending=undefined;
  const own=original.ownTeam.find(p=>p.active&&ownHp(p)>0);
  if(!moving||!own||!original.opponent)return this.inner.choose(original);
  this.immunity.observeOwn(own);
  const pivots=original.legalActions.filter(a=>/^move \d+$/.test(a.command)&&['uturn','voltswitch'].includes(dex.moves.get(a.label).id));
  // This layer refines pivot carriers; ordinary hard-switch decisions remain
  // with the existing policy for teammates that do not have a pivot move.
  if(!pivots.length)return this.inner.choose(original);
  const blocked=pivots.filter(a=>this.immunity.blocked(a.label,own,original));
  let actions=original.legalActions.filter(a=>!blocked.includes(a));if(!actions.length)actions=original.legalActions;
  const o={...original,legalActions:actions};
  const fallback=()=>{
   const filtered=actions.filter(a=>!pivots.includes(a)),usable=filtered.some(a=>a.command.startsWith('move '));
   const choice=this.inner.choose(usable?{...o,legalActions:filtered}:o);
   const record=(command:string)=>{if(command.startsWith('switch '))this.lastExit=o.turn;return command;};
   return typeof choice==='string'?record(choice):choice.then(record);
  };
  const ordinary=actions.filter(a=>/^move \d+$/.test(a.command)&&!this.immunity.blocked(a.label,own,o));
  const finishers=ordinary.filter(a=>npcCanFinish(o,own,[a]));
  if(finishers.length){this.evaluation={mode:'ko',koAvailable:true};return [...finishers].sort((a,b)=>dex.moves.get(b.label).priority-dex.moves.get(a.label).priority||npcAttackDamage(b.label,own,o)-npcAttackDamage(a.label,own,o))[0].command;}
  if(o.switching?.dynamax||o.switching?.maybeTrapped||this.pivots>=4||o.turn-this.lastExit<3||o.turn-this.lastPivot<3)return fallback();
  const threats=this.threats(o),risk=this.risk(own,o,threats),hp=ownHp(own);
  if(risk<.22&&risk<hp*.85)return fallback();
  const receivers=actions.filter(a=>a.command.startsWith('switch ')).map(a=>({a,p:o.ownTeam[Number(a.command.split(' ')[1])-1]})).filter(({p})=>p&&ownHp(p)>0).map(({a,p})=>({a,p,entry:pivotEntryCosts(p,o),risk:this.risk(p,o,threats),offense:Math.max(0,...(p.moves??[]).map(m=>npcAttackDamage(m,p,o)))})).filter(r=>ownHp(r.p)-r.entry.damage>.25&&r.entry.damage<ownHp(r.p)&&r.risk<=risk*.65&&risk-r.risk>=.15&&r.risk+r.entry.total<risk&&r.offense>0).sort((a,b)=>(a.risk+a.entry.total-Math.min(.15,a.offense/500))-(b.risk+b.entry.total-Math.min(.15,b.offense/500))||b.offense-a.offense);
  const receiver=receivers[0];if(!receiver)return fallback();
  const valid=pivots.filter(a=>actions.includes(a)&&!this.immunity.blocked(a.label,own,o));
  const speed=own.stats.spe*stage(o.switching?.boosts.spe??0)*(own.condition.includes('par')?.5:1)*(Showdown.toID(own.item)==='choicescarf'?1.5:1),foeSpeed=dex.species.get(o.opponent!.species).baseStats.spe+20;
  const before=threats.some(t=>t.weight===1&&t.priority>0)||speed<foeSpeed;
  const sash=Showdown.toID(own.item)==='focussash'&&hp===1&&!threats.some(t=>t.weight===1&&t.multihit);
  const evaluation={risk,receiverRisk:receiver.risk,entryCost:receiver.entry.total,entryDamage:receiver.entry.damage,statusCost:receiver.entry.statusCost,speedCost:receiver.entry.speedCost,absorbBenefit:receiver.entry.absorbBenefit,receiver:receiver.p.ident,koAvailable:false};
  if(!valid.length||before&&risk>=hp*.8&&!sash){this.evaluation={...evaluation,mode:'switch'};this.lastExit=o.turn;return receiver.a.command;}
  const pivot=[...valid].sort((a,b)=>npcAttackDamage(b.label,own,o)-npcAttackDamage(a.label,own,o))[0];
  this.evaluation={...evaluation,mode:'pivot'};this.pending=receiver.p.ident;this.lastExit=o.turn;this.lastPivot=o.turn;this.pivots++;return pivot.command;
 }
}
