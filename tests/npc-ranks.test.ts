import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {npcSamples,npcTrainerSample} from '../src/data/npc-samples';
import {npcRankProfiles,npcRankTraining,rankWeights,sampleRankWeights,challengerRankWeights,drawNpcRank,type NpcRank} from '../src/data/npc-ranks';
import {drawChallengers,challengerDefinition} from '../src/data/challengers';
import {generateNpcEncounter} from '../src/server/npc-encounters';
import {encounterRandom,encounterPool,normalOpponentSpecies,selectTrainerSample,type OpponentEntry} from '../src/server/opponent-team';
import {TowerStore} from '../src/server/tower-store';
import {ChallengerEvents} from '../src/server/challenger-events';
import {challengerFixture,finishChallengerBattle} from './challenger-fixture';
import {starters,packTeam} from '../src/data/teams';
import {FORMAT} from '../src/data/battle-rules';
import {allowsRuleItem,type BattleRule} from '../src/data/run-rules';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {TowerPolicy} from '../src/battle/tower-policy';
const ranks:NpcRank[]=['normal','elite','master'];
const seed:[number,number,number,number]=[17,29,43,71];

test('common concepts have 20 distinct IDs, all tactics, both pools, ordinary names and reviewed local portraits',()=>{
 assert.equal(npcSamples.length,20);assert.equal(new Set(npcSamples.map(s=>s.id)).size,20);
 assert.equal(new Set(npcSamples.map(s=>s.tactic)).size,7);
 const manifest=JSON.parse(readFileSync('public/sprites/trainers/sources.json','utf8'));
 for(const sample of npcSamples){
  assert.ok(sample.pools.includes('normal')&&sample.pools.includes('challenger'));
  assert.ok(existsSync(`public/sprites/trainers/${sample.portrait}.png`));
  assert.ok(manifest.portraits.some((p:{portrait:string;review?:string})=>p.portrait===sample.portrait&&p.review));
  assert.ok(!/전술|전문가|내구|속공|상태이상|랭크업/.test(sample.displayName));
  assert.ok(!('rewardProfile' in sample));assert.ok(!('trainingScale' in sample));
 }
});

test('rank targets differ at 5/20/40 and retain monotonic IVs and legal EV totals across all 100 floors',()=>{
 const concept=npcSamples.find(s=>s.id==='ace-setup')!;
 for(let floor=1;floor<=100;floor++)for(const rank of ranks){
  const target=npcRankTraining(floor,rank);assert.ok(target.ivRange.every(v=>v>=0&&v<=31));
  assert.ok(target.evBudget<=66&&target.evBudget>=0);
  if(floor>1){const previous=npcRankTraining(floor-1,rank);assert.ok(target.ivRange[0]>=previous.ivRange[0]);assert.ok(target.ivRange[1]>=previous.ivRange[1]);}
 }
 for(const floor of [5,20,40]){
  const teams=ranks.map(rank=>generateNpcEncounter(floor,seed,concept,rank));
  const means=teams.map(s=>s.team.flatMap(p=>Object.values(p.profile!.ivs)).reduce((a,b)=>a+b,0)/18);
  assert.ok(means[0]<means[1]&&means[1]<means[2]);
  const totals=teams.map(s=>Object.values(s.team[0].profile!.evs).reduce((a,b)=>a+b,0));assert.ok(totals[0]<totals[1]&&totals[1]<totals[2]);
  assert.ok(teams[0].team.filter(p=>p.item).length<=(floor<=20?0:1));
  assert.notDeepEqual(teams[1].team.map(p=>p.item),teams[2].team.map(p=>p.item));
 }
});

test('every concept and rank uses the current floor ordinary pool, deterministic legal builds, distinct items and exact budgets',()=>{
 const validator=new Showdown.TeamValidator(FORMAT);
 for(const floor of [5,20,40,99])for(const concept of npcSamples)for(const rank of ranks){
  const encounter=generateNpcEncounter(floor,seed,concept,rank),pool=encounterPool(floor,CURRENT_PROGRESSION).filter(normalOpponentSpecies);
  assert.deepEqual(encounter,generateNpcEncounter(floor,seed,concept,rank));
  assert.ok(encounter.team.every(p=>pool.includes(p.name)));
  assert.equal(encounter.team.length,3);assert.equal(new Set(encounter.team.map(p=>p.name)).size,3);
  const items=encounter.team.flatMap(p=>p.item?[p.item]:[]);assert.equal(new Set(items).size,items.length);
  for(const entry of encounter.team){
   const p=entry.profile!,target=npcRankTraining(floor,rank);
   assert.ok(Object.values(p.ivs).every(v=>v>=target.ivRange[0]&&v<=target.ivRange[1]));
   assert.ok(Object.values(p.evs).every(v=>v>=0&&v<=32));assert.equal(Object.values(p.evs).reduce((a,b)=>a+b,0),target.evBudget);
  }
  const profiles=Object.fromEntries(encounter.team.map(p=>[p.name,p.profile!]));
  const packed=Showdown.Teams.unpack(packTeam(encounter.team.map(p=>p.name),profiles,Object.fromEntries(encounter.team.map(p=>[p.name,p.item??'']))))!;
  // Same provenance normalization as existing tower profile validation.
  for(const set of packed){set.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};set.gender='';set.shiny=false;set.pokeball='';if(Object.values(set.evs).every(v=>v===0))set.evs.hp=1;}
  assert.equal(validator.validateTeam(packed),null,`${concept.id}/${rank}/${floor}`);
 }
});

