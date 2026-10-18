import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {alolaTrainers,alolaSample} from '../src/data/alola-trainers';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {DamagePolicy} from '../src/battle/policy';
import {TowerPolicy} from '../src/battle/tower-policy';
import {LearningOpponentPolicy} from '../src/battle/learning-opponent-policy';
import {runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {packTeam,pokemonSets} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {packedNpcRule} from '../src/data/npc-gimmicks';
import {mechanicObserver,tuningTelemetry} from './lib/alola-tuning-telemetry';

const root='artifacts/experiments/balance/alola-tuning-20261018';mkdirSync(root,{recursive:true});
const baseline=process.argv.includes('--before'),phase=process.env.ALOLA_PHASE??(baseline?'before':'after');
assert.equal(baseline,!!process.env.NPC_BALANCE_BASELINE);
const design=baseline?JSON.parse(readFileSync(root+'/baseline-design.json','utf8')).trainers:alolaTrainers;
const smart=process.env.ALOLA_SMART==='1',holdout=process.env.ALOLA_HOLDOUT==='1'||smart;
const cases=holdout?[
 {id:'holdout-fast',team:['Dragapult','Aerodactyl','Greninja']},
 {id:'holdout-physical',team:['Dragonite','Scizor','Darmanitan']},
 {id:'holdout-special',team:['Espeon','Gengar','Hydreigon']},
 {id:'holdout-bulk',team:['Hippowdon','Toxapex','Umbreon']},
 {id:'holdout-water',team:['Rotom-Wash','Milotic','Azumarill']},
 {id:'holdout-bug',team:['Yanmega','Volcarona','Abomasnow']},
 {id:'holdout-balanced',team:['Mamoswine','Togekiss','Chandelure']},
 {id:'holdout-fighting',team:['Toxicroak','Kommo-o','Heracross']},
]:[
 {id:'balanced',team:['Charizard','Blastoise','Venusaur']},
 {id:'fast',team:['Jolteon','Weavile','Starmie']},
 {id:'physical',team:['Garchomp','Metagross','Gyarados']},
 {id:'special',team:['Alakazam','Magnezone','Primarina']},
 {id:'bulk',team:['Slowbro','Corviknight','Gastrodon']},
 {id:'water',team:['Blastoise','Swampert','Gyarados']},
 {id:'fire',team:['Charizard','Arcanine','Volcarona']},
 {id:'fighting',team:['Machamp','Lucario','Heracross']},
];
const seeds=Number(process.env.ALOLA_SEEDS??16),start=Number(process.env.ALOLA_SEED_START??1),path=`${root}/${phase}.jsonl`;
assert.ok(Number.isSafeInteger(seeds)&&seeds>0);writeFileSync(path,'');
const observer=mechanicObserver();let n=0;
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
writeFileSync(`${root}/${phase}-manifest.json`,JSON.stringify({phase,cases,seeds,start,floors:[45,95],rule:'basic',player:`${smart?'LearningOpponentPolicy(p1)':holdout?'TowerPolicy':'DamagePolicy'}; curated pokemonSets moves; IV31; 66 points; no held items; same full-health independent battles before/after`,runtime:hash(process.env.NPC_BALANCE_BASELINE??'src/data/normal-npc-templates.json'),design:hash(baseline?root+'/baseline-design.json':'scripts/data/npc/alola-design.json'),policy:hash('src/battle/npc-policy.ts')},null,2));
try{for(const id of ['named-olivia','named-kahili','named-kiawe']){
 const t=design.find((t:any)=>t.id===id)!,sample=alolaSample(t);
 for(const floor of [45,95])for(const c of cases)for(let seed=start;seed<start+seeds;seed++){
  const profiles=Object.fromEntries(c.team.map(name=>{assert.ok(pokemonSets[name],name);const p=defaultProfile(name),stats=Showdown.Dex.species.get(name).baseStats,physical=stats.atk>=stats.spa;p.moves=[...pokemonSets[name].moves];p.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};p.nature=physical?'Adamant':'Modest';p.evs={hp:16,atk:physical?32:0,def:0,spa:physical?0:32,spd:0,spe:18};return [name,p];}));
  const snap=snapshotTrainerEventBattle(`alola-tuning:${c.id}:${seed}`,sample,floor,'basic',CURRENT_PROGRESSION);observer.reset();
  const log=await runBattle({teams:{p1:packTeam(c.team,profiles),p2:snap.opponentTeam},rule:'basic',opponentRule:packedNpcRule(snap.team.map(p=>({item:p.item??''})),0),seed:snap.seed,player:smart?new LearningOpponentPolicy('p1'):holdout?new TowerPolicy():new DamagePolicy(),opponent:createNpcPolicy(npcAi(floor,sample))});
  assert.ok(log.winner,'Battle must complete');
  const telemetry=tuningTelemetry(log,observer.result());
  if(seed===start&&c.id==='balanced')assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
  const row={id,floor,case:c.id,seed,battleSeed:snap.seed,winner:log.winner,turns:log.turns,team:snap.team.map(p=>p.name),telemetry};
  appendFileSync(path,JSON.stringify(row)+'\n');
  if(process.env.ALOLA_SAVE_PROTOCOL==='1')writeFileSync(`${root}/${phase}-${id}-${floor}-${c.id}-${seed}.json`,JSON.stringify({teams:log.teams,protocol:log.publicProtocol,mechanics:observer.result()},null,2));
  n++;
 }
 console.log(`${phase}: ${id} ${n} battles completed`);
}}finally{observer.restore();}
console.log(`${phase}: ${n} total battles; errors=0`);
