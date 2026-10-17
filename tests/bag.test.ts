import Showdown from 'pokemon-showdown';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {hiddenShopFixture} from './hidden-shop-fixture';
import {grantRunItem,grantStoredReward,grantEquipment} from '../src/server/inventory-grants';
import {hiddenShopProducts} from '../src/server/hidden-shop';
import {ownsMachine} from '../src/server/run-ownership';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {machineMoves,MACHINE_COUNT} from '../src/data/shop';
const view=(f:ReturnType<typeof hiddenShopFixture>)=>f.store.view(f.owner).run!.bag!;

test('immediate vitamin purchase uses the canonical Bag row when the same vitamin is already stored',()=>{
 const f=hiddenShopFixture();try{
  grantStoredReward(f.store.db,f.run,{kind:'vitamin',stat:'atk',amount:2});f.pin(['vitamin-atk','item-Life Orb','machine-Earthquake','egg-ticket-5']);const before=f.store.view(f.owner);
  f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'vitamin-atk','use','Charizard');f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'vitamin-atk','use','Charizard');
  assert.equal(f.store.view(f.owner).coins,before.coins-400);assert.equal(view(f).entries.find(e=>e.action==='vitamin')!.quantity,2);assert.equal(f.store.db.prepare('SELECT points FROM run_stat_boosts WHERE run_id=? AND species=? AND stat=?').get(f.run,'Charizard','atk')!.points,5);
  assert.ok(!view(f).entries.find(e=>e.action==='vitamin')!.targets.length);assert.equal(f.store.view(f.owner).run!.vitaminUsage!.usedStats[0],'atk');
 }finally{f.store.close();}
});

test('Bag unifies pockets without duplicating stores; equipped tool stays visible, moves automatically, returns replaced tool',()=>{
 const f=hiddenShopFixture();try{
  grantRunItem(f.store.db,f.run,'Focus Sash',3);grantRunItem(f.store.db,f.run,'Life Orb',1);grantRunItem(f.store.db,f.run,'Charizardite X',1);grantRunItem(f.store.db,f.run,'Firium Z',1);grantEquipment(f.store.db,f.run,'Dynamax Band');
  assert.equal(view(f).entries.filter(e=>e.item==='Focus Sash').length,1);assert.equal(view(f).entries.find(e=>e.item==='Focus Sash')!.quantity,undefined);
  const use=(item:string,target:string|null)=>f.store.useBag(f.owner,f.run,randomUUID(),`held:${item}`,target);
  use('Focus Sash','Charizard');assert.equal(view(f).entries.find(e=>e.item==='Focus Sash')!.holder,'Charizard');
  use('Life Orb','Blastoise');use('Focus Sash','Blastoise');assert.equal(view(f).entries.find(e=>e.item==='Focus Sash')!.holder,'Blastoise');assert.equal(view(f).entries.find(e=>e.item==='Life Orb')!.holder,undefined);assert.equal(f.store.view(f.owner).run!.heldItems!.Charizard,undefined);
  use('Firium Z','Blastoise');assert.equal(view(f).entries.find(e=>e.item==='Focus Sash')!.holder,undefined);assert.equal(view(f).entries.find(e=>e.item==='Firium Z')!.pocket,'z');
  use('Firium Z',null);use('Charizardite X','Charizard');assert.equal(view(f).entries.find(e=>e.item==='Charizardite X')!.pocket,'tools');
  assert.equal(view(f).entries.find(e=>e.name==='다이맥스밴드')!.pocket,'important');
  const before=f.store.view(f.owner);assert.throws(()=>use('Charizardite X','Blastoise'));assert.deepEqual(f.store.view(f.owner),before);
 }finally{f.store.close();}
});

