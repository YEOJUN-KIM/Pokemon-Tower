import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {rankRewardFixture} from './rank-reward-fixture';
import {mirrorFixture} from './mirror-fixture';
import {finishChallengerBattle} from './challenger-fixture';
import {snapshotRankReward,epicRewardItems,eliteRewardMachines} from '../src/server/challenger-rewards';
import {snapshotMirrorReward} from '../src/server/mirror-challenger';
import {grantRunItem,grantStoredReward,grantEquipment} from '../src/server/inventory-grants';
import {ownsRunItem,ownsMachine} from '../src/server/run-ownership';
import {allowsRuleItem} from '../src/data/run-rules';
import {trainingOptions} from '../src/server/training';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';

const draw=(category:number,item=0)=>{const values=[category,item];return()=>values.shift()??0;};
function win(f:ReturnType<typeof rankRewardFixture>){f.store.chooseEvent(f.owner,f.run,f.event.id,f.candidate.id);const id=f.store.currentBattle(f.owner)!.id;finishChallengerBattle(f.store,id);return id;}

test('direct epic snapshot survives reconnect and a lost/retried challenger battle without exposing its item',()=>{
 const path=`.data/tests/unique-retry-${randomUUID()}.sqlite`,f=rankRewardFixture('elite',[.8,.45],path);let store=f.store;
 try{
  const raw=store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json;store.close();store=new TowerStore(path);assert.equal(store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json,raw);assert.ok(!JSON.stringify(store.view(f.owner).run!.event!.challengers).includes('items'));
  store.db.prepare('UPDATE run_retries SET retry_limit=1 WHERE run_id=?').run(f.run);store.chooseEvent(f.owner,f.run,f.event.id,f.candidate.id);const battle=store.currentBattle(f.owner)!;finishChallengerBattle(store,battle.id,'Opponent');store.retry(f.owner,f.run,battle.id);store.enter(f.owner,f.run,20,starters);finishChallengerBattle(store,store.currentBattle(f.owner)!.id);assert.equal(store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json,raw);const effect=f.candidate.rewardDefinition.entries[0];if(effect.kind!=='item-exchange')throw Error('Expected tool');assert.equal(store.view(f.owner).run!.itemBag![effect.items[0]],1);assert.equal(store.view(f.owner).run!.rewardInventory!.length,0);
 }finally{store.close();}
});

test('epic snapshots contain one random unowned item; Bag, held and reserved single rewards are all excluded',()=>{
 const f=rankRewardFixture('elite',[.8]);try{
  const pool=epicRewardItems.filter(item=>allowsRuleItem('chaos',item));assert.ok(pool.length>3);
  grantRunItem(f.store.db,f.run,pool[0],1);f.store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(f.run,'Charizard',pool[1]);grantStoredReward(f.store.db,f.run,{kind:'item-exchange',items:[pool[2]],amount:1,fallbackCoins:1500});
  for(const item of pool.slice(0,3))assert.ok(ownsRunItem(f.store.db,f.run,item));
  const outcomes=new Set<string>();for(let n=0;n<100;n++){
   const snapshot=snapshotRankReward(f.store.db,f.run,'elite',draw(.8,n/100)),entry=snapshot.rewardDefinition.entries[0];assert.equal(snapshot.selections,undefined);assert.equal(entry.kind,'item-exchange');if(entry.kind!=='item-exchange')throw Error('Expected epic');assert.equal(entry.direct,true);assert.equal(entry.items.length,1);assert.ok(!pool.slice(0,3).some(item=>item===entry.items[0]));outcomes.add(entry.items[0]);
  }assert.ok(outcomes.size>1);
  for(const item of pool)grantRunItem(f.store.db,f.run,item,1);assert.deepEqual(snapshotRankReward(f.store.db,f.run,'elite',draw(.8)).rewardDefinition.entries,[{kind:'coins',amount:1500}]);
 }finally{f.store.close();}
});

