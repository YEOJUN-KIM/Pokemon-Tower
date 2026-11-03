import Showdown from 'pokemon-showdown';
import type {Policy,Observation} from './policy';
import {ownHp,npcCanFinish} from './pivot-policy';
import {publicIncomingRisk,publicThreats} from './switch-evaluation';

// Opted into saved v2 encounter descriptors only. No changes to archived policies.
export class BuildSupportPolicy implements Policy{
 readonly switchingInformation=true;readonly uncertainSwitchingInformation=true;readonly fixedOrder:boolean|undefined;
 private field=new Set<string>();private used=new Set<string>();
 constructor(private inner:Policy){this.fixedOrder=inner.fixedOrder;}
 observePublicLine(line:string){
  this.inner.observePublicLine?.(line);const p=line.split('|');
  if(p[1]==='-sidestart')this.field.add(p[2].slice(0,2)+':'+Showdown.toID(p[3].replace('move: ','')));
  if(p[1]==='-sideend')this.field.delete(p[2].slice(0,2)+':'+Showdown.toID(p[3].replace('move: ','')));
  if(p[1]==='-weather'){this.field.delete('sun');this.field.delete('rain');this.field.delete('sand');this.field.delete('snow');const k=({SunnyDay:'sun',RainDance:'rain',Sandstorm:'sand',Snow:'snow'} as Record<string,string>)[p[2]];if(k)this.field.add(k);}
 }
 choose(o:Observation):string|Promise<string>{
  const own=o.ownTeam.find(p=>p.active&&ownHp(p)>0),foe=o.opponent;
  if(!own||!foe||npcCanFinish(o,own))return this.inner.choose(o);
  const risk=publicIncomingRisk(own,o,publicThreats(o,[])),hp=ownHp(own),last=Showdown.Dex.moves.get(o.lastOpponentMove??''),types=o.switching?.opponentTypes.length?o.switching.opponentTypes:Showdown.Dex.species.get(foe.species).types;
  const support=o.legalActions.find(a=>{
   if(!/^move \d+$/.test(a.command))return false;
   const m=Showdown.Dex.moves.get(a.label),key=own.ident+':'+foe.species+':'+m.id;
   if(m.category!=='Status'||this.used.has(key))return false;
   if(['synthesis','moonlight','morningsun','shoreup'].includes(m.id))return hp<.5&&risk<hp*.8;
   if(['reflect','lightscreen'].includes(m.id))return hp>.6&&risk<hp*.65&&o.ownTeam.filter(p=>ownHp(p)>0).length>=2&&!this.field.has('p2:'+m.id)&&(m.id==='reflect'?last.category!=='Special':last.category!=='Physical');
   if(['stealthrock','spikes','toxicspikes','stickyweb'].includes(m.id))return hp>.6&&risk<hp*.6&&!this.field.has('p1:'+m.id);
   if(['spore','sleeppowder','glare','yawn'].includes(m.id))return hp>.4&&!foe.condition.split(' ')[1]&&!types.includes('Grass')&&(m.id!=='glare'||!types.includes('Electric'));
   const weather=({sunnyday:['sun','Chlorophyll','Solar Power'],raindance:['rain','Swift Swim'],sandstorm:['sand','Sand Rush'],snowscape:['snow','Slush Rush']} as Record<string,string[]>)[m.id];
   return !!weather&&!this.field.has(weather[0])&&weather.includes(Showdown.Dex.abilities.get(own.ability??'').name)&&hp>.65&&risk<hp*.5;
  });
  if(support){this.used.add(own.ident+':'+foe.species+':'+Showdown.toID(support.label));return support.command;}
  return this.inner.choose(o);
 }
}
