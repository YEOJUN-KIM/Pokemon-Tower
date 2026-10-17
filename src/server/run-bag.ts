import type {DatabaseSync} from 'node:sqlite';
import type {BagEntry,BagView} from '../data/bag';
import type {TrainingProfile} from '../data/training';
import type {MachinePartner} from '../shared/contracts';
import {heldItems,isHeldItem,itemName,itemIcon,itemIconExtension} from '../data/held-items';
import {zCrystals} from '../data/z-crystals';
import {allowsGimmick} from '../data/run-rules';
import type {BattleRule} from '../data/run-rules';
import {canEquipGimmick} from '../data/gimmicks';
import {selectedForm} from '../data/selectable-forms';
import {vitamins,upgrades,VITAMIN_LIMIT} from '../data/shop';
import {moveInfo} from '../data/move-info';
import {trainingOptions,validateProfile,defaultProfile} from './training';
import {vitaminDisabledReason} from '../shared/vitamin-eligibility';
import {readVitaminUsage,applyVitamin,grantRunItem} from './inventory-grants';
import {ownsRunItem} from './run-ownership';
import {BattleRequestError} from './request-error';
import type {InventoryReward} from '../data/rewards';
import {grantCoins} from './player-wallet';

type Context={runId:string;roster:string[];profiles:Record<string,TrainingProfile>;held:Record<string,string>;rule:BattleRule;partners:Record<string,MachinePartner>};
export class RunBag{
 constructor(private db:DatabaseSync,private context:Context){}
 view():BagView{
  const {runId,roster,profiles,held,rule,partners}=this.context,entries:BagEntry[]=[];
  const floor=(this.db.prepare('SELECT floor FROM runs WHERE id=?').get(runId) as {floor:number}).floor,vitaminUsage=readVitaminUsage(this.db,runId,floor);
  const canHold=(species:string,item:string)=>!selectedForm(species,profiles[species]?.forme)?.requiredItem&&canEquipGimmick(species,item);
  const owned=new Set([...(this.db.prepare('SELECT item FROM run_item_bag WHERE run_id=? AND quantity>0').all(runId) as {item:string}[]).map(r=>r.item),...Object.values(held)]);
  for(const item of owned){if(!isHeldItem(item)){entries.push({id:`held:${item}`,item,pocket:'tools',name:itemName(item),description:'이 모습에 고정된 전용 도구입니다.',icon:'',holder:Object.entries(held).find(([,value])=>value===item)?.[0],action:'view',targets:[]});continue;}entries.push({id:`held:${item}`,item,pocket:zCrystals[item]?'z':'tools',name:itemName(item),description:heldItems[item].description,icon:`/sprites/items/${itemIcon(item)}.${itemIconExtension(item)}`,holder:Object.entries(held).find(([,value])=>value===item)?.[0],action:'equip',targets:roster.filter(s=>canHold(s,item))});}
  for(const row of this.db.prepare('SELECT id,effect_json,quantity FROM run_reward_inventory WHERE run_id=? AND quantity>0 ORDER BY rowid').all(runId) as {id:string;effect_json:string;quantity:number}[]){
   const effect:InventoryReward=JSON.parse(row.effect_json);
   if(effect.kind==='vitamin'&&entries.some(e=>e.pocket==='consumables'&&e.name===vitamins[effect.stat].name)){entries.find(e=>e.pocket==='consumables'&&e.name===vitamins[effect.stat].name)!.quantity!+=row.quantity;continue;}
   if(effect.kind==='vitamin')entries.push({id:row.id,pocket:'consumables',name:vitamins[effect.stat].name,description:`${vitamins[effect.stat].name} · 포켓몬당 영양제 총 ${VITAMIN_LIMIT}개 제한`,icon:`/sprites/items/${vitamins[effect.stat].icon}.png`,quantity:row.quantity,action:'vitamin',targets:roster.filter(s=>!vitaminDisabledReason(vitaminUsage,s,vitamins[effect.stat].name))});
   else if(effect.kind==='machine')entries.push({id:row.id,pocket:'machines',move:effect.move,name:moveInfo[effect.move]?.name??effect.move,description:moveInfo[effect.move]?.description??'현재 Run 동안 반복해서 가르칠 수 있는 기술머신입니다.',icon:'/sprites/items/tm-normal.png',action:'machine',targets:roster.filter(s=>trainingOptions(s,profiles[s]?.forme).learnableMoves.includes(effect.move)&&!profiles[s]?.moves.includes(effect.move))});
   else if(effect.kind==='item-exchange')entries.push({id:row.id,pocket:'tools',name:effect.items.length===1?itemName(effect.items[0]):'에픽 지닌 도구 교환권',description:'미보유 도구를 선택해 배낭에 등록합니다.',icon:'/sprites/items/life-orb.png',action:'exchange',targets:effect.items.filter(item=>!ownsRunItem(this.db,runId,item,row.id))});
  }
  for(const row of this.db.prepare('SELECT kind,quantity FROM run_battle_items WHERE run_id=? AND quantity>0').all(runId) as {kind:keyof typeof upgrades;quantity:number}[]){const info=upgrades[row.kind];entries.push({id:`battle:${row.kind}`,pocket:'battle',name:info.name,description:`${info.description} · 전투 중 사용할 수 있습니다.`,icon:`/sprites/items/${info.icon}.png`,quantity:row.quantity,action:'view',targets:[]});}
  for(const row of this.db.prepare('SELECT item FROM run_trainer_equipment WHERE run_id=?').all(runId) as {item:string}[])entries.push({id:`important:${row.item}`,pocket:'important',name:itemName(row.item),description:isHeldItem(row.item)?heldItems[row.item].description:'트레이너 장비',icon:`/sprites/items/${row.item.toLowerCase().replaceAll(' ','-')}.png`,action:'view',targets:[]});
  return {entries,pockets:['tools','consumables','machines','battle','important',...(allowsGimmick(rule,'zmove')?['z' as const]:[])],partners,currentMoves:Object.fromEntries(roster.map(s=>[s,profiles[s]?.moves??defaultProfile(s).moves]))};
 }
 use(requestId:unknown,id:unknown,target:unknown,slot:unknown,equip:(species:string,item:string|null)=>void){
  const {runId,roster,profiles,held}=this.context;
  if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId)||typeof id!=='string')throw new BattleRequestError('배낭 사용 요청이 올바르지 않습니다.',400);
  const payload=JSON.stringify({bag:id,target:target??null,slot:slot??null}),old=this.db.prepare('SELECT payload FROM reward_use_receipts WHERE run_id=? AND request_id=?').get(runId,requestId) as {payload:string}|undefined;
  if(old){if(old.payload!==payload)throw new BattleRequestError('다른 동작으로 처리된 요청입니다.',409);return;}
  const entry=this.view().entries.find(e=>e.id===id);if(!entry)throw new BattleRequestError('배낭에 없는 아이템입니다.',409);
  if(entry.action==='equip'){
   if(target===null){if(entry.holder)equip(entry.holder,null);}else{
    if(typeof target!=='string'||!entry.targets.includes(target))throw new BattleRequestError('장착할 수 없는 포켓몬입니다.',400);
    const holder=Object.entries(held).find(([,item])=>item===entry.item)?.[0];if(holder&&holder!==target)equip(holder,null);equip(target,entry.item!);
   }
  }else if(entry.action==='vitamin'||entry.action==='machine'){
   if(typeof target!=='string'||!roster.includes(target)||!entry.targets.includes(target))throw new BattleRequestError('사용할 수 없는 포켓몬입니다.',409);
   if(entry.action==='vitamin'){
    const row=this.db.prepare('SELECT effect_json FROM run_reward_inventory WHERE id=? AND run_id=?').get(id,runId) as {effect_json:string};const effect=JSON.parse(row.effect_json);
    const floor=(this.db.prepare('SELECT floor FROM runs WHERE id=?').get(runId) as {floor:number}).floor;applyVitamin(this.db,runId,floor,target,effect.stat);this.db.prepare('UPDATE run_reward_inventory SET quantity=quantity-1 WHERE id=?').run(id);
   }else{
    const profile=structuredClone(profiles[target]??defaultProfile(target));if(!Number.isInteger(slot)||(slot as number)<0||(slot as number)>Math.min(profile.moves.length,3))throw new BattleRequestError('잊을 기술을 선택하세요.',400);
    profile.moves[slot as number]=entry.move!;profiles[target]=validateProfile(target,profile);this.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),runId);
   }
  }else if(entry.action==='exchange'){
   const row=this.db.prepare('SELECT effect_json FROM run_reward_inventory WHERE id=?').get(id) as {effect_json:string},effect=JSON.parse(row.effect_json);
   const available=effect.items.filter((item:string)=>!ownsRunItem(this.db,runId,item,id));
   if(typeof target!=='string'||!available.includes(target)){if(target==='owned-fallback'&&!available.length){const owner=(this.db.prepare('SELECT player_id FROM runs WHERE id=?').get(runId) as {player_id:string}).player_id;grantCoins(this.db,owner,effect.fallbackCoins);}else throw new BattleRequestError('교환할 도구를 선택하세요.',409);}else grantRunItem(this.db,runId,target,1);
   this.db.prepare('UPDATE run_reward_inventory SET quantity=quantity-1 WHERE id=?').run(id);
  }else throw new BattleRequestError('이 아이템은 여기서 사용할 수 없습니다.',409);
  this.db.prepare('INSERT INTO reward_use_receipts VALUES (?,?,?)').run(runId,requestId,payload);
 }
}
