import Showdown from 'pokemon-showdown';
import {CautiousSwitchingPolicy} from './switch-policy';
import type {Observation} from './policy';

const hp=(condition:string)=>{const [n,d]=condition.split(' ')[0].split('/').map(Number);return d>0?n/d:0;};
// Experimental player policy only. Consume publicly announced fields, never the engine state.
export class CompositionPolicy extends CautiousSwitchingPolicy {
 private fields=new Set<string>();
 private sideConditions=new Set<string>();
 private attempts=new Map<string,number>();
 private publicTurn=0;
 consumePublicLine(line:string){
  const p=line.split('|'),event=p[1],effect=Showdown.toID((p[event==='-sidestart'||event==='-sideend'?3:2]??'').replace(/^move: /,''));
  if(event==='turn')this.publicTurn=Number(p[2]);
  if(event==='move'&&p[2]?.startsWith('p1a:'))this.attempts.set(p[2].replace(/^p1a:/,'p1:')+':'+Showdown.toID(p[3]),this.publicTurn);
  if(event==='-fieldstart')this.fields.add(effect);
  if(event==='-fieldend')this.fields.delete(effect);
  if((event==='-sidestart'||event==='-sideend')&&p[2]?.startsWith('p1:')){if(event==='-sidestart')this.sideConditions.add(effect);else this.sideConditions.delete(effect);}
  if(event==='-weather'){this.fields.delete('snow');this.fields.delete('hail');if(['Snow','Hail'].includes(p[2]))this.fields.add(Showdown.toID(p[2]));}
 }
 override choose(o:Observation):string {
  const own=o.ownTeam.find(p=>p.active),enemy=o.opponent;
  if(!own||!enemy||!o.legalActions.some(a=>a.command.startsWith('move ')))return super.choose(o);
  const base=super.choose(o);
  // Keep a tactical retreat or an available finishing hit.
  if(!base.startsWith('move '))return base;
  const attacks=o.legalActions.filter(a=>/^move \d+$/.test(a.command)&&Showdown.Dex.moves.get(a.label).category!=='Status');
  if(Math.max(0,...attacks.map(a=>a.estimatedDamage))>=(Showdown.Dex.species.get(enemy.species).baseStats.hp+91)*hp(enemy.condition))return base;
  const allies=o.ownTeam.filter(p=>hp(p.condition)>0),target=Showdown.Dex.species.get(enemy.species),estimatedEnemySpeed=target.baseStats.spe+20;
  const candidates=o.legalActions.filter(a=>/^move \d+$/.test(a.command)).filter(a=>{
   const m=Showdown.Dex.moves.get(a.label),key=own.ident+':'+m.id;
   if(o.turn-(this.attempts.get(key)??-10)<3||hp(own.condition)<.3)return false;
   if(['reflect','lightscreen','auroraveil'].includes(m.id)){
    if(this.sideConditions.has(m.id)||allies.length<2)return false;
    if(m.id==='auroraveil')return this.fields.has('snow')||this.fields.has('hail');
    const last=Showdown.Dex.moves.get(o.lastOpponentMove??'');
    const physical=last.exists&&last.category!=='Status'?last.category==='Physical':target.baseStats.atk>=target.baseStats.spa;
    return m.id===(physical?'reflect':'lightscreen');
   }
   if(m.id==='trickroom')return !this.fields.has('trickroom')&&allies.filter(p=>p.stats.spe<estimatedEnemySpeed).length>=2&&allies.filter(p=>p.stats.spe>estimatedEnemySpeed).length===0;
   return false;
  });
  if(!candidates.length)return base;
  const action=candidates[0],move=Showdown.Dex.moves.get(action.label);
  return action.command;
 }
}
