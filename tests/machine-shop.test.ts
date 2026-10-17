import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {machinePrice} from '../src/data/machine-rarities';
import {ownsMachine} from '../src/server/run-ownership';
import {MACHINE_COUNT} from '../src/data/shop';
function checkpoint(store:TowerStore,owner='machines'){store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);store.db.prepare('UPDATE players SET coins=10000 WHERE id=?').run(owner);return run;}

test('run TM offers freeze, keep slot count, charge once and register in Bag without changing permanent Pokemon knowledge',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);try{
  const run=checkpoint(store),shop=store.view('machines').run!.machineShop!,before=store.trainingCollection('machines');assert.equal(shop.offers.length,MACHINE_COUNT);for(const o of shop.offers)assert.equal(o.price,machinePrice(o.move));
  store.close();store=new TowerStore(path);assert.deepEqual(store.view('machines').run!.machineShop,shop);
  const offer=shop.offers[0];store.purchaseMachine('machines',run,6,offer.move);store.purchaseMachine('machines',run,6,offer.move);assert.equal(store.view('machines').coins,10000-offer.price);assert.ok(ownsMachine(store.db,run,offer.move));assert.deepEqual(store.trainingCollection('machines'),before);assert.deepEqual(store.view('machines').run!.bag!.currentMoves,shop.currentMoves);
  store.close();store=new TowerStore(path);assert.ok(ownsMachine(store.db,run,offer.move));assert.equal(store.view('machines').run!.machineShop!.offers.find(o=>o.move===offer.move)!.purchased,true);
 }finally{store.close();}
});

test('TM used from Bag affects next battle, survives restart and never changes new-run or permanent defaults',()=>{
 const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);try{
  const run=checkpoint(store),before=store.trainingCollection('machines');store.db.prepare('INSERT INTO machine_shops VALUES (?,?,?)').run(run,6,JSON.stringify([{move:'Earthquake',price:600,targets:[],purchased:false}]));store.purchaseMachine('machines',run,6,'Earthquake');
  const entry=store.view('machines').run!.bag!.entries.find(e=>e.move==='Earthquake')!,target=entry.targets[0];store.useBag('machines',run,randomUUID(),entry.id,target,0);
  store.close();store=new TowerStore(path);assert.equal(store.view('machines').run!.bag!.currentMoves[target][0],'Earthquake');assert.deepEqual(store.trainingCollection('machines'),before);
  const battle=store.enter('machines',run,6,starters);assert.equal(Showdown.Teams.unpack(store.battle(battle).player_team)!.find(s=>s.species===target)!.moves[0],'Earthquake');assert.throws(()=>store.useBag('machines',run,randomUUID(),entry.id,target,1),/비전투/);
  store.abandon('machines',run);const fresh=store.start('machines',starters);assert.deepEqual(Showdown.Teams.unpack(store.battle(fresh).player_team)!.find(s=>s.species===target)!.moves,before.find(e=>e.species===target)!.profile.moves);assert.equal(ownsMachine(store.db,store.battle(fresh).run_id,'Earthquake'),false);
 }finally{store.close();}
});

test('wrong owner/checkpoint/product and insufficient funds cannot register or charge TM',()=>{
 const store=new TowerStore(':memory:');try{const run=checkpoint(store),offer=store.view('machines').run!.machineShop!.offers[0],before=store.trainingCollection('machines');
  assert.throws(()=>store.purchaseMachine('other',run,6,offer.move),/찾을/);assert.throws(()=>store.purchaseMachine('machines',run,5,offer.move),/상점/);assert.throws(()=>store.purchaseMachine('machines',run,6,'Fake Move'),/진열/);
  store.db.prepare('UPDATE players SET coins=0 WHERE id=?').run('machines');assert.throws(()=>store.purchaseMachine('machines',run,6,offer.move),/부족/);assert.equal(ownsMachine(store.db,run,offer.move),false);assert.deepEqual(store.trainingCollection('machines'),before);
 }finally{store.close();}
});

test('knowing every party move does not empty the TM shelf; compatibility is irrelevant to ownership',()=>{const store=new TowerStore(':memory:');try{const run=checkpoint(store);for(const e of store.trainingCollection('machines'))for(const move of e.learnableMoves)store.db.prepare('INSERT OR IGNORE INTO move_unlocks VALUES (?,?,?)').run('machines',e.species,move);assert.equal(store.view('machines').run!.machineShop!.offers.length,MACHINE_COUNT);assert.equal(store.view('machines').run!.bag!.entries.filter(e=>e.pocket==='machines').length,0);}finally{store.close();}});
