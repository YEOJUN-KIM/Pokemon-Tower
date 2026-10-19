import Showdown from 'pokemon-showdown';
import type {Observation,Policy} from './policy';
import {PublicImmunityV2} from './public-immunity-v2';
import {ownHp,npcCanFinish,npcAttackDamage} from './pivot-policy';
import {evaluateSwitchCandidates} from './switch-evaluation';

export class AdvancedSwitchPolicy implements Policy{
 readonly switchingInformation=true;readonly uncertainSwitchingInformation=true;readonly fixedOrder:boolean|undefined;
 private immunity=new PublicImmunityV2();private revealed=new Set<string>();
 private lastExit=-10;private exits=0;private pivots=0;private pending:string|undefined;
 private ownPublicTypes=new Map<string,string[]>();
 private evaluation:Record<string,unknown>|undefined;
 get lastEvaluation(){return this.evaluation?{...this.evaluation}:undefined;}
 constructor(private inner:Policy,private options:{aggressive?:boolean;reserveLast?:boolean;setupLead?:boolean}={}){this.fixedOrder=inner.fixedOrder;}
 observePublicLine(line:string){
  this.inner.observePublicLine?.(line);this.immunity.consume(line.replace(/\bp([12])(?=[a-z]?:)/g,(_,n)=>'p'+(n==='1'?'2':'1')));
  const p=line.split('|');if(['switch','drag','replace'].includes(p[1])&&p[2]?.startsWith('p1'))this.revealed.clear();
  const ident=p[2]?.replace(/^p2[a-z]?:/,'p2:');
  if(['switch','drag','replace'].includes(p[1])&&p[2]?.startsWith('p2'))this.ownPublicTypes.clear();
  if(p[1]==='-start'&&p[2]?.startsWith('p2')&&p[3]==='typechange')this.ownPublicTypes.set(ident,p[4].split('/'));
  if(p[1]==='move'&&p[2]?.startsWith('p1')&&Showdown.Dex.moves.get(p[3]).category!=='Status')this.revealed.add(p[3]);
 }
 choose(original:Observation):string|Promise<string>{
  original={...original,ownTeam:original.ownTeam.map(p=>this.ownPublicTypes.has(p.ident)?{...p,revealedTypes:this.ownPublicTypes.get(p.ident)}:p)};
  this.evaluation=undefined;
  const moving=original.legalActions.some(a=>a.command.startsWith('move '));
  if(!moving&&this.pending){const index=original.ownTeam.findIndex(p=>p.ident===this.pending),target=original.legalActions.find(a=>a.command===`switch ${index+1}`);this.pending=undefined;if(target)return target.command;}
  this.pending=undefined;
  const own=original.ownTeam.find(p=>p.active&&ownHp(p)>0);
  if(!moving||!own||!original.opponent)return this.inner.choose(original);
  this.immunity.observeOwn(own);
  const actions=original.legalActions.filter(a=>!a.command.startsWith('move ')||!this.immunity.blocked(a.label,own,original));
  const o={...original,legalActions:actions.length?actions:original.legalActions},dex=Showdown.Dex;
  const finishers=o.legalActions.filter(a=>npcCanFinish(o,own,[a]));
  if(finishers.length){this.evaluation={mode:'ko',koAvailable:true};return [...finishers].sort((a,b)=>dex.moves.get(b.label).priority-dex.moves.get(a.label).priority||npcAttackDamage(b.label,own,o)-npcAttackDamage(a.label,own,o))[0].command;}
  const pivot=(a:typeof actions[number])=>/^move \d+$/.test(a.command)&&['uturn','voltswitch'].includes(dex.moves.get(a.label).id);
  // New tier gate owns voluntary switching; legacy fallback cannot override a
  // rejected receiver, cooldown or entry-hazard safety decision.
  const stay=()=>{const filtered=o.legalActions.filter(a=>!a.command.startsWith('switch ')&&!pivot(a));return this.inner.choose({...o,legalActions:filtered.length?filtered:o.legalActions.filter(a=>a.command.startsWith('move '))});};
  // The hidden boss's intact Sash buys one opening hazard action before its
  // team starts evaluating voluntary exits. The KO guard above still wins.
  if(this.options.setupLead&&o.turn===1&&ownHp(own)===1&&Showdown.toID(own.item)==='focussash'&&o.legalActions.some(a=>a.label==='Stealth Rock'))return stay();
  if(this.fixedOrder||o.switching?.dynamax||o.switching?.maybeTrapped||o.turn-this.lastExit<3||this.exits>=6)return stay();
  const e=evaluateSwitchCandidates(o,this.revealed,this.options),r=e.recommended;
  if(!e.dangerous||!r)return stay();
  const speedStage=o.switching?.boosts.spe??0,speed=own.stats.spe*(speedStage>=0?(2+speedStage)/2:2/(2-speedStage))*(own.condition.includes('par')?.5:1)*(Showdown.toID(own.item)==='choicescarf'?1.5:1);
  const slower=speed<dex.species.get(o.opponent!.species).baseStats.spe+20||e.threats.some(t=>t.weight===1&&t.priority>0);
  const sash=Showdown.toID(own.item)==='focussash'&&ownHp(own)===1&&!e.threats.some(t=>t.weight===1&&t.multihit);
  const pivots=o.legalActions.filter(pivot).sort((a,b)=>npcAttackDamage(b.label,own,o)-npcAttackDamage(a.label,own,o));
  const usePivot=this.pivots<4&&pivots.length>0&&!(slower&&e.currentRisk>=ownHp(own)*.8&&!sash);
  this.evaluation={mode:usePivot?'pivot':'switch',koAvailable:false,risk:e.currentRisk,receiver:r.pokemon.ident,receiverRisk:r.risk,entryDamage:r.entry.damage,statusCost:r.entry.statusCost,speedCost:r.entry.speedCost,absorbBenefit:r.entry.absorbBenefit,entryCost:r.entry.total,offensivePressure:r.offensivePressure,netImprovement:r.netImprovement,remainingHP:r.remainingHP};
  this.lastExit=o.turn;this.exits++;
  if(usePivot){this.pivots++;this.pending=r.pokemon.ident;return pivots[0].command;}
  return r.action.command;
 }
}
