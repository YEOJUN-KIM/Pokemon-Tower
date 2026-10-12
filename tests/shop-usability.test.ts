import test from 'node:test';
import assert from 'node:assert/strict';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {isShopFloor} from '../src/data/shop';
import {rollItemOffers,itemShopRule} from '../src/data/held-item-shop';
import {megaStones,canEquipGimmick} from '../src/data/gimmicks';

test('new hundred-floor shops open every ten floors; legacy short saves retain their cadence',()=>{
  assert.deepEqual(Array.from({length:100},(_,i)=>i+1).filter(f=>isShopFloor(f,100)),[11,21,31,41,51,61,71,81,91]);
  assert.equal(isShopFloor(6,50),true);
});
test('sold-out tiers fall back to stocked tiers and exhaust small pools without duplicates',()=>{
  const megaOnly=rollItemOffers(30,()=>0,item=>!!megaStones[item]);assert.equal(megaOnly.length,4);assert.equal(new Set(megaOnly).size,4);assert.ok(megaOnly.every(item=>!!megaStones[item]));
  let n=0;const rareDraw=rollItemOffers(30,()=>n++%2===0?.999:0,item=>item==='Charizardite X');
  assert.deepEqual(rareDraw,['Charizardite X']);
  assert.equal(itemShopRule(rareDraw[0]).rarity,'legendary');
});
test('bag purchase, duplicate protection, compatible stock, independent one-use rerolls and reset persist',()=>{
  const store=new TowerStore(':memory:');try{
    store.ensurePlayer('p');const id=store.battle(store.start('p',starters)).run_id;
    store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(id);
    store.db.prepare('UPDATE players SET coins=30000 WHERE id=?').run('p');
    store.db.prepare('INSERT INTO item_shops VALUES (?,?,?)').run(id,11,JSON.stringify(['Leftovers']));
    store.purchaseItem('p',id,11,'Leftovers',null);
    assert.equal(store.view('p').run!.itemBag!.Leftovers,1);
    assert.deepEqual(store.view('p').run!.heldItems,{});
    store.rerollShop('p',id,11,'items',0);
    const stock=store.view('p').run!.itemOffers!;
    assert.ok(!stock.includes('Leftovers'));
    assert.ok(stock.every(item=>starters.some(name=>canEquipGimmick(name,item))));
    const coins=store.view('p').coins;
    assert.throws(()=>store.rerollShop('p',id,11,'items',1),/리롤/);
    assert.equal(store.view('p').coins,coins);
    store.rerollShop('p',id,11,'machines',0);
    assert.equal(store.view('p').run!.shopRerolls!.machines.count,1);
    store.db.prepare('UPDATE item_shops SET offers=? WHERE run_id=? AND floor=?').run(JSON.stringify(['Leftovers']),id,11);
    assert.throws(()=>store.purchaseItem('p',id,11,'Leftovers','Charizard',1),/보유/);
    store.equipItem('p',id,11,'Charizard','Leftovers');
    assert.equal(store.view('p').run!.heldItems!.Charizard,'Leftovers');
    store.db.prepare('UPDATE runs SET floor=21 WHERE id=?').run(id);
    assert.equal(store.view('p').run!.shopRerolls!.items.count,0);
    assert.ok(!store.view('p').run!.itemOffers!.includes('Leftovers'));
  }finally{store.close();}
});
