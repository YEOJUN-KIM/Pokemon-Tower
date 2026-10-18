import Showdown from 'pokemon-showdown';
import type {BattleLog} from '../../src/battle/run';
import {namedBattleTelemetry} from './named-battle-telemetry';
import {unovaBattleTelemetry} from './unova-battle-telemetry';

/** Own request forms become canonical base species; no changes to battle policy. */
export function kalosBattleTelemetry(log:BattleLog){
 const base=(name:string)=>Showdown.Dex.species.get(name).baseSpecies||name;
 const normalized={...log,decisions:log.decisions.map(d=>({...d,observation:{...d.observation,ownTeam:d.observation.ownTeam.map(p=>({...p,details:[base(p.details.split(',')[0]),...p.details.split(',').slice(1)].join(',')}))}}))};
 const usage=unovaBattleTelemetry(normalized),telemetry=namedBattleTelemetry(log);
 const megaAvailability=telemetry.available.filter(a=>a.kind==='mega').map(a=>({species:base(a.species),legalDecisionTurns:[...new Set(normalized.decisions.filter(d=>d.side==='p2'&&d.observation.ownTeam.some(p=>p.active&&p.details.split(',')[0]===base(a.species))&&d.observation.legalActions.some(action=>action.command.endsWith(' mega'))).map(d=>d.observation.turn))]}));
 const mega=telemetry.used.filter(u=>u.kind==='mega').map(u=>{
  const species=base(u.species),index=log.publicProtocol.findIndex(l=>l.startsWith('|-mega|p2'));
  const post=unovaBattleTelemetry({...normalized,publicProtocol:log.publicProtocol.slice(index)});
  const activeTurns=new Set(normalized.decisions.filter(d=>d.side==='p2'&&d.observation.turn>=u.turn&&d.observation.ownTeam.some(p=>p.active&&p.details.split(',')[0]===species)).map(d=>d.observation.turn)).size;
  let turn=u.turn,faintTurn:number|null=null;
  for(const l of log.publicProtocol.slice(index)){const p=l.split('|');if(p[1]==='turn')turn=Number(p[2]);if(p[1]==='faint'&&p[2]?.startsWith('p2')&&p[2].split(': ')[1]===species){faintTurn=turn;break;}}
  return {species,activationTurn:u.turn,directKOs:post.directKOs[species]??0,activeDecisionTurns:activeTurns,faintTurn,survivedElapsedTurns:Math.max(0,(faintTurn??log.turns)-u.turn),survivedBattle:faintTurn===null};
 });
 return {telemetry,moveUsage:usage.moveUsage,directKOs:usage.directKOs,directDamage:usage.directDamage,mega,megaAvailability};
}
