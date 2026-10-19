import Showdown from 'pokemon-showdown';
import type {BattleLog} from '../../src/battle/run';
import {galarTuningTelemetry} from './galar-tuning-telemetry';

const actor=(s:string)=>s.replace(/^p[12][a-z]?: /,'');
const fraction=(s:string)=>{const [a,b]=s.split(' ')[0].split('/').map(Number);return b?a/b:a===0?0:1;};
/** Post-hoc audit only. This never enters an AI observation or changes a seed. */
export function paldeaTuningTelemetry(log:BattleLog){
 const team=Showdown.Teams.unpack(log.teams.p2)!.map(p=>p.species),base=galarTuningTelemetry(log,team[2]);
 const mons=Object.fromEntries(team.map(name=>[name,{entered:false,activeTurns:0,moves:{} as Record<string,number>,damage:base.damage[name]??0,healing:0,sash:0,sturdy:0,electromorphosis:0,waterAbsorb:0,tera:0}]));
 const exposure=new Map(team.map(n=>[n,new Set<number>()])),health=new Map<string,number>(),alive=new Set(team),abilityEvents=new Set<string>();
 let turn=0,active='',lightScreen=false,screenInstalled=0,screenDuplicate=0,screenTinkatonEntry=false,leadSurvivedTurn1=false,luminaDrops=0,lastSource='',lastMove='';
 const tinkatonScreenTurns=new Set<number>();
 const expose=()=>{if(turn>0&&active&&alive.has(active)){exposure.get(active)?.add(turn);if(active==='Tinkaton'&&lightScreen)tinkatonScreenTurns.add(turn);}};
 for(const line of log.publicProtocol){
  const p=line.split('|'),kind=p[1],who=p[2]??'',name=actor(who),npc=who.startsWith('p2'),value=p[3]??'';
  if(kind==='turn'){turn=Number(who);if(turn===2)leadSurvivedTurn1=alive.has(team[0]);expose();}
  if(['switch','drag'].includes(kind)&&npc){active=value.split(',')[0];if(mons[active]){mons[active].entered=true;health.set(active,fraction(p[4]??'100/100'));if(active==='Tinkaton'&&lightScreen)screenTinkatonEntry=true;expose();}}
  if(kind==='move'){
   lastSource=npc?name:'';lastMove=value;
   if(npc&&mons[name]){mons[name].moves[value]=(mons[name].moves[value]??0)+1;if(value==='Light Screen'&&lightScreen)screenDuplicate++;}
  }
  if(kind==='-sidestart'&&npc&&value==='move: Light Screen'){lightScreen=true;screenInstalled++;}
  if(kind==='-sideend'&&npc&&value==='move: Light Screen')lightScreen=false;
  if(kind==='-unboost'&&who.startsWith('p1')&&value==='spd'&&lastSource==='Espathra'&&lastMove==='Lumina Crash')luminaDrops++;
  if(kind==='-enditem'&&npc&&value==='Focus Sash'&&mons[name])mons[name].sash++;
  if(npc&&['-ability','-activate','-start','-heal','-immune'].includes(kind)&&mons[name]){
   const ability=line.match(/ability: ([^|]+)/)?.[1]??value.replace('ability: ','');
   const key=`${turn}:${name}:${ability}`;
   if(!abilityEvents.has(key)){
    if(ability==='Sturdy')mons[name].sturdy++;
    if(ability==='Electromorphosis')mons[name].electromorphosis++;
    if(ability==='Water Absorb')mons[name].waterAbsorb++;
    abilityEvents.add(key);
   }
  }
  if(kind==='-terastallize'&&npc&&mons[name])mons[name].tera++;
  if(['-heal','-damage'].includes(kind)&&npc&&mons[name]){const now=fraction(value);if(kind==='-heal')mons[name].healing+=Math.max(0,now-(health.get(name)??1))*100;health.set(name,now);}
  if(kind==='faint'&&npc)alive.delete(name);
 }
 for(const name of team)mons[name].activeTurns=exposure.get(name)!.size;
 return {winner:log.winner,turns:log.turns,team,mons,leadSurvivedTurn1,aceEntered:mons[team[2]].entered,middleActed:Object.values(mons[team[1]].moves).some(n=>n>0),screenInstalled,screenDuplicate,screenTinkatonEntry,tinkatonScreenTurns:tinkatonScreenTurns.size,luminaDrops,voluntary:base.voluntary};
}
