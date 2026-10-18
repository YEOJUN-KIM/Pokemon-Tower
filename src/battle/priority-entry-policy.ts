import Showdown from 'pokemon-showdown';
import {estimateDamage,type Policy,type Observation,type OwnPokemon,type Action} from './policy';
import {PublicImmunityV2} from './public-immunity-v2';
import {hpFraction} from './z-decision';

const firstActionMoves=new Set(['firstimpression','fakeout']);
const key=(ident:string)=>ident.replace(/^p2[a-z]?:/,'p2:');
const hp=(p:OwnPokemon)=>hpFraction(p.condition)??0;
const types=(p:OwnPokemon)=>p.terastallized&&p.terastallized!=='Stellar'?[p.terastallized]:Showdown.Dex.species.get(p.details.split(',')[0]).types;
const effectiveness=(type:string,defending:string[])=>Showdown.Dex.getImmunity(type,defending)?2**Showdown.Dex.getEffectiveness(type,defending):0;
const stageMultiplier=(stage:number)=>stage>=0?(2+stage)/2:2/(2-stage);

/** Own entry/action history and public opponent evidence; no hidden set access.
 * The archived v12 scorer and Z/checkpoint behavior remain untouched. */
export class PriorityEntryPolicy implements Policy {
 readonly switchingInformation:boolean;readonly uncertainSwitchingInformation:boolean;
 private entryUsed=new Map<string,boolean>();private departed=new Map<string,number>();
 private active='';private turn=0;private voluntary=0;private lastSwitch=-10;
 private memory=new PublicImmunityV2();
 constructor(private inner:Policy,private switching:boolean){this.switchingInformation=!!inner.switchingInformation;this.uncertainSwitchingInformation=!!inner.uncertainSwitchingInformation;}
 observePublicLine(line:string){
  this.inner.observePublicLine?.(line);this.memory.consume(line.replace(/\bp([12])(?=[a-z]?:)/g,(_,n)=>'p'+(n==='1'?'2':'1')));
  const p=line.split('|');if(p[1]==='turn')this.turn=Number(p[2]);
  if(['switch','drag'].includes(p[1])&&p[2]?.startsWith('p2')){const next=key(p[2]);if(this.active&&this.active!==next)this.departed.set(this.active,this.turn);this.active=next;this.entryUsed.set(next,false);}
 }
 private damage(moveName:string,p:OwnPokemon,o:Observation){
  if(!o.opponent||this.memory.blocked(moveName,p,o))return 0;
  const move=Showdown.Dex.moves.get(moveName),target=Showdown.Dex.species.get(o.opponent.species),visible=o.switching?.opponentTypes.length?o.switching.opponentTypes:target.types;
  if(move.category==='Status'||!effectiveness(move.type,visible))return 0;
  const original=effectiveness(move.type,target.types);let value=estimateDamage(moveName,p,o.opponent.species);
  if(original)value*=effectiveness(move.type,visible)/original;
  else {const defense=(move.category==='Physical'?target.baseStats.def:target.baseStats.spd)+20;value=((22*move.basePower*(move.category==='Physical'?p.stats.atk:p.stats.spa)/defense)/50+2)*effectiveness(move.type,visible)*(types(p).includes(move.type)?1.5:1)*.925;}
  if(Showdown.toID(p.ability)==='technician'&&move.basePower>0&&move.basePower<=60)value*=1.5;
  if(Showdown.toID(p.ability)==='toughclaws'&&move.flags.contact)value*=1.3;
  if(p.active)value*=stageMultiplier(o.switching?.boosts[move.category==='Physical'?'atk':'spa']??0);
  return value;
 }
 private priority(moveName:string,p:OwnPokemon){const m=Showdown.Dex.moves.get(moveName);return m.priority+(Showdown.toID(p.ability)==='galewings'&&hp(p)===1&&m.type==='Flying'?1:0);}
 private targetHP(o:Observation){return (Showdown.Dex.species.get(o.opponent!.species).baseStats.hp+91)*(hpFraction(o.opponent!.condition)??1);}
 private incoming(p:OwnPokemon,o:Observation){
  const foe=Showdown.Dex.species.get(o.opponent!.species),last=Showdown.Dex.moves.get(o.lastOpponentMove??'');
  const attacks=last.exists&&last.category!=='Status'?[last]:foe.types.map(type=>({type,basePower:80,category:foe.baseStats.atk>=foe.baseStats.spa?'Physical':'Special'}));
  return Math.max(0,...attacks.map(m=>{const ability=Showdown.toID(p.ability),item=Showdown.toID(p.item);
   if(m.type==='Ground'&&(ability==='levitate'||item==='airballoon')||m.type==='Water'&&['stormdrain','waterabsorb','dryskin'].includes(ability)||m.type==='Electric'&&['voltabsorb','lightningrod','motordrive'].includes(ability)||m.type==='Fire'&&ability==='flashfire')return 0;
   return ((22*(m.basePower||70)*((m.category==='Physical'?foe.baseStats.atk:foe.baseStats.spa)+20)/Math.max(1,m.category==='Physical'?p.stats.def:p.stats.spd))/50+2)*1.5*effectiveness(m.type,types(p));}));
 }
 private entryCost(p:OwnPokemon,o:Observation){const h=o.switching?.hazards,ability=Showdown.toID(p.ability),item=Showdown.toID(p.item);if(!h||item==='heavydutyboots'||ability==='magicguard')return 0;const t=types(p),grounded=!t.includes('Flying')&&ability!=='levitate'&&item!=='airballoon';return (h.stealthRock?effectiveness('Rock',t)/8:0)+(grounded?[0,1/8,1/6,1/4][h.spikes]:0);}
 private finishingPriority(o:Observation,own:OwnPokemon):Action|undefined{
  if(!o.opponent)return;
  const actions=o.legalActions.filter(a=>/^move \d+$/.test(a.command)),best=Math.max(0,...actions.map(a=>this.damage(a.label,own,o))),targetHP=this.targetHP(o),enemy=Showdown.Dex.species.get(o.opponent.species),boost=o.switching?.boosts.spe??0;
  const speed=own.stats.spe*(boost>=0?(2+boost)/2:2/(2-boost))*(own.condition.includes('par')?.5:1),slower=speed<enemy.baseStats.spe+20,maxHP=Number(own.condition.split(' ')[0].split('/')[1])||100,danger=this.incoming(own,o)>=maxHP*hp(own);
  return actions.filter(a=>{const move=Showdown.Dex.moves.get(a.label),damage=this.damage(a.label,own,o);
   if(move.category==='Status'||this.priority(a.label,own)<=0||damage<=0||move.accuracy!==true&&move.accuracy<90)return false;
   if(move.id==='suckerpunch'&&Showdown.Dex.moves.get(o.lastOpponentMove??'').category==='Status')return false;
   return damage*.85/.925>=targetHP||slower&&danger&&damage>=best*.9;
  }).sort((a,b)=>this.priority(b.label,own)-this.priority(a.label,own)||this.damage(b.label,own,o)-this.damage(a.label,own,o))[0];
 }
 private reentry(o:Observation,own:OwnPokemon|undefined):Action|undefined{
  if(!this.switching||!o.opponent||o.switching?.maybeTrapped)return;
  const forced=!o.legalActions.some(a=>a.command.startsWith('move '));
  if(!forced&&(this.voluntary>=4||o.turn-this.lastSwitch<3||o.switching?.dynamax||!own||hp(own)<.2))return;
  const current=own?Math.max(0,...o.legalActions.filter(a=>/^move \d+$/.test(a.command)).map(a=>this.damage(a.label,own,o))):0,targetHP=this.targetHP(o);
  if(!forced&&current*.85/.925>=targetHP)return;
  return o.legalActions.filter(a=>a.command.startsWith('switch ')).map(a=>({a,p:o.ownTeam[Number(a.command.split(' ')[1])-1]})).filter(({p})=>p&&(p.moves??[]).some(m=>Showdown.toID(m)==='firstimpression')).filter(({p})=>{
   const maxHP=Number(p.condition.split(' ')[0].split('/')[1])||100,remaining=maxHP*(hp(p)-this.entryCost(p,o)),hit=this.damage('First Impression',p,o);
   if(remaining<=0||hit*.85/.925<targetHP)return false;if(forced)return true;
   return o.turn-(this.departed.get(key(p.ident))??-10)>=3&&this.incoming(p,o)<remaining*.7&&!!own&&(current===0||this.incoming(own,o)>=(Number(own.condition.split(' ')[0].split('/')[1])||100)*hp(own));
  }).sort((a,b)=>this.damage('First Impression',b.p,o)-this.damage('First Impression',a.p,o))[0]?.a;
 }
 private depletedPivot(o:Observation,own:OwnPokemon|undefined):Action|undefined{
  if(!this.switching||!own||!o.opponent||hp(own)<=.15||!Object.entries(o.switching?.boosts??{}).some(([s,n])=>['atk','spa'].includes(s)&&n<=-2))return;
  const ordinary=o.legalActions.filter(a=>/^move \d+$/.test(a.command)),best=Math.max(0,...ordinary.map(a=>this.damage(a.label,own,o)));
  if(best*.85/.925>=this.targetHP(o))return;
  const enemy=Showdown.Dex.species.get(o.opponent.species),speed=own.stats.spe*stageMultiplier(o.switching?.boosts.spe??0)*(own.condition.includes('par')?.5:1),maxHP=Number(own.condition.split(' ')[0].split('/')[1])||100;
  if(speed<enemy.baseStats.spe+20&&this.incoming(own,o)>=maxHP*hp(own)*.8)return;
  const receivers=o.ownTeam.filter(p=>!p.active&&hp(p)>this.entryCost(p,o)+.2);
  if(!receivers.some(p=>Math.max(0,...(p.moves??[]).map(m=>this.damage(m,p,o)))>best*1.25))return;
  return ordinary.filter(a=>Showdown.Dex.moves.get(a.label).selfSwitch===true&&this.damage(a.label,own,o)>0).sort((a,b)=>this.damage(b.label,own,o)-this.damage(a.label,own,o))[0];
 }
 choose(original:Observation):string{
  const own=original.ownTeam.find(p=>p.active&&hp(p)>0),k=own?key(own.ident):'';if(own&&this.active!==k){if(this.active)this.departed.set(this.active,original.turn);this.active=k;this.entryUsed.set(k,false);}if(own&&!this.entryUsed.has(k))this.entryUsed.set(k,false);this.memory.observeOwn(own);
  const conditionalTeam=original.ownTeam.some(p=>(p.moves??[]).some(m=>Showdown.toID(m)==='firstimpression'));
  const actions=original.legalActions.filter(a=>{
   if(/^move \d+(?: (?:mega|terastallize))?$/.test(a.command)&&firstActionMoves.has(Showdown.Dex.moves.get(a.label).id)&&this.entryUsed.get(k))return false;
   if(this.switching&&/^move \d+$/.test(a.command)&&Showdown.Dex.moves.get(a.label).id==='suckerpunch'){
    const last=Showdown.Dex.moves.get(original.lastOpponentMove??'');
    if(last.exists&&last.category==='Status'&&original.legalActions.some(b=>/^move \d+$/.test(b.command)&&Showdown.Dex.moves.get(b.label).id!=='suckerpunch'&&Showdown.Dex.moves.get(b.label).category!=='Status'))return false;
   }
   if(conditionalTeam&&own&&a.command.startsWith('switch ')&&original.legalActions.some(a=>a.command.startsWith('move '))){const target=original.ownTeam[Number(a.command.split(' ')[1])-1];if(this.voluntary>=4||original.turn-this.lastSwitch<3||target&&original.turn-(this.departed.get(key(target.ident))??-10)<3)return false;}return true;
  });
  // A physically forced Encore/trap/empty-PP state may have no alternative;
  // never crash the battle or fabricate an action absent from the request.
  if(!actions.length){const forced=this.inner.choose(original);if(typeof forced!=='string')throw Error('Expected synchronous NPC policy');return forced;}
  const o={...original,legalActions:actions};
  // Leave Mega/Max/Tera resource turns with their established scorer. Max
  // attacks in particular do not inherit the original move's priority.
  const resourceTurn=o.legalActions.some(a=>/ (mega|dynamax|terastallize)$/.test(a.command));
  const chosen=(!resourceTurn&&this.switching&&own?this.finishingPriority(o,own):undefined)?.command??(!resourceTurn?this.reentry(o,own)?.command??this.depletedPivot(o,own)?.command:undefined)??this.inner.choose(o);
  if(typeof chosen!=='string')throw Error('Expected synchronous NPC policy');
  if(chosen.startsWith('move ')&&own)this.entryUsed.set(k,true);
  if(chosen.startsWith('switch ')&&own&&o.legalActions.some(a=>a.command.startsWith('move '))){this.voluntary++;this.lastSwitch=o.turn;this.departed.set(k,o.turn);}
  if(!this.switching&&chosen.startsWith('switch '))this.active='';
  return chosen;
 }
}
