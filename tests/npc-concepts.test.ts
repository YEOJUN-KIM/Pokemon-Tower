import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {randomUUID} from 'node:crypto';
import {npcSamples,type NpcSample} from '../src/data/npc-samples';
import {sampleRankWeights,combineNpcRankWeights,drawNpcRank,npcRankTraining,type NpcRank} from '../src/data/npc-ranks';
import {encounterRandom,encounterPool,normalOpponentSpecies,selectTrainerSample} from '../src/server/opponent-team';
import {generateNpcEncounter,selectNpcMembers,type NpcEncounterSnapshotV1} from '../src/server/npc-encounters';
import {drawChallengers,challengerDefinition} from '../src/data/challengers';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {challengerFixture,finishChallengerBattle} from './challenger-fixture';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {statKeys} from '../src/data/training';
import fixtureV1 from './fixtures/npc-encounter-v1.json' with {type:'json'};
const ranks:NpcRank[]=['normal','elite','master'];
const seed:[number,number,number,number]=[17,29,43,71];
const sample=(id:string)=>npcSamples.find(s=>s.id===id)!;
const matches=(name:string,s:NpcSample)=>s.teamConcept.mode==='specialty'&&Showdown.Dex.species.get(name).types.some(t=>s.teamConcept.mode==='specialty'&&s.teamConcept.types.includes(t));
const bst=(name:string)=>statKeys.reduce((sum,key)=>sum+Showdown.Dex.species.get(name).baseStats[key],0);

test('all 20 samples define normalized class ranks and team concepts; class zero ranks survive floor/encounter normalization',()=>{
 for(const s of npcSamples){
  assert.ok(!('defaultRank' in s));assert.ok(Math.abs(Object.values(s.rankWeights).reduce((a,b)=>a+b,0)-1)<1e-10);
  for(const floor of [1,5,20,40,100])for(const context of ['normal','challenger'] as const){
   const weights=sampleRankWeights(s,floor,context);assert.ok(Math.abs(Object.values(weights).reduce((a,b)=>a+b,0)-1)<1e-10);
   for(const rank of ranks)if(s.rankWeights[rank]===0)assert.equal(weights[rank],0);
   assert.ok(s.rankWeights[drawNpcRank(weights,()=>1)]>0);
  }
 }
 assert.equal(sample('youngster-balanced').rankWeights.master,0);
 for(const id of ['ace-setup','ace-physical','veteran-balanced','veteran-bulk'])assert.equal(sample(id).rankWeights.normal,0);
 assert.throws(()=>combineNpcRankWeights({normal:0,elite:0,master:1},{normal:1,elite:0,master:0}),/no supported rank/);
 assert.throws(()=>combineNpcRankWeights({normal:.2,elite:.2,master:0},{normal:1,elite:1,master:1}),/Invalid/);
});

test('class rank sampling follows final probabilities: youngsters stay mostly Normal, aces/veterans exclude Normal, later floors and challengers boost eligible ranks',()=>{
 const random=encounterRandom(seed);
 for(const s of [sample('youngster-balanced'),sample('ace-setup'),sample('veteran-balanced')])for(const floor of [5,100])for(const context of ['normal','challenger'] as const){
  const weights=sampleRankWeights(s,floor,context),counts={normal:0,elite:0,master:0};
  for(let i=0;i<10000;i++)counts[drawNpcRank(weights,random)]++;
  for(const rank of ranks){assert.ok(Math.abs(counts[rank]/10000-weights[rank])<.02);if(s.rankWeights[rank]===0)assert.equal(counts[rank],0);}
  if(s.id==='youngster-balanced')assert.ok(counts.normal>counts.elite*2);
 }
 assert.ok(sampleRankWeights(sample('youngster-balanced'),100).elite>sampleRankWeights(sample('youngster-balanced'),5).elite);
 assert.ok(sampleRankWeights(sample('youngster-balanced'),5,'challenger').elite>sampleRankWeights(sample('youngster-balanced'),5).elite);
 assert.ok(sampleRankWeights(sample('veteran-balanced'),40,'challenger').master>sampleRankWeights(sample('ace-setup'),40,'challenger').master);
 for(let i=0;i<500;i++){
  const selected=selectTrainerSample(40,[i,29,43,71],[],CURRENT_PROGRESSION,{common:true});assert.ok(sample(selected.id).rankWeights[selected.npcRank!]>0);
  for(const offer of drawChallengers(20,random))assert.ok(offer.sample.rankWeights[offer.rank]>0);
 }
});

