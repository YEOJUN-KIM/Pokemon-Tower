import Showdown from 'pokemon-showdown';
import type {BattleLog} from '../../src/battle/run';
import {megaStones} from '../../src/data/gimmicks';
import {zCrystals} from '../../src/data/z-crystals';
import {primalOrbs} from '../../src/data/primal-forms';

export function namedBattleTelemetry(log:BattleLog){
 const team=Showdown.Teams.unpack(log.teams.p2)!;
 const available=team.flatMap(p=>{
  const kind=megaStones[p.item]?'mega':zCrystals[p.item]?'z':p.item==='Dynamax Band'?'dynamax':primalOrbs[p.item]?'primal':null;
  return kind?[{kind,species:p.species,item:p.item}]:[];
 });
 if(log.teraTickets?.p2)available.push({kind:'tera',species:log.opponentTeraSpecies??'',item:''});
 const active:Record<string,{species:string;hp:number|null}>={};let turn=0;
 const used:{kind:string;species:string;turn:number;hp:number|null;targetHP:number|null;winner:string|null}[]=[],moves:{species:string;move:string;turn:number;hp:number|null;targetHP:number|null}[]=[];
 const fraction=(condition:string)=>{const [hp,max]=condition.split(' ')[0].split('/').map(Number);return max>0?hp/max:condition.endsWith('fnt')?0:null;};
 for(const line of log.publicProtocol){
  const p=line.split('|'),event=p[1],side=p[2]?.slice(0,2);
  if(event==='turn')turn=Number(p[2]);
  if((event==='switch'||event==='drag')&&side)active[side]={species:p[3].split(',')[0],hp:fraction(p[4])};
  if(['-damage','-heal','-sethp'].includes(event)&&active[side])active[side].hp=fraction(p[3]);
  if(side!=='p2')continue;
  const kind=event==='-mega'?'mega':event==='-zpower'?'z':event==='-terastallize'?'tera':event==='-primal'?'primal':event==='-start'&&p[3]==='Dynamax'?'dynamax':null;
  if(kind)used.push({kind,species:active.p2?.species??p[2].split(': ')[1],turn,hp:active.p2?.hp??null,targetHP:active.p1?.hp??null,winner:log.winner});
  if(event==='move')moves.push({species:active.p2?.species??'',move:p[3],turn,hp:active.p2?.hp??null,targetHP:active.p1?.hp??null});
 }
 return {team:team.map(p=>p.species),available,used,moves};
}
