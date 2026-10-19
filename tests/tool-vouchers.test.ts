import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {ToolVouchers} from '../src/server/tool-vouchers';
import {grantStoredReward} from '../src/server/inventory-grants';
import {applyRewardOption} from '../src/server/rewards';
import {itemShopRule} from '../src/data/held-item-shop';
import {isHeldItem} from '../src/data/held-items';
import {trackFixture,trackRegistry} from './villain-track-fixture';
import {transaction} from '../src/server/storage/transaction';
function grant(s:TowerStore,run:string,amount=1){grantStoredReward(s.db,run,{kind:'tool-voucher',rarity:'epic',choices:4,amount});return String(s.db.prepare("SELECT id FROM run_reward_inventory WHERE run_id=? ORDER BY rowid DESC LIMIT 1").get(run)!.id);}
test('shared reward infrastructure grants a rarity voucher; draw is unique, real rarity, unfiltered and reconnect-safe',()=>{
 const path=`.data/tests/voucher-${randomUUID()}.sqlite`,f=trackFixture(path);let s=f.store;
 try{
  applyRewardOption(s.db,f.owner,{id:'voucher',title:'교환권',tone:'good',entries:[{kind:'tool-voucher',rarity:'epic',choices:4,amount:1}]},f.run);
  const id=String(s.db.prepare('SELECT id FROM run_reward_inventory WHERE run_id=?').get(f.run)!.id);
  // Deliberately owned and incompatible items remain eligible for the draw.
  s.db.prepare('INSERT INTO run_item_bag VALUES (?,?,1)').run(f.run,'Choice Band');
  const voucher=new ToolVouchers(s.db,f.run,()=>0);transaction(s.db,()=>voucher.use(id,'open',()=>{}));const first=voucher.pending(id)!;
  assert.equal(new Set(first.candidates).size,4);for(const item of first.candidates){assert.ok(isHeldItem(item));assert.equal(itemShopRule(item).rarity,'epic');}
  transaction(s.db,()=>voucher.use(id,'open',()=>{throw Error('open must not equip');}));assert.deepEqual(voucher.pending(id),first);
  const before=s.view(f.owner);s.close();s=new TowerStore(path,()=>99,trackRegistry);assert.deepEqual(s.view(f.owner),before);assert.deepEqual(new ToolVouchers(s.db,f.run).pending(id),first);
  const payload={drawIndex:first.drawIndex,item:first.candidates[0],destination:'bag'};s.useBag(f.owner,f.run,randomUUID(),id,payload);s.useBag(f.owner,f.run,randomUUID(),id,payload);
  assert.equal(s.db.prepare('SELECT quantity FROM run_reward_inventory WHERE id=?').get(id)!.quantity,0);assert.equal(s.view(f.owner).run!.itemBag![payload.item],1);
  assert.throws(()=>s.useBag(f.owner,f.run,randomUUID(),id,{...payload,item:first.candidates[1]}),/이미 교환/);
  assert.deepEqual(s.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{s.close();}
});
test('voucher direct equip returns old item, moves an existing holder, validates party, and duplicate requests are harmless',()=>{
 const f=trackFixture(),s=f.store;try{
  const id=grant(s,f.run,2);s.useBag(f.owner,f.run,randomUUID(),id,'open');const first=new ToolVouchers(s.db,f.run).pending(id)!,item=first.candidates[0],roster=s.view(f.owner).run!.roster;
  s.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(f.run,roster[0],'Leftovers');s.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(f.run,roster[1],item);
  const target={drawIndex:first.drawIndex,item,destination:'use',species:roster[0]},request=randomUUID();
  assert.throws(()=>s.useBag(f.owner,f.run,randomUUID(),id,{...target,species:'invalid'}),/파티/);assert.equal(s.db.prepare('SELECT quantity FROM run_reward_inventory WHERE id=?').get(id)!.quantity,2);
  s.useBag(f.owner,f.run,request,id,target);s.useBag(f.owner,f.run,request,id,target);s.useBag(f.owner,f.run,randomUUID(),id,target);
  assert.equal(s.view(f.owner).run!.heldItems![roster[0]],item);assert.equal(s.view(f.owner).run!.heldItems![roster[1]],undefined);assert.equal(s.view(f.owner).run!.itemBag!['Leftovers'],1);
  assert.equal(s.db.prepare('SELECT quantity FROM run_reward_inventory WHERE id=?').get(id)!.quantity,1);
  s.useBag(f.owner,f.run,randomUUID(),id,'open');assert.equal(new ToolVouchers(s.db,f.run).pending(id)!.drawIndex,1);
 }finally{s.close();}
});
test('voucher selection and equip roll back together on receipt failure; invalid candidates cannot be submitted',()=>{
 const f=trackFixture(),s=f.store;try{
  const id=grant(s,f.run);s.useBag(f.owner,f.run,randomUUID(),id,'open');const draw=new ToolVouchers(s.db,f.run).pending(id)!,target={drawIndex:draw.drawIndex,item:draw.candidates[0],destination:'use',species:s.view(f.owner).run!.roster[0]},before=s.view(f.owner);
  assert.throws(()=>s.useBag(f.owner,f.run,randomUUID(),id,{...target,item:'Leftovers'}),/저장된 후보/);
  s.db.exec("CREATE TRIGGER fail_voucher BEFORE INSERT ON reward_use_receipts BEGIN SELECT RAISE(ABORT,'fixture receipt'); END");
  assert.throws(()=>s.useBag(f.owner,f.run,randomUUID(),id,target),/fixture receipt/);assert.deepEqual(s.view(f.owner),before);assert.deepEqual(new ToolVouchers(s.db,f.run).pending(id),draw);
 }finally{s.close();}
});
