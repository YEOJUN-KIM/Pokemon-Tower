import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {hiddenShopFixture} from './hidden-shop-fixture';
import {HiddenShop,hiddenShopProducts,snapshotHiddenShop} from '../src/server/hidden-shop';
import {hiddenShopProductPool as pool,hiddenShopProductOverrides} from '../src/data/hidden-shop';
import {TowerStore} from '../src/server/tower-store';
import {RunEvents} from '../src/server/run-events';
import {selectRunEvent} from '../src/game/run-events';
import {eventDefinitions} from '../src/data/run-events';
import {starters} from '../src/data/teams';
import {transaction} from '../src/server/storage/transaction';
import {existsSync} from 'node:fs';

test('generation: 4/5 distinct products, every currency/price permitted, both currencies for the same product',()=>{
 const f=hiddenShopFixture();try{
  const snapshots=[snapshotHiddenShop(f.products,()=>0),snapshotHiddenShop(f.products,()=>.999999)];
  assert.deepEqual(snapshots.map(s=>s.offers.length),[4,5]);
  const vitamin=f.products.find(p=>p.id==='vitamin-atk')!;
  const coin=snapshotHiddenShop([vitamin],()=>0).offers[0],growth=snapshotHiddenShop([vitamin],()=>.999);
  assert.equal(coin.currency,'coins');assert.equal(growth.offers[0].currency,'growth-points');
  const single={...vitamin,allowedCurrencies:['growth-points'] as const};assert.equal(snapshotHiddenShop([single],()=>0).offers[0].currency,'growth-points');
  for(const snapshot of snapshots){assert.equal(new Set(snapshot.offers.map(o=>o.id)).size,snapshot.offers.length);for(const o of snapshot.offers){const p=f.products.find(p=>p.id===o.id)!;assert.ok(p.allowedCurrencies.includes(o.currency));const [min,max]=pool[o.category].prices[o.currency];assert.ok(o.price>=min&&o.price<=max);}}
  assert.ok(!f.products.some(p=>p.effect.kind==='typed-egg-ticket'&&p.effect.eggKind==='shiny'));
  for(const product of f.products)if(product.icon)assert.ok(existsSync(`public${product.icon}`),product.icon);
 }finally{f.store.close();}
});

test('category weights are per group and repeat-category soft penalty preserves varied stock',()=>{
 const f=hiddenShopFixture();try{
  let seed=1234;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x100000000;};
  let varied=0;const categories=new Set<string>();
  for(let i=0;i<200;i++){
   const s=snapshotHiddenShop(f.products,random);assert.ok(s.offers.length>=4&&s.offers.length<=5);assert.equal(new Set(s.offers.map(p=>p.id)).size,s.offers.length);
   const unique=new Set(s.offers.map(p=>p.category));if(unique.size>=3)varied++;for(const c of unique)categories.add(c);
  }
  assert.ok(varied>150);assert.equal(categories.size,6);
 }finally{f.store.close();}
});

test('purchased vitamin and TM use existing reward inventory and keep vitamin cap/forever move unlock',()=>{
 const f=hiddenShopFixture();try{
  const machine=f.products.find(p=>p.category==='machine')!;f.pin(['vitamin-atk',machine.id]);
  f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'vitamin-atk');f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,machine.id);
  f.store.chooseEvent(f.owner,f.run,f.eventId,'leave');
  const inventory=f.store.view(f.owner).run!.rewardInventory!;
  const vitamin=inventory.find(e=>e.label==='타우린')!,tm=inventory.find(e=>e.label===machine.name)!;
  assert.ok(vitamin.choices.length);assert.ok(tm.choices.length);
  f.store.useReward(f.owner,f.run,randomUUID(),vitamin.id,vitamin.choices[0].id);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM vitamin_purchases WHERE run_id=? AND species=?').get(f.run,vitamin.choices[0].id)!.n,1);
  const request=randomUUID();f.store.useReward(f.owner,f.run,request,tm.id,tm.choices[0].id);f.store.useReward(f.owner,f.run,request,tm.id,tm.choices[0].id);
  if(machine.effect.kind!=='machine')throw Error();assert.ok(f.store.db.prepare('SELECT 1 FROM move_unlocks WHERE player_id=? AND species=? AND move=?').get(f.owner,tm.choices[0].id,machine.effect.move));
 }finally{f.store.close();}
});