test('TM ownership is run scoped, reusable across Pokemon, compatibility checked only on use; purchases preserve snapshot and duplicate receipt',()=>{
 const f=hiddenShopFixture();try{
  f.pin(['machine-Earthquake','item-Life Orb','vitamin-atk','egg-ticket-5']);const raw=f.store.db.prepare('SELECT snapshot_json FROM hidden_shop_events WHERE event_id=?').get(f.eventId)!.snapshot_json;
  f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'machine-Earthquake');f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'machine-Earthquake');const entry=view(f).entries.find(e=>e.move==='Earthquake')!;assert.ok(entry);assert.equal(entry.quantity,undefined);
  const before=f.store.trainingCollection(f.owner);const targets=entry.targets;assert.ok(targets.length>=2);
  for(const species of targets.slice(0,2)){const id=randomUUID();f.store.useBag(f.owner,f.run,id,entry.id,species,0);f.store.useBag(f.owner,f.run,id,entry.id,species,0);assert.ok(view(f).currentMoves[species].includes('Earthquake'));assert.ok(ownsMachine(f.store.db,f.run,'Earthquake'));}
  assert.deepEqual(f.store.trainingCollection(f.owner),before);assert.ok(!hiddenShopProducts(f.store.db,f.run).some(p=>p.id==='machine-Earthquake'));
  const bad=f.store.view(f.owner);assert.throws(()=>f.store.useBag(f.owner,f.run,randomUUID(),entry.id,'Magikarp',0));assert.deepEqual(f.store.view(f.owner),bad);
  const snap=JSON.parse(String(raw)),after=JSON.parse(String(f.store.db.prepare('SELECT snapshot_json FROM hidden_shop_events WHERE event_id=?').get(f.eventId)!.snapshot_json));assert.deepEqual(after.offers.map((o:{purchased:boolean})=>({...o,purchased:false})),snap.offers);
  f.store.abandon(f.owner,f.run);const battle=f.store.start(f.owner,starters,'chaos');const next=f.store.battle(battle).run_id;assert.equal(ownsMachine(f.store.db,next,'Earthquake'),false);assert.ok(f.store.view(f.owner).growthPoints>=bad.growthPoints);
 }finally{f.store.close();}
});

test('hidden immediate vitamin/equip atomically validate, charge and receipt; invalid target or receipt failure rolls back everything',()=>{
 const f=hiddenShopFixture();try{
  f.pin(['vitamin-atk','item-Life Orb','machine-Earthquake','egg-ticket-5']);const before=f.store.view(f.owner);
  assert.throws(()=>f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'vitamin-atk','use','Missing'));assert.deepEqual(f.store.view(f.owner),before);
  f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'vitamin-atk','use','Charizard');f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'vitamin-atk','use','Charizard');assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM vitamin_purchases WHERE run_id=?').get(f.run)!.n,1);
  f.store.purchaseHiddenShop(f.owner,f.run,f.eventId,'item-Life Orb','use','Blastoise');assert.equal(f.store.view(f.owner).run!.heldItems!.Blastoise,'Life Orb');assert.equal(f.store.view(f.owner).run!.event!.hiddenShop!.purchasedCount,2);
 }finally{f.store.close();}
});

test('Bag vitamin is quantity based, consumes only on success, deduplicates requests, enforces cap and battle lock',()=>{
 const f=hiddenShopFixture();try{
  grantStoredReward(f.store.db,f.run,{kind:'vitamin',stat:'atk',amount:3});const entry=view(f).entries.find(e=>e.action==='vitamin')!,request=randomUUID();f.store.useBag(f.owner,f.run,request,entry.id,'Charizard');f.store.useBag(f.owner,f.run,request,entry.id,'Charizard');assert.equal(view(f).entries.find(e=>e.id===entry.id)!.quantity,2);
  const before=f.store.view(f.owner);assert.throws(()=>f.store.useBag(f.owner,f.run,randomUUID(),entry.id,'Charizard'));assert.deepEqual(f.store.view(f.owner),before);
  f.store.db.prepare("UPDATE runs SET state='battle' WHERE id=?").run(f.run);assert.throws(()=>f.store.useBag(f.owner,f.run,randomUUID(),entry.id,'Charizard'),/비전투/);
 }finally{f.store.close();}
});

