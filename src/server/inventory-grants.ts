import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import type {InventoryReward} from '../data/rewards';
import {VITAMIN_BOOST,VITAMIN_LIMIT} from '../data/shop';
import {BattleRequestError} from './request-error';

// Shared inventory mutations; callers own their transaction and receipt.
export function grantGrowth(db:DatabaseSync,owner:string,amount:number){db.prepare('UPDATE players SET growth_points=growth_points+? WHERE id=?').run(amount,owner);}
export function grantRunItem(db:DatabaseSync,runId:string,item:string,quantity:number){if(quantity>0&&!db.prepare('SELECT 1 FROM run_held_items WHERE run_id=? AND item=?').get(runId,item))db.prepare('INSERT INTO run_item_bag VALUES (?,?,1) ON CONFLICT(run_id,item) DO UPDATE SET quantity=1').run(runId,item);}
export function grantEquipment(db:DatabaseSync,runId:string,item:string){return !!db.prepare('INSERT OR IGNORE INTO run_trainer_equipment VALUES (?,?)').run(runId,item).changes;}
export function grantStoredReward(db:DatabaseSync,runId:string,effect:InventoryReward){if(effect.kind==='machine'&&db.prepare("SELECT 1 FROM run_reward_inventory WHERE run_id=? AND json_extract(effect_json,'$.kind')='machine' AND json_extract(effect_json,'$.move')=?").get(runId,effect.move)){db.prepare("UPDATE run_reward_inventory SET quantity=1 WHERE run_id=? AND json_extract(effect_json,'$.kind')='machine' AND json_extract(effect_json,'$.move')=?").run(runId,effect.move);return;}db.prepare('INSERT INTO run_reward_inventory VALUES (?,?,?,?)').run(randomUUID(),runId,JSON.stringify(effect),effect.kind==='machine'?1:effect.amount);}
export function grantEggTicket(db:DatabaseSync,owner:string,kind:string,quantity:number){db.prepare('INSERT INTO reward_egg_tickets VALUES (?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET quantity=quantity+excluded.quantity').run(owner,kind,quantity);}
export function applyVitamin(db:DatabaseSync,runId:string,floor:number,species:string,stat:string,price=0){
 const count=db.prepare('SELECT COUNT(*) AS n FROM vitamin_purchases WHERE run_id=? AND species=?').get(runId,species) as {n:number};
 if(count.n>=VITAMIN_LIMIT)throw new BattleRequestError('한 포켓몬은 영양제를 총 3개까지만 사용할 수 있습니다.',409);
 // A reward dose and shop dose share the existing per-floor/stat ledger.
 if(db.prepare('SELECT 1 FROM vitamin_purchases WHERE run_id=? AND floor=? AND stat=?').get(runId,floor,stat))throw new BattleRequestError('이번 층에서 이미 사용한 영양제입니다. 다음 층 준비에서 사용하세요.',409);
 db.prepare('INSERT INTO vitamin_purchases VALUES (?,?,?,?,?)').run(runId,floor,stat,species,price);
 db.prepare('INSERT INTO run_stat_boosts VALUES (?,?,?,?) ON CONFLICT(run_id,species,stat) DO UPDATE SET points=points+excluded.points').run(runId,species,stat,VITAMIN_BOOST);
}
export function learnMachine(db:DatabaseSync,owner:string,species:string,move:string){db.prepare('INSERT OR IGNORE INTO move_unlocks VALUES (?,?,?)').run(owner,species,move);}
