import type {DatabaseSync} from 'node:sqlite';
import {randomInt} from 'node:crypto';
import {heldItemKeys} from '../data/held-items';
import {itemShopRule} from '../data/held-item-shop';
import type {InventoryReward} from '../data/rewards';
import {grantRunItem,grantEquipment} from './inventory-grants';
import {isTrainerEquipment} from '../data/trainer-equipment';
import {BattleRequestError} from './request-error';
type Draw={draw_index:number;candidates_json:string;selected_item:string|null;destination:string|null;target:string|null};
// Called inside the same bag transaction as equip and the use receipt.
export class ToolVouchers{
 constructor(private db:DatabaseSync,private runId:string,private roll:(max:number)=>number=randomInt){}
 pending(id:string){const r=this.db.prepare('SELECT * FROM tool_voucher_draws WHERE voucher_id=? AND selected_item IS NULL').get(id) as Draw|undefined;return r?{drawIndex:r.draw_index,candidates:JSON.parse(r.candidates_json) as string[]}:undefined;}
 use(id:string,target:unknown,equip:(species:string,item:string|null)=>void){
  const row=this.db.prepare('SELECT effect_json,quantity FROM run_reward_inventory WHERE id=? AND run_id=?').get(id,this.runId) as {effect_json:string;quantity:number}|undefined;
  if(!row)throw new BattleRequestError('보유한 교환권이 아닙니다.',409);
  const effect=JSON.parse(row.effect_json) as InventoryReward;if(effect.kind!=='tool-voucher')throw new BattleRequestError('도구 교환권이 아닙니다.',400);
  if(target==='open'){
   if(this.pending(id))return;
   if(row.quantity<1)throw new BattleRequestError('사용한 교환권입니다.',409);
   const pool=heldItemKeys.filter(item=>itemShopRule(item).rarity===effect.rarity),candidates:string[]=[];
   while(candidates.length<effect.choices&&pool.length)candidates.push(pool.splice(this.roll(pool.length),1)[0]);
   if(candidates.length!==effect.choices)throw Error('Voucher rarity has fewer than four items');
   const index=(this.db.prepare('SELECT COUNT(*) AS n FROM tool_voucher_draws WHERE voucher_id=?').get(id) as {n:number}).n;
   this.db.prepare('INSERT INTO tool_voucher_draws(voucher_id,draw_index,candidates_json) VALUES (?,?,?)').run(id,index,JSON.stringify(candidates));return;
  }
  if(!target||typeof target!=='object')throw new BattleRequestError('교환할 도구를 선택하세요.',400);
  const {drawIndex,item,destination,species}=target as Record<string,unknown>;
  if(!Number.isInteger(drawIndex)||typeof item!=='string'||destination!=='bag'&&destination!=='use'||destination==='use'&&typeof species!=='string')throw new BattleRequestError('교환 요청이 올바르지 않습니다.',400);
  const draw=this.db.prepare('SELECT * FROM tool_voucher_draws WHERE voucher_id=? AND draw_index=?').get(id,drawIndex as number) as Draw|undefined;
  if(!draw||!JSON.parse(draw.candidates_json).includes(item))throw new BattleRequestError('저장된 후보를 선택하세요.',409);
  if(draw.selected_item){if(draw.selected_item===item&&draw.destination===destination&&draw.target===(species??null))return;throw new BattleRequestError('이미 교환한 후보입니다.',409);}
  if(row.quantity<1)throw new BattleRequestError('사용한 교환권입니다.',409);
  if(destination==='use'&&(!this.db.prepare('SELECT 1 FROM members WHERE run_id=? AND species=?').get(this.runId,species as string)||isTrainerEquipment(item)))throw new BattleRequestError('장착할 파티 포켓몬을 선택하세요.',400);
  if(isTrainerEquipment(item))grantEquipment(this.db,this.runId,item);else grantRunItem(this.db,this.runId,item,1);
  if(destination==='use'){
   const holder=this.db.prepare('SELECT species FROM run_held_items WHERE run_id=? AND item=?').get(this.runId,item) as {species:string}|undefined;
   if(holder&&holder.species!==species)equip(holder.species,null);
   equip(species as string,item);
  }
  this.db.prepare('UPDATE run_reward_inventory SET quantity=quantity-1 WHERE id=?').run(id);
  this.db.prepare('UPDATE tool_voucher_draws SET selected_item=?,destination=?,target=? WHERE voucher_id=? AND draw_index=?').run(item,destination,(species??null) as string|null,id,drawIndex as number);
 }
}
