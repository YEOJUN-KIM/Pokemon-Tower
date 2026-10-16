import {rankRewardFixture} from './rank-reward-fixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {challengerFixture,finishChallengerBattle} from './challenger-fixture';
import {snapshotRankReward,weightedRewardId,epicRewardItems} from '../src/server/challenger-rewards';
import {rankRewardProfiles} from '../src/data/challenger-rewards';
import {challengerDefinition,drawChallengers} from '../src/data/challengers';
import {encounterRandom} from '../src/server/opponent-team';
import type {Seed} from '../src/battle/run';
import {npcSamples} from '../src/data/npc-samples';
import {generateNpcEncounter} from '../src/server/npc-encounters';
import type {NpcRank} from '../src/data/npc-ranks';
import {itemShopRule} from '../src/data/held-item-shop';
import {transaction} from '../src/server/storage/transaction';
import {applyRewardOption} from '../src/server/rewards';


function win(f:ReturnType<typeof rankRewardFixture>){f.store.chooseEvent(f.owner,f.run,f.event.id,f.candidate.id);finishChallengerBattle(f.store,f.store.currentBattle(f.owner)!.id);}
test('profile weights partition all elite outcomes and master egg draws deterministically',()=>{
 const count:Record<string,number>={};for(let n=0;n<100;n++){const id=weightedRewardId(rankRewardProfiles.elite.pool,()=>n/100);count[id]=(count[id]??0)+1;}
 assert.deepEqual(count,{coins:30,eggs:25,vitamins:15,growth:10,epic:8,machine:12});
 const eggs:Record<string,number>={};for(let n=0;n<100;n++){const id=weightedRewardId(rankRewardProfiles.master.eggs,()=>n/100);eggs[id]=(eggs[id]??0)+1;}
 assert.deepEqual(eggs,{normal:60,superRare:35,shiny:5});
});
for(const [draw,kind] of [[0,'coins'],[.9,'egg-ticket']] as const)test(`normal ${kind}: hidden preview, saved payout and no selection`,()=>{
 const path=`.data/tests/reward-normal-${randomUUID()}.sqlite`,f=rankRewardFixture('normal',[draw],path);let store=f.store;
 try{
  const view=store.view(f.owner).run!.event!;assert.equal(view.challengers![0].rewardPreview,'소소한 보상');assert.ok(!JSON.stringify(view).includes('rewardDefinition'));
  const saved=JSON.stringify(f.candidate);store.close();store=new TowerStore(path);f.store=store;
  assert.equal(store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json,`[${saved}]`);
  const before=store.view(f.owner);win(f);const result=store.view(f.owner).run!.event!.result!;
  assert.equal(result.entries.length,1);assert.equal(result.entries[0].kind,kind);assert.equal(result.selections,undefined);
  store.chooseEvent(f.owner,f.run,f.event.id,f.candidate.id);assert.equal(store.view(f.owner).coins,before.coins+(kind==='coins'?300:0));
 }finally{store.close();}
});
for(const [name,draw] of [['coins',0],['eggs',.3],['vitamins',.55],['growth',.7],['epic',.8],['machine',.9]] as const)test(`elite ${name}: auto payout, inventory use and exact-once`,()=>{
 const f=rankRewardFixture('elite',[draw,.99,0,0]);const {store,owner,run}=f;
 try{
  const before=store.view(owner);win(f);const result=store.view(owner).run!.event!.result!;
  assert.equal(result.selections,undefined);assert.equal(result.title,'희귀한 보상');
  if(name==='coins')assert.equal(store.view(owner).coins,before.coins+1500);
  if(name==='eggs')assert.equal(store.permanentView(owner).eggTickets,5);
  if(name==='growth')assert.equal(store.view(owner).growthPoints,before.growthPoints+300);
  if(name==='vitamins'){assert.equal(result.entries.length,2);assert.equal(new Set(result.entries.map(e=>e.kind==='vitamin'?e.stat:'')).size,2);assert.ok(result.entries.every(e=>e.kind==='vitamin'&&e.amount===1));}
  store.continueEvent(owner,run,f.event.id);
  const entries=store.view(owner).run!.rewardInventory!;
  if(name==='vitamins'||name==='epic'||name==='machine'){
   assert.equal(entries.length,name==='vitamins'?2:1);const entry=entries[0];assert.ok(entry.choices.length);
   const request=randomUUID();store.useReward(owner,run,request,entry.id,entry.choices[0].id);store.useReward(owner,run,request,entry.id,entry.choices[0].id);
   assert.throws(()=>store.useReward(owner,run,randomUUID(),entry.id,entry.choices[0].id));
   if(name==='epic'){assert.ok(epicRewardItems.every(item=>itemShopRule(item).rarity==='epic'));assert.equal(store.view(owner).run!.itemBag![entry.choices[0].id],1);}
   if(name==='vitamins')assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM vitamin_purchases WHERE run_id=?').get(run)!.n,1);
   if(name==='machine'){const effect=result.entries[0];assert.equal(effect.kind,'machine');if(effect.kind==='machine')assert.ok(store.trainingCollection(owner).find(e=>e.species===entry.choices[0].id)!.unlockedMoves.includes(effect.move));}
  }
 }finally{store.close();}
});
test('elite egg count and vitamin count use the configured inclusive range',()=>{
 const f=rankRewardFixture('elite',[0]);try{
  for(const draw of [0,.4,.99]){const entries=snapshotRankReward(f.store.db,f.run,'elite',(()=>{const q=[.3,draw];return()=>q.shift()??0;})()).rewardDefinition.entries;assert.equal(entries[0].kind,'egg-ticket');assert.equal('amount' in entries[0]?entries[0].amount:0,3+Math.floor(draw*3));}
  for(const draw of [0,.99]){const q=[.55,draw,0,0],entries=snapshotRankReward(f.store.db,f.run,'elite',()=>q.shift()??0).rewardDefinition.entries;assert.equal(entries.length,draw===0?1:2);}
 }finally{f.store.close();}
});
for(const eggDraw of [0,.7,.99])test(`master snapshot ${eggDraw}: three categories, one payout, reload and conflicting choice blocked`,()=>{
 const path=`.data/tests/reward-master-${randomUUID()}.sqlite`,f=rankRewardFixture('master',[eggDraw,0],path);let store=f.store;
 try{
  const selection=f.candidate.selections![0];assert.equal(selection.candidates.length,3);assert.deepEqual(selection.candidates.map(c=>c.id),['eggs','growth','equipment']);
  const expected=selection.candidates[0].effects[0];win(f);assert.deepEqual(store.view(f.owner).run!.event!.result!.entries,[]);
  assert.throws(()=>store.continueEvent(f.owner,f.run,f.event.id));const before=store.view(f.owner);
  store.selectEventReward(f.owner,f.run,f.event.id,'master-reward','eggs');store.selectEventReward(f.owner,f.run,f.event.id,'master-reward','eggs');
  assert.throws(()=>store.selectEventReward(f.owner,f.run,f.event.id,'master-reward','growth'));
  assert.equal(store.view(f.owner).growthPoints,before.growthPoints);assert.deepEqual(store.trainerEquipment(f.run),[]);
  if(expected.kind==='egg-ticket')assert.equal(store.permanentView(f.owner).eggTickets,10);
  else {assert.equal(expected.kind,'typed-egg-ticket');if(expected.kind==='typed-egg-ticket')assert.equal(store.permanentView(f.owner).rewardEggTickets![expected.eggKind],1);}
  const saved=store.view(f.owner).run!.event!.result;store.close();store=new TowerStore(path);assert.deepEqual(store.view(f.owner).run!.event!.result,saved);
 }finally{store.close();}
});
test('master growth and trainer equipment go to separate existing systems; duplicates and no-stock fallback are defined',()=>{
 for(const choice of ['growth','equipment']){const f=rankRewardFixture('master',[0,0]);try{win(f);const before=f.store.view(f.owner);f.store.selectEventReward(f.owner,f.run,f.event.id,'master-reward',choice);if(choice==='growth')assert.equal(f.store.view(f.owner).growthPoints,before.growthPoints+1500);else{assert.deepEqual(f.store.trainerEquipment(f.run),['Dynamax Band']);assert.deepEqual(f.store.view(f.owner).run!.itemBag,{});}}finally{f.store.close();}}
 const f=rankRewardFixture('master',[0,0]);try{
  f.store.db.prepare('INSERT INTO run_trainer_equipment VALUES (?,?)').run(f.run,'Dynamax Band');win(f);const before=f.store.view(f.owner);f.store.selectEventReward(f.owner,f.run,f.event.id,'master-reward','equipment');assert.equal(f.store.view(f.owner).growthPoints,before.growthPoints+1500);assert.equal(f.store.trainerEquipment(f.run).length,1);
  f.store.db.prepare('INSERT INTO run_trainer_equipment VALUES (?,?)').run(f.run,'Tera Orb');const next=snapshotRankReward(f.store.db,f.run,'master',()=>0);assert.equal(next.selections![0].candidates[2].effects[0].kind,'coins');
 }finally{f.store.close();}
});
test('typed egg reward redeems through existing hatch engine, costs no points, persists shiny/grade and replays receipt once',()=>{
 for(const eggKind of ['superRare','shiny'] as const){const f=rankRewardFixture('normal',[0]);try{
  transaction(f.store.db,()=>applyRewardOption(f.store.db,f.owner,{id:'egg',title:'egg',tone:'great',entries:[{kind:'typed-egg-ticket',eggKind,amount:1}]},f.run));
  const request=randomUUID(),points=f.store.view(f.owner).growthPoints;
  const result=f.store.permanentAction(f.owner,request,'hatch','egg',1,null,eggKind,undefined,true);
  assert.equal(result.eggs!.length,1);if(eggKind==='shiny')assert.equal(result.eggs![0].shiny,true);else assert.ok(['superRare','shiny'].includes(result.eggs![0].eggKind!));
  assert.deepEqual(f.store.permanentAction(f.owner,request,'hatch','egg',1,null,eggKind,undefined,true),result);assert.equal(f.store.view(f.owner).growthPoints,points);
  assert.throws(()=>f.store.permanentAction(f.owner,randomUUID(),'hatch','egg',1,null,eggKind,undefined,true),/없습니다/);
 }finally{f.store.close();}}
});
test('reward receipt and inventory use receipt failures roll back all effects',()=>{
 const f=rankRewardFixture('elite',[.55,0,0]);try{
  f.store.chooseEvent(f.owner,f.run,f.event.id,f.candidate.id);const battle=f.store.currentBattle(f.owner)!;
  f.store.db.exec("CREATE TRIGGER fail_grant BEFORE UPDATE OF result_json ON run_events BEGIN SELECT RAISE(ABORT,'receipt failed'); END");
  assert.throws(()=>finishChallengerBattle(f.store,battle.id),/receipt failed/);assert.equal(f.store.view(f.owner).run!.rewardInventory!.length,0);assert.equal(f.store.battle(battle.id).status,'active');f.store.db.exec('DROP TRIGGER fail_grant');finishChallengerBattle(f.store,battle.id);f.store.continueEvent(f.owner,f.run,f.event.id);
  const entry=f.store.view(f.owner).run!.rewardInventory![0];f.store.db.exec("CREATE TRIGGER fail_use BEFORE INSERT ON reward_use_receipts BEGIN SELECT RAISE(ABORT,'use failed'); END");
  assert.throws(()=>f.store.useReward(f.owner,f.run,randomUUID(),entry.id,entry.choices[0].id),/use failed/);assert.equal(f.store.view(f.owner).run!.rewardInventory![0].quantity,1);assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM vitamin_purchases WHERE run_id=?').get(f.run)!.n,0);
 }finally{f.store.close();}
});
test('regular checkpoint has no vitamin offers and its retired API cannot charge or grant',()=>{
 const f=rankRewardFixture('normal',[0]);try{f.store.chooseEvent(f.owner,f.run,f.event.id,'back');f.store.db.prepare("UPDATE runs SET floor=21,state='select' WHERE id=?").run(f.run);const before=f.store.view(f.owner);assert.equal(before.run!.vitaminShop,null);assert.throws(()=>f.store.purchaseVitamin(f.owner,f.run,21,'atk','Charizard'),/판매는 종료/);assert.deepEqual(f.store.view(f.owner),before);}finally{f.store.close();}
});
test('production snapshots every rank reward without changing the original sample/rank/team random stream',()=>{
 const f=challengerFixture(':memory:','owner',20,'random');try{
  const saved=JSON.parse(String(f.store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json));
  const digest=createHash('sha256').update(f.event.id).digest(),random=encounterRandom([0,4,8,12].map(i=>digest.readUInt32LE(i)) as Seed);
  const before=drawChallengers(20,random);
  for(let i=0;i<3;i++){
   assert.equal(saved[i].id,before[i].id);assert.equal(saved[i].rank,before[i].rank);assert.equal(saved[i].rewardSnapshotVersion,2);
   const seed=[0,1,2,3].map(()=>Math.floor(random()*65536)) as Seed;
   assert.deepEqual(saved[i].encounter,JSON.parse(JSON.stringify(generateNpcEncounter(20,seed,before[i].sample,before[i].rank,'basic'))));
   if(saved[i].rank==='master')assert.equal(saved[i].selections[0].candidates.length,3);else assert.equal(saved[i].selections,undefined);
  }
 }finally{f.store.close();}
});
test('changing future reward tuning cannot change a pending snapshotted payout',()=>{
 const f=rankRewardFixture('normal',[0]);const tuning=rankRewardProfiles.normal as {coins:number},before=tuning.coins;
 try{tuning.coins=99999;win(f);assert.equal(f.store.view(f.owner).run!.event!.result!.entries[0].kind,'coins');assert.equal(f.store.view(f.owner).run!.event!.result!.entries[0].kind==='coins'?(f.store.view(f.owner).run!.event!.result!.entries[0] as {amount:number}).amount:0,300);}
 finally{tuning.coins=before;f.store.close();}
});
test('v38 old challenger reward JSON remains byte-for-byte intact and pays its original legacy reward',()=>{
 const path=`.data/tests/reward-v38-${randomUUID()}.sqlite`,f=challengerFixture(path);let store=f.store;
 try{
  const original=store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json;
  store.db.exec('PRAGMA user_version=38');store.close();store=new TowerStore(path);
  assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,40);assert.equal(store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json,original);
  const before=store.view(f.owner).coins;store.chooseEvent(f.owner,f.run,f.event.id,'medium');finishChallengerBattle(store,store.currentBattle(f.owner)!.id);assert.equal(store.view(f.owner).coins,before+700);assert.equal(store.permanentView(f.owner).eggTickets,1);
 }finally{store.close();}
});
test('all-owned epic exchange uses its stored fallback once',()=>{
 const f=rankRewardFixture('elite',[.8]);try{
  win(f);f.store.continueEvent(f.owner,f.run,f.event.id);
  for(const item of epicRewardItems)f.store.db.prepare('INSERT INTO run_item_bag VALUES (?,?,1)').run(f.run,item);
  const entry=f.store.view(f.owner).run!.rewardInventory![0];assert.deepEqual(entry.choices.map(c=>c.id),['owned-fallback']);const before=f.store.view(f.owner).coins,request=randomUUID();
  f.store.useReward(f.owner,f.run,request,entry.id,'owned-fallback');f.store.useReward(f.owner,f.run,request,entry.id,'owned-fallback');assert.equal(f.store.view(f.owner).coins,before+1500);
 }finally{f.store.close();}
});