for(const source of ['bag','held','reserved'] as const)test(`stale epic from ${source}: stored result pays 1500 coins once without snapshot reroll, including restart`,()=>{
 const path=`.data/tests/unique-${randomUUID()}.sqlite`,f=rankRewardFixture('elite',[.8,0],path);let store=f.store;
 try{
  const entry=f.candidate.rewardDefinition.entries[0];if(entry.kind!=='item-exchange')throw Error('Expected epic');const item=entry.items[0];
  if(source==='bag')grantRunItem(store.db,f.run,item,1);else if(source==='held')store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(f.run,'Charizard',item);else grantStoredReward(store.db,f.run,{kind:'item-exchange',items:[item],amount:1,fallbackCoins:1500});
  const snapshot=store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json,before=store.view(f.owner).coins,id=win(f);finishChallengerBattle(store,id);
  assert.equal(store.view(f.owner).coins,before+1500);assert.deepEqual(store.view(f.owner).run!.event!.result!.entries,[{kind:'coins',amount:1500}]);assert.equal(store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json,snapshot);
  const result=store.view(f.owner).run!.event!.result;store.close();store=new TowerStore(path);assert.deepEqual(store.view(f.owner).run!.event!.result,result);assert.equal(store.view(f.owner).coins,before+1500);
 }finally{store.close();}
});

test('elite TM pool excludes owned only; nobody-compatible TM can be snapshotted but cannot be used',()=>{
 const f=rankRewardFixture('elite',[.9]);try{
  const unsupported=eliteRewardMachines.find(move=>!f.store.roster(f.run).some(name=>trainingOptions(name).learnableMoves.includes(move)));assert.ok(unsupported);
  for(const move of eliteRewardMachines.filter(move=>move!==unsupported))grantStoredReward(f.store.db,f.run,{kind:'machine',move,amount:1});
  const snapshot=snapshotRankReward(f.store.db,f.run,'elite',draw(.9)),entry=snapshot.rewardDefinition.entries[0];assert.equal(entry.kind,'machine');if(entry.kind!=='machine')throw Error('Expected TM');assert.equal(entry.move,unsupported);
  Object.assign(f.candidate,snapshot);f.store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify([f.candidate]),f.event.id);win(f);f.store.continueEvent(f.owner,f.run,f.event.id);
  const bag=f.store.view(f.owner).run!.bag!.entries.find(e=>e.move===unsupported)!;assert.equal(bag.quantity,undefined);assert.deepEqual(bag.targets,[]);const before=f.store.view(f.owner);assert.throws(()=>f.store.useBag(f.owner,f.run,randomUUID(),bag.id,'Charizard',0));assert.deepEqual(f.store.view(f.owner),before);
  assert.deepEqual(snapshotRankReward(f.store.db,f.run,'elite',draw(.9)).rewardDefinition.entries,[{kind:'coins',amount:1500}]);
 }finally{f.store.close();}
});

test('elite TM is reusable by two partners without account unlocks; stale duplicate converts to coins exactly once',()=>{
 for(const stale of [false,true]){
  const f=rankRewardFixture('elite',[.9]);try{
   const snapshot=snapshotRankReward(f.store.db,f.run,'elite',draw(.9,eliteRewardMachines.indexOf('Earthquake')/eliteRewardMachines.length)),effect=snapshot.rewardDefinition.entries[0];if(effect.kind!=='machine')throw Error('Expected TM');assert.equal(effect.move,'Earthquake');Object.assign(f.candidate,snapshot);f.store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify([f.candidate]),f.event.id);
   if(stale)grantStoredReward(f.store.db,f.run,{kind:'machine',move:effect.move,amount:1});const before=f.store.view(f.owner),permanent=f.store.trainingCollection(f.owner),id=win(f);finishChallengerBattle(f.store,id);assert.equal(f.store.view(f.owner).coins,before.coins+(stale?1500:0));
   if(stale)assert.deepEqual(f.store.view(f.owner).run!.event!.result!.entries,[{kind:'coins',amount:1500}]);
   f.store.continueEvent(f.owner,f.run,f.event.id);const entry=f.store.view(f.owner).run!.bag!.entries.find(e=>e.move===effect.move)!;assert.equal(entry.quantity,undefined);assert.ok(entry.targets.length>=2);
   for(const name of entry.targets.slice(0,2)){f.store.useBag(f.owner,f.run,randomUUID(),entry.id,name,0);assert.ok(f.store.view(f.owner).run!.bag!.currentMoves[name].includes(effect.move));assert.ok(ownsMachine(f.store.db,f.run,effect.move));}
   assert.deepEqual(f.store.trainingCollection(f.owner),permanent);assert.equal(f.store.db.prepare("SELECT COUNT(*) AS n FROM run_reward_inventory WHERE run_id=? AND json_extract(effect_json,'$.kind')='machine' AND json_extract(effect_json,'$.move')=?").get(f.run,effect.move)!.n,1);
  }finally{f.store.close();}
 }
});

