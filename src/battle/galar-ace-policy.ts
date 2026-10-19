import Showdown from 'pokemon-showdown';
import type {Observation,Policy} from './policy';
import {npcCanFinish,ownHp} from './pivot-policy';
import {PublicImmunityV2} from './public-immunity-v2';

const key=(s:string)=>s.replace(/^p2[a-z]?:/,'p2:');
/** New champion decisions only; historical GalarPolicy remains frozen. */
export class GalarAcePolicy implements Policy {
 readonly switchingInformation=true;readonly uncertainSwitchingInformation=true;readonly fixedOrder:boolean|undefined;
 private blade=new Set<string>();private aegislash=new Set<string>();private turn=0;
 private lastShield=new Map<string,number>();private exploited=new Map<string,number>();
 private immunity=new PublicImmunityV2();private wildfire=false;
 constructor(private inner:Policy){this.fixedOrder=inner.fixedOrder;}
 observePublicLine(line:string){
  this.inner.observePublicLine?.(line);this.immunity.consume(line.replace(/\bp([12])(?=[a-z]?:)/g,(_,n)=>'p'+(n==='1'?'2':'1')));
  const p=line.split('|'),who=p[2]??'',k=key(who),event=p[1],value=p[3]??'';
  if(event==='turn')this.turn=Number(who);
  if(['switch','drag'].includes(event)&&who.startsWith('p2')){this.blade.delete(k);if(Showdown.Dex.species.get(value.split(',')[0]).baseSpecies==='Aegislash')this.aegislash.add(k);}
  if(event==='-formechange'&&who.startsWith('p2')&&value.startsWith('Aegislash')){this.aegislash.add(k);if(value==='Aegislash-Blade')this.blade.add(k);else this.blade.delete(k);}
  if(event==='move'&&who.startsWith('p2')&&this.aegislash.has(k)){
   const m=Showdown.Dex.moves.get(value);if(m.id==='kingsshield')this.blade.delete(k);else if(m.category!=='Status')this.blade.add(k);
  }
  if(event==='move'&&who.startsWith('p1')&&Showdown.Dex.moves.get(value).category==='Status')for(const [ident,turn]of this.lastShield)if(turn===this.turn)this.exploited.set(ident,this.turn);
  if(event==='-sidestart'&&who.startsWith('p1')&&value.includes('G-Max Wildfire'))this.wildfire=true;
  if(event==='-sideend'&&who.startsWith('p1')&&value.includes('G-Max Wildfire'))this.wildfire=false;
 }
 choose(original:Observation):string|Promise<string>{
  const own=original.ownTeam.find(p=>p.active&&ownHp(p)>0);if(!own||!original.opponent)return this.inner.choose(original);
  const species=Showdown.Dex.species.get(own.details.split(',')[0]),k=key(own.ident);
  this.immunity.observeOwn(own);
  let actions=original.legalActions;
  if(species.baseSpecies==='Charizard'){
   const filtered=actions.filter(a=>Showdown.Dex.moves.get(a.label).id!=='solarbeam');
   if(filtered.length)actions=filtered;
   const o={...original,legalActions:actions},ordinary=actions.filter(a=>!this.immunity.blocked(a.label,own,o));
   if(!npcCanFinish(o,own,ordinary)){
    const max=actions.filter(a=>a.command.endsWith(' dynamax')&&a.label!=='Max Guard'&&!this.immunity.blocked(a.label,own,o));
    const score=(a:typeof max[number])=>a.estimatedDamage+(Showdown.Dex.moves.get(a.label).id==='gmaxwildfire'&&!this.wildfire?35:0);
    if(max.length)return [...max].sort((a,b)=>score(b)-score(a))[0].command;
   }
  }
  if(species.baseSpecies==='Aegislash'){
   const shield=actions.find(a=>/^move \d+$/.test(a.command)&&Showdown.Dex.moves.get(a.label).id==='kingsshield'),last=Showdown.Dex.moves.get(original.lastOpponentMove??''),foe=Showdown.Dex.species.get(original.opponent.species);
   const cool=original.turn-(this.lastShield.get(k)??-10)>=3&&original.turn-(this.exploited.get(k)??-10)>=5;
   const threat=ownHp(own)<=.65||last.exists&&last.category!=='Status'||foe.baseStats.atk>foe.baseStats.spa*1.2;
   if(shield&&this.blade.has(k)&&cool&&threat&&!(last.exists&&last.category==='Status'&&ownHp(own)>.35)&&!npcCanFinish(original,own,actions.filter(a=>!this.immunity.blocked(a.label,own,original)))){this.lastShield.set(k,original.turn);return shield.command;}
   // Even a reconnected/failed Shield request cannot cause consecutive spam.
   if(!cool)actions=actions.filter(a=>a!==shield);
  }
  return this.inner.choose({...original,legalActions:actions.length?actions:original.legalActions});
 }
}
