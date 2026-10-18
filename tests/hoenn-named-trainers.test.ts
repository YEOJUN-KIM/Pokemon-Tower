import {readPreHauGuzmaFile as readFileSync} from './hau-guzma-preservation';
import {kalosTrainers} from '../src/data/kalos-trainers';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {hoennTrainers} from '../src/data/hoenn-trainers';
import {sinnohTrainers} from '../src/data/sinnoh-trainers';
import {unovaTrainers} from '../src/data/unova-trainers';
import preservation from './fixtures/alola-preservation.json' with {type:'json'};
import {trainerCatalog} from '../src/data/trainer-catalog';
import {villainLeaders,villainEncounter,organizationGrunt} from '../src/data/villain-organizations';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {satisfiesSelectionRules} from '../src/data/npc-selection-rules';
import {npcAi} from '../src/data/npc-ai';
import {CURRENT_PROGRESSION,towerDifficulty} from '../src/data/tower-progression';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {pokemonSets,packTeam,starters} from '../src/data/teams';
import {createNpcPolicy} from '../src/battle/npc-policy';
import {DamagePolicy} from '../src/battle/policy';
import {packedNpcRule} from '../src/data/npc-gimmicks';
import {projectNpcRuntime} from '../scripts/lib/npc-runtime.mjs';