test('TM rolls exclude owned moves, preserve original slot count, and ignore roster compatibility for normal and hidden shops',()=>{
 const f=hiddenShopFixture();try{
  for(const move of ['Earthquake','Ice Beam'])grantStoredReward(f.store.db,f.run,{kind:'machine',move,amount:1});f.store.chooseEvent(f.owner,f.run,f.eventId,'leave');f.store.db.prepare('UPDATE runs SET floor=11 WHERE id=?').run(f.run);
  for(let revision=0;revision<2;revision++){const offers=f.store.view(f.owner).run!.machineShop!.offers;assert.equal(offers.length,MACHINE_COUNT);assert.equal(new Set(offers.map(o=>o.move)).size,MACHINE_COUNT);assert.ok(offers.every(o=>!['Earthquake','Ice Beam'].includes(o.move)));if(revision===0)f.store.rerollShop(f.owner,f.run,11,'machines',0);}
  const missing=f.products.find(p=>p.effect.kind==='machine'&&!f.store.roster(f.run).some(s=>f.store.trainingCollection(f.owner).find(e=>e.species===s)!.learnableMoves.includes(p.effect.kind==='machine'?p.effect.move:'')));assert.ok(missing,'TM with no compatible current Pokemon must be available');
  assert.ok(hiddenShopProducts(f.store.db,f.run).some(p=>p.id===missing.id));
 }finally{f.store.close();}
});

test('v40 semantic migration keeps purchased/consumed machines and clamps unique tools; reopen is stable',()=>{
 const path=`.data/tests/bag-${randomUUID()}.sqlite`,f=hiddenShopFixture(path);let store=f.store;try{
  grantStoredReward(store.db,f.run,{kind:'machine',move:'Earthquake',amount:1});store.db.prepare('UPDATE run_reward_inventory SET quantity=0 WHERE run_id=?').run(f.run);store.db.prepare('INSERT INTO run_item_bag VALUES (?,?,5)').run(f.run,'Focus Sash');store.db.exec('PRAGMA user_version=40');store.close();store=new TowerStore(path);
  assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,42);assert.ok(ownsMachine(store.db,f.run,'Earthquake'));assert.equal(store.view(f.owner).run!.itemBag!['Focus Sash'],1);const before=store.view(f.owner);store.close();store=new TowerStore(path);assert.deepEqual(store.view(f.owner),before);
 }finally{store.close();}
});


test('six-member roster can use Bag and departing Pokemon returns its held item',()=>{
 const store=new TowerStore(':memory:');try{
  const owner='departure';store.ensurePlayer(owner);const battle=store.start(owner,starters,'chaos'),run=store.battle(battle).run_id;
  for(const [index,species] of ['Meganium','Typhlosion','Feraligatr'].entries())store.db.prepare('INSERT INTO members VALUES (?,?,?)').run(run,index+3,species);
  store.db.prepare("UPDATE runs SET state='select' WHERE id=?").run(run);grantRunItem(store.db,run,'Focus Sash',1);store.useBag(owner,run,randomUUID(),'held:Focus Sash','Meganium');assert.equal(store.view(owner).run!.bag!.entries.find(e=>e.item==='Focus Sash')!.targets.length,6);
  const opponent=store.battle(battle).opponent_team;const incoming=Showdown.Teams.unpack(opponent)!.find(s=>!store.roster(run).includes(s.species))!.species;
  store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(battle);store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run);store.recruit(owner,run,battle,incoming,'Meganium');assert.equal(store.view(owner).run!.itemBag!['Focus Sash'],1);assert.ok(!Object.values(store.view(owner).run!.heldItems!).includes('Focus Sash'));
 }finally{store.close();}
});

test('Bag receipts roll back vitamin quantity/profile and held swaps; Z pocket is hidden in basic rules',()=>{
 const f=hiddenShopFixture();try{
  grantStoredReward(f.store.db,f.run,{kind:'vitamin',stat:'atk',amount:2});grantRunItem(f.store.db,f.run,'Focus Sash',1);const entry=view(f).entries.find(e=>e.action==='vitamin')!;const before=f.store.view(f.owner);
  f.store.db.exec("CREATE TRIGGER fail_bag_receipt BEFORE INSERT ON reward_use_receipts BEGIN SELECT RAISE(ABORT,'receipt failed'); END;");assert.throws(()=>f.store.useBag(f.owner,f.run,randomUUID(),entry.id,'Charizard'),/receipt failed/);assert.deepEqual(f.store.view(f.owner),before);assert.throws(()=>f.store.useBag(f.owner,f.run,randomUUID(),'held:Focus Sash','Charizard'),/receipt failed/);assert.deepEqual(f.store.view(f.owner),before);f.store.db.exec('DROP TRIGGER fail_bag_receipt');
  f.store.db.prepare("UPDATE run_rules SET rule='basic' WHERE run_id=?").run(f.run);assert.ok(!view(f).pockets.includes('z'));
 }finally{f.store.close();}
});
