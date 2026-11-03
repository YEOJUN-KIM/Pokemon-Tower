// Read-only v2 runtime audit. Run: node --import tsx scripts/audit-build-progression.ts [runs]
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {generateOpponentTeam,selectTrainerSample,encounterRandom,encounterPool} from '../src/server/opponent-team';
import {generateNpcEncounter} from '../src/server/npc-encounters';
import {npcSamples} from '../src/data/npc-samples';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {randomTowerTheme,secondTowerTheme,towerThemes} from '../src/data/tower-themes';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {normalNpcCategory,normalNpcGimmicksEnabled} from '../src/data/normal-mode-stages';
import {npcGimmick,npcSpecies} from '../src/data/npc-gimmicks';
import {megaStones,DYNAMAX_ITEM} from '../src/data/gimmicks';
import {zCrystals} from '../src/data/z-crystals';
import {primalOrbs} from '../src/data/primal-forms';
import {npcAi} from '../src/data/npc-ai';
import {CURRENT_PROGRESSION,towerDifficulty,type TowerProgression} from '../src/data/tower-progression';
import {opponentProfile} from '../src/server/opponent-training';
import {statKeys} from '../src/data/training';
import {packTeam} from '../src/data/teams';
import type {Seed} from '../src/battle/run';
import type {BattleRule} from '../src/data/run-rules';
const dir='artifacts/build-progression-audit';mkdirSync(dir,{recursive:true});
const progression=(process.argv[4]??CURRENT_PROGRESSION) as TowerProgression;
const runs=Number(process.argv[2]??1000),rule=(process.argv[3]??'chaos') as BattleRule,suffix=(rule==='chaos'?`${runs}`:`${runs}-${rule}`)+(progression===CURRENT_PROGRESSION?'':'-v1'),out=`${dir}/encounters-${suffix}.jsonl`;
writeFileSync(out,'');
const ranges=[[1,10],[11,20],[21,30],[31,40],[41,49],[50,50],[51,60],[61,70],[71,80],[81,90],[91,99],[100,100]];
const groups:any[]=ranges.map(([lo,hi])=>({lo,hi})),floors:any[]=Array.from({length:100},(_,i)=>({lo:i+1,hi:i+1})),hidden:any={lo:0,hi:0};
const inc=(obj:any,key:string,n=1)=>obj[key]=(obj[key]??0)+n;
const setup=new Set(['swordsdance','dragondance','nastyplot','calmmind','bulkup','quiverdance','shellsmash','coil','agility','rockpolish','irondefense','bellydrum','shiftgear','growth','workup','tidyup']);
const hazards=new Set(['stealthrock','spikes','toxicspikes','stickyweb']);
const pivot=new Set(['uturn','voltswitch','flipturn','partingshot','teleport','batonpass','chillyreception']);
const weatherAbilities=new Set(['Drought','Drizzle','Sand Stream','Snow Warning','Orichalcum Pulse','Primordial Sea','Desolate Land']);
const fieldAbilities=new Set(['Electric Surge','Grassy Surge','Psychic Surge','Misty Surge','Hadron Engine']);
function record(g:any,r:any){
 g.n=(g.n??0)+1;for(const key of ['rank','role','trainer','gimmick','ai','tactic','theme']){g[key]??={};inc(g[key],String(r[key]??'none'));}
 for(const key of ['size','itemCount','bst','iv','ev','attackPower','typeCount','repeatSpecies','repeatPair','repeatTeam','typeRepeat','mono','physical','special','fast','bulky','setup','status','hazard','priority','weather','terrain','pivot','phaze','competitiveItems'])g[key]=(g[key]??0)+Number(r[key]);
 g.itemTeams=(g.itemTeams??0)+Number(r.itemCount>0);g.gimmickTeams=(g.gimmickTeams??0)+Number(!!r.gimmick);
 g.species??={};g.types??={};g.items??={};g.teams??={};g.pairs??={};g.typeSignatures??={};g.moves??={};
 for(const p of r.team){inc(g.species,p.name);for(const t of p.types)inc(g.types,t);if(p.item)inc(g.items,p.item);for(const m of p.moves)inc(g.moves,m);}
 inc(g.teams,r.teamKey);inc(g.typeSignatures,r.typeKey);
 for(let i=0;i<r.names.length;i++)for(let j=0;j<i;j++)inc(g.pairs,[r.names[i],r.names[j]].sort().join('|'));
}
const themes:any={},firstGimmick:any={},firstMaster:any={};let parityRows:any[]=[];
for(let run=0;run<runs;run++){
 const runId=createHash('sha256').update(`pokemon-tower-audit-v1:${run}`).digest('hex').slice(0,36),first=randomTowerTheme(runId),second=secondTowerTheme(runId,first);inc(themes,first);
 const history:any[]=[];let lines='',gimmickSeen=false,masterSeen=false;
 for(let floor=1;floor<=100;floor++)for(const stage of [0,...(floor%50===0&&'hiddenBoss' in towerThemes[floor===50?first:second]?[1]:[])]){
  const theme=floor<=50?first:second,bytes=createHash('sha256').update(`${runId}:${floor}:${stage}`).digest(),seed=[0,2,4,6].map(i=>bytes.readUInt16BE(i)) as Seed;
  const trainer=towerTrainerEncounter(floor,runId,theme,true,stage===1);
  const recent=history.slice(0,3);
  const sample=trainer?undefined:selectTrainerSample(floor,seed,recent.filter(r=>r.rank!=='named').map(r=>({id:r.trainer,specialty:r.specialty})),progression,{common:true});
  const concept=sample?.npcRank?npcSamples.find(s=>s.id===sample.id):undefined;
  const ranked=concept?generateNpcEncounter(floor,seed,concept,sample!.npcRank!,rule,progression):null;
  const team=ranked?.team??generateOpponentTeam(floor,seed,recent.flatMap(r=>r.names),trainer,sample,progression);
  const id=sample?.id??trainer!.boss.id,role=sample?.role??trainer?.boss.role??'trainer';
  const template=trainer?normalNpcTemplate(id,floor,role,progression):null;
  const allowed=ranked?!!ranked.gimmick:normalNpcGimmicksEnabled(floor,normalNpcCategory(role,id,sample?.kind??'named'),progression);
  let signature=ranked?.gimmick??null;
  if(trainer&&allowed){const plan=template?.signature??npcGimmick(id,trainer.boss.generation??null,team.map(p=>p.name),trainer.ace?npcSpecies(trainer.ace,id,trainer.boss.generation??null):undefined),carrier=team.find(p=>p.item&&(megaStones[p.item]||primalOrbs[p.item]||p.item===DYNAMAX_ITEM||zCrystals[p.item]));signature=carrier?{rule:primalOrbs[carrier.item!]?'primal':megaStones[carrier.item!]?'mega':carrier.item===DYNAMAX_ITEM?'dynamax':'z',species:carrier.name,item:carrier.item}:plan?.rule==='tera'||plan?.rule==='dynamax'&&team.some(p=>p.name===plan.species&&p.gigantamax)?plan:null;}
  const ai=npcAi(floor,sample??{...trainer!.boss,kind:'named',tactic:trainer!.tactic},{boss:floor%50===0,progression});
  const enriched=team.map(p=>{const sp=Showdown.Dex.species.get(p.name);const profile=p.profile??opponentProfile(p.name,p.moves,floor,Object.fromEntries(statKeys.map((k,i)=>[k,bytes[i+8]%32])) as any,progression);return {...p,profile,types:sp.types,bst:sp.bst};});
  const moves=team.flatMap(p=>p.moves.map(m=>Showdown.Dex.moves.get(m))),names=team.map(p=>p.name).sort(),typeKey=team.map(p=>Showdown.Dex.species.get(p.name).types.slice().sort().join('/')).sort().join('|'),teamKey=names.join('|');
  const abilityNames=enriched.map(p=>p.ability??p.profile.ability),previousNames=new Set(recent.flatMap(r=>r.names));
  const attack=moves.filter(m=>m.category!=='Status');
  const row:any={run,floor,stage,seed,theme,rank:ranked?.rank??'named',role,trainer:id,specialty:sample?.specialty??null,tactic:sample?.tactic??trainer!.tactic,ai:ai.tier,aiProfile:ai,gimmick:signature?.rule??null,signature,team:enriched,names,teamKey,typeKey,size:team.length,itemCount:team.filter(p=>p.item).length,
   bst:enriched.reduce((s,p)=>s+p.bst,0)/team.length,iv:enriched.reduce((s,p)=>s+Object.values(p.profile.ivs).reduce((a,b)=>a+b,0)/6,0)/team.length,ev:enriched.reduce((s,p)=>s+Object.values(p.profile.evs).reduce((a,b)=>a+b,0),0)/team.length,
   attackPower:attack.reduce((s,m)=>s+m.basePower,0)/Math.max(1,attack.length),typeCount:new Set(enriched.flatMap(p=>p.types)).size,
   repeatSpecies:names.filter(n=>previousNames.has(n)).length,repeatPair:recent.some(r=>names.filter(n=>r.names.includes(n)).length>=2),repeatTeam:recent.some(r=>r.teamKey===teamKey),typeRepeat:recent.some(r=>r.typeKey===typeKey),
   mono:Showdown.Dex.types.all().some(t=>enriched.every(p=>p.types.includes(t.name))),physical:attack.filter(m=>m.category==='Physical').length>attack.length*2/3,special:attack.filter(m=>m.category==='Special').length>attack.length*2/3,
   fast:team.some(p=>Showdown.Dex.species.get(p.name).baseStats.spe>=100),bulky:team.some(p=>{const s=Showdown.Dex.species.get(p.name).baseStats;return s.hp+s.def+s.spd>=300;}),
   setup:moves.some(m=>setup.has(m.id)),status:moves.some(m=>m.status||m.secondary?.status||m.secondaries?.some(e=>e.status)),hazard:moves.some(m=>hazards.has(m.id)),priority:attack.some(m=>m.priority>0),weather:moves.some(m=>m.weather)||abilityNames.some(a=>weatherAbilities.has(a)),terrain:moves.some(m=>m.terrain)||abilityNames.some(a=>fieldAbilities.has(a)),pivot:moves.some(m=>pivot.has(m.id)),phaze:moves.some(m=>m.forceSwitch),competitiveItems:team.filter(p=>['Life Orb','Focus Sash','Choice Band','Choice Specs','Choice Scarf','Leftovers','Rocky Helmet','Assault Vest'].includes(p.item??'')).length};
  if(!gimmickSeen&&signature){inc(firstGimmick,String(floor));gimmickSeen=true;}if(!masterSeen&&ranked?.rank==='master'){inc(firstMaster,String(floor));masterSeen=true;}
  if(stage===0){record(floors[floor-1],row);record(groups.find(g=>floor>=g.lo&&floor<=g.hi),row);}else record(hidden,row);
  history.unshift(row);if(history.length>3)history.pop();lines+=JSON.stringify(row)+'\n';
  if(run===0)parityRows.push({floor,stage,seed,trainer:id,team:packTeam(names,Object.fromEntries(enriched.map(p=>[p.name,p.profile])),Object.fromEntries(team.map(p=>[p.name,p.item??''])),team.filter(p=>p.gigantamax).map(p=>p.name))});
 }
 appendFileSync(out,lines);
 if((run+1)%10===0)console.log(`completed ${run+1}/${runs} runs (${Math.round(process.uptime())}s)`);
}
function finish(g:any){
 const top=(o:any,n=10)=>Object.entries(o??{}).sort((a:any,b:any)=>b[1]-a[1]).slice(0,n);
 return {...g,topSpecies:top(g.species),topTypes:top(g.types),topItems:top(g.items),topTeams:top(g.teams,5),topPairs:top(g.pairs,5),topMoves:top(g.moves),uniqueSpecies:Object.keys(g.species??{}).length,uniqueTeams:Object.keys(g.teams??{}).length,uniqueTypeSignatures:Object.keys(g.typeSignatures??{}).length,collisionTeam:Object.values(g.teams??{}).reduce((s:number,c:any)=>s+c*(c-1),0)/(g.n*(g.n-1)),species:undefined,types:undefined,items:undefined,teams:undefined,pairs:undefined,moves:undefined,typeSignatures:undefined};
}
writeFileSync(`${dir}/summary-${suffix}.json`,JSON.stringify({runs,progression,rule,seedLabel:'pokemon-tower-audit-v1',themes,firstGimmick,firstMaster,groups:groups.map(finish),floors:floors.map(finish),hidden:finish(hidden),poolSizes:Array.from({length:100},(_,i)=>({floor:i+1,all:encounterPool(i+1,progression).length,difficulty:towerDifficulty(i+1)}))},null,2));
writeFileSync(`${dir}/parity-${suffix}.json`,JSON.stringify(parityRows,null,2));
console.log('DONE',out);
