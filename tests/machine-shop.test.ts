import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {validateProfile} from '../src/server/training';
import {machinePrice} from '../src/data/machine-rarities';

function checkpoint(store:TowerStore,owner='machines') {
  store.ensurePlayer(owner);
  const run=store.battle(store.start(owner,starters)).run_id;
  store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);
  store.db.prepare('UPDATE players SET coins=1000 WHERE id=?').run(owner);
  return run;
}

test('machine offers are legal, uncollected and persist across restart; a purchase charges once and permanently unlocks only its target',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try {
    const run=checkpoint(store),shop=store.view('machines').run!.machineShop!;
    assert.equal(shop.offers.length,4);
    for(const offer of shop.offers)assert.equal(offer.price,machinePrice(offer.move));
    assert.deepEqual(Object.keys(shop.partners),starters);
    assert.deepEqual(shop.partners.Charizard.stats,{hp:138,atk:89,def:83,spa:114,spd:90,spe:105});
    assert.equal(shop.partners.Charizard.level,50);
    for(const offer of shop.offers)for(const name of offer.targets) {
      const entry=store.trainingCollection('machines').find(entry=>entry.species===name)!;
      assert.ok(entry.learnableMoves.includes(offer.move));assert.ok(!entry.unlockedMoves.includes(offer.move));
    }
    store.close();store=new TowerStore(path);
    assert.deepEqual(store.view('machines').run!.machineShop,shop);
    const offer=shop.offers[0],target=offer.targets[0],before=store.trainingCollection('machines');
    store.purchaseMachine('machines',run,6,offer.move,target);
    assert.equal(store.view('machines').coins,1000-offer.price);
    assert.deepEqual(store.view('machines').run!.machineShop!.currentMoves,shop.currentMoves);
    assert.throws(()=>store.purchaseMachine('machines',run,6,offer.move,target),/이미 구매/);
    assert.equal(store.view('machines').coins,1000-offer.price);
    for(const entry of store.trainingCollection('machines')) {
      assert.deepEqual(entry.profile,before.find(old=>old.species===entry.species)!.profile);
      if(entry.species===target)assert.ok(entry.unlockedMoves.includes(offer.move));
      else assert.deepEqual(entry.unlockedMoves,before.find(old=>old.species===entry.species)!.unlockedMoves);
    }
    store.close();store=new TowerStore(path);
    assert.equal(store.view('machines').run!.machineShop!.offers[0].buyer,target);
    assert.ok(store.trainingCollection('machines').find(entry=>entry.species===target)!.unlockedMoves.includes(offer.move));
  } finally {store.close();}
});

test('equipped machines change the next battle and survive restart without changing permanent defaults or new-run moves',()=>{
  const path=`.data/tests/${randomUUID()}.sqlite`;let store=new TowerStore(path);
  try {
    const run=checkpoint(store),shop=store.view('machines').run!.machineShop!;
    const offer=shop.offers[0],target=offer.targets[0],before=store.trainingCollection('machines').find(entry=>entry.species===target)!;
    const snapshots=JSON.parse((store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(run) as {profiles:string}).profiles);
    const slot=shop.currentMoves[target].findIndex((_,slot)=>{
      try {const profile=structuredClone(snapshots[target]);profile.moves[slot]=offer.move;validateProfile(target,profile);return true;} catch {return false;}
    });
    assert.ok(slot>=0);
    store.purchaseMachine('machines',run,6,offer.move,target,slot);
    store.close();store=new TowerStore(path);
    assert.equal(store.view('machines').run!.machineShop!.currentMoves[target][slot],offer.move);
    assert.deepEqual(store.trainingCollection('machines').find(entry=>entry.species===target)!.profile,before.profile);
    const battle=store.enter('machines',run,6,starters);
    assert.equal(Showdown.Teams.unpack(store.battle(battle).player_team)!.find(set=>set.species===target)!.moves[slot],offer.move);
    assert.throws(()=>store.purchaseMachine('machines',run,6,shop.offers[1].move,shop.offers[1].targets[0]),/상점/);
    store.abandon('machines',run);
    const fresh=store.start('machines',starters);
    assert.deepEqual(Showdown.Teams.unpack(store.battle(fresh).player_team)!.find(set=>set.species===target)!.moves,before.profile.moves);
    assert.ok(store.trainingCollection('machines').find(entry=>entry.species===target)!.unlockedMoves.includes(offer.move));
  } finally {store.close();}
});

test('invalid ownership, checkpoint, offer, target, slot and insufficient funds cannot charge or unlock a machine',()=>{
  const store=new TowerStore(':memory:');
  try {
    const run=checkpoint(store),shop=store.view('machines').run!.machineShop!,offer=shop.offers[0],target=offer.targets[0];
    const before=store.trainingCollection('machines');
    assert.throws(()=>store.purchaseMachine('other',run,6,offer.move,target),/찾을/);
    assert.throws(()=>store.purchaseMachine('machines',run,5,offer.move,target),/상점/);
    assert.throws(()=>store.purchaseMachine('machines',run,6,'Fake Move',target),/제시/);
    assert.throws(()=>store.purchaseMachine('machines',run,6,offer.move,'Mewtwo'),/파티/);
    for(const slot of [-1,4,1.5,'0',{}])assert.throws(()=>store.purchaseMachine('machines',run,6,offer.move,target,slot),/기술 칸/);
    assert.equal(store.view('machines').coins,1000);
    store.db.prepare('UPDATE players SET coins=0 WHERE id=?').run('machines');
    assert.throws(()=>store.purchaseMachine('machines',run,6,offer.move,target),/부족/);
    assert.equal(store.view('machines').coins,0);
    assert.deepEqual(store.trainingCollection('machines'),before);
    assert.ok(store.view('machines').run!.machineShop!.offers.every(offer=>!offer.purchased));
    assert.equal((store.db.prepare('SELECT COUNT(*) AS n FROM machine_purchases').get() as {n:number}).n,0);
  } finally {store.close();}
});

test('a fully collected party sees an empty machine shelf',()=>{
  const store=new TowerStore(':memory:');
  try {
    checkpoint(store);
    for(const entry of store.trainingCollection('machines'))for(const move of entry.learnableMoves)store.db.prepare('INSERT OR IGNORE INTO move_unlocks VALUES (?,?,?)').run('machines',entry.species,move);
    assert.deepEqual(store.view('machines').run!.machineShop!.offers,[]);
  } finally {store.close();}
});
