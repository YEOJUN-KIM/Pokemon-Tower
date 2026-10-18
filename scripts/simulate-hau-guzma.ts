import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {alolaTrainers,alolaSample} from '../src/data/alola-trainers';
import {trainerCatalog,type TrainerSample} from '../src/data/trainer-catalog';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {createNpcPolicy as v12Policy} from '../src/battle/npc-policy-v12';
import {DamagePolicy} from '../src/battle/policy';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {packTeam,pokemonSets} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {packedNpcRule} from '../src/data/npc-gimmicks';
import {monitorEntryPolicy} from './lib/hau-guzma-telemetry';

const root='artifacts/experiments/balance/hau-guzma-20261019';mkdirSync(root,{recursive:true});
const phase=process.env.HG_PHASE??'after-mega',before=phase==='before',oldAI=before||phase==='regression-before'||phase==='restored-v12';
assert.equal(before,!!process.env.NPC_BALANCE_BASELINE);
const oldDesign=JSON.parse(readFileSync(root+'/baseline-design.json','utf8')).trainers;
const cases=[
 {id:'balanced',team:['Charizard','Blastoise','Venusaur']},{id:'fast',team:['Jolteon','Weavile','Starmie']},
 {id:'physical',team:['Garchomp','Metagross','Gyarados']},{id:'special',team:['Alakazam','Magnezone','Primarina']},
 {id:'bulk',team:['Slowbro','Corviknight','Gastrodon']},{id:'water',team:['Blastoise','Swampert','Gyarados']},
 {id:'fire',team:['Charizard','Arcanine','Volcarona']},{id:'flying',team:['Aerodactyl','Talonflame','Dragonite']},
 {id:'fighting',team:['Machamp','Lucario','Heracross']},{id:'psychic',team:['Espeon','Slowbro','Alakazam']},
 {id:'fairy',team:['Clefable','Togekiss','Azumarill']},{id:'electric',team:['Raichu','Magnezone','Electivire']},
];
const regression=phase.startsWith('regression'),reference=phase==='rank-reference',trial=phase.startsWith('trial-'),targets=reference?['named-ilima','named-lana','named-mina','named-nanu','named-hala','named-molayne']:regression?['named-olivia','named-kahili','named-kiawe']:phase==='restored-v12'||trial?['named-guzma']:['named-hau','named-guzma'];
const seeds=Number(process.env.HG_SEEDS??(regression||reference?4:16)),path=`${root}/${phase}.jsonl`;writeFileSync(path,'');let completed=0;
const fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
writeFileSync(`${root}/${phase}-manifest.json`,JSON.stringify({baselineCommit:'7f2be76aecfdc4b92911a774cd8d9b29912e6ef8',phase,seeds,cases,targets,policy:oldAI?'v12':'v13',golisopodItemOverride:phase==='trial-life-orb'?'Life Orb':phase==='trial-assault-vest'?'Assault Vest':phase==='after'||phase==='restored-v12'?'Sitrus Berry':null,runtimeHash:fileHash(before?root+'/baseline-runtime.json':'src/data/normal-npc-templates.json'),policyHash:fileHash(oldAI?'src/battle/npc-policy-v12.ts':'src/battle/npc-policy.ts'),entryPolicyHash:oldAI?null:fileHash('src/battle/priority-entry-policy.ts'),rule:'basic',player:'DamagePolicy, curated defaults, 31 IV, 66 points, physical/special nature, no held items; paired full-health battles'},null,2));
let savedChain=false,savedZ=false,savedMega=false;
for(const id of targets){
 let sample:TrainerSample;
 if(before&&id==='named-hau')sample={id,name:'하우',title:'리그 최종 상대',kind:'named',role:'champion',generation:7,specialty:null,tactic:'balanced',portrait:'hau',minFloor:10,ace:'Primarina',entries:['Primarina','Raichu','Noivern','Crabominable','Tauros','Flareon'],concept:'레거시 하우'};
 else sample=alolaSample((before?oldDesign:alolaTrainers).find((t:any)=>t.id===id)!);
 for(const floor of id==='named-hau'?[50,100]:[45,95])for(const c of cases)for(let seed=1;seed<=seeds;seed++){
  const profiles=Object.fromEntries(c.team.map(name=>{assert.ok(pokemonSets[name],name);const p=defaultProfile(name),stats=Showdown.Dex.species.get(name).baseStats,physical=stats.atk>=stats.spa;p.moves=[...pokemonSets[name].moves];p.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};p.nature=physical?'Adamant':'Modest';p.evs={hp:16,atk:physical?32:0,def:0,spa:physical?0:32,spd:0,spe:18};return [name,p];}));
  const snapshot=snapshotTrainerEventBattle(`hau-guzma:${c.id}:${seed}`,sample,floor,'basic',CURRENT_PROGRESSION),ai=npcAi(floor,sample),monitor=monitorEntryPolicy((oldAI?v12Policy:createNpcPolicy)(ai));
  if(id==='named-guzma'&&(trial||phase==='after'||phase==='restored-v12')){const item=phase==='trial-life-orb'?'Life Orb':phase==='trial-assault-vest'?'Assault Vest':'Sitrus Berry';const team=Showdown.Teams.unpack(snapshot.opponentTeam)!;team.find(p=>p.species==='Golisopod')!.item=item;snapshot.opponentTeam=Showdown.Teams.pack(team);}
  const log=await runBattle({teams:{p1:packTeam(c.team,profiles),p2:snapshot.opponentTeam},rule:'basic',opponentRule:packedNpcRule(snapshot.team.map(p=>({item:p.item??''})),0),seed:snapshot.seed,player:new DamagePolicy(),opponent:monitor.policy});
  assert.ok(log.winner);const telemetry=monitor.finish(log);
  if(!oldAI)assert.equal(telemetry.entry.firstImpressionInvalid,0,`${id}/${floor}/${c.id}/${seed}`);
  if(seed===1&&c.id==='balanced')assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
  const row={id,floor,case:c.id,seed,battleSeed:snapshot.seed,team:snapshot.team.map(p=>p.name),winner:log.winner,turns:log.turns,ai,telemetry};appendFileSync(path,JSON.stringify(row)+'\n');completed++;
  if(!savedMega&&telemetry.entry.golisopodMegaActivations>0){writeFileSync(`${root}/${phase}-guzma-mega-example.json`,JSON.stringify({row,teams:log.teams,protocol:log.publicProtocol},null,2)+'\n');savedMega=true;}
  if(!oldAI&&(!savedChain&&telemetry.entry.firstImpressionAfterExitReturn>0||!savedZ&&id==='named-hau'&&telemetry.z.used)){
   const kind=id==='named-hau'?'hau-z':'guzma-exit-return';writeFileSync(`${root}/${phase}-${kind}-example.json`,JSON.stringify({row,teams:log.teams,protocol:log.publicProtocol},null,2)+'\n');if(id==='named-hau')savedZ=true;else savedChain=true;
  }
 }
 console.log(`${phase}: ${id}, completed ${completed}`);
}
console.log(`${phase}: ${completed} battles; errors=0`);