const source=JSON.parse(readFileSync('scripts/data/npc/normal-npc-samples.json','utf8'));
const runtime=JSON.parse(readFileSync('src/data/normal-npc-templates.json','utf8'));
test('all out-of-scope NPC runtime definitions retain their pre-Hoenn content',()=>{
 const changed=new Set([...kalosTrainers,...hoennTrainers,...sinnohTrainers,...unovaTrainers].map(t=>t.id));changed.add('named-lysandre');changed.add('named-maxie');changed.add('named-archie');changed.add('named-cyrus');changed.add('named-ghetsis');
 const others=runtime.filter((r:{id:string})=>!preservation.excludedAlola.includes(r.id)&&!changed.has(r.id)).sort((a:{id:string;stage:string},b:{id:string;stage:string})=>(a.id+a.stage).localeCompare(b.id+b.stage));
 // Sinnoh has its own before/after preservation guard following its review.
 assert.equal(others.length,preservation.hoenn.count);
 assert.equal(createHash('sha256').update(JSON.stringify(others)).digest('hex'),preservation.hoenn.runtime);
});
function sampleFor(id:string){
 const named=trainerCatalog.find(s=>s.id===id);if(named)return named;
 const org=id.split('-')[0];if(id.endsWith('grunt'))return organizationGrunt(org);
 const leaders=villainLeaders[org];return {...(id.includes('-boss-')?leaders.boss:[leaders.executive,...leaders.executives??[]].find(s=>id.endsWith('-'+s.portrait))!),id};
}
test('reviewed Hoenn runtime projection includes staged selectable boss candidates',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(projectNpcRuntime(source))),runtime);
 for(const id of ['magma-boss-maxie','aqua-boss-archie'])for(const floor of [50,76,100]){
  const t=normalNpcTemplate(id,floor,'villain')!;assert.equal(t.select,true);assert.ok(t.team.length>=4);
 }
});
for(const t of hoennTrainers)test(`${t.id}: legal sets, deterministic triples, selection and original floor training`,()=>{
 const sample=sampleFor(t.id),validator=new Showdown.TeamValidator(FORMAT);
 for(const floor of t.category==='boss'?[50,76,100]:[5,45,55,95,100]){
  const template=normalNpcTemplate(t.id,floor,sample.role)!;assert.ok(template,t.id);
  if(t.id==='named-roxanne')assert.equal(npcAi(floor,sample).tier,'tactical');
  assert.ok(template.team.length>=4&&template.team.length<=6);
  for(const p of template.team){assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.species]),ability:p.profile.ability,item:p.item,moves:p.profile.moves},{}),null,t.id+'/'+p.species);}
  for(let n=1;n<=12;n++){
   const seed:[number,number,number,number]=[n,floor,29,43],team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),names=team.map(p=>p.name);
   assert.equal(team.length,3);assert.equal(new Set(names).size,3);assert.ok(satisfiesSelectionRules(names,template.selectionRules));
   assert.deepEqual(team,generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION));
   for(const p of team){assert.equal(p.profile!.statSystem,'points');assert.equal(Object.values(p.profile!.evs).reduce((a,b)=>a+b,0),Math.min(66,towerDifficulty(floor).points));assert.ok(p.profile!.moves.every(m=>m!=='Hidden Power Ice'));}
   if(t.category==='grunt'){assert.equal(npcAi(floor,sample).tier,floor<20?'basic':'tactical');assert.ok(team.every(p=>!p.item?.endsWith('ite')&&!p.item?.endsWith(' Z')));}
   if(t.id==='named-brawly')assert.ok(names.some(n=>['Medicham','Breloom','Heracross'].includes(n)));
   if(t.id==='named-tateandliza')assert.ok(names.includes('Solrock')||names.includes('Lunatone'));
   if(t.id==='magma-boss-maxie'&&floor>=75){assert.equal(names[0],'Groudon');assert.equal(team.find(p=>p.name==='Camerupt')!.item,'Cameruptite');}
   if(t.id==='aqua-boss-archie'&&floor>=75){assert.ok(names.includes('Kyogre'));assert.equal(names.at(-1),'Sharpedo');}
  }
 }
});
test('both Hoenn officers are reachable and use their own portraits, eligibility and sets',()=>{
 for(const org of ['magma','aqua']){
  const seen=new Set<string>();
  for(let n=0;n<5000;n++){const e=villainEncounter('hoenn-officers-'+n,56,org,false,false,{gruntWins:100,executiveWins:0});if(e?.event.rank==='executive')seen.add(e.sample.portrait);}
  const leaders=villainLeaders[org];assert.deepEqual([...seen].sort(),[leaders.executive,...leaders.executives!].map(s=>s.portrait).sort());
  for(const officer of leaders.executives!)assert.ok(existsSync(`public/sprites/trainers/${officer.portrait}.png`));
  for(let n=0;n<100;n++){const e=villainEncounter('hoenn-eligible-'+n,56,org,false,false,{gruntWins:100,executiveWins:0},s=>s.portrait!==leaders.executive.portrait);if(e?.event.rank==='executive')assert.equal(e.sample.portrait,leaders.executives![0].portrait);}
 }
 const matt=normalNpcTemplate('aqua-executive-matt',95,'villain')!,shelly=normalNpcTemplate('aqua-executive-shelly',95,'villain')!;
 assert.notDeepEqual(matt.team.find(p=>p.species==='Sharpedo')!.profile.moves,shelly.team.find(p=>p.species==='Sharpedo')!.profile.moves);
});
test('Hoenn Mega bosses produce legal v12 actions and deterministic replay',async()=>{
 for(const id of ['named-phoebe','named-glacia','named-steven','magma-boss-maxie','aqua-boss-archie']){
  const sample=sampleFor(id),seed:[number,number,number,number]=[2,95,29,43],team=generateOpponentTeam(95,seed,[],null,sample,CURRENT_PROGRESSION);
  const p2=packTeam(team.map(p=>p.name),Object.fromEntries(team.map(p=>[p.name,p.profile!])),Object.fromEntries(team.map(p=>[p.name,p.item??''])));
  const log=await runBattle({teams:{p1:packTeam(starters),p2},seed,rule:'basic',opponentRule:packedNpcRule(team.map(p=>({item:p.item??''})),0),player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(95,sample))});
  assert.ok(log.winner);for(const d of log.decisions)assert.ok(d.observation.legalActions.some(a=>a.command===d.action));
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 }
});