test('event selection uses the existing 10% roll, cooldown and checkpoint exclusion; v1 remains unchanged',()=>{
 const total=Object.values(eventDefinitions).reduce((n,d)=>n+d.weight,0),roll=(max:number)=>max===100?0:total-1;
 assert.equal(total,132);assert.equal(selectRunEvent(1,null,roll,undefined,2),'hidden-shop');
 assert.equal(selectRunEvent(5,null,roll,undefined,2),null);assert.equal(selectRunEvent(3,1,roll,undefined,2),null);
 assert.equal(selectRunEvent(1,null,()=>99,undefined,2),null);
 assert.equal(selectRunEvent(1,null,max=>max===100?99:0,undefined,1),null);
 const f=hiddenShopFixture();try{
  f.store.chooseEvent(f.owner,f.run,f.eventId,'leave');
  f.store.db.prepare('INSERT INTO run_event_rules VALUES (?,2)').run(f.run);
  transaction(f.store.db,()=>new RunEvents(f.store.db,roll).encounter(f.run,4));
  const event=f.store.view(f.owner).run!.event!;assert.equal(event.kind,'hidden-shop');assert.ok(event.hiddenShop!.offers.length>=4);assert.equal(f.store.view(f.owner).run!.floor,2);
 }finally{f.store.close();}
});

test('mixed payment, duplicate product receipt, third purchase rejection, price and currency stay snapshotted',()=>{
 const f=hiddenShopFixture();try{
  const snapshot=f.pin(['vitamin-atk','vitamin-spa','egg-ticket-3'],['coins','growth-points','coins']);
  const before=f.store.view(f.owner);
  f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,snapshot.offers[0].id);
  f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,snapshot.offers[0].id);
  f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,snapshot.offers[1].id);
  f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,snapshot.offers[1].id);
  assert.throws(()=>f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,snapshot.offers[2].id),/한도/);
  const after=f.store.view(f.owner),shop=after.run!.event!.hiddenShop!;
  assert.equal(after.coins,before.coins-snapshot.offers[0].price);assert.equal(after.growthPoints,before.growthPoints-snapshot.offers[1].price);
  assert.equal(shop.purchasedCount,2);assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM run_reward_inventory WHERE run_id=?').get(f.run)!.n,2);
  assert.deepEqual(shop.offers.map(o=>[o.id,o.price,o.currency]),snapshot.offers.map(o=>[o.id,o.price,o.currency]));
  assert.ok(!JSON.stringify(shop).includes('effect'));
 }finally{f.store.close();}
});

for(const currency of ['coins','growth-points'] as const)test(`${currency}: insufficient funds, two same-currency purchases, no third`,()=>{
 const f=hiddenShopFixture();try{
  const s=f.pin(['vitamin-atk','vitamin-def','vitamin-spa'],[currency,currency,currency]);
  f.store.db.prepare('UPDATE players SET coins=0,growth_points=0 WHERE id=?').run(f.owner);
  const before=f.store.view(f.owner);assert.throws(()=>f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,s.offers[0].id),/부족/);assert.deepEqual(f.store.view(f.owner),before);
  f.store.db.prepare('UPDATE players SET coins=50000,growth_points=10000 WHERE id=?').run(f.owner);
  for(const p of s.offers.slice(0,2))f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,p.id);
  assert.throws(()=>f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,s.offers[2].id),/한도/);assert.equal(f.store.view(f.owner).run!.event!.hiddenShop!.purchasedCount,2);
 }finally{f.store.close();}
});

