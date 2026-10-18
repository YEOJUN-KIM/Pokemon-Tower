import {mkdirSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {hoennTrainers} from '../src/data/hoenn-trainers';
import {namedTrainerSamples,type TrainerSample} from '../src/data/trainer-catalog';
import {villainLeaders,organizationGrunt} from '../src/data/villain-organizations';
import {normalNpcTemplate,templateProfile} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {satisfiesSelectionRules} from '../src/data/npc-selection-rules';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {ZMovePolicy} from '../src/battle/z-move-policy';
import {packTeam,packPlayerTeam,pokemonSets} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {statKeys,type StatBlock,type TrainingProfile} from '../src/data/training';
import {megaStones,canEquipGimmick} from '../src/data/gimmicks';
import {matchingZCrystals,zCrystals} from '../src/data/z-crystals';
import {battleRules,allowsGimmick,type BattleRule} from '../src/data/run-rules';
import type {TrainerEquipment} from '../src/data/trainer-equipment';
import {packedNpcRule} from '../src/data/npc-gimmicks';
import {runBattle,engineVersion,FORMAT,type Seed} from '../src/battle/run';
import {normalNpcCategory,normalNpcGimmicksEnabled} from '../src/data/normal-mode-stages';
import {namedBattleTelemetry} from './lib/named-battle-telemetry';
import {monitorZPolicy,zAiTelemetry} from './lib/z-ai-telemetry';

const phase=process.argv.includes('--before')?'before':'after';
assert.equal(phase==='before',!!process.env.NPC_BALANCE_BASELINE);
const root=process.env.HOENN_OUTPUT??'artifacts/experiments/balance/hoenn-20261018';mkdirSync(root,{recursive:true});
const count=Number(process.env.HOENN_SEEDS??4),draws=Number(process.env.HOENN_DRAWS??1000);
assert.ok(Number.isSafeInteger(count)&&count>0&&Number.isSafeInteger(draws)&&draws>0);
const rules=Object.keys(battleRules) as BattleRule[];
// Same four independent-battle benchmarks and equipment as the existing regional
// comparison. No shopping, recruitment, consumables, or claims of human win rate.
const cases=[{id:'starters',species:['Charizard','Blastoise','Venusaur']},{id:'offense',species:['Garchomp','Metagross','Lapras']},{id:'bulk',species:['Slowbro','Corviknight','Gastrodon']},{id:'signature',species:['Mimikyu','Kommo-o','Gyarados']}];
const highest=JSON.parse(readFileSync('scripts/data/npc/npc-team-samples.json','utf8')).samples as {team:{species:string;profile:TrainingProfile}[]}[];
const roles=new Map<string,TrainingProfile>();for(const r of highest)for(const p of r.team)if(!roles.has(p.species))roles.set(p.species,p.profile);
const gear=(floor:number,rule:BattleRule):TrainerEquipment[]=>floor<11?[]:[...(allowsGimmick(rule,'dynamax')?['Dynamax Band' as const]:[]),...(allowsGimmick(rule,'terastallize')?['Tera Orb' as const]:[])];
function player(index:number,floor:number,rule:BattleRule){
 const species=cases[index].species;
 const profiles=Object.fromEntries(species.map(name=>{
  const p=defaultProfile(name),role=roles.get(name);p.moves=[...pokemonSets[name].moves];
  if(name==='Mimikyu')p.moves=['Play Rough','Shadow Claw','Shadow Sneak','Swords Dance'];
  if(name==='Kommo-o')p.moves=['Clanging Scales','Flamethrower','Drain Punch','Protect'];
  p.evs=role?{...role.evs}:{hp:10,atk:0,def:0,spa:32,spd:0,spe:24};
  if(!role&&Showdown.Dex.species.get(name).baseStats.atk>=Showdown.Dex.species.get(name).baseStats.spa){p.evs.atk=32;p.evs.spa=0;}
  p.ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as StatBlock;p.nature=floor>=55?(role?.nature??(p.evs.atk>p.evs.spa?'Adamant':'Modest')):'Serious';return [name,templateProfile(p,floor)];
 }));
 const items=Object.fromEntries(species.map((name,i)=>[name,floor>=11?['Expert Belt','Leftovers','Sitrus Berry'][i]:'']));
 if(floor>=11){
  if(allowsGimmick(rule,'mega')){const pair=species.flatMap(name=>Object.keys(megaStones).filter(item=>canEquipGimmick(name,item)).map(item=>({name,item})))[0];if(pair)items[pair.name]=pair.item;}
  if(allowsGimmick(rule,'zmove')){const eligible=species.filter(n=>!megaStones[items[n]]),name=eligible.find(n=>n==='Mimikyu')??eligible.find(n=>n==='Kommo-o')??eligible[0];const item=matchingZCrystals(name,profiles[name].moves).sort((a,b)=>Number(!!zCrystals[b].from)-Number(!!zCrystals[a].from))[0];if(item)items[name]=item;}
 }
 return packPlayerTeam(species,profiles,items,gear(floor,rule).includes('Dynamax Band'));
}
function sampleFor(id:string):TrainerSample{
 const named=namedTrainerSamples.find(s=>s.id===id);if(named)return named;
 const org=id.split('-')[0];if(id.endsWith('-grunt'))return organizationGrunt(org);
 const group=villainLeaders[org],base=id.includes('-boss-')?group.boss:[group.executive,...group.executives??[]].find(s=>id.endsWith('-'+s.portrait))!;
 return {...base,id,role:'villain'};
}
const inc=(map:Record<string,number>,key:string)=>{map[key]=(map[key]??0)+1;};
const lineup:unknown[]=[];
for(const t of hoennTrainers){
 const sample=sampleFor(t.id);
 for(const floor of t.category==='boss'?[76,96]:[45,55,95]){
  const template=normalNpcTemplate(t.id,floor,sample.role);if(phase==='before'&&!template)continue;assert.ok(template,t.id);
  const teams:Record<string,number>={},leads:Record<string,number>={},lasts:Record<string,number>={};let ace=0,carrier=0,success=0,both=0,slow=0;
  for(let n=1;n<=draws;n++){
   const team=generateOpponentTeam(floor,[n,floor,29,43],[],null,sample,CURRENT_PROGRESSION),names=team.map(p=>p.name);
   inc(teams,[...names].sort().join(' / '));inc(leads,names[0]);inc(lasts,names[2]);
   ace+=Number(names.includes(template.ace));carrier+=Number(!!template.signature&&names.includes(template.signature.species));
   success+=Number(satisfiesSelectionRules(names,template.selectionRules));both+=Number(names.includes('Solrock')&&names.includes('Lunatone'));
   slow+=Number(names.every(n=>Showdown.Dex.species.get(n).baseStats.spe<70));
  }
  assert.equal(success,draws);lineup.push({id:t.id,floor,draws,teams,leads,lasts,ace,carrier,success,both,slow});
 }
}
writeFileSync(`${root}/${phase}-lineups.json`,JSON.stringify(lineup,null,2));
const out=`${root}/${phase}-focused.jsonl`;writeFileSync(out,'');
const sources=['src/data/normal-npc-templates.json','src/data/hoenn-trainers.ts','src/battle/npc-policy.ts','src/battle/z-decision.ts','src/server/opponent-team.ts'];
writeFileSync(`${root}/${phase}-focused-manifest.json`,JSON.stringify({engineVersion,FORMAT,count,draws,cases,rules,baseline:process.env.NPC_BALANCE_BASELINE??null,sourceHashes:Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))},null,2));
for(const t of hoennTrainers){
 const sample=sampleFor(t.id);let battles=0,errors=0;
 for(const floor of t.category==='boss'?[76,96]:[45,95]){
  const template=normalNpcTemplate(t.id,floor,sample.role);if(phase==='before'&&!template)continue;assert.ok(template,t.id);
  for(let n=1;n<=count;n++){
   const entries=generateOpponentTeam(floor,[n,floor,29,43],[],null,sample,CURRENT_PROGRESSION);
   const signature=normalNpcGimmicksEnabled(floor,normalNpcCategory(sample.role,sample.id,sample.kind))?template.signature:null,tera=signature?.rule==='tera'?1:0;
   const p2=packTeam(entries.map(p=>p.name),Object.fromEntries(entries.map(p=>[p.name,p.profile!])),Object.fromEntries(entries.map(p=>[p.name,p.item??''])));
   for(let i=0;i<cases.length;i++)for(const rule of rules){
    const seed:Seed=[n,floor,37,101],ai=npcAi(floor,sample,{boss:t.category==='champion'});
    const base={phase,id:t.id,floor,n,caseId:cases[i].id,rule,ai,team:entries.map(p=>p.name)};
    try{
     const monitor=monitorZPolicy(createNpcPolicy(ai));
     const log=await runBattle({teams:{p1:player(i,floor,rule),p2},seed,rule,opponentRule:packedNpcRule(entries.map(p=>({item:p.item??''})),tera),opponentTeraSpecies:signature?.rule==='tera'?signature.species:undefined,teraTickets:{p1:0,p2:tera},trainerEquipment:gear(floor,rule),player:new ZMovePolicy('p1'),opponent:monitor.policy});
     const telemetry=namedBattleTelemetry(log),z=telemetry.available.some(a=>a.kind==='z')?zAiTelemetry(log,monitor.evaluations):null;
     const truant=log.publicProtocol.filter(l=>l.includes('Truant')).length;
     const legendaryKOs=log.publicProtocol.reduce((state,l)=>{const p=l.split('|');if(p[1]==='move')state.actor=p[2]?.startsWith('p2')?p[2].split(': ')[1]:'';if(p[1]==='faint'&&p[2]?.startsWith('p1')&&['Groudon','Kyogre'].includes(state.actor))state.count++;return state;},{actor:'',count:0}).count;
     appendFileSync(out,JSON.stringify({...base,winner:log.winner,turns:log.turns,telemetry,z,truant,legendaryKOs})+'\n');
    }catch(error){errors++;appendFileSync(out,JSON.stringify({...base,error:String(error)})+'\n');}
    battles++;
   }
  }
 }
 console.log(`${phase} ${t.id}: ${battles} battles, ${errors} errors`);
}