test('Normal and stronger ranks retain three Bug/Water/Fighting/Psychic/Rock-Ground members at 5/20/40 with higher training quality',()=>{
 for(const id of ['youngster-balanced','fisherman-bulk','blackbelt-physical','psychic-setup','hiker-bulk','scientist-status','scientist-special','worker-physical','collector-status'])for(const floor of [5,20,40]){
  const s=sample(id),teams=ranks.map(rank=>generateNpcEncounter(floor,seed,s,rank));
  for(const e of teams){assert.equal(e.version,2);assert.equal(e.team.filter(p=>matches(p.name,s)).length,3,`${id}/${floor}/${e.rank}`);assert.equal(e.composition.fallback,false);assert.equal(e.composition.themeUsed,3);}
  const average=(i:number)=>teams[i].team.flatMap(p=>Object.values(p.profile!.ivs)).reduce((a,b)=>a+b,0)/18;
  assert.ok(average(1)>average(0));assert.ok(average(2)>average(1));
  assert.ok(teams[1].training.evBudget>teams[0].training.evBudget);
  assert.ok(teams[1].team.filter(p=>p.item).length>teams[0].team.filter(p=>p.item).length);
 }
});

test('scarce/absent specialty candidates are maximized, fillers stay in the supplied floor pool, and fallback is recorded',()=>{
 const floorPool=encounterPool(5,CURRENT_PROGRESSION).filter(normalOpponentSpecies),s=sample('youngster-balanced');
 const bugs=floorPool.filter(name=>matches(name,s)),other=floorPool.filter(name=>!matches(name,s));
 for(const available of [0,1,2])for(const rank of ranks){
  const pool=[...bugs.slice(0,available),...other.slice(0,4)],result=selectNpcMembers(pool,s,rank,encounterRandom(seed));
  assert.equal(result.members.length,3);assert.equal(new Set(result.members).size,3);assert.ok(result.members.every(name=>pool.includes(name)));
  assert.equal(result.members.filter(name=>matches(name,s)).length,available);
  assert.equal(result.composition.fallback,true);assert.equal(result.composition.themeAvailable,available);
 }
 for(const rank of ranks){
  const partial={...s,teamConcept:{mode:'specialty' as const,types:['Bug'],requiredCount:2 as const}};
  assert.ok(selectNpcMembers([...bugs.slice(0,4),...other.slice(0,4)],partial,rank,encounterRandom(seed)).members.filter(name=>matches(name,s)).length>=2);
 }
 assert.throws(()=>selectNpcMembers(bugs.slice(0,2),s,'normal',encounterRandom(seed)),/three distinct/);
 const mega=generateNpcEncounter(5,seed,s,'master','mega');assert.ok(mega.team.every(p=>matches(p.name,s)));
});

test('higher ranks prefer better candidates within the same specialty floor pool rather than importing later species',()=>{
 const s=sample('youngster-balanced'),means=ranks.map(rank=>{
  let total=0;
  for(let n=0;n<64;n++){
   const e=generateNpcEncounter(20,[n,29,43,71],s,rank),pool=encounterPool(20,CURRENT_PROGRESSION);
   assert.ok(e.team.every(p=>pool.includes(p.name)&&matches(p.name,s)));
   total+=e.team.reduce((sum,p)=>sum+bst(p.name),0)/3;
  }
  return total/64;
 });
 assert.ok(means[1]>means[0]+10,JSON.stringify(means));assert.ok(means[2]>means[1],JSON.stringify(means));
});

