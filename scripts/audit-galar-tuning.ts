import {mkdirSync,writeFileSync,readFileSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
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
import {runBattle,replayBattle,engineVersion,FORMAT} from '../src/battle/run';
import type {TrainingProfile} from '../src/data/training';
import {galarTuningTelemetry} from './lib/galar-tuning-telemetry';

const phase=process.argv[2];assert.ok(['before','after','raihan-orb'].includes(phase));
const root='artifacts/experiments/balance/galar-tuning-20261019';mkdirSync(root,{recursive:true});mkdirSync(root+'/traces',{recursive:true});
const count=8;
// These inputs and event IDs exactly match simulate-galar-npcs.ts at edc1d6eb.
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
const reanalyze=process.argv.includes('--reanalyze');
const previous=reanalyze?JSON.parse(readFileSync(`${root}/${phase}-summary.json`,'utf8')):null;
const rows:any[]=[],tracePath=`${root}/${phase}-logs.jsonl`;if(!reanalyze)writeFileSync(tracePath,'');
const targets=galarTrainers.filter(t=>phase!=='raihan-orb'||t.id==='named-raihan');
if(reanalyze){
 for(const line of readFileSync(tracePath,'utf8').trim().split('\n')){const {log,...metadata}=JSON.parse(line),t=targets.find(t=>t.id===metadata.id)!;rows.push({...metadata,winner:log.winner,...galarTuningTelemetry(log,t.ace)});}
}else for(const t of targets){
 const floors=t.category==='boss'?[75,95]:t.category==='champion'?[50,100]:[45,95];
 for(const floor of floors)for(const c of cases)for(let n=1;n<=count;n++){
  const snapshot=snapshotTrainerEventBattle(`galar-balance:${t.id}:${floor}:${c.id}:${n}`,galarSample(t),floor,'basic',CURRENT_PROGRESSION);
  if(phase==='raihan-orb'){const sets=Showdown.Teams.unpack(snapshot.opponentTeam)!;sets.find(p=>p.species==='Duraludon')!.item='Life Orb';snapshot.opponentTeam=Showdown.Teams.pack(sets);}
  const metadata={id:t.id,floor,case:c.id,n};
  try{
   const log=await runBattle({teams:{p1:player(c.species,floor),p2:snapshot.opponentTeam},seed:snapshot.seed,rule:'basic',opponentRule:packedNpcRule(Showdown.Teams.unpack(snapshot.opponentTeam)!,0),player:new ZMovePolicy('p1'),opponent:createNpcPolicy(npcAi(floor,galarSample(t)))});
   const metrics=galarTuningTelemetry(log,t.ace);rows.push({...metadata,winner:log.winner,...metrics});
   appendFileSync(tracePath,JSON.stringify({...metadata,log})+'\n');
   if(n===1&&c.id==='offense')await replayBattle(log);
  }catch(e){rows.push({...metadata,error:String(e)});}
 }
 console.log(`${phase} ${t.id}: ${rows.filter(r=>r.id===t.id).length} battles`);
}
writeFileSync(`${root}/${phase}-battles.json`,JSON.stringify(rows,null,2)+'\n');
const summary=targets.flatMap(t=>[...new Set(rows.filter(r=>r.id===t.id).map(r=>r.floor))].map(floor=>{
 const all=rows.filter(r=>r.id===t.id&&r.floor===floor),ok=all.filter(r=>!r.error),sum=(f:(r:any)=>number)=>ok.reduce((n,r)=>n+f(r),0);
 const merge=(field:string)=>{const m:Record<string,number>={};for(const r of ok)for(const [k,v]of Object.entries(r[field]??{}))m[k]=(m[k]??0)+(v as number);return m;};
 return {id:t.id,name:t.name,floor,battles:all.length,errors:all.length-ok.length,npcWins:sum(r=>Number(r.winner==='Tower AI')),winRate:sum(r=>Number(r.winner==='Tower AI'))/ok.length,meanTurns:sum(r=>r.turns)/ok.length,meanSwitches:sum(r=>r.voluntary)/ok.length,aceEntered:sum(r=>Number(r.aceEntered)),maxBattles:sum(r=>Number(Object.keys(r.maxBy).length>0)),aceFaintedWithoutMax:sum(r=>Number(r.aceFaintedWithoutMax)),meanMaxTurn:sum(r=>r.maxTurns.reduce((a:number,b:number)=>a+b,0))/Math.max(1,sum(r=>r.maxTurns.length)),sashExtraActions:sum(r=>r.sashExtraActions),sashSavedEntries:sum(r=>r.sashSavedEntries),hexOnStatus:sum(r=>r.hexOnStatus),calmMindSafe:sum(r=>r.calmMindSafe),swordsDanceWithDisguise:sum(r=>r.swordsDanceWithDisguise),choiceLockViolations:sum(r=>r.choiceLockViolations),moves:merge('moves'),effects:merge('effects'),weather:merge('weather'),items:merge('items'),damage:merge('damage'),maxDamage:merge('maxDamage'),firstMoves:merge('firstMoves'),directKOs:merge('directKOs'),activeTurns:merge('activeTurns'),actorActionTurns:merge('actorActionTurns'),issues:ok.flatMap(r=>r.issues.map((issue:string)=>({case:r.case,n:r.n,issue}))),charizardSweeps:sum(r=>Number((r.directKOs.Charizard??0)+(r.directKOs['Charizard residual']??0)>=3))};
}));
const files=['scripts/data/npc/galar-design.json','src/data/normal-npc-templates.json','src/battle/galar-policy.ts','src/battle/gimmicks.ts','src/data/npc-gimmicks.ts'];
writeFileSync(`${root}/${phase}-summary.json`,JSON.stringify({phase,baselineCommit:'edc1d6eb0261e5db9ae17f59d3a6349d5c9f21ec',engineVersion,FORMAT,seeds:count,cases,rule:'basic',inputs:'Exact existing benchmark event IDs, player builder and AI; replay checked for each NPC/floor offense seed 1',hashes:previous?.hashes??Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),summary},null,2)+'\n');
console.log(JSON.stringify({phase,battles:rows.length,errors:rows.filter(r=>r.error).length,summary:summary.map(({id,floor,winRate,maxBattles,issues})=>({id,floor,winRate,maxBattles,issues:issues.length}))}));