for(const category of ['vitamin','held-item','machine','egg-tickets','super-rare-ticket','equipment'] as const)test(`${category}: existing inventory/ticket/equipment grant path and exactly-once payment`,()=>{
 const f=hiddenShopFixture();try{
  const p=f.products.find(p=>p.category===category)!;assert.ok(p);
  const s=f.pin([p.id]),before=f.store.view(f.owner),tickets=f.store.permanentView(f.owner).eggTickets;
  f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,p.id);const after=f.store.view(f.owner);
  f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,p.id);assert.deepEqual(f.store.view(f.owner),after);
  assert.equal(after.coins,before.coins-s.offers[0].price);
  const effect=p.effect;
  if(effect.kind==='vitamin'||effect.kind==='machine'){
   const rows=f.store.db.prepare('SELECT effect_json,quantity FROM run_reward_inventory WHERE run_id=?').all(f.run);assert.equal(rows.length,1);assert.equal(rows[0].quantity,1);assert.deepEqual(JSON.parse(String(rows[0].effect_json)),effect);
  }else if(effect.kind==='item-exchange')assert.equal(f.store.db.prepare('SELECT quantity FROM run_item_bag WHERE run_id=? AND item=?').get(f.run,effect.items[0])!.quantity,1);
  else if(effect.kind==='trainer-equipment')assert.ok(f.store.db.prepare('SELECT 1 FROM run_trainer_equipment WHERE run_id=? AND item=?').get(f.run,effect.item));
  else if(effect.kind==='typed-egg-ticket')assert.equal(f.store.db.prepare('SELECT quantity FROM reward_egg_tickets WHERE player_id=? AND kind=?').get(f.owner,'superRare')!.quantity,1);
  else if(effect.kind==='egg-ticket')assert.equal(f.store.permanentView(f.owner).eggTickets,tickets+p.quantity);
 }finally{f.store.close();}
});

test('rule/ownership eligibility excludes unique held items, both owned trainer devices, and unlocked TMs',()=>{
 const f=hiddenShopFixture(':memory:','owner','basic');try{
  assert.equal(f.products.filter(p=>p.category==='equipment').length,0);
  f.store.db.prepare("UPDATE run_rules SET rule='chaos' WHERE run_id=?").run(f.run);
  assert.equal(hiddenShopProducts(f.store.db,f.run).filter(p=>p.category==='equipment').length,2);
  f.store.db.prepare("INSERT INTO run_trainer_equipment VALUES (?,'Dynamax Band'),(?,'Tera Orb')").run(f.run,f.run);
  f.store.db.prepare("INSERT INTO run_item_bag VALUES (?,'Life Orb',1)").run(f.run);
  f.store.db.prepare("INSERT INTO run_held_items VALUES (?,?,'Choice Band')").run(f.run,starters[0]);
  const machine=f.products.find(p=>p.effect.kind==='machine')!;
  if(machine.effect.kind!=='machine')throw Error();
  for(const species of f.store.roster(f.run))f.store.db.prepare('INSERT OR IGNORE INTO move_unlocks VALUES (?,?,?)').run(f.owner,species,machine.effect.move);
  const products=hiddenShopProducts(f.store.db,f.run);
  assert.ok(!products.some(p=>p.category==='equipment'||['item-Life Orb','item-Choice Band',machine.id].includes(p.id)));
 }finally{f.store.close();}
});

test('failed grant rolls back currency, inventory and receipt; wrong owner/event/product cannot buy',()=>{
 const f=hiddenShopFixture();try{
  f.pin(['vitamin-atk']);const before=f.store.view(f.owner);
  f.store.db.exec("CREATE TRIGGER fail_hidden_grant BEFORE INSERT ON run_reward_inventory BEGIN SELECT RAISE(ABORT,'injected failure'); END;");
  assert.throws(()=>f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'vitamin-atk'),/injected failure/);assert.deepEqual(f.store.view(f.owner),before);
  assert.throws(()=>f.store.purchaseHiddenShop('stranger',f.run,f.eventId,'vitamin-atk'),/이 도전/);
  assert.throws(()=>f.store.purchaseHiddenShop(f.owner,f.run,'wrong-event','vitamin-atk'),/찾을 수/);
  assert.throws(()=>f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,{id:'vitamin-atk',price:0}),/선택/);
  assert.throws(()=>f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'nonexistent'),/선택/);
 }finally{f.store.close();}
});

