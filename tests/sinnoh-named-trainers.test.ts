import {kalosTrainers} from '../src/data/kalos-trainers';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {sinnohTrainers} from '../src/data/sinnoh-trainers';
import {unovaTrainers} from '../src/data/unova-trainers';
import preservation from './fixtures/kalos-preservation.json' with {type:'json'};
import {trainerCatalog} from '../src/data/trainer-catalog';
import {organizationGrunt,villainLeaders,villainEncounter} from '../src/data/villain-organizations';
import {normalNpcTemplate} from '../src/server/npc-templates';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {satisfiesSelectionRules} from '../src/data/npc-selection-rules';
import {CURRENT_PROGRESSION,towerDifficulty} from '../src/data/tower-progression';
import {npcAi} from '../src/data/npc-ai';
import {FORMAT,runBattle,replayBattle,battleEvents} from '../src/battle/run';
import {pokemonSets,packTeam,starters} from '../src/data/teams';
import {DamagePolicy} from '../src/battle/policy';
import {createNpcPolicy} from '../src/battle/npc-policy';

export function sampleFor(id:string){
 const named=trainerCatalog.find(s=>s.id===id);if(named)return named;
 if(id==='galactic-grunt')return organizationGrunt('galactic');
 const group=villainLeaders.galactic;
 return {...(id.includes('-boss-')?group.boss:[group.executive,...group.executives??[]].find(s=>id.endsWith('-'+s.portrait))!),id,role:'villain' as const};
}
test('Sinnoh review preserves every out-of-scope runtime row including Hoenn work',()=>{
 const ids=new Set([...kalosTrainers.map(t=>t.id),'named-lysandre',...sinnohTrainers.map(t=>t.id),...unovaTrainers.map(t=>t.id),'named-cyrus','named-ghetsis']);
 const rows=JSON.parse(readFileSync('src/data/normal-npc-templates.json','utf8')).filter((r:{id:string})=>!ids.has(r.id)).sort((a:{id:string;stage:string},b:{id:string;stage:string})=>(a.id+a.stage).localeCompare(b.id+b.stage));
 assert.equal(rows.length,preservation.sinnoh.count);assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),preservation.sinnoh.runtime);
});
for(const t of sinnohTrainers)test(`${t.id}: legal sets, no Trick Room, floor curve and varied deterministic triples`,()=>{
 const sample=sampleFor(t.id),validator=new Showdown.TeamValidator(FORMAT);
 for(const floor of t.category==='boss'?[50,75,76,96]:[5,45,55,95]){
  const template=normalNpcTemplate(t.id,floor,sample.role)!;assert.ok(template,t.id);
  assert.equal(template.signature,null);assert.equal(template.gimmickEnabled,false);
  assert.equal(template.team.length,t.category==='boss'&&floor<75?5:6);
  for(const p of template.team){assert.ok(!p.profile.moves.includes('Trick Room'));assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.species]),ability:p.profile.ability,item:p.item,moves:p.profile.moves},{}),null);}
  const combinations=new Set();
  for(let n=1;n<=100;n++){
   const seed:[number,number,number,number]=[n,floor,29,43],team=generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION),names=team.map(p=>p.name);
   assert.equal(names.length,3);assert.equal(new Set(names).size,3);assert.ok(satisfiesSelectionRules(names,template.selectionRules));
   if(template.ace)assert.ok(names.includes(template.ace));
   if(t.id==='named-roark')assert.equal(names[0],'Rampardos');
   if(t.category==='boss')assert.equal(names.includes('Dialga'),floor>=75);
   assert.deepEqual(team,generateOpponentTeam(floor,seed,[],null,sample,CURRENT_PROGRESSION));
   for(const p of team)assert.equal(Object.values(p.profile!.evs).reduce((a,b)=>a+b,0),Math.min(66,towerDifficulty(floor).points));
   combinations.add([...names].sort().join(','));
  }
  assert.ok(combinations.size>=5,'Do not turn a six-candidate pool into a fixed triple');
  assert.equal(npcAi(floor,sample).tier,t.category==='grunt'?(floor<20?'basic':'tactical'):t.category==='champion'||t.category==='boss'?'expert':'tactical');
 }
});
test('all three Galactic commanders are reachable, eligible and have distinct reviewed roles',()=>{
 const officers=[villainLeaders.galactic.executive,...villainLeaders.galactic.executives!],seen=new Set();
 for(let n=0;n<5000;n++){const e=villainEncounter('sinnoh-officers-'+n,56,'galactic',false,false,{gruntWins:100,executiveWins:0});if(e?.event.rank==='executive')seen.add(e.sample.portrait);}
 assert.deepEqual([...seen].sort(),['jupiter','mars','saturn']);
 for(const s of officers)assert.ok(existsSync(`public/sprites/trainers/${s.portrait}.png`));
 for(let n=0;n<200;n++){const e=villainEncounter('sinnoh-eligibility-'+n,56,'galactic',false,false,{gruntWins:100,executiveWins:0},s=>s.portrait==='saturn');if(e)assert.equal(e.sample.portrait,'saturn');}
 const sets=officers.map(s=>normalNpcTemplate(`galactic-executive-${s.portrait}`,95,'villain')!.team.find(p=>p.species==='Crobat')!.profile.moves.join(','));assert.equal(new Set(sets).size,3);
});
test('Snow Warning activates real snow and Sinnoh battles replay deterministically',async()=>{
 for(const id of ['named-candice','named-byron','named-lucian','named-cynthia','galactic-boss-cyrus']){
  const sample=sampleFor(id);let seed:[number,number,number,number]=[1,95,29,43];
  let team=generateOpponentTeam(95,seed,[],null,sample,CURRENT_PROGRESSION);
  if(id==='named-candice')for(let n=1;!team.some(p=>p.name==='Abomasnow')&&n<100;n++){seed=[n,95,29,43];team=generateOpponentTeam(95,seed,[],null,sample,CURRENT_PROGRESSION);}
  if(id==='named-candice')team.sort((a,b)=>Number(b.name==='Abomasnow')-Number(a.name==='Abomasnow'));
  const log=await runBattle({teams:{p1:packTeam(starters),p2:packTeam(team.map(p=>p.name),Object.fromEntries(team.map(p=>[p.name,p.profile!])),Object.fromEntries(team.map(p=>[p.name,p.item??''])))},seed,rule:'basic',player:new DamagePolicy(),opponent:createNpcPolicy(npcAi(95,sample))});
  assert.ok(log.winner);for(const d of log.decisions)assert.ok(d.observation.legalActions.some(a=>a.command===d.action));
  if(id==='named-candice')assert.ok(log.publicProtocol.some(l=>l.includes('|-weather|Snowscape|')));
  assert.deepEqual(battleEvents((await replayBattle(log)).publicProtocol),battleEvents(log.publicProtocol));
 }
});
