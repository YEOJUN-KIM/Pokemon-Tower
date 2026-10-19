import Showdown from 'pokemon-showdown';
import type {Action,Observation,OwnPokemon,Policy} from './policy';
import {ownHp,ownTypes,npcAttackDamage,npcCanFinish} from './pivot-policy';
import {PublicImmunityV2} from './public-immunity-v2';
import {publicIncomingRisk,publicThreats} from './switch-evaluation';
import {publicMoveEffectiveness} from '../data/type-effectiveness';

/** Public singles adaptations. The engine owns abilities, item consumption,
 * generation-9 Protean, move restrictions and actual Tera damage. */
export class PaldeaPolicy implements Policy{
 readonly switchingInformation=true;readonly uncertainSwitchingInformation=true;readonly fixedOrder:boolean;
 private used=new Set<string>();private fields=new Set<string>();private lastMove='';private lastEntry='';
 private immunity=new PublicImmunityV2();
 constructor(private inner:Policy,private style:'gym'|'elite'|'champion'|'hidden'|'event',private ace:string){this.fixedOrder=style==='champion'||style==='event';}
 observePublicLine(line:string){
  this.inner.observePublicLine?.(line);this.immunity.consume(line.replace(/\bp([12])(?=[a-z]?:)/g,(_,n)=>'p'+(n==='1'?'2':'1')));
  const p=line.split('|'),side=p[2]?.slice(0,2),field=Showdown.toID(p[3]?.replace('move: ','')??'');
  if(p[1]==='-sidestart')this.fields.add(side+':'+field);if(p[1]==='-sideend')this.fields.delete(side+':'+field);
  if(p[1]==='-weather'){if(p[2]==='SunnyDay')this.fields.add('sun');else if(p[2]!=='[upkeep]')this.fields.delete('sun');}
 }
 private damage(a:Action,p:OwnPokemon,o:Observation){
  const dex=Showdown.Dex,m=dex.moves.get(a.label);let n=npcAttackDamage(a.label,p,o);
  const tera=a.command.endsWith(' terastallize')?this.teraType:p.terastallized;
  if(m.id==='terablast'&&tera&&o.opponent){const types=o.switching?.opponentTypes.length?o.switching.opponentTypes:dex.species.get(o.opponent.species).types;n=((22*80*Math.max(p.stats.atk,p.stats.spa)/100)/50+2)*(dex.getImmunity(tera,types)?2**dex.getEffectiveness(tera,types):0)*1.5;}
  else if(p.terastallized===m.type)n*=dex.species.get(p.details.split(',')[0]).types.includes(m.type)?4/3:1.5;
  if(m.id==='hex'&&o.opponent?.condition.split(' ')[1])n*=2;
  if(m.id==='lastrespects')n*=1+o.ownTeam.filter(p=>ownHp(p)===0).length;
  if(m.id==='bodypress'){const boost=o.switching?.boosts.def??0;n*=p.stats.def/Math.max(1,p.stats.atk)*(boost>=0?(2+boost)/2:2/(2-boost));}
  if(Showdown.toID(p.ability)==='sharpness'&&m.flags.slicing)n*=1.5;
  if(Showdown.toID(p.ability)==='megalauncher'&&m.flags.pulse)n*=1.5;
  if(Showdown.toID(p.ability)==='punkrock'&&m.flags.sound)n*=1.3;
  if(Showdown.toID(p.ability)==='ironfist'&&m.flags.punch)n*=1.2;
  if(Showdown.toID(p.item)==='throatspray'&&m.flags.sound)n*=1.12;
  if(Showdown.toID(p.ability)==='supremeoverlord')n*=1+o.ownTeam.filter(p=>ownHp(p)===0).length*.1;
  if(m.id==='suckerpunch'&&Showdown.Dex.moves.get(o.lastOpponentMove??'').category==='Status')n*=.25;
  return n;
 }
 choose(original:Observation):string|Promise<string>{
  let o=original,actions=o.legalActions;
  const moving=actions.some(a=>a.command.startsWith('move '));
  if(!moving&&this.fixedOrder)return actions[0].command;
  const own=o.ownTeam.find(p=>p.active&&ownHp(p)>0);if(!own||!o.opponent)return this.inner.choose(o);
  const dex=Showdown.Dex;this.immunity.observeOwn(own);
  if(own.ident!==this.lastEntry){this.lastEntry=own.ident;this.lastMove='';}
  const risk=publicIncomingRisk(own,o,publicThreats(o,[])),safe=ownHp(own)>.6&&risk<.25;
  const finish=npcCanFinish(o,own),last=dex.moves.get(o.lastOpponentMove??'');
  actions=actions.filter(a=>!a.command.startsWith('switch '));
  if(this.style==='event'||!own.details.startsWith(this.ace))actions=actions.filter(a=>!a.command.endsWith(' terastallize'));
  const ordinary=actions.filter(a=>/^move \d+$/.test(a.command));
  const support=ordinary.find(a=>{
   const m=dex.moves.get(a.label),key=own.ident+':'+m.id;if(finish||this.used.has(key))return false;
   // Poppy Light Screen begin: scoped to the reviewed middle, no shared AI changes.
   if(m.id==='lightscreen'&&this.ace==='Tinkaton'&&own.details.split(',')[0]==='Magnezone'){
    const incoming=publicIncomingRisk(own,o,publicThreats(o,[]).filter(t=>t.category==='Special'&&t.weight===1));
    const sturdy=Showdown.toID(own.ability)==='sturdy'&&ownHp(own)===1;
    return !this.fields.has('p2:lightscreen')&&o.ownTeam.some(p=>!p.active&&ownHp(p)>0)&&last.exists&&last.category==='Special'&&incoming>=.12&&(sturdy||incoming<ownHp(own)*.8);
   }
   // Poppy Light Screen end.
   if(m.id==='stealthrock')return !this.fields.has('p1:stealthrock')&&ownHp(own)>.35&&o.ownTeam.filter(p=>ownHp(p)>0).length>=2;
   if(m.id==='sunnyday')return !this.fields.has('sun')&&ownHp(own)>.4;
   if(m.id==='tailwind')return !this.fields.has('p2:tailwind')&&ownHp(own)>.65&&o.turn<=3;
   if(m.id==='reflect')return !this.fields.has('p2:reflect')&&safe&&dex.species.get(o.opponent!.species).baseStats.atk>=dex.species.get(o.opponent!.species).baseStats.spa;
   if(['spore','willowisp','toxic','leechseed'].includes(m.id)){
    const types=o.switching?.opponentTypes.length?o.switching.opponentTypes:dex.species.get(o.opponent!.species).types;
    if(ownHp(own)<.4||this.lastMove===m.id||o.opponent!.condition.split(' ')[1])return false;
    return m.id==='spore'?!types.includes('Grass'):m.id==='willowisp'?!types.includes('Fire')&&last.category!=='Status':m.id==='toxic'?!types.some(t=>['Poison','Steel'].includes(t))&&safe:!types.includes('Grass')&&safe;
   }
   if(m.id==='encore'||m.id==='taunt')return last.exists&&last.category==='Status';
   if(['swordsdance','dragondance','quiverdance','calmmind','irondefense'].includes(m.id))return safe||Showdown.toID(own.ability)==='disguise'&&ownHp(own)>.9;
   if(['recover','roost'].includes(m.id))return ownHp(own)<.5&&risk<ownHp(own)*.8;
   return false;
  });
  const attacks=actions.filter(a=>{
   const m=dex.moves.get(a.label);if(m.category==='Status')return false;
   if(m.id==='terablast'&&(own.terastallized||a.command.endsWith(' terastallize'))){const type=own.terastallized||this.teraType,types=o.switching?.opponentTypes.length?o.switching.opponentTypes:dex.species.get(o.opponent!.species).types;return publicMoveEffectiveness({type,defending:types,ability:this.immunity.context().revealedAbility,ownAbility:own.ability,move:m.id})>0;}
   return !this.immunity.blocked(a.label,own,o);
  });
  const scored=attacks.map(a=>{
   const m=dex.moves.get(a.label);let damage=this.damage(a,own,o);
   if(a.command.endsWith(' terastallize')){
    const type=dex.species.get(own.details.split(',')[0]).name===this.ace?o.ownTeam.find(p=>p.ident===own.ident)?.terastallized:undefined;
    // Packed own request does not expose its unused Tera type; each reviewed
    // ace has an explicit plan supplied to this policy by its factory.
    const tera=this.teraType;
    const moveType=m.id==='terablast'?tera:m.type;
    if(m.id==='terablast'&&tera&&o.opponent){const types=o.switching?.opponentTypes.length?o.switching.opponentTypes:dex.species.get(o.opponent.species).types;damage=((22*80*Math.max(own.stats.atk,own.stats.spa)/100)/50+2)*(dex.getImmunity(tera,types)?2**dex.getEffectiveness(tera,types):0)*1.5;}
    else if(moveType===tera)damage*=ownTypes(own).includes(tera)?4/3:1.5;
    const late=o.ownTeam.filter(p=>ownHp(p)>0).length<=1;
    if(!late&&moveType!==tera&&!type)damage*=.7;
    if(this.style==='hidden'&&m.id==='uturn')damage*=.65;
    damage*=1.02;
   }
   if(own.terastallized&&this.style==='hidden'&&m.id==='uturn')damage*=.6;
   return {a,damage};
  }).sort((a,b)=>b.damage-a.damage);
  let choice=support?.command??scored[0]?.a.command??this.inner.choose({...o,legalActions:actions.length?actions:o.legalActions});
  if(typeof choice!=='string')return choice;
  const selected=actions.find(a=>a.command===choice);
  if(selected){this.lastMove=dex.moves.get(selected.label).id;if(dex.moves.get(selected.label).category==='Status')this.used.add(own.ident+':'+this.lastMove);}
  return choice;
 }
 private teraType='';
 withTera(type:string|null){this.teraType=type??'';return this;}
}
