import type {DatabaseSync} from 'node:sqlite';
import {grantStoredReward,grantRunItem} from '../inventory-grants';
// Semantic migration only: the existing reward inventory is the run TM registry.
export function migrateRunBag(db:DatabaseSync){
 for(const row of db.prepare('SELECT p.run_id,p.move FROM machine_purchases p').all() as {run_id:string;move:string}[])grantStoredReward(db,row.run_id,{kind:'machine',move:row.move,amount:1});
 const rows=db.prepare('SELECT id,run_id,effect_json FROM run_reward_inventory ORDER BY rowid').all() as {id:string;run_id:string;effect_json:string}[];
 const machines=new Set<string>();
 for(const row of rows){const effect=JSON.parse(row.effect_json);
  if(effect.kind==='machine'){
   const key=row.run_id+':'+effect.move;if(machines.has(key))db.prepare('DELETE FROM run_reward_inventory WHERE id=?').run(row.id);else{machines.add(key);db.prepare('UPDATE run_reward_inventory SET quantity=1 WHERE id=?').run(row.id);}}
  if(effect.kind==='item-exchange'&&effect.items.length===1&&(db.prepare('SELECT quantity FROM run_reward_inventory WHERE id=?').get(row.id) as {quantity:number}).quantity>0){grantRunItem(db,row.run_id,effect.items[0],1);db.prepare('UPDATE run_reward_inventory SET quantity=0 WHERE id=?').run(row.id);}
 }
 db.exec(`DELETE FROM run_held_items WHERE rowid NOT IN (SELECT MIN(rowid) FROM run_held_items GROUP BY run_id,item);
 UPDATE run_item_bag SET quantity=CASE WHEN EXISTS(SELECT 1 FROM run_held_items h WHERE h.run_id=run_item_bag.run_id AND h.item=run_item_bag.item) THEN 0 ELSE MIN(quantity,1) END;`);
 // Legacy account knowledge has no source ledger (a caught Pokemon and an old
 // shop can unlock the same move). Preserve it; new Bag TM grants never write it.
}