test('normal-floor rank curve interpolates and sampling follows its distribution independently of concepts',()=>{
 const random=encounterRandom(seed);
 for(const floor of [1,5,20,40,55,60,100]){
  const weights=rankWeights(floor),count={normal:0,elite:0,master:0};assert.ok(Math.abs(Object.values(weights).reduce((a,b)=>a+b,0)-1)<1e-10);
  for(let i=0;i<10000;i++)count[drawNpcRank(weights,random)]++;
  for(const rank of ranks)assert.ok(Math.abs(count[rank]/10000-weights[rank])<.02);
 }
 assert.ok(rankWeights(5).normal>.9);assert.ok(rankWeights(100).master>rankWeights(20).master);assert.equal(rankWeights(1).master,0);
 for(let i=0;i<100;i++){
  const selected=selectTrainerSample(40,[i,29,43,71],[],CURRENT_PROGRESSION,{common:true});
  assert.ok(npcSamples.some(s=>s.id===selected.id));assert.ok(selected.npcRank);
  assert.deepEqual(selected,selectTrainerSample(40,[i,29,43,71],[],CURRENT_PROGRESSION,{common:true}));
 }
});

test('challenger draws are weighted, respect minimums and sample/class uniqueness, and allow arbitrary rank combinations',()=>{
 const random=encounterRandom(seed),counts={normal:0,elite:0,master:0},combinations=new Set<string>(),samples=new Map<string,number>();
 for(let i=0;i<3000;i++){
  const floor=i%2?2:40,offers=drawChallengers(floor,random);
  assert.equal(offers.length,3);assert.equal(new Set(offers.map(c=>c.id)).size,3);assert.equal(new Set(offers.map(c=>c.title)).size,3);
  assert.ok(offers.every(c=>c.minFloor<=floor));combinations.add(offers.map(c=>c.rank).sort().join(','));
  for(const c of offers){counts[c.rank]++;samples.set(c.id,(samples.get(c.id)??0)+1);}
 }
 assert.ok(counts.normal>counts.master);assert.ok(counts.elite>counts.master);
 for(const c of drawChallengers(20,random))assert.ok(c.sample.rankWeights[c.rank]>0);
 for(const combo of ['elite,normal,normal','elite,elite,master','elite,master,normal'])assert.ok(combinations.has(combo));
 const twoMasters=[npcSamples.find(s=>s.id==='veteran-balanced')!,npcSamples.find(s=>s.id==='ace-setup')!,npcSamples[0]];
 const tickets=[0,.99,0,.99,0,0];
 assert.deepEqual(drawChallengers(20,()=>tickets.shift()!,twoMasters).map(c=>c.rank),['master','master','normal']);
 const custom=npcSamples.slice(0,4).map((s,i)=>({...s,weight:i===0?1000:1}));
 let heavy=0;for(let i=0;i<500;i++)if(drawChallengers(5,random,custom).some(s=>s.id===custom[0].id))heavy++;
 assert.ok(heavy>490);
});

test('new ordinary battles save common sample/rank, restore and retry the packed opponent while old runs retain their path',()=>{
 const path=`.data/tests/npc-rank-${randomUUID()}.sqlite`;let store=new TowerStore(path,max=>max-1);
 try{
  store.ensurePlayer('p');const first=store.start('p',starters,'basic'),run=store.battle(first).run_id;
  const original=store.battle(first),trainer=JSON.parse(original.trainer!);assert.ok(npcSamples.some(s=>s.id===trainer.id));assert.ok(trainer.npcRank);
  assert.ok(store.db.prepare('SELECT 1 FROM run_npc_rules WHERE run_id=?').get(run));
  store.db.prepare('UPDATE run_retries SET retry_limit=1 WHERE run_id=?').run(run);
  finishChallengerBattle(store,first,'Tower AI');store.retry('p',run,first);
  store.close();store=new TowerStore(path,max=>max-1);const retry=store.enter('p',run,1,starters);
  assert.equal(store.battle(retry).opponent_team,original.opponent_team);assert.equal(store.battle(retry).trainer,original.trainer);
  store.db.prepare('DELETE FROM run_npc_rules WHERE run_id=?').run(run);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM run_npc_rules').get()!.n,0);
  const packed=store.battle(retry).opponent_team;store.close();store=new TowerStore(path,max=>max-1);assert.equal(store.battle(retry).opponent_team,packed);
 }finally{store.close();}
});

