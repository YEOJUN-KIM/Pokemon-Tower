import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {galarTrainers,galarSample} from '../src/data/galar-trainers';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {ZMovePolicy} from '../src/battle/z-move-policy';
import {defaultProfile} from '../src/server/training';
import {templateProfile} from '../src/server/npc-templates';
import {packTeam,pokemonSets} from '../src/data/teams';
import {packedNpcRule} from '../src/data/npc-gimmicks';
import {runBattle,engineVersion,FORMAT} from '../src/battle/run';
import type {TrainingProfile} from '../src/data/training';

const root='artifacts/experiments/balance/galar-20261019';mkdirSync(root,{recursive:true});
const count=Number(process.env.GALAR_SEEDS??8);
const cases=[{id:'starters',species:['Charizard','Blastoise','Venusaur']},{id:'offense',species:['Garchomp','Metagross','Lapras']},{id:'bulk',species:['Slowbro','Corviknight','Gastrodon']},{id:'signature',species:['Mimikyu','Kommo-o','Gyarados']}];
const roles=new Map<string,TrainingProfile>();
for(const row of JSON.parse(readFileSync('scripts/data/npc/npc-team-samples.json','utf8')).samples)for(const p of row.team)if(!roles.has(p.species))roles.set(p.species,p.profile);
function player(names:string[],floor:number){
 const profiles=Object.fromEntries(names.map(name=>{
  const p=defaultProfile(name),role=roles.get(name);p.moves=[...pokemonSets[name].moves];
  p.evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};const s=Showdown.Dex.species.get(name);
  p.evs[s.baseStats.atk>s.baseStats.spa?'atk':'spa']=32;p.evs[s.baseStats.spe>=80?'spe':'hp']=32;p.evs.spd=2;
  p.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};p.nature=role?.nature??(p.evs.atk>p.evs.spa?'Adamant':'Modest');
  return [name,templateProfile(p,floor)];
 }));
 return packTeam(names,profiles,Object.fromEntries(names.map((n,i)=>[n,['Expert Belt','Leftovers','Sitrus Berry'][i]])));
}
const rows:any[]=[];
for(const t of galarTrainers){
 const floors=t.category==='boss'?[75,95]:t.category==='champion'?[50,100]:[45,95];
 for(const floor of floors)for(const c of cases)for(let n=1;n<=count;n++){
  const snapshot=snapshotTrainerEventBattle(`galar-balance:${t.id}:${floor}:${c.id}:${n}`,galarSample(t),floor,'basic',CURRENT_PROGRESSION);
  try{
   const log=await runBattle({teams:{p1:player(c.species,floor),p2:snapshot.opponentTeam},seed:snapshot.seed,rule:'basic',opponentRule:packedNpcRule(Showdown.Teams.unpack(snapshot.opponentTeam)!,0),player:new ZMovePolicy('p1'),opponent:createNpcPolicy(npcAi(floor,galarSample(t)))});
   const voluntary=log.decisions.filter(d=>d.side==='p2'&&d.action.startsWith('switch ')&&d.observation.legalActions.some(a=>a.command.startsWith('move '))).length;
   rows.push({id:t.id,floor,case:c.id,n,winner:log.winner,turns:log.turns,voluntary,dynamax:log.publicProtocol.filter(l=>l.startsWith('|-start|p2')&&l.includes('|Dynamax')).length,phaseEntries:log.publicProtocol.filter(l=>l.startsWith('|switch|p2')).map(l=>l.split('|')[3]),maxMoves:log.publicProtocol.filter(l=>l.startsWith('|move|p2')&&l.includes('G-Max')).map(l=>l.split('|')[3])});
  }catch(e){rows.push({id:t.id,floor,case:c.id,n,error:String(e)});}
 }
 console.log(`${t.id}: ${rows.filter(r=>r.id===t.id).length} battles`);
}
const summary=galarTrainers.flatMap(t=>[...new Set(rows.filter(r=>r.id===t.id).map(r=>r.floor))].map(floor=>{
 const all=rows.filter(r=>r.id===t.id&&r.floor===floor),ok=all.filter(r=>!r.error);
 return {id:t.id,name:t.name,floor,battles:all.length,errors:all.length-ok.length,npcWins:ok.filter(r=>r.winner==='Tower AI').length,winRate:ok.filter(r=>r.winner==='Tower AI').length/ok.length,meanTurns:ok.reduce((n,r)=>n+r.turns,0)/ok.length,meanSwitches:ok.reduce((n,r)=>n+r.voluntary,0)/ok.length,dynamaxBattles:ok.filter(r=>r.dynamax).length};
}));
writeFileSync(`${root}/battles.jsonl`,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
writeFileSync(`${root}/summary.json`,JSON.stringify({engineVersion,FORMAT,seeds:count,cases,rule:'basic',player:'ZMovePolicy; role-informed default moves; floor-scaled points; no player gimmicks',summary},null,2)+'\n');
console.log(JSON.stringify({battles:rows.length,errors:rows.filter(r=>r.error).length,summary}));
