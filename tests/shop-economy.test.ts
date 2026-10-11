import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {vitaminPrice} from '../src/data/shop';
import {heldItems} from '../src/data/held-items';

test('one reroll per category is free and resets at the next checkpoint',()=>{
 const store=new TowerStore(':memory:');try{store.ensurePlayer('p');const id=store.battle(store.start('p',starters)).run_id;store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(id);store.db.prepare('UPDATE players SET coins=10000 WHERE id=?').run('p');
 store.rerollShop('p',id,11,'items',0);assert.equal(store.view('p').coins,10000);
 const stock=store.view('p').run!.itemOffers;assert.throws(()=>store.rerollShop('p',id,11,'items',1),/리롤/);assert.equal(store.view('p').coins,10000);assert.deepEqual(store.view('p').run!.itemOffers,stock);
 store.rerollShop('p',id,11,'machines',0);assert.equal(store.view('p').coins,10000);
 store.db.prepare('UPDATE runs SET floor=21 WHERE id=?').run(id);assert.equal(store.view('p').run!.shopRerolls!.items.count,0);assert.equal(store.view('p').run!.shopRerolls!.items.price,0);
 }finally{store.close();}
});

test('vitamin and strong equipment prices are charged by the server and unaffordable purchases preserve inventory',()=>{
 const store=new TowerStore(':memory:');try{store.ensurePlayer('p');const id=store.battle(store.start('p',starters)).run_id;store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(id);store.db.prepare('UPDATE players SET coins=10000 WHERE id=?').run('p');
 const vitamin=store.view('p').run!.vitaminShop!.offers[0];assert.equal(vitamin.price,1900);store.purchaseVitamin('p',id,6,vitamin.stat,'Charizard');assert.equal(store.view('p').coins,8100);
 store.db.prepare('INSERT OR REPLACE INTO item_shops VALUES (?,?,?)').run(id,6,JSON.stringify(['Charizardite X','Leftovers','Life Orb','Charcoal']));store.purchaseItem('p',id,6,'Charizardite X','Charizard');assert.equal(heldItems['Charizardite X'].price,5000);assert.equal(store.view('p').coins,3100);
 store.db.prepare('UPDATE players SET coins=899 WHERE id=?').run('p');assert.throws(()=>store.purchaseItem('p',id,6,'Life Orb','Blastoise'),/부족/);assert.equal(store.view('p').coins,899);assert.equal(store.view('p').run!.heldItems!.Blastoise,undefined);
 store.db.prepare('UPDATE runs SET floor=46 WHERE id=?').run(id);assert.equal(store.view('p').run!.vitaminShop!.offers[0].price,5900);assert.equal(vitaminPrice(11),2400);
 }finally{store.close();}
});