for(const stale of [false,true])test(`unique reward receipt failure rolls back ${stale?'fallback coins':'direct tool'} and retries safely`,()=>{
 const f=rankRewardFixture('elite',[.8]);try{
  const effect=f.candidate.rewardDefinition.entries[0];if(effect.kind!=='item-exchange')throw Error('Expected tool');if(stale)grantRunItem(f.store.db,f.run,effect.items[0],1);
  f.store.chooseEvent(f.owner,f.run,f.event.id,f.candidate.id);const battle=f.store.currentBattle(f.owner)!,before=f.store.view(f.owner);f.store.db.exec("CREATE TRIGGER fail_unique BEFORE UPDATE OF result_json ON run_events BEGIN SELECT RAISE(ABORT,'receipt failed'); END;");assert.throws(()=>finishChallengerBattle(f.store,battle.id),/receipt failed/);assert.deepEqual(f.store.view(f.owner),before);f.store.db.exec('DROP TRIGGER fail_unique');finishChallengerBattle(f.store,battle.id);finishChallengerBattle(f.store,battle.id);assert.equal(f.store.view(f.owner).coins,before.coins+(stale?1500:0));assert.equal(f.store.view(f.owner).run!.itemBag![effect.items[0]],1);assert.equal(f.store.view(f.owner).run!.rewardInventory!.length,0);
 }finally{f.store.close();}
});

test('Master/Mirror equipment share ownership filtering, preserve rule fallback and stale grant growth',()=>{
 const master=rankRewardFixture('master',[0,0]);try{
  for(const rule of ['basic','mega','z']){master.store.db.prepare('UPDATE run_rules SET rule=? WHERE run_id=?').run(rule,master.run);assert.deepEqual(snapshotRankReward(master.store.db,master.run,'master',()=>0).selections![0].candidates[2].effects,[{kind:'coins',amount:2500}]);}
 }finally{master.store.close();}
 const f=mirrorFixture(':memory:','owner',20,'chaos');try{
  grantEquipment(f.store.db,f.run,'Dynamax Band');const reward=snapshotMirrorReward(f.store.db,f.run,()=>.8),effect=reward.rewardDefinition.entries[0];if(effect.kind!=='trainer-equipment')throw Error('Expected equipment');assert.equal(effect.item,'Tera Orb');assert.equal(reward.selections,undefined);Object.assign(f.mirror,reward);f.save();grantEquipment(f.store.db,f.run,'Tera Orb');f.store.chooseEvent(f.owner,f.run,f.event.id,f.mirror.id);const before=f.store.view(f.owner),id=f.store.currentBattle(f.owner)!.id;finishChallengerBattle(f.store,id);finishChallengerBattle(f.store,id);assert.equal(f.store.view(f.owner).growthPoints,before.growthPoints+1500);assert.deepEqual(f.store.view(f.owner).run!.event!.result!.entries,[{kind:'growth-points',amount:1500}]);assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM recruitments WHERE battle_id=?').get(id)!.n,0);assert.deepEqual(snapshotMirrorReward(f.store.db,f.run,()=>.8).rewardDefinition.entries,[{kind:'growth-points',amount:1500}]);
 }finally{f.store.close();}
});
