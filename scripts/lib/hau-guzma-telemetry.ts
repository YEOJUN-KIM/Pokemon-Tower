import Showdown from 'pokemon-showdown';
import type {Policy} from '../../src/battle/policy';
import type {BattleLog} from '../../src/battle/run';
import {tuningTelemetry} from './alola-tuning-telemetry';

export function monitorEntryPolicy(inner:Policy){
 let active='',turn=0,fresh=true,seen=false,entryNumber=0,awaitingExitReturn=false,entryAfterExit=false,lastMove='',lastActor='';
 let entryUsedFi=false,exitHadFi=false,returnFromFiExit=false;
 const counts={golisopodEntries:0,firstAppearances:0,reappearances:0,firstImpressionAvailable:0,firstImpressionSelected:0,firstImpressionInvalid:0,firstImpressionUsed:0,firstImpressionFailed:0,firstImpressionKOs:0,aquaJetUsed:0,emergencyExit:0,exitReturns:0,firstImpressionAfterReturn:0,firstImpressionAfterExitReturn:0,completeEntryChains:0,golisopodMegaActivations:0,voluntarySwitches:0,forcedSwitches:0,switchLoops:0};
 const switches:{turn:number;from:string;to:string;forced:boolean;beforeThreat:number;afterThreat:number}[]=[],entries:{turn:number;number:number;afterExit:boolean}[]=[];
 let pendingFiVictim='';
 const policy:Policy={switchingInformation:inner.switchingInformation,uncertainSwitchingInformation:inner.uncertainSwitchingInformation,observePublicLine(line){
  inner.observePublicLine?.(line);const p=line.split('|'),event=p[1],side=p[2]?.slice(0,2);if(event==='turn'){turn=Number(p[2]);lastMove='';lastActor='';pendingFiVictim='';}
  if(['switch','drag'].includes(event)&&side==='p2'){
   active=p[3].split(',')[0].replace(/^Golisopod-Mega$/,'Golisopod');fresh=true;entryUsedFi=false;
   if(active==='Golisopod'){counts.golisopodEntries++;if(seen)counts.reappearances++;else counts.firstAppearances++;seen=true;entryNumber++;entryAfterExit=awaitingExitReturn;returnFromFiExit=entryAfterExit&&exitHadFi;if(entryAfterExit){counts.exitReturns++;awaitingExitReturn=false;}entries.push({turn,number:entryNumber,afterExit:entryAfterExit});}
  }
  if(event==='-activate'&&side==='p2'&&p[3]==='ability: Emergency Exit'){counts.emergencyExit++;awaitingExitReturn=true;exitHadFi=entryUsedFi;}
  if(event==='-mega'&&side==='p2'&&p[3]==='Golisopod')counts.golisopodMegaActivations++;
  if(event==='move'){
   lastActor=side==='p2'?active:'';lastMove=p[3];pendingFiVictim='';
   if(lastActor==='Golisopod'&&lastMove==='First Impression'){counts.firstImpressionUsed++;entryUsedFi=true;if(entryNumber>1)counts.firstImpressionAfterReturn++;if(entryAfterExit)counts.firstImpressionAfterExitReturn++;if(returnFromFiExit){counts.completeEntryChains++;returnFromFiExit=false;}}
   if(lastActor==='Golisopod'&&lastMove==='Aqua Jet')counts.aquaJetUsed++;
  }
  if(event==='-fail'&&side==='p2'&&lastActor==='Golisopod'&&lastMove==='First Impression')counts.firstImpressionFailed++;
  if(event==='-damage'&&side==='p1')pendingFiVictim=lastActor==='Golisopod'&&lastMove==='First Impression'&&p[3].includes('fnt')&&!p.slice(4).some(s=>s.startsWith('[from]'))?p[2]:'';
  if(event==='faint'&&p[2]===pendingFiVictim){counts.firstImpressionKOs++;pendingFiVictim='';}
 },choose(o){
  const own=o.ownTeam.find(p=>p.active&&!p.condition.endsWith('fnt'));
  if(active==='Golisopod'&&fresh&&o.legalActions.some(a=>/^move \d+$/.test(a.command)&&Showdown.Dex.moves.get(a.label).id==='firstimpression'))counts.firstImpressionAvailable++;
  const choice=inner.choose(o);if(typeof choice!=='string')throw Error('Expected synchronous policy');
  if(choice.startsWith('move ')){
   const chosen=o.legalActions.find(a=>a.command===choice);if(active==='Golisopod'&&chosen&&Showdown.Dex.moves.get(chosen.label).id==='firstimpression'){counts.firstImpressionSelected++;if(!fresh)counts.firstImpressionInvalid++;}fresh=false;
  }
  if(choice.startsWith('switch ')){
   const forced=!o.legalActions.some(a=>a.command.startsWith('move '));counts[forced?'forcedSwitches':'voluntarySwitches']++;
   const target=o.ownTeam[Number(choice.split(' ')[1])-1],species=target.details.split(',')[0],foe=Showdown.Dex.species.get(o.opponent?.species??'');
   const threat=(species:string)=>Math.max(0,...foe.types.map(t=>Showdown.Dex.getImmunity(t,Showdown.Dex.species.get(species).types)?2**Showdown.Dex.getEffectiveness(t,Showdown.Dex.species.get(species).types):0));
   const row={turn:o.turn,from:own?.details.split(',')[0]??active,to:species,forced,beforeThreat:threat(own?.details.split(',')[0]??active),afterThreat:threat(species)};
   const previous=switches.filter(s=>!s.forced).at(-1);if(!forced&&previous&&o.turn-previous.turn<=2&&previous.from===row.to&&previous.to===row.from)counts.switchLoops++;
   switches.push(row);
  }
  return choice;
 }};
 return {policy,finish(log:BattleLog){const base=tuningTelemetry(log,{unburden:false,thickClub:false,galePriority:[]});return {...base,entry:counts,switches,entries};}};
}