test('competitive aces/veterans prefer complementary types and roles in the current floor pool',()=>{
 const typeCounts:number[]=[],mixed:number[]=[],shared:number[]=[];
 for(const rank of ['normal','master'] as const){
  let coverage=0,mix=0,weakness=0;
  for(let n=0;n<40;n++){
   const e=generateNpcEncounter(40,[n,29,43,71],sample('ace-setup'),rank),species=e.team.map(p=>Showdown.Dex.species.get(p.name));
   assert.ok(e.team.every(p=>encounterPool(40,CURRENT_PROGRESSION).includes(p.name)));
   coverage+=new Set(species.flatMap(s=>s.types)).size;
   mix+=Number(species.some(s=>s.baseStats.atk>s.baseStats.spa)&&species.some(s=>s.baseStats.spa>s.baseStats.atk));
   weakness+=Showdown.Dex.types.all().filter(t=>species.every(s=>Showdown.Dex.getImmunity(t.name,s)&&Showdown.Dex.getEffectiveness(t.name,s)>0)).length;
   assert.equal(e.sample.teamConcept.mode,'competitive');
  }
  typeCounts.push(coverage/40);mixed.push(mix/40);shared.push(weakness/40);
 }
 assert.ok(typeCounts[1]>=typeCounts[0],JSON.stringify(typeCounts));assert.ok(mixed[1]>=mixed[0],JSON.stringify(mixed));assert.ok(shared[1]<=shared[0],JSON.stringify(shared));
});

test('item slots follow floor/rank budgets and remain deterministic, legal, unique even with gimmicks',()=>{
 const s=sample('blackbelt-physical');
 for(const floor of [5,20,21,40,50,51,100])for(const rank of ranks)for(let n=0;n<12;n++){
  const e=generateNpcEncounter(floor,[n,29,43,71],s,rank,'chaos'),items=e.team.flatMap(p=>p.item?[p.item]:[]),[min,max]=npcRankTraining(floor,rank).itemSlots;
  assert.ok(items.length>=min&&items.length<=max,`${rank}/${floor}: ${items.length}`);assert.equal(items.length,e.composition.itemSlots);assert.equal(new Set(items).size,items.length);
  assert.deepEqual(e,generateNpcEncounter(floor,[n,29,43,71],s,rank,'chaos'));
 }
});

test('a committed f35 v1 snapshot keeps its mixed youngster team, three Normal items, rank and saved rewards after restart and retry',()=>{
 const snapshot=fixtureV1 as unknown as NpcEncounterSnapshotV1,path=`.data/tests/npc-concept-v1-${randomUUID()}.sqlite`;
 let {store,run,event,owner}=challengerFixture(path,'owner',20,'random');
 try{
  const offer={...challengerDefinition(sample('youngster-balanced'),snapshot.rank,20),sample:snapshot.sample,training:snapshot.training,encounter:snapshot};
  store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify([offer]),event.id);
  const before=store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(event.id)!.candidates_json;
  store.close();store=new TowerStore(path);assert.equal(store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(event.id)!.candidates_json,before);
  store.chooseEvent(owner,run,event.id,offer.id);const original=store.currentBattle(owner)!,sets=Showdown.Teams.unpack(original.opponent_team)!;
  assert.deepEqual(sets.map(s=>s.species),snapshot.team.map(p=>p.name));assert.equal(sets.filter(s=>s.item).length,3);
  for(const set of sets){const expected=snapshot.team.find(p=>p.name===set.species)!;assert.deepEqual(set.ivs,expected.profile!.ivs);assert.deepEqual(set.evs,expected.profile!.evs);assert.equal(set.item,expected.item??'');}
  store.db.prepare('UPDATE run_retries SET retry_limit=1 WHERE run_id=?').run(run);finishChallengerBattle(store,original.id,'Tower AI');store.retry(owner,run,original.id);
  const retry=store.enter(owner,run,20,starters);assert.equal(store.battle(retry).opponent_team,original.opponent_team);
  finishChallengerBattle(store,retry);assert.deepEqual(store.view(owner).run!.event!.result!.entries,offer.rewardDefinition.entries);
 }finally{store.close();}
});
