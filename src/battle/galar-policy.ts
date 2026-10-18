import Showdown from 'pokemon-showdown';
import type {NpcAi} from '../data/npc-ai';
import {estimateDamage,type Observation,type Policy} from './policy';
import {hpFraction} from './z-decision';

/** Scoped to new Galar snapshots. Uses own requests and public battle events. */
export class GalarPolicy implements Policy {
 readonly fixedOrder:boolean;
 readonly switchingInformation=true;
 readonly uncertainSwitchingInformation=true;
 private used=new Set<string>();
 private hazards=new Set<string>();
 private lastMove='';private lastSwitch=-10;private switches=0;
 private trapped=new Set<string>();
 private veil=false;
 constructor(private inner:Policy,private style:NonNullable<NpcAi['galar']>){this.fixedOrder=style==='phases';}
 observePublicLine(line:string){
  this.inner.observePublicLine?.(line);
  const p=line.split('|');
  if(p[1]==='-sidestart'&&p[2]?.startsWith('p1'))this.hazards.add(Showdown.toID(p[3].replace('move: ','')));
  if(p[1]==='-sideend'&&p[2]?.startsWith('p1'))this.hazards.delete(Showdown.toID(p[3].replace('move: ','')));
  if(p[1]==='-sidestart'&&p[2]?.startsWith('p2')&&p[3].includes('Aurora Veil'))this.veil=true;
  if(p[1]==='-sideend'&&p[2]?.startsWith('p2')&&p[3].includes('Aurora Veil'))this.veil=false;
  if(p[1]==='-start'&&p[2]?.startsWith('p2')&&Showdown.toID(p[3].replace('move: ',''))==='noretreat')this.trapped.add(p[2].replace(/^p2[a-z]?:/,'p2:'));
 }
 choose(original:Observation):string{
  // Keep the designated finisher for the end while allowing the first pair to pivot.
  // Phase bosses use their fixed order below instead.
  if(this.style!=='phases'&&this.style!=='grunt'){
   const others=original.ownTeam.slice(0,2).some(p=>!p.active&&!p.condition.endsWith('fnt'));
   if(others){const actions=original.legalActions.filter(a=>a.command!=='switch 3');if(actions.length)original={...original,legalActions:actions};}
  }
  const own=original.ownTeam.find(p=>p.active),moves=original.legalActions.filter(a=>a.command.startsWith('move '));
  // Fixed phases also apply to forced replacements and U-turn style requests.
  if(!moves.length&&this.style==='phases')return original.legalActions[0].command;
  if(!own||!original.opponent)return this.inner.choose(original) as string;
  const hp=hpFraction(own.condition)??1,foe=Showdown.Dex.species.get(original.opponent.species);
  const incoming=original.lastOpponentMove?Showdown.Dex.moves.get(original.lastOpponentMove):undefined;
  const attacking=incoming?.exists&&incoming.category!=='Status';
  const visibleTypes=original.switching?.opponentTypes.length?original.switching.opponentTypes:foe.types;
  const ownTypes=Showdown.Dex.species.get(own.details.split(',')[0]).types;
  const danger=attacking?Showdown.Dex.getImmunity(incoming.type,ownTypes)&&Showdown.Dex.getEffectiveness(incoming.type,ownTypes)>0:foe.types.some(t=>Showdown.Dex.getEffectiveness(t,ownTypes)>0);
  const safe=hp>.65&&!danger;
  const ordinary=moves.filter(a=>/^move \d+$/.test(a.command));
  const best=Math.max(0,...ordinary.map(a=>estimateDamage(a.label,own,foe.name)));
  const targetHP=(foe.baseStats.hp+91)*(hpFraction(original.opponent.condition)??1);
  const finish=best>=targetHP;
  const active=this.style==='elite'||this.style==='champion'||this.style==='executive';
  let actions=original.legalActions.filter(a=>{
   if(!a.command.startsWith('switch '))return true;
   if(!moves.length)return true;
   if(this.style==='phases'||this.style==='grunt'||this.trapped.has(own.ident))return false;
   if(this.style==='brawler')return danger&&hp>.6&&original.turn-this.lastSwitch>=5&&this.switches<1;
   return active||danger&&original.turn-this.lastSwitch>=5&&this.switches<2;
  });
  if(!actions.length)actions=original.legalActions;
  // One safe boost per entry/set. No Retreat is also a real engine trap.
  const boosts=new Set(['swordsdance','noretreat','quiverdance','bulkup','calmmind','shiftgear']);
  const support=ordinary.find(a=>{
   const m=Showdown.Dex.moves.get(a.label),key=own.ident+':'+m.id;
   if(finish||this.used.has(key)&&m.id!=='kingsshield')return false;
   if(boosts.has(m.id))return safe||Showdown.toID(own.ability)==='disguise'&&hp>.85&&!danger;
   if(m.id==='stealthrock'||m.id==='stickyweb')return hp>.4&&!this.hazards.has(m.id)&&original.ownTeam.filter(p=>!p.condition.endsWith('fnt')).length>=2;
   if(m.id==='tailwind')return safe&&original.turn<=3;
   if(m.id==='taunt')return incoming?.category==='Status';
   if(m.id==='yawn'||m.id==='hypnosis')return hp>.5&&!original.opponent!.condition.split(' ')[1]&&best<targetHP*.6;
   if(m.id==='encore')return incoming?.category==='Status'&&incoming.id!=='encore';
   if(m.id==='destinybond')return hp<.3&&own.stats.spe>=foe.baseStats.spe+20&&this.lastMove!==m.id;
   if(m.id==='kingsshield')return hp<.65&&attacking&&own.details.startsWith('Aegislash-Blade')&&this.lastMove!==m.id;
   if(m.id==='mirrorcoat')return hp>.5&&attacking&&incoming.category==='Special'&&own.stats.spe<foe.baseStats.spe+20;
   return false;
  });
  // Do not spend consecutive turns on a failed setup/protection/status attempt.
  actions=actions.filter(a=>{
   const m=Showdown.Dex.moves.get(a.label);
   if(!/^move \d+$/.test(a.command))return true;
   if(boosts.has(m.id))return safe&&!this.used.has(own.ident+':'+m.id);
   if(['destinybond','kingsshield','mirrorcoat'].includes(m.id))return a===support;
   return !this.hazards.has(m.id);
  });
  if(!actions.length)actions=original.legalActions.filter(a=>a.command.startsWith('move '));
  let choice=support&&actions.includes(support)?support.command:this.inner.choose({...original,legalActions:actions}) as string;
  // Max effects have strategic value even when their source move is weaker.
  const max=actions.filter(a=>a.command.endsWith(' dynamax')||original.switching?.dynamax&&a.command.startsWith('move ')).filter(a=>a.label!=='Max Guard');
  if(max.length&&!support&&(!finish||this.style==='phases')&&choice.startsWith('move ')){
   const score=(a:typeof max[number])=>{
    const m=Showdown.Dex.moves.get(a.label);
    if(!Showdown.Dex.getImmunity(m.type,visibleTypes))return -1;
    let bonus=0;
    if(m.id==='gmaxresonance'&&!this.veil)bonus=65;
    if(['gmaxwildfire','gmaxvolcalith','gmaxcentiferno'].includes(m.id))bonus=35;
    return a.estimatedDamage+bonus;
   };
   const strongest=[...max].sort((a,b)=>score(b)-score(a))[0];
   if(score(strongest)>0)choice=strongest.command;
  }
  const selected=actions.find(a=>a.command===choice);
  if(selected&&choice.startsWith('move ')){
   this.lastMove=Showdown.Dex.moves.get(selected.label).id;
   if(Showdown.Dex.moves.get(selected.label).category==='Status')this.used.add(own.ident+':'+this.lastMove);
  }
  if(choice.startsWith('switch ')&&moves.length){this.lastSwitch=original.turn;this.switches++;}
  return choice;
 }
}
