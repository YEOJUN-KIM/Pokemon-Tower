import Showdown from 'pokemon-showdown';
import type {BattleLog} from '../../src/battle/run';
import {evaluateZOptions,hpFraction} from '../../src/battle/z-decision';
import {namedBattleTelemetry} from './named-battle-telemetry';
import {matchingZCrystals} from '../../src/data/z-crystals';
import {PublicImmunityV2} from '../../src/battle/public-immunity-v2';
import type {Policy} from '../../src/battle/policy';

type Evaluation=ReturnType<typeof evaluateZOptions>;
// Independent observer: supplies no information to the acting policy. Baseline
// and v12 counterfactual estimates both respect the same publicly revealed facts.
export function monitorZPolicy(actor:Policy){
 const memory=new PublicImmunityV2(),evaluations:Evaluation[]=[];
 const policy:Policy={switchingInformation:actor.switchingInformation,uncertainSwitchingInformation:actor.uncertainSwitchingInformation,
  observePublicLine(line){actor.observePublicLine?.(line);memory.consume(line.replace(/\bp([12])(?=[a-z]?:)/g,(_,n)=>'p'+(n==='1'?'2':'1')));},
  choose(o){const own=o.ownTeam.find(p=>p.active);memory.observeOwn(own);evaluations.push(evaluateZOptions(own?{...o,legalActions:o.legalActions.filter(a=>!a.command.startsWith('move ')||a.label.startsWith('Z-')||!memory.blocked(a.label,own,o))}:o));return actor.choose(o);}
 };
 return {policy,evaluations};
}

export function zAiTelemetry(log:BattleLog,evaluations?:Evaluation[]){
 const basic=namedBattleTelemetry(log),moves:{turn:number;actor:string;move:string}[]=[],fainted=new Set<string>();
 let turn=0;
 const knockouts=new Set<number>();
 for(let i=0;i<log.publicProtocol.length;i++){
  const [,event,actor,value]=log.publicProtocol[i].split('|');
  if(event==='turn')turn=Number(actor);
  if(event==='move'&&actor.startsWith('p2'))moves.push({turn,actor:actor.split(': ')[1],move:value});
  if(event==='faint'&&actor.startsWith('p2'))fainted.add(actor.split(': ')[1]);
  if(event==='-zpower'&&actor.startsWith('p2')){
   let started=false;
   for(let j=i+1;j<log.publicProtocol.length;j++){
    const [,next,target]=log.publicProtocol[j].split('|');
    if(next==='turn')break;
    if(next==='move'){if(started)break;started=true;}
    if(started&&next==='faint'&&target.startsWith('p1'))knockouts.add(turn);
   }
  }
 }
 const decisions=log.decisions.filter(d=>d.side==='p2').flatMap((d,index)=>{
  const e=evaluations?evaluations[index]:evaluateZOptions(d.observation);if(!e)return [];
  const chosen=e.candidates.find(c=>c.action.command===d.action),blockedUse=d.action.endsWith(' zmove')&&!chosen;
  if(!e.candidates.length&&!blockedUse)return [];
  const actor=e.own.ident.split(': ')[1],used=d.action.endsWith(' zmove')&&basic.used.some(u=>u.kind==='z'&&u.turn===d.observation.turn);
  const actualAction=moves.some(m=>m.turn===d.observation.turn&&m.actor===actor);
  const opportunity=e.candidates.some(c=>!c.status&&c.zOnlyKO);
  return [{turn:d.observation.turn,actor,selfHP:e.selfHP,target:d.observation.opponent!.species,targetHP:hpFraction(d.observation.opponent!.condition),estimatedTargetHP:e.targetHP,normal:e.bestNormal,normalKO:e.normalKO,danger:e.danger,action:d.action,actualAction,opportunity,miss:opportunity&&!chosen&&actualAction,waste:blockedUse||!!chosen&&!chosen.status&&e.normalKO,blockedUse,lowGain:blockedUse||!!chosen&&!chosen.status&&chosen.gain<e.targetMax*.1,used,gain:blockedUse?0:chosen&&!chosen.status?chosen.gain:null,zKO:used&&knockouts.has(d.observation.turn),candidates:e.candidates.map(c=>({command:c.action.command,label:c.action.label,damage:c.damage,base:c.ordinaryDamage,gain:c.gain,zOnlyKO:c.zOnlyKO,status:c.status}))}];
 });
 const team=Showdown.Teams.unpack(log.teams.p2)!;
 const carriers=basic.available.filter(a=>a.kind==='z').map(a=>{
  const actor=team.find(p=>p.species===a.species)?.name??a.species;
  const used=basic.used.some(u=>u.kind==='z'&&u.species===a.species),died=fainted.has(actor),acted=moves.some(m=>m.actor===actor);
  const set=team.find(p=>p.species===a.species)!;
  return {...a,matchingMove:matchingZCrystals(set.species,set.moves).includes(a.item),used,died,acted,diedBeforeAction:died&&!used&&!acted,diedAfterAction:died&&!used&&acted};
 });
 return {basic,decisions,carriers};
}
