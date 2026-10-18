import {mkdirSync,readFileSync,writeFileSync,appendFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {towerThemes,type TowerTheme} from '../src/data/tower-themes';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {generateOpponentTeam,selectTrainerSample} from '../src/server/opponent-team';
import {generateNpcEncounter} from '../src/server/npc-encounters';
import {npcSamples} from '../src/data/npc-samples';
import {trainerCatalog,type TrainerSample} from '../src/data/trainer-catalog';
import {normalNpcTemplate,templateProfile} from '../src/server/npc-templates';
import {normalNpcGimmicksEnabled,normalNpcCategory} from '../src/data/normal-mode-stages';
import {npcAi,type NpcAi} from '../src/data/npc-ai';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {createNpcPolicy as archivedNpcPolicy} from '../src/battle/npc-policy-v11';
import runtime from '../src/data/normal-npc-templates.json' with {type:'json'};
import {villainLeaders} from '../src/data/villain-organizations';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {zAiTelemetry,monitorZPolicy} from './lib/z-ai-telemetry';
import {ZMovePolicy} from '../src/battle/z-move-policy';
import {opponentProfile} from '../src/server/opponent-training';
import {packedNpcRule} from '../src/data/npc-gimmicks';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {packTeam,packPlayerTeam,pokemonSets} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {statKeys,type TrainingProfile,type StatBlock} from '../src/data/training';
import {battleRules,allowsGimmick,type BattleRule} from '../src/data/run-rules';
import {megaStones,canEquipGimmick} from '../src/data/gimmicks';
import {matchingZCrystals,zCrystals} from '../src/data/z-crystals';
import type {TrainerEquipment} from '../src/data/trainer-equipment';
import {runBattle,engineVersion,FORMAT,type Seed} from '../src/battle/run';
import {namedBattleTelemetry} from './lib/named-battle-telemetry';

const phase=process.argv.includes('--before')?'before':'after';
if(process.argv.includes('--help')){console.log('Usage: node --import tsx scripts/simulate-z-ai.ts [--before]; Z_AI_OUTPUT selects the experiment directory.');process.exit(0);}
assert.ok(process.argv.slice(2).every(arg=>arg==='--before'),'Unknown simulation option');
const root=process.env.Z_AI_OUTPUT??'artifacts/experiments/balance/z-ai-20261018';
const baselineCommit='d538331fa1b275bfa3f57d4cf647f92b57b6072a';
assert.equal(createHash('sha256').update(readFileSync('src/data/normal-npc-templates.json')).digest('hex'),createHash('sha256').update(readFileSync(root+'/before-runtime.json')).digest('hex'),'NPC data must stay frozen');
const inventory=[...new Set(runtime.filter(r=>r.signature?.rule==='z').map(r=>r.id))].map(id=>{
 const sample=[...trainerCatalog,...Object.entries(villainLeaders).flatMap(([org,v])=>(['executive','boss'] as const).map(rank=>({...v[rank],id:`${org}-${rank}-${v[rank].portrait}`})))].find(s=>s.id===id);assert.ok(sample,id);return sample;
});
writeFileSync(root+'/inventory.json',JSON.stringify(inventory.map(s=>({id:s.id,name:s.name,role:s.role,generation:s.generation,tactic:s.tactic,signatures:runtime.filter(r=>r.id===s.id).map(r=>r.signature)})),null,2));
const seeds=Number(process.env.THEME_BALANCE_SEEDS??4),limit=Number(process.env.THEME_BALANCE_LIMIT??Infinity);
assert.ok(Number.isSafeInteger(seeds)&&seeds>0);mkdirSync(root,{recursive:true});
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const policyHash=digest(['src/battle/npc-policy.ts','src/battle/z-decision.ts'].map(p=>readFileSync(p,'utf8')).join('\n'));
const metricHash=digest('final-model-2\n'+['scripts/lib/z-ai-telemetry.ts','src/battle/z-decision.ts'].map(p=>readFileSync(p,'utf8')).join('\n'));
const rules=Object.keys(battleRules) as BattleRule[];
const cases=[
 {id:'starters',species:['Charizard','Blastoise','Venusaur']},
 {id:'offense',species:['Garchomp','Metagross','Lapras']},
 {id:'bulk',species:['Slowbro','Corviknight','Gastrodon']},
 {id:'signature',species:['Mimikyu','Kommo-o','Gyarados']},
];
const highest=JSON.parse(readFileSync('scripts/data/npc/npc-team-samples.json','utf8')).samples as {team:{species:string;profile:TrainingProfile}[]}[];
const roles=new Map<string,TrainingProfile>();for(const row of highest)for(const p of row.team)if(!roles.has(p.species))roles.set(p.species,p.profile);
function gear(floor:number,rule:BattleRule):TrainerEquipment[]{return floor<11?[]:[...(allowsGimmick(rule,'dynamax')?['Dynamax Band' as const]:[]),...(allowsGimmick(rule,'terastallize')?['Tera Orb' as const]:[])];}
const playerCache=new Map<string,string>();
function playerTeam(index:number,floor:number,rule:BattleRule){
 const key=JSON.stringify([index,floor,rule]),cached=playerCache.get(key);if(cached)return cached;
 const species=cases[index].species;
 const profiles=Object.fromEntries(species.map(name=>{
  const p=defaultProfile(name),role=roles.get(name);p.moves=[...pokemonSets[name].moves];
  if(name==='Mimikyu')p.moves=['Play Rough','Shadow Claw','Shadow Sneak','Swords Dance'];
  if(name==='Kommo-o')p.moves=['Clanging Scales','Flamethrower','Drain Punch','Protect'];
  p.evs=role?{...role.evs}:{hp:10,atk:0,def:0,spa:32,spd:0,spe:24};
  if(!role&&Showdown.Dex.species.get(name).baseStats.atk>=Showdown.Dex.species.get(name).baseStats.spa){p.evs.atk=32;p.evs.spa=0;}
  p.ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as StatBlock;
  p.nature=floor>=55?(role?.nature??(p.evs.atk>p.evs.spa?'Adamant':'Modest')):'Serious';
  return [name,templateProfile(p,floor)];
 }));
 const items=Object.fromEntries(species.map((name,i)=>[name,floor>=11?['Expert Belt','Leftovers','Sitrus Berry'][i]:'']));
 if(floor>=11){
  if(allowsGimmick(rule,'mega')){const pair=species.flatMap(name=>Object.keys(megaStones).filter(item=>canEquipGimmick(name,item)).map(item=>({name,item})))[0];if(pair)items[pair.name]=pair.item;}
  if(allowsGimmick(rule,'zmove')){
   const eligible=species.filter(n=>!megaStones[items[n]]),name=eligible.find(n=>n==='Mimikyu')??eligible.find(n=>n==='Kommo-o')??eligible[0];
   const crystal=matchingZCrystals(name,profiles[name].moves).sort((a,b)=>Number(!!zCrystals[b].from)-Number(!!zCrystals[a].from))[0];if(crystal)items[name]=crystal;
  }
 }
 const packed=packPlayerTeam(species,profiles,items,gear(floor,rule).includes('Dynamax Band'));playerCache.set(key,packed);return packed;
}
type Enemy={npcId:string;name:string;kind:string;packed:string;ai:NpcAi;rule:BattleRule;tera:number;teraSpecies?:string};
const enemyCache=new Map<string,Enemy>();
function enemy(theme:TowerTheme,floor:number,n:number,rule:BattleRule,hidden=false):Enemy{
 const named=floor%5===0||hidden,key=JSON.stringify([named?theme:'shared',floor,n,rule,hidden]);
 const cached=enemyCache.get(key);if(cached)return cached;
 const seed:Seed=[n,floor,29,43],trainer=named?towerTrainerEncounter(floor,`johto-comparison-v1:${n}`,theme,true,hidden):null;
 let sample:TrainerSample=trainer?{...trainerCatalog.find(s=>s.id===trainer.boss.id)!,role:trainer.boss.role}:selectTrainerSample(floor,seed,[],CURRENT_PROGRESSION,{common:true});
 const concept=sample.npcRank?npcSamples.find(s=>s.id===sample.id):undefined;
 const ranked=concept?generateNpcEncounter(floor,seed,concept,sample.npcRank,rule,CURRENT_PROGRESSION):null;
 const team=ranked?.team??generateOpponentTeam(floor,seed,[],trainer,sample,CURRENT_PROGRESSION);
 const signature=ranked?.gimmick??(named&&normalNpcGimmicksEnabled(floor,normalNpcCategory(sample.role,sample.id,sample.kind))?normalNpcTemplate(sample.id,floor,sample.role)?.signature:null);
 const profiles=Object.fromEntries(team.map(p=>[p.name,p.profile??{...opponentProfile(p.name,p.moves,floor,Object.fromEntries(statKeys.map(k=>[k,createHash('sha256').update(`${n}:${floor}:${p.name}:${k}`).digest()[0]%32])) as StatBlock,CURRENT_PROGRESSION),...(p.ability?{ability:p.ability}:{})}]));
 const tera=signature?.rule==='tera'?1:0;
 const result:Enemy={npcId:sample.id,name:sample.name,kind:hidden?'hidden':named?'named':'ordinary',packed:packTeam(team.map(p=>p.name),profiles,Object.fromEntries(team.map(p=>[p.name,p.item??''])),team.filter(p=>p.gigantamax).map(p=>p.name)),ai:npcAi(floor,sample,{boss:floor%50===0}),rule:packedNpcRule(team.map(p=>({item:p.item??''})),tera),tera,...(signature?.rule==='tera'?{teraSpecies:signature.species}:{})};
 enemyCache.set(key,result);return result;
}
type Outcome={key:string;winner:string|null;turns:number;hash:string;telemetry?:ReturnType<typeof namedBattleTelemetry>;z?:ReturnType<typeof zAiTelemetry>;metricHash?:string;error?:string};
const cachePath=root+'/outcomes.jsonl',cache=new Map<string,Outcome>();
if(existsSync(cachePath))for(const line of readFileSync(cachePath,'utf8').split('\n').filter(Boolean)){const row=JSON.parse(line) as Outcome;cache.set(row.key,row);}
type Row={phase:string;theme:TowerTheme;floor:number;band:string;kind:string;npcId:string;name:string;caseId:string;rule:BattleRule;n:number;key:string;winner:string|null;turns:number;error?:string};
const rows:Row[]=[],manifest:unknown[]=[];let fresh=0,reused=0;
const started=Date.now(),rowsPath=root+`/${phase}-battles.jsonl`;writeFileSync(rowsPath,'');
const tracedNpcs=new Set(existsSync(root+'/traces')?readdirSync(root+'/traces').filter(f=>f.startsWith(phase+'-')).map(f=>JSON.parse(readFileSync(root+'/traces/'+f,'utf8')).foe.npcId as string):[]);
async function battle(theme:TowerTheme,floor:number,n:number,index:number,rule:BattleRule,hidden=false,forced?:TrainerSample){
 const snapshot=forced?snapshotTrainerEventBattle(`z-ai:${forced.id}:${n}`,forced,floor,rule,CURRENT_PROGRESSION):null;
 const foe:Enemy=snapshot?{npcId:forced!.id,name:forced!.name,kind:'supplemental',packed:snapshot.opponentTeam,ai:snapshot.trainer.npcAi!,rule:packedNpcRule(snapshot.team.map(p=>({item:p.item??''})),snapshot.opponentTeraTickets),tera:snapshot.opponentTeraTickets}:enemy(theme,floor,n,rule,hidden);
 const p1=playerTeam(index,floor,rule),seed:Seed=[n,floor,37,101],equipment=gear(floor,rule),hasZ=foe.rule==='z';
 const inputKey=digest(JSON.stringify({p1,p2:foe.packed,seed,rule,ai:foe.ai,enemyRule:foe.rule,tera:foe.tera,teraSpecies:foe.teraSpecies,equipment}));
 const key=phase==='after'&&hasZ?digest(inputKey+':z-v12:'+policyHash):inputKey;
 let outcome=cache.get(key);
 const saveTrace=hasZ&&rule==='basic'&&(n===1||!tracedNpcs.has(foe.npcId));
 const tracePath=`${root}/traces/${phase}-${foe.npcId}-${floor}-${cases[index].id}.json`;
 if(!outcome||(hasZ&&outcome.metricHash!==metricHash&&!outcome.error)||(saveTrace&&!existsSync(tracePath))){
  try{
   const monitored=monitorZPolicy((phase==='before'?archivedNpcPolicy:createNpcPolicy)(foe.ai));
   const log=await runBattle({teams:{p1,p2:foe.packed},seed,rule,opponentRule:foe.rule,opponentTeraSpecies:foe.teraSpecies,teraTickets:{p1:0,p2:foe.tera},trainerEquipment:equipment,player:new ZMovePolicy('p1'),opponent:monitored.policy});
   outcome={key,winner:log.winner,turns:log.turns,hash:digest(log.publicProtocol.filter(l=>!l.startsWith('|t:|')).join('\n')),...(hasZ?{metricHash,telemetry:namedBattleTelemetry(log),z:zAiTelemetry(log,monitored.evaluations)}:{})};
   if(saveTrace){
    mkdirSync(root+'/traces',{recursive:true});
    writeFileSync(tracePath,JSON.stringify({foe,seed,teams:log.teams,winner:log.winner,aiVersion:phase==='before'?'tower-policy-v11':'tower-policy-v12',policyHash,metricHash,publicProtocol:log.publicProtocol,z:outcome.z,decisions:log.decisions.filter(d=>d.side==='p2')},null,2));
    tracedNpcs.add(foe.npcId);
   }
  }catch(error){outcome={key,winner:null,turns:0,hash:'',error:String(error)};}
  cache.set(key,outcome);appendFileSync(cachePath,JSON.stringify(outcome)+'\n');fresh++;
 }else reused++;
 const row:Row={phase,theme,floor,band:floor<=50?'1-50':'51-100',kind:foe.kind,npcId:foe.npcId,name:foe.name,caseId:cases[index].id,rule,n,key,winner:outcome.winner,turns:outcome.turns,...(outcome.error?{error:outcome.error}:{})};
 rows.push(row);appendFileSync(rowsPath,JSON.stringify(row)+'\n');
 if(index===0)manifest.push({theme,floor,n,rule,hidden,foe});
}
const requestedThemes=process.env.THEME_BALANCE_THEMES?.split(',');
if(requestedThemes)assert.ok(requestedThemes.length>0&&new Set(requestedThemes).size===requestedThemes.length&&requestedThemes.every(theme=>Object.hasOwn(towerThemes,theme)),'Invalid comparison themes');
const themes=(requestedThemes??Object.keys(towerThemes)) as TowerTheme[];
outer:for(const theme of themes)for(let floor=1;floor<=100;floor++){
 for(let n=1;n<=seeds;n++)for(let i=0;i<cases.length;i++)for(const rule of rules){if(rows.length>=limit)break outer;await battle(theme,floor,n,i,rule);}
 if(floor%10===0)console.log(`${phase} ${theme} F${floor}: rows=${rows.length} actual=${fresh} cache=${reused} errors=${rows.filter(r=>r.error).length} seconds=${Math.round((Date.now()-started)/1000)}`);
}
if(limit===Infinity)for(const theme of themes.filter(t=>t==='johto'||t==='kanto'))for(const floor of [50,100])for(let n=1;n<=seeds;n++)for(let i=0;i<cases.length;i++)for(const rule of rules)await battle(theme,floor,n,i,rule,true);
// Cover every existing Z signature, including alternate leaders/champions and
// organization events absent from the nine regular routes. Never mix these
// supplemental matchups into the route-weighted regional figures.
if(limit===Infinity)for(const sample of inventory)for(const floor of [45,75]){
 const band=floor<=50?'1-50':'51-100';
 if(rows.some(r=>r.npcId===sample.id&&r.band===band))continue;
 for(let n=1;n<=seeds;n++)for(let i=0;i<cases.length;i++)for(const rule of rules)await battle('kanto',floor,n,i,rule,false,sample);
 console.log(`${phase} supplemental ${sample.id} ${band}: rows=${rows.length} actual=${fresh}`);
}
assert.equal(policyHash,digest(['src/battle/npc-policy.ts','src/battle/z-decision.ts'].map(p=>readFileSync(p,'utf8')).join('\n')),'Policy changed during measurement; rerun');
assert.equal(metricHash,digest('final-model-2\n'+['scripts/lib/z-ai-telemetry.ts','src/battle/z-decision.ts'].map(p=>readFileSync(p,'utf8')).join('\n')),'Metric changed during measurement; rerun');
function summary(group:Row[]){const completed=group.filter(r=>!r.error),wins=completed.filter(r=>r.winner==='Player').length;return {n:group.length,completed:completed.length,wins,losses:completed.filter(r=>r.winner==='Tower AI').length,draws:completed.filter(r=>!r.winner).length,errors:group.length-completed.length,rate:completed.length?wins/completed.length:null,turns:completed.length?completed.reduce((s,r)=>s+r.turns,0)/completed.length:null};}
const report={phase,seeds,actualBattles:fresh,reused,elapsedSeconds:(Date.now()-started)/1000,total:summary(rows),byTheme:themes.flatMap(theme=>['1-50','51-100'].map(band=>({theme,band,all:summary(rows.filter(r=>r.theme===theme&&r.band===band&&r.kind!=='hidden')),named:summary(rows.filter(r=>r.theme===theme&&r.band===band&&r.kind==='named')),ordinary:summary(rows.filter(r=>r.theme===theme&&r.band===band&&r.kind==='ordinary')),hidden:summary(rows.filter(r=>r.theme===theme&&r.band===band&&r.kind==='hidden'))}))),byNpc:Object.entries(Object.groupBy(rows.filter(r=>r.kind==='named'),r=>r.npcId+':'+r.band)).map(([key,group])=>({key,name:group![0].name,...summary(group!)})),byRule:themes.flatMap(theme=>['1-50','51-100'].flatMap(band=>rules.map(rule=>({theme,band,rule,...summary(rows.filter(r=>r.theme===theme&&r.band===band&&r.rule===rule&&r.kind!=='hidden'))})))),errors:rows.filter(r=>r.error)};
writeFileSync(root+`/${phase}-report.json`,JSON.stringify(report,null,2));
writeFileSync(root+`/${phase}-manifest.json`,JSON.stringify({engineVersion,FORMAT,seeds,cases,rules,manifest,baselineCommit,loadedRuntimeHash:digest(readFileSync('src/data/normal-npc-templates.json','utf8')),sourceHashes:Object.fromEntries(['src/data/normal-npc-templates.json','src/data/npc-ai.ts','src/battle/npc-policy.ts','src/battle/npc-policy-v11.ts','src/battle/z-decision.ts','src/server/opponent-team.ts','src/server/npc-templates.ts','scripts/simulate-z-ai.ts'].map(path=>[path,digest(readFileSync(path,'utf8'))]))},null,2));
console.log(JSON.stringify({phase,actual:fresh,reused,total:report.total,seconds:report.elapsedSeconds}));