test('v37 migration leaves old runs unmarked, preserves packed battles/candidate JSON and uses the old future NPC path',()=>{
 const path=`.data/tests/npc-rank-v37-${randomUUID()}.sqlite`;
 let {store,owner,run,event}=challengerFixture(path);
 try{
  store.db.prepare('DELETE FROM run_npc_rules WHERE run_id=?').run(run);
  const saved=store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(event.id)!.candidates_json;
  store.db.exec('PRAGMA user_version=37');store.close();store=new TowerStore(path,max=>max-1);
  assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,38);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM run_npc_rules WHERE run_id=?').get(run)!.n,0);
  assert.equal(store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(event.id)!.candidates_json,saved);
  store.chooseEvent(owner,run,event.id,'back');store.db.prepare('DELETE FROM run_villains WHERE run_id=?').run(run);
  const next=store.enter(owner,run,2,starters),trainer=JSON.parse(store.battle(next).trainer!);
  assert.equal(trainer.npcRank,undefined);assert.ok(!npcSamples.some(s=>s.id===trainer.id));
  assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});

for(const rank of ranks)test(`ranked challenger ${rank}: frozen offer/team/reward restore, exact selected build, no recruitment, reward and retry`,()=>{
 const path=`.data/tests/challenger-rank-${randomUUID()}.sqlite`;let {store,owner,run,event}=challengerFixture(path,'owner',20,'random');
 try{
  // Pin a rank only for integration coverage; the production draw is tested above.
  const concept=npcSamples.find(s=>s.id==='ace-setup')!,definition=challengerDefinition(concept,rank,20);
  definition.encounter=generateNpcEncounter(20,seed,concept,rank,'basic');
  store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify([definition]),event.id);
  const before=store.view(owner).run!.event!;store.close();store=new TowerStore(path);
  assert.deepEqual(store.view(owner).run!.event,before);assert.ok(!JSON.stringify(before).includes('ivs'));
  const originalRange=npcRankProfiles[rank].ivRange;
  try{npcRankProfiles[rank].ivRange=[31,31];store.chooseEvent(owner,run,event.id,definition.id);}finally{npcRankProfiles[rank].ivRange=originalRange;}
  const original=store.currentBattle(owner)!,sets=Showdown.Teams.unpack(original.opponent_team)!;
  assert.equal(JSON.parse(original.trainer!).npcRank,rank);
  for(const set of sets){const expected:OpponentEntry=definition.encounter.team.find(p=>p.name===set.species)!;assert.deepEqual(set.ivs,expected.profile!.ivs);assert.deepEqual(set.evs,expected.profile!.evs);assert.equal(set.item,expected.item??'');}
  store.db.prepare('UPDATE run_retries SET retry_limit=1 WHERE run_id=?').run(run);finishChallengerBattle(store,original.id,'Tower AI');store.retry(owner,run,original.id);
  const retry=store.enter(owner,run,20,starters);assert.equal(store.battle(retry).opponent_team,original.opponent_team);
  finishChallengerBattle(store,retry);assert.deepEqual(store.view(owner).run!.event!.result!.entries,definition.rewardDefinition.entries);
  assert.equal(store.view(owner).run!.candidates.length,0);assert.throws(()=>store.recruit(owner,run,retry,null,null));
  if(rank==='master'){
   assert.throws(()=>store.continueEvent(owner,run,event.id));store.selectEventReward(owner,run,event.id,'bonus','tickets');store.selectEventReward(owner,run,event.id,'bonus','tickets');assert.equal(store.permanentView(owner).eggTickets,3);
  }
  store.continueEvent(owner,run,event.id);assert.equal(store.view(owner).run!.event,null);
 }finally{store.close();}
});

test('rank gimmicks obey basic/mega/tera/dynamax/Z/chaos and run through the existing public AI engine',async()=>{
 const concept=npcSamples.find(s=>s.id==='ace-setup')!;
 for(const rule of ['basic','mega','tera','dynamax','z','chaos'] as BattleRule[]){
  for(const rank of ranks){
   const encounter=generateNpcEncounter(40,seed,concept,rank,rule);
   if(rule==='basic'||rank==='normal')assert.equal(encounter.gimmick,null);
   else if(rank==='master'){assert.ok(encounter.gimmick);if(rule!=='chaos')assert.equal(encounter.gimmick!.rule,rule);}
   assert.ok(encounter.team.every(p=>!p.item||allowsRuleItem(rule,p.item)));
   const profiles=Object.fromEntries(encounter.team.map(p=>[p.name,p.profile!])),items=Object.fromEntries(encounter.team.map(p=>[p.name,p.item??'']));
   const log=await runBattle({teams:{p1:packTeam(starters),p2:packTeam(encounter.team.map(p=>p.name),profiles,items,encounter.team.filter(p=>p.gigantamax).map(p=>p.name))},seed,rule,teraTickets:{p1:0,p2:encounter.gimmick?.rule==='tera'?1:0},player:new DamagePolicy(),opponent:new TowerPolicy()});
   assert.ok(log.winner);assert.ok(log.turns>0);
  }
 }
});
