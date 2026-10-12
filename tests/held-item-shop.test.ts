import test from 'node:test';
import assert from 'node:assert/strict';
import {itemShopRule,itemRarityWeights,rollItemOffers,type ItemRarity} from '../src/data/held-item-shop';
import {heldItemKeys} from '../src/data/held-items';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';

test('shops always draw four different eligible tools; higher floors increase epic frequency',()=>{
  let seed=7391;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const epicCounts:number[]=[];
  for(const cleared of [5,10,15,25]){
    let epics=0;
    for(let i=0;i<2000;i++){const offers=rollItemOffers(cleared,random);assert.equal(offers.length,4);assert.equal(new Set(offers).size,4);for(const item of offers){assert.ok(itemShopRule(item).minClearedFloor<=cleared);if(itemShopRule(item).rarity==='epic')epics++;}}
    epicCounts.push(epics);
  }
  assert.ok(epicCounts[0]>0);assert.ok(epicCounts[2]>epicCounts[0]);assert.ok(epicCounts[3]>epicCounts[2]*2);
});
test('all five rarities can appear in the first shop, including extremely rare legendary rolls',()=>{
  const weights=itemRarityWeights(5);let cumulative=0;
  for(const rarity of Object.keys(weights) as ItemRarity[]){assert.ok(weights[rarity]>0);let call=0;const pick=(cumulative+weights[rarity]/2)/100;const result=rollItemOffers(5,()=>call++===0 ? pick : 0);assert.equal(itemShopRule(result[0]).rarity,rarity);cumulative+=weights[rarity];}
  assert.equal(weights.legendary,0.01);
});
test('saved stock survives reloads, rejects unlisted purchases without spending, and changes at the next shop',()=>{
  const store=new TowerStore(':memory:');try{
    store.ensurePlayer('shop');const run=store.battle(store.start('shop',starters)).run_id;
    store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);store.db.prepare('UPDATE players SET coins=5000 WHERE id=?').run('shop');
    const before=store.view('shop'),offers=before.run!.itemOffers!;assert.equal(offers.length,4);assert.deepEqual(store.view('shop').run!.itemOffers,offers);
    const absent=heldItemKeys.find(item=>!offers.includes(item) && itemShopRule(item).minClearedFloor===5)!;
    assert.throws(()=>store.purchaseItem('shop',run,6,absent,'Charizard'),/판매하지/);assert.deepEqual(store.view('shop'),before);
    store.purchaseItem('shop',run,6,offers[0],'Charizard');assert.deepEqual(store.view('shop').run!.itemOffers,offers);
    store.db.prepare("UPDATE runs SET floor=11 WHERE id=?").run(run);assert.equal(store.view('shop').run!.itemOffers!.length,4);assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM item_shops WHERE run_id=?').get(run)!.n,2);
  }finally{store.close();}
});

 test('depleted tiers still fill four distinct tools and saved short stock is filled once',()=>{
  const rareOnly=heldItemKeys.filter(item=>itemShopRule(item).rarity==='rare');
  for(const random of [()=>0,()=>.999999]){const offers=rollItemOffers(30,random,item=>rareOnly.includes(item));assert.equal(offers.length,4);assert.equal(new Set(offers).size,4);assert.ok(offers.every(item=>rareOnly.includes(item)));}
  const store=new TowerStore(':memory:');try{store.ensurePlayer('fill');const run=store.battle(store.start('fill',starters,'basic')).run_id;store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(run);
    const old=['Light Clay','Heavy-Duty Boots','Spell Tag'];store.db.prepare('INSERT INTO item_shops VALUES (?,?,?)').run(run,11,JSON.stringify(old));
    const stock=store.view('fill').run!.itemOffers!;assert.equal(stock.length,4);assert.equal(new Set(stock).size,4);assert.deepEqual(stock.slice(0,3),old);assert.deepEqual(store.view('fill').run!.itemOffers,stock);
    store.db.prepare('INSERT INTO run_item_bag VALUES (?,?,?)').run(run,stock[3],1);assert.deepEqual(store.view('fill').run!.itemOffers,stock);
  }finally{store.close();}
 });
