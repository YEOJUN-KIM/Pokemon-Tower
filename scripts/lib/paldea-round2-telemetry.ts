import Showdown from 'pokemon-showdown';
import type {BattleLog} from '../../src/battle/run';
import {npcCanFinish} from '../../src/battle/pivot-policy';
import {paldeaTuningTelemetry} from './paldea-tuning-telemetry';
import {galarTuningTelemetry} from './galar-tuning-telemetry';

const actor=(s:string)=>s.replace(/^p[12][a-z]?: /,'');
const hp=(s:string)=>{const [a,b]=s.split(' ')[0].split('/').map(Number);return b?a/b:a===0?0:1;};
export function paldeaRound2Telemetry(log:BattleLog){
 const common=paldeaTuningTelemetry(log),base=galarTuningTelemetry(log,common.team[2]),dex=Showdown.Dex;
 const out={...common,kos:base.directKOs,galladeRecoilKO:0,galladeSuperHits:0,galladeSuperDamage:0,galladeBeltChoices:0,galladeSuboptimalRawChoices:0,airChoices:0,hurricaneChoices:0,bothFlyingAvailable:0,hurricaneOverReliableKO:0,tauntRepeats:0,recoverRepeats:0,highHpRecover:0,statusOverKO:0,teraTypeImmuneChoices:0,haxDanceThenDamage:0,haxDanceDamage:0,toxicSpikesSelected:0,toxicSpikesInstalled:0,toxicSpikesOverstack:0,toxicSpikesPoisoned:0,toxicSpikesPoisonDamage:0,toxicSpikesPoisonAbsorptions:0,playerVoluntary:0};
 for(const d of log.decisions){
  const o=d.observation,own=o.ownTeam.find(p=>p.active),a=o.legalActions.find(a=>a.command===d.action);if(!own||!a)continue;
  if(d.side==='p1'){if(d.action.startsWith('switch ')&&o.legalActions.some(a=>a.command.startsWith('move ')))out.playerVoluntary++;continue;}
  const m=dex.moves.get(a.label),ordinary=o.legalActions.filter(a=>/^move \d+$/.test(a.command));
  if(a.label==='Toxic Spikes')out.toxicSpikesSelected++;
  if(d.action.startsWith('move ')&&m.category==='Status'&&npcCanFinish(o,own))out.statusOverKO++;
  if(a.label==='Recover'&&hp(own.condition)>.65)out.highHpRecover++;
  if(own.details.startsWith('Kilowattrel')){
   if(a.label==='Air Slash')out.airChoices++;if(a.label==='Hurricane')out.hurricaneChoices++;
   const air=ordinary.find(a=>a.label==='Air Slash'),hurricane=ordinary.find(a=>a.label==='Hurricane');if(air&&hurricane)out.bothFlyingAvailable++;
   if(a.label==='Hurricane'&&air&&npcCanFinish(o,own,[air]))out.hurricaneOverReliableKO++;
  }
  if(own.details.startsWith('Gallade')&&own.item==='Expert Belt'&&d.action.startsWith('move ')){
   out.galladeBeltChoices++;if(ordinary.some(b=>b.estimatedDamage>a.estimatedDamage+1e-6))out.galladeSuboptimalRawChoices++;
  }
  if(own.terastallized&&d.action.startsWith('move ')&&m.category!=='Status'){
   const type=m.id==='terablast'?own.terastallized:m.type,types=o.switching?.opponentTypes.length?o.switching.opponentTypes:dex.species.get(o.opponent?.species??'').types;
   if(!dex.getImmunity(type,types))out.teraTypeImmuneChoices++;
  }
 }
 const health=new Map<string,number>(),poisonVictims=new Set<string>(),lastOwn=new Map<string,string>();
 let source='',move='',superEffective=false,layers=0,entering=false,playerSpecies='',danced=false;
 for(const line of log.publicProtocol){
  const p=line.split('|'),event=p[1],who=p[2]??'',name=actor(who),value=p[3]??'',npc=who.startsWith('p2');
  if(['switch','drag'].includes(event)){
   health.set(who.slice(0,2)+':'+name,hp(p[4]??'100/100'));
   if(who.startsWith('p1')){entering=true;playerSpecies=value.split(',')[0];}
   if(npc){lastOwn.delete(name);if(name==='Haxorus')danced=false;}
  }
  if(event==='turn')entering=false;
  if(event==='move'){
   entering=false;source=npc?name:'';move=value;superEffective=false;
   if(npc){const previous=lastOwn.get(name);if(name==='Noivern'&&value==='Taunt'&&previous===value)out.tauntRepeats++;if(name==='Clodsire'&&value==='Recover'&&previous===value)out.recoverRepeats++;lastOwn.set(name,value);}
   if(npc&&value==='Toxic Spikes'&&layers>=2)out.toxicSpikesOverstack++;
  }
  if(event==='-boost'&&name==='Haxorus'&&npc&&value==='atk'&&source==='Haxorus'&&move==='Dragon Dance')danced=true;
  if(event==='-supereffective'&&who.startsWith('p1'))superEffective=true;
  if(event==='-sidestart'&&who.startsWith('p1')&&value==='move: Toxic Spikes'){layers=Math.min(2,layers+1);out.toxicSpikesInstalled++;}
  if(event==='-sideend'&&who.startsWith('p1')&&value==='move: Toxic Spikes'){
   if(entering&&dex.species.get(playerSpecies).types.includes('Poison'))out.toxicSpikesPoisonAbsorptions++;layers=0;
  }
  if(event==='-status'&&who.startsWith('p1')&&entering&&layers>0&&['psn','tox'].includes(value)){poisonVictims.add(name);out.toxicSpikesPoisoned++;}
  if(event==='-curestatus'&&who.startsWith('p1'))poisonVictims.delete(name);
  if(['-damage','-heal'].includes(event)){
   const key=who.slice(0,2)+':'+name,old=health.get(key)??1,now=hp(value),damage=Math.max(0,old-now)*100;health.set(key,now);
   if(event==='-damage'){
    const direct=!p.slice(4).some(s=>s.startsWith('[from]'));
    if(who.startsWith('p1')&&source==='Gallade'&&superEffective&&direct){out.galladeSuperHits++;out.galladeSuperDamage+=damage;}
    if(who.startsWith('p1')&&source==='Haxorus'&&danced&&direct&&damage>0){out.haxDanceThenDamage++;out.haxDanceDamage+=damage;}
    if(who.startsWith('p1')&&poisonVictims.has(name)&&p.slice(4).some(s=>/\[from\] (psn|tox)$/.test(s)))out.toxicSpikesPoisonDamage+=damage;
    if(npc&&name==='Gallade'&&now===0&&line.includes('[from] item: Life Orb'))out.galladeRecoilKO++;
   }
  }
 }
 return out;
}
