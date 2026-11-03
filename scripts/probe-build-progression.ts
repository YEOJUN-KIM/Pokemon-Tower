// Controlled comparisons, including equal-training ablation. Not human climb win rates.
import {createReadStream,mkdirSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {runBattle} from '../src/battle/run';
import {TowerPolicy} from '../src/battle/tower-policy';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {packedNpcRule} from '../src/data/npc-gimmicks';
import {starters,packTeam,pokemonSets} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {statKeys} from '../src/data/training';
const dir='artifacts/build-progression-audit';mkdirSync(dir,{recursive:true});
const checkpoints=[1,4,5,10,11,20,30,40,49,50,51,55,60,70,90,99,100],limit=Number(process.argv[2]??50);
const profiles=Object.fromEntries(starters.map(name=>{const p=defaultProfile(name);p.moves=[...pokemonSets[name].moves];p.ivs=Object.fromEntries(statKeys.map(k=>[k,15])) as any;p.evs={hp:10,atk:0,def:0,spa:15,spd:0,spe:8};return [name,p];}));
const p1=packTeam(starters,profiles),results:any[]=[];
for(const version of ['before','after'] as const){
 const path=version==='before'?'artifacts/progression-audit/encounters-1000.jsonl':`${dir}/encounters-1000.jsonl`;
 for await(const line of createInterface({input:createReadStream(path),crlfDelay:Infinity})){
  const r=JSON.parse(line);if(r.run>=limit)break;if(r.stage!==0||!checkpoints.includes(r.floor))continue;
  for(const normalized of [false,true]){
   const team=r.team.map((p:any)=>({...p,profile:normalized?{...p.profile,ivs:Object.fromEntries(statKeys.map(k=>[k,15])),evs:{hp:8,atk:5,def:5,spa:5,spd:5,spe:5},nature:'Serious'}:p.profile}));
   const p2=packTeam(team.map((p:any)=>p.name),Object.fromEntries(team.map((p:any)=>[p.name,p.profile])),Object.fromEntries(team.map((p:any)=>[p.name,p.item??''])),team.filter((p:any)=>p.gigantamax).map((p:any)=>p.name));
   try{
    const log=await runBattle({teams:{p1,p2},seed:r.seed,rule:'chaos',opponentRule:packedNpcRule(team.map((p:any)=>({...p,item:p.item??''})),r.gimmick==='tera'?1:0),opponentTeraSpecies:r.gimmick==='tera'?r.signature.species:undefined,teraTickets:{p1:0,p2:r.gimmick==='tera'?1:0},trainerEquipment:[],player:new TowerPolicy(),opponent:createNpcPolicy(r.aiProfile)});
    results.push({version,normalized,run:r.run,floor:r.floor,rank:r.rank,trainer:r.trainer,gimmick:r.gimmick,winner:log.winner,turns:log.turns,activated:log.publicProtocol.some(l=>/\|-(mega|primal|zpower|terastallize)\|p2|\|-start\|p2.*\|Dynamax/.test(l))});
   }catch(e){results.push({version,normalized,run:r.run,floor:r.floor,rank:r.rank,error:String(e)});}
  }
  if(results.length%200===0)console.log('Controlled battles',results.length);
 }
}
const groups:any={};for(const r of results){const key=`${r.version}:${r.normalized?'equal-training':'actual'}:${r.floor}`,g=groups[key]??={n:0,wins:0,errors:0,turns:0,equipped:0,activated:0};g.n++;if(r.error){g.errors++;continue;}g.wins+=Number(r.winner==='Player');g.turns+=r.turns;g.equipped+=Number(!!r.gimmick);g.activated+=Number(r.activated);}
writeFileSync(`${dir}/controlled-probes.json`,JSON.stringify({limit,checkpoints,assumptions:'Same fixed starter team: IV15, SpA15/HP10/Spe8, default pokemonSets moves; no player items/gimmicks, TowerPolicy. Equal-training sets ALL opponents to IV15 / 33 identical neutral-nature points (HP8, other stats5). Species/moves/items/AI/gimmicks remain generated. This isolates changes beyond training investment, NOT human win rates.',groups,results},null,2));
console.log('Controlled probes complete',results.length);
