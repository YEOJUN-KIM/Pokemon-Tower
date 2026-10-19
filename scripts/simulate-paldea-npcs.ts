import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {paldeaTrainers,paldeaSample} from '../src/data/paldea-trainers';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {AdvancedSwitchPolicy} from '../src/battle/advanced-switch-policy';
import {ZMovePolicy} from '../src/battle/z-move-policy';
import {defaultProfile} from '../src/server/training';
import {templateProfile} from '../src/server/npc-templates';
import {packTeam,pokemonSets} from '../src/data/teams';
import {runBattle,replayBattle,engineVersion,FORMAT,type BattleLog} from '../src/battle/run';
import {galarTuningTelemetry} from './lib/galar-tuning-telemetry';
import {applyPaldeaAuditVariant,paldeaAuditVariants,type PaldeaAuditVariant} from './lib/paldea-audit-variant';

const root=process.env.PALDEA_AUDIT_OUTPUT??'artifacts/experiments/balance/paldea-20261019';mkdirSync(root,{recursive:true});mkdirSync(root+'/traces',{recursive:true});
const variant=(process.env.PALDEA_AUDIT_VARIANT??'current') as PaldeaAuditVariant;
assert.ok(paldeaAuditVariants.includes(variant),'Unknown Paldea audit variant');
const targets=paldeaTrainers.filter(t=>variant==='current'||t.id===(variant==='tulip-no-item'?'named-tulip':'named-rika'));
const cases=[{id:'starters',species:['Charizard','Blastoise','Venusaur']},{id:'offense',species:['Garchomp','Metagross','Lapras']},{id:'bulk',species:['Slowbro','Corviknight','Gastrodon']},{id:'signature',species:['Mimikyu','Kommo-o','Gyarados']}];
function player(names:string[],floor:number,hazards=false){
 const profiles=Object.fromEntries(names.map(name=>{
  const p=defaultProfile(name),s=Showdown.Dex.species.get(name);p.moves=[...pokemonSets[name].moves];
  p.evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};p.evs[s.baseStats.atk>s.baseStats.spa?'atk':'spa']=32;p.evs[s.baseStats.spe>=80?'spe':'hp']=32;p.evs.spd=2;p.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};p.nature=p.evs.atk>p.evs.spa?'Adamant':'Modest';
  if(hazards&&name==='Skarmory')p.moves=['Stealth Rock','Spikes','Brave Bird','Roost'];
  return [name,templateProfile(p,floor)];
 }));
 return packTeam(names,profiles,Object.fromEntries(names.map((n,i)=>[n,['Expert Belt','Leftovers','Sitrus Berry'][i]])));
}
const rows:any[]=[];writeFileSync(root+'/logs.jsonl','');
const count=(lines:string[],prefix:string)=>lines.filter(l=>l.startsWith(prefix)).length;
function metrics(log:BattleLog,evaluations:any[],ace:string){
 const p=log.publicProtocol,t=galarTuningTelemetry(log,ace),switches=evaluations.filter(e=>e.mode!=='ko'),pivots=switches.filter(e=>e.mode==='pivot');
 let previous=-10,loops=0;for(const e of switches){if(e.turn-previous<3)loops++;previous=e.turn;}
 return {...t,tera:count(p,'|-terastallize|p2'),protean:p.filter(l=>l.startsWith('|-start|p2')&&l.includes('typechange')&&l.includes('Protean')).length,priority:p.filter(l=>l.startsWith('|move|p2')&&['Accelerock','Sucker Punch','Mach Punch','Shadow Sneak','Ice Shard'].includes(l.split('|')[3])).length,
  volt:count(p,'|move|p2a: Pawmot|Volt Switch|'),uturn:count(p,'|move|p2a: Meowscarada|U-turn|'),advancedDirect:switches.filter(e=>e.mode==='switch').length,hazardExits:switches.filter(e=>e.entryDamage||e.statusCost||e.speedCost||e.absorbBenefit).length,koAbandoned:switches.filter(e=>e.koAvailable).length,unfavorableExits:switches.filter(e=>e.netImprovement<=0).length,pivotLoops:loops,
  evaluatedPivots:pivots.length,poisonAbsorptions:count(p,'|-sideend|p2: Tower AI|move: Toxic Spikes'),toxicDebris:p.filter(l=>l.includes('ability: Toxic Debris')).length,supremeOverlord:p.filter(l=>l.includes('ability: Supreme Overlord')).length,protosynthesis:p.filter(l=>l.includes('protosynthesis')).length,quarkDrive:p.filter(l=>l.includes('quarkdrive')).length,
 };
}
for(const t of targets){
 const floors=t.category==='champion'||t.category==='hidden'?[50,100]:t.category==='event'?[75,95]:[45,95];
 const scenarios=t.category==='hidden'?[...cases,{id:'hazards',species:['Skarmory','Garchomp','Lapras']}]:cases;
 for(const floor of floors)for(const c of scenarios)for(let n=1;n<=8;n++){
  const meta={id:t.id,name:t.name,floor,case:c.id,n},sample=paldeaSample(t),snap=snapshotTrainerEventBattle(`paldea-balance:${t.id}:${floor}:${c.id}:${n}`,sample,floor,'basic',CURRENT_PROGRESSION),policy=createNpcPolicy(npcAi(floor,sample)),evaluations:any[]=[];
  snap.opponentTeam=applyPaldeaAuditVariant(snap.opponentTeam,variant);
  try{
   let installed=0;const basePlayer=new ZMovePolicy('p1');
   const log=await runBattle({teams:{p1:player(c.species,floor,c.id==='hazards'),p2:snap.opponentTeam},seed:snap.seed,rule:'basic',opponentRule:snap.opponentTeraTickets?'tera':'basic',teraTickets:{p1:0,p2:snap.opponentTeraTickets},opponentTeraSpecies:t.teraType?t.ace:undefined,
    player:{choose:o=>{if(c.id==='hazards'&&o.ownTeam.find(p=>p.active)?.details.startsWith('Skarmory')&&installed<2){const a=o.legalActions.find(a=>a.label===(installed===0?'Stealth Rock':'Spikes'));if(a){installed++;return a.command;}}return basePlayer.choose(o);}},
    opponent:{fixedOrder:policy.fixedOrder,switchingInformation:policy.switchingInformation,uncertainSwitchingInformation:policy.uncertainSwitchingInformation,observePublicLine:l=>policy.observePublicLine?.(l),choose:async o=>{const action=await policy.choose(o);if(policy instanceof AdvancedSwitchPolicy&&policy.lastEvaluation)evaluations.push({turn:o.turn,action,...policy.lastEvaluation});return action;}}});
   for(const e of evaluations.filter(e=>e.mode!=='ko')){assert.equal(e.koAvailable,false);assert.ok(e.remainingHP>.25);assert.ok(e.netImprovement>0);assert.ok(e.remainingHP>e.receiverRisk);}
   const row={...meta,winner:log.winner,...metrics(log,evaluations,t.ace)};rows.push(row);appendFileSync(root+'/logs.jsonl',JSON.stringify({...meta,log,evaluations})+'\n');
   if(n===1&&c.id==='offense'){await replayBattle(log);writeFileSync(`${root}/traces/${t.id}-${floor}.json`,JSON.stringify(log)+'\n');}
  }catch(e){rows.push({...meta,error:String(e)});}
 }
 console.log(`${t.id}: ${rows.filter(r=>r.id===t.id).length} battles`);
}
writeFileSync(root+'/battles.json',JSON.stringify(rows,null,2)+'\n');
const summary=paldeaTrainers.flatMap(t=>[...new Set(rows.filter(r=>r.id===t.id).map(r=>r.floor))].map(floor=>{
 const all=rows.filter(r=>r.id===t.id&&r.floor===floor),ok=all.filter(r=>!r.error),sum=(f:(r:any)=>number)=>ok.reduce((n,r)=>n+f(r),0);
 const moves:Record<string,number>={};for(const r of ok)for(const [name,n]of Object.entries(r.moves))moves[name]=(moves[name]??0)+(n as number);
 return {id:t.id,name:t.name,floor,battles:all.length,errors:all.length-ok.length,npcWins:sum(r=>Number(r.winner==='Tower AI')),winRate:sum(r=>Number(r.winner==='Tower AI'))/ok.length,meanTurns:sum(r=>r.turns)/ok.length,meanDirectSwitches:sum(r=>r.voluntary)/ok.length,teraBattles:sum(r=>Number(r.tera>0)),proteanBattles:sum(r=>Number(r.protean>0)),volt:sum(r=>r.volt),uturn:sum(r=>r.uturn),advancedDirect:sum(r=>r.advancedDirect),hazardExits:sum(r=>r.hazardExits),koAbandoned:sum(r=>r.koAbandoned),unfavorableExits:sum(r=>r.unfavorableExits),pivotLoops:sum(r=>r.pivotLoops),priority:sum(r=>r.priority),moves,issues:ok.flatMap(r=>r.issues.map((issue:string)=>({case:r.case,n:r.n,issue})))};
}));
const paths=['scripts/data/npc/paldea-design.json','src/data/paldea-trainers.ts','src/battle/switch-evaluation.ts','src/battle/advanced-switch-policy.ts','src/battle/paldea-policy.ts','src/battle/pivot-policy.ts','src/battle/npc-policy.ts','src/data/npc-ai.ts'];
writeFileSync(root+'/summary.json',JSON.stringify({baselineCommit:process.env.PALDEA_AUDIT_BASELINE??'ed0de99a8e1d9b7f2a8c9720572854daa004b294',variant,engineVersion,FORMAT,seeds:8,cases,extra:'Nemona also has 16 hazard scenario battles; report base and hazard rows separately. Audit variants override only packed simulator teams; live source/runtime data stay unchanged.',hashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),summary},null,2)+'\n');
console.log(JSON.stringify({battles:rows.length,errors:rows.filter(r=>r.error).length,summary:summary.map(({moves,issues,...s})=>({...s,issues:issues.length}))}));