test('receipt write failure rolls back an already granted product and both currencies',()=>{
 for(const currency of ['coins','growth-points'] as const){
  const f=hiddenShopFixture();try{
   f.pin(['vitamin-atk'],[currency]);const before=f.store.view(f.owner);
   f.store.db.exec("CREATE TRIGGER fail_hidden_receipt BEFORE UPDATE ON hidden_shop_events BEGIN SELECT RAISE(ABORT,'receipt failure'); END;");
   assert.throws(()=>f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'vitamin-atk'),/receipt failure/);
   assert.deepEqual(f.store.view(f.owner),before);assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM run_reward_inventory WHERE run_id=?').get(f.run)!.n,0);
  }finally{f.store.close();}
 }
});

test('per-product currency overrides and future tuning do not mutate a saved shop',()=>{
 const f=hiddenShopFixture();try{
  const before=new HiddenShop(f.store.db).snapshot(f.eventId);
  hiddenShopProductOverrides['vitamin-atk']={allowedCurrencies:['growth-points'],prices:{coins:[1,1],'growth-points':[2,2]}};
  const product=hiddenShopProducts(f.store.db,f.run).find(p=>p.id==='vitamin-atk')!;
  const fresh=snapshotHiddenShop([product],()=>0);assert.equal(fresh.offers[0].currency,'growth-points');assert.equal(fresh.offers[0].price,2);
  assert.deepEqual(new HiddenShop(f.store.db).snapshot(f.eventId),before);
 }finally{delete hiddenShopProductOverrides['vitamin-atk'];f.store.close();}
});

test('restart preserves exact snapshot, purchase receipt and limit; leaving without buying completes event',()=>{
 const path=`.data/tests/hidden-${randomUUID()}.sqlite`,f=hiddenShopFixture(path);let store=f.store;try{
  f.pin(['vitamin-atk','egg-ticket-5','vitamin-def'],['growth-points','coins']);
  store.purchaseHiddenShop(f.owner,f.run,f.eventId,'vitamin-atk');const before=store.view(f.owner);
  store.close();store=new TowerStore(path);
  assert.deepEqual(store.view(f.owner),before);store.purchaseHiddenShop(f.owner,f.run,f.eventId,'vitamin-atk');assert.deepEqual(store.view(f.owner),before);
  store.purchaseHiddenShop(f.owner,f.run,f.eventId,'egg-ticket-5');assert.equal(store.view(f.owner).run!.event!.hiddenShop!.purchasedCount,2);
  store.chooseEvent(f.owner,f.run,f.eventId,'leave');assert.equal(store.view(f.owner).run!.event,null);
  assert.throws(()=>store.purchaseHiddenShop(f.owner,f.run,f.eventId,'vitamin-def'),/열려/);
  assert.equal(store.view(f.owner).run!.floor,2);store.enter(f.owner,f.run,2,starters);
 }finally{store.close();}
 const empty=hiddenShopFixture();try{const before=empty.store.view(empty.owner);empty.store.chooseEvent(empty.owner,empty.run,empty.eventId,'leave');assert.equal(empty.store.view(empty.owner).coins,before.coins);assert.equal(empty.store.view(empty.owner).growthPoints,before.growthPoints);assert.equal(empty.store.view(empty.owner).run!.event,null);}finally{empty.store.close();}
});

test('schema 39 migration adds storage while preserving old event snapshots',()=>{
 const path=`.data/tests/hidden-migration-${randomUUID()}.sqlite`,f=hiddenShopFixture(path);let store=f.store;
 try{
  store.chooseEvent(f.owner,f.run,f.eventId,'leave');const old=store.db.prepare('SELECT * FROM run_events WHERE id=?').get(f.eventId);
  store.db.exec('DROP TABLE hidden_shop_events; PRAGMA user_version=39');store.close();store=new TowerStore(path);
  assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,40);assert.deepEqual(store.db.prepare('SELECT * FROM run_events WHERE id=?').get(f.eventId),old);assert.deepEqual(store.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{store.close();}
});
