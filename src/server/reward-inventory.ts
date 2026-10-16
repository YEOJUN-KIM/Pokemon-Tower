import type {DatabaseSync} from 'node:sqlite';
import type {InventoryReward} from '../data/rewards';
import type {RewardInventoryView} from '../data/reward-inventory';
import type {TrainingProfile} from '../data/training';
import {vitamins,VITAMIN_LIMIT} from '../data/shop';
import {moveInfo} from '../data/move-info';
import {itemName} from '../data/held-items';
import {trainingOptions} from './training';
import {applyVitamin,learnMachine,grantRunItem} from './inventory-grants';
import {grantCoins} from './player-wallet';
import {BattleRequestError} from './request-error';

type Row={id:string;effect_json:string;quantity:number};
type Context={owner:string;runId:string;floor:number;roster:string[];profiles:Record<string,TrainingProfile>;known:(species:string)=>string[]};
export class RewardInventory{
 constructor(private readonly db:DatabaseSync,private readonly context:Context){}
 private choices(effect:InventoryReward){
  const {owner,runId,roster,profiles,known}=this.context;
  if(effect.kind==='vitamin')return roster.filter(species=>(this.db.prepare('SELECT COUNT(*) AS n FROM vitamin_purchases WHERE run_id=? AND species=?').get(runId,species) as {n:number}).n<VITAMIN_LIMIT).map(id=>({id,label:id}));
  if(effect.kind==='machine')return roster.filter(species=>trainingOptions(species,profiles[species]?.forme).learnableMoves.includes(effect.move)&&!known(species).includes(effect.move)).map(id=>({id,label:id}));
  if(effect.kind==='item-exchange'){
   const items=effect.items.filter(item=>!this.db.prepare('SELECT 1 FROM run_item_bag WHERE run_id=? AND item=? AND quantity>0').get(runId,item)&&!this.db.prepare('SELECT 1 FROM run_held_items WHERE run_id=? AND item=?').get(runId,item));
   return items.length?items.map(id=>({id,label:itemName(id)})):[{id:'owned-fallback',label:`모두 보유 · 타워 코인 ${effect.fallbackCoins.toLocaleString()}`}];
  }
  return [];
 }
 view():RewardInventoryView[]{
  return (this.db.prepare('SELECT * FROM run_reward_inventory WHERE run_id=? AND quantity>0 ORDER BY rowid').all(this.context.runId) as Row[]).map(row=>{
   const effect:InventoryReward=JSON.parse(row.effect_json);
   const label=effect.kind==='vitamin'?vitamins[effect.stat].name:effect.kind==='machine'?`기술머신 ${moveInfo[effect.move]?.name??effect.move}`:'에픽 지닌 도구 교환권';
   return {id:row.id,label,quantity:row.quantity,choices:this.choices(effect)};
  });
 }
 use(requestId:unknown,id:unknown,choice:unknown){
  if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId)||typeof id!=='string'||typeof choice!=='string')throw new BattleRequestError('보상 사용 요청이 올바르지 않습니다.',400);
  const {owner,runId,floor}=this.context,payload=JSON.stringify({id,choice});
  const old=this.db.prepare('SELECT payload FROM reward_use_receipts WHERE run_id=? AND request_id=?').get(runId,requestId) as {payload:string}|undefined;
  if(old){if(old.payload!==payload)throw new BattleRequestError('이미 다른 사용 요청으로 처리했습니다.',409);return;}
  const row=this.db.prepare('SELECT * FROM run_reward_inventory WHERE id=? AND run_id=? AND quantity>0').get(id,runId) as Row|undefined;
  if(!row)throw new BattleRequestError('보유한 보상을 선택하세요.',409);
  const effect:InventoryReward=JSON.parse(row.effect_json);
  if(!this.choices(effect).some(c=>c.id===choice))throw new BattleRequestError('사용할 수 있는 대상을 선택하세요.',409);
  if(effect.kind==='vitamin')applyVitamin(this.db,runId,floor,choice,effect.stat);
  else if(effect.kind==='machine')learnMachine(this.db,owner,choice,effect.move);
  else if(effect.kind==='item-exchange'){if(choice==='owned-fallback')grantCoins(this.db,owner,effect.fallbackCoins);else grantRunItem(this.db,runId,choice,1);}
  else throw new BattleRequestError('사용할 수 없는 보상입니다.',400);
  this.db.prepare('UPDATE run_reward_inventory SET quantity=quantity-1 WHERE id=? AND quantity>0').run(id);
  this.db.prepare('INSERT INTO reward_use_receipts VALUES (?,?,?)').run(runId,requestId,payload);
 }
}
