import Showdown from 'pokemon-showdown';
import type {BattleLog} from '../../src/battle/run';

/** Audit only: own requests resolve Illusion; residual faints are not direct KOs. */
export function unovaBattleTelemetry(log:BattleLog){
 const actors=new Map<number,string>();
 for(const d of log.decisions)if(d.side==='p2'&&d.action.startsWith('move ')){
  const own=d.observation.ownTeam.find(p=>p.active);if(own)actors.set(d.observation.turn,own.details.split(',')[0]);
 }
 const moveUsage:Record<string,Record<string,number>>={},directKOs:Record<string,number>={},directDamage:Record<string,number>={};
 let turn=0,actor='',directVictim='',playerHP=1;
 const hp=(s:string)=>{const [current,max]=s.split(' ')[0].split('/').map(Number);return s.includes('fnt')?0:max>0?current/max:1;};
 for(const line of log.publicProtocol){
  const p=line.split('|'),event=p[1];
  if(event==='turn'){turn=Number(p[2]);actor='';directVictim='';}
  if((event==='switch'||event==='drag')&&p[2]?.startsWith('p1'))playerHP=hp(p[4]);
  if(event==='move'){
   actor=p[2]?.startsWith('p2')?actors.get(turn)??p[2].split(': ')[1]:'';directVictim='';
   if(actor){const moves=moveUsage[actor]??={};moves[p[3]]=(moves[p[3]]??0)+1;}
  }
  if(event==='-damage'&&p[2]?.startsWith('p1')){
   const next=hp(p[3]);
   if(actor&&!p.slice(4).some(s=>s.startsWith('[from]'))){directDamage[actor]=(directDamage[actor]??0)+Math.max(0,playerHP-next);directVictim=next===0?p[2]:'';}else directVictim='';
   playerHP=next;
  }
  if(event==='-heal'&&p[2]?.startsWith('p1'))playerHP=hp(p[3]);
  if(event==='faint'&&p[2]===directVictim&&actor){directKOs[actor]=(directKOs[actor]??0)+1;directVictim='';}
 }
 const legendaryKOs=directKOs.Zekrom??0;
 const partners=Object.keys(moveUsage).filter(s=>s!=='Zekrom');
 const partnerDamage=partners.reduce((s,p)=>s+(directDamage[p]??0),0);
 const partnerUtilityMoves=partners.reduce((s,p)=>s+Object.entries(moveUsage[p]).filter(([m])=>Showdown.Dex.moves.get(m).category==='Status').reduce((n,[,c])=>n+c,0),0);
 return {moveUsage,directKOs,directDamage,legendaryKOs,legendaryThreeKOs:legendaryKOs===3,unassistedLegendarySweep:legendaryKOs===3&&partnerDamage===0&&partnerUtilityMoves===0,partnerDamage,partnerUtilityMoves};
}
