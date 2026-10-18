import Showdown from 'pokemon-showdown';
import type {BattleLog} from '../../src/battle/run';

export type MechanicTrace={unburden:boolean;thickClub:boolean;galePriority:{turn:number;move:string}[]};
// Audit-process-only listeners delegate to the installed callbacks verbatim:
// no state, return value, move choice or scoring is changed. Unburden is silent
// in public protocol, so item disappearance alone is insufficient evidence.
export function mechanicObserver(){
 let trace:MechanicTrace={unburden:false,thickClub:false,galePriority:[]};
 const prototype=Showdown.Battle.prototype as any,original=prototype.runEvent;
 prototype.runEvent=function(this:any,...args:any[]){
  const result=original.apply(this,args),[event,p,,move,base]=args;
  if(p?.side?.id==='p2'){
   if(event==='ModifySpe'&&p.species.name==='Hawlucha'&&p.volatiles.unburden&&!p.item&&!p.ignoringAbility()&&result>=base*1.99)trace.unburden=true;
   if(event==='ModifyAtk'&&p.baseSpecies.baseSpecies==='Marowak'&&p.hasItem('thickclub')&&result>=base*1.99)trace.thickClub=true;
   if(event==='ModifyPriority'&&p.species.name==='Talonflame'&&p.hasAbility('galewings')&&p.hp===p.maxhp&&move?.type==='Flying'&&result===base+1)trace.galePriority.push({turn:this.turn,move:move.id});
  }
  return result;
 };
 return {reset(){trace={unburden:false,thickClub:false,galePriority:[]};},result(){return structuredClone(trace);},restore(){prototype.runEvent=original;}};
}

export function tuningTelemetry(log:BattleLog,mechanics:MechanicTrace){
 const sets=Showdown.Teams.unpack(log.teams.p2)!;
 const pokemon=Object.fromEntries(sets.map(p=>[p.species,{entries:0,switchIns:0,switchOuts:0,activeTurns:0,directKOs:0,residualKOs:0,moves:{} as Record<string,number>}]));
 const nick=new Map(sets.map(p=>[p.name||p.species,p.species])),resolve=(ident:string)=>nick.get(ident.split(': ')[1])??ident.split(': ')[1];
 const turns=new Map(sets.map(p=>[p.species,new Set<number>()]));
 let turn=0,active='',actor='',victim='',zActor='',pendingZ='',zKOs=0,whiteHerb=0,intimidate=0,galeBraveBird=0,galeMoves=0,residualActor='',remainingNpc=3,remainingPlayer=3,voluntarySwitches=0;
 const fainted=new Set<string>(),legalZ=new Set<number>(),galeEligible=new Set<number>();
 for(const d of log.decisions.filter(d=>d.side==='p2')){
  if(d.observation.legalActions.some(a=>a.command.endsWith(' zmove')))legalZ.add(d.observation.turn);
  const own=d.observation.ownTeam.find(p=>p.active),condition=own?.condition.split(' ')[0].split('/').map(Number);
  if(own?.details.startsWith('Talonflame,')&&condition?.[0]===condition?.[1]&&d.observation.legalActions.some(a=>Showdown.Dex.moves.get(a.label).type==='Flying'))galeEligible.add(d.observation.turn);
  if(d.action.startsWith('switch ')&&d.observation.legalActions.some(a=>a.command.startsWith('move ')))voluntarySwitches++;
 }
 const galeKeys=new Set(mechanics.galePriority.map(p=>`${p.turn}:${p.move}`));let zUsed=0;
 for(const line of log.publicProtocol){
  const p=line.split('|'),event=p[1],side=p[2]?.slice(0,2);
  if(event==='turn'){turn=Number(p[2]);actor='';victim='';residualActor='';if(active)turns.get(active)?.add(turn);}
  if((event==='switch'||event==='drag')&&side==='p2'){
   const species=p[3].split(',')[0];nick.set(p[2].split(': ')[1],species);if(active&&active!==species&&!fainted.has(active))pokemon[active].switchOuts++;
   active=species;const row=pokemon[active];if(row){row.switchIns+=Number(row.entries>0);row.entries++;if(turn>0)turns.get(active)!.add(turn);}actor='';victim='';
  }
  if(event==='-zpower'&&side==='p2'){zUsed++;pendingZ=resolve(p[2]);}
  if(event==='-enditem'&&side==='p2'&&p[3]==='White Herb')whiteHerb++;
  if((event==='-ability'||event==='-activate')&&side==='p2'&&p[3]?.replace('ability: ','')==='Intimidate')intimidate++;
  if(event==='move'){
   actor=side==='p2'?resolve(p[2]):'';victim='';residualActor='';zActor=actor&&pendingZ===actor?actor:'';pendingZ='';
   if(actor&&pokemon[actor]){const row=pokemon[actor];row.moves[p[3]]=(row.moves[p[3]]??0)+1;if(actor==='Talonflame'&&galeKeys.has(`${turn}:${Showdown.Dex.moves.get(p[3]).id}`)){galeMoves++;if(p[3]==='Brave Bird')galeBraveBird++;}}
  }
  if(event==='-damage'&&side==='p1'){
   const direct=actor&&!p.slice(4).some(s=>s.startsWith('[from]'));
   victim=p[3].includes('fnt')&&direct?p[2]:'';
   residualActor=p[3].includes('fnt')?resolve(p.find(s=>s.startsWith('[of] p2'))?.slice(5)??''):'';
  }
  if(event==='faint'){
   if(side==='p2'){const species=resolve(p[2]);fainted.add(species);remainingNpc--;if(active===species)active='';}
   if(side==='p1'){remainingPlayer--;if(victim===p[2]&&actor&&pokemon[actor]){pokemon[actor].directKOs++;if(zActor===actor)zKOs++;}else if(pokemon[residualActor])pokemon[residualActor].residualKOs++;victim='';residualActor='';}
  }
 }
 for(const [species,t]of turns)pokemon[species].activeTurns=t.size;
 return {pokemon,remainingNpc,remainingPlayer,voluntarySwitches,z:{equipped:sets.some(p=>p.item.endsWith('ium Z')),legal:legalZ.size>0,legalTurns:[...legalZ],used:zUsed,directKOs:zKOs},whiteHerb,unburden:Number(mechanics.unburden),intimidate,galeEligibleTurns:galeEligible.size,galeUsed:galeMoves,galeBraveBird,thickClub:Number(mechanics.thickClub)};
}
