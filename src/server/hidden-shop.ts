import type {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {hiddenShopEventSettings as settings,hiddenShopProductPool as pool,hiddenShopProductOverrides,type HiddenShopCategory,type HiddenShopProduct,type HiddenShopSnapshot,type HiddenShopView} from '../data/hidden-shop';
import {epicRewardItems,eligibleRewardMachines,weightedRewardId} from './challenger-rewards';
import {vitamins} from '../data/shop';
import {statKeys} from '../data/training';
import {heldItems,itemName,itemIcon} from '../data/held-items';
import {moveInfo} from '../data/move-info';
import {trainerEquipmentKeys} from '../data/trainer-equipment';
import {allowsRuleItem,type BattleRule} from '../data/run-rules';
import {spendCoins} from './player-wallet';
import {grantRunItem} from './inventory-grants';
import {ownsRunItem,ownsMachine} from './run-ownership';
import {applyRewardOption} from './rewards';
import {BattleRequestError} from './request-error';

export function hiddenShopProducts(db:DatabaseSync,runId:string):HiddenShopProduct[]{
 const rule=(db.prepare('SELECT rule FROM run_rules WHERE run_id=?').get(runId) as {rule:BattleRule}).rule;
 const products:HiddenShopProduct[]=[];
 const add=(category:HiddenShopCategory,id:string,name:string,icon:string,description:string,effect:HiddenShopProduct['effect'])=>{
  const image=category==='machine'?'':category==='egg-tickets'?'/sprites/eggs/normal.png':category==='super-rare-ticket'?'/sprites/eggs/super-rare.png':`/sprites/items/${icon}.png`;
  for(const quantity of pool[category].quantities){
   const productId=category==='egg-tickets'?`${id}-${quantity}`:id,override=hiddenShopProductOverrides[productId];
   products.push({id:productId,name,category,quantity,icon:image,description,allowedCurrencies:override?.allowedCurrencies??pool[category].allowedCurrencies,prices:override?.prices??pool[category].prices,effect:{...effect,...('amount' in effect?{amount:quantity}:{})}});
  }
 };
 for(const stat of statKeys)add('vitamin',`vitamin-${stat}`,vitamins[stat].name,vitamins[stat].icon,'배낭에 보관 · 포켓몬당 영양제 총 3개 제한',{kind:'vitamin',stat,amount:1});
 for(const item of epicRewardItems.filter(item=>allowsRuleItem(rule,item)&&!ownsRunItem(db,runId,item)))add('held-item',`item-${item}`,itemName(item),itemIcon(item),heldItems[item].description,{kind:'item-exchange',items:[item],amount:1,fallbackCoins:0});
 for(const move of eligibleRewardMachines(db,runId))add('machine',`machine-${move}`,`기술머신 ${moveInfo[move]?.name??move}`,'tm-normal','배낭에 등록 · 이번 Run 동안 반복 사용 가능',{kind:'machine',move,amount:1});
 add('egg-tickets','egg-ticket','알 티켓','lucky-egg','영구 상점의 일반 알 뽑기에서 사용',{kind:'egg-ticket',amount:1});
 add('super-rare-ticket','super-rare-ticket','슈퍼레어 알 티켓','lucky-egg','영구 상점의 보상 알 티켓으로 부화',{kind:'typed-egg-ticket',eggKind:'superRare',amount:1});
 for(const item of trainerEquipmentKeys.filter(item=>allowsRuleItem(rule,item)&&!db.prepare('SELECT 1 FROM run_trainer_equipment WHERE run_id=? AND item=?').get(runId,item)))add('equipment',`equipment-${item}`,itemName(item),itemIcon(item),'이번 도전의 트레이너 장비 · 지닌 도구와 별개',{kind:'trainer-equipment',item,amount:1,fallbackPoints:0});
 return products;
}

export function snapshotHiddenShop(products:readonly HiddenShopProduct[],random:()=>number):HiddenShopSnapshot{
 const remaining=[...products],offers:HiddenShopSnapshot['offers']=[],counts:Partial<Record<HiddenShopCategory,number>>={};
 const count=settings.minItems+Math.floor(random()*(settings.maxItems-settings.minItems+1));
 while(offers.length<count&&remaining.length){
  const groups=(Object.keys(pool) as HiddenShopCategory[]).filter(id=>remaining.some(p=>p.category===id)&&pool[id].weight>0).map(id=>({id,weight:pool[id].weight*settings.duplicateCategoryPenalty**(counts[id]??0)}));
  if(!groups.length)break;
  const category=weightedRewardId(groups,random),candidates=remaining.filter(p=>p.category===category),product=candidates[Math.floor(random()*candidates.length)];
  remaining.splice(remaining.indexOf(product),1);counts[category]=(counts[category]??0)+1;
  const currency=product.allowedCurrencies[Math.floor(random()*product.allowedCurrencies.length)];
  const [min,max]=product.prices[currency];
  const {allowedCurrencies:_,prices:__,...display}=product;
  offers.push({...display,currency,price:min+Math.floor(random()*(max-min+1)),purchased:false});
 }
 return {version:1,purchaseLimit:settings.purchaseLimit,offers};
}

// The enclosing TowerStore operation owns BEGIN IMMEDIATE and commit/rollback.
export class HiddenShop{
 constructor(private readonly db:DatabaseSync){}
 create(eventId:string,runId:string){
  // Isolated from the shared encounter/battle random stream; immutable once saved.
  let counter=0;
  const random=()=>createHash('sha256').update(`${eventId}:hidden-shop:${counter++}`).digest().readUInt32BE(0)/0x100000000;
  const snapshot=snapshotHiddenShop(hiddenShopProducts(this.db,runId),random);
  this.db.prepare('INSERT INTO hidden_shop_events(event_id,snapshot_json) VALUES (?,?)').run(eventId,JSON.stringify(snapshot));
 }
 snapshot(eventId:string):HiddenShopSnapshot{
  const row=this.db.prepare('SELECT snapshot_json FROM hidden_shop_events WHERE event_id=?').get(eventId) as {snapshot_json:string}|undefined;
  if(!row)throw new BattleRequestError('저장된 히든상점을 찾을 수 없습니다.',409);
  return JSON.parse(row.snapshot_json);
 }
 view(eventId:string):HiddenShopView{
  const snapshot=this.snapshot(eventId);
  return {purchaseLimit:snapshot.purchaseLimit,purchasedCount:snapshot.offers.filter(p=>p.purchased).length,offers:snapshot.offers.map(({effect:_,...offer})=>offer)};
 }
 purchase(owner:string,runId:string,eventId:string,productId:unknown){
  const snapshot=this.snapshot(eventId),offer=snapshot.offers.find(p=>p.id===productId);
  if(!offer)throw new BattleRequestError('진열된 상품을 선택하세요.',400);
  // (eventId, productId) is the durable receipt. Replays acknowledge the same
  // purchase, including after the second purchase, without paying/granting again.
  if(offer.purchased)return;
  if(snapshot.offers.filter(p=>p.purchased).length>=snapshot.purchaseLimit)throw new BattleRequestError('구매 한도를 모두 사용했습니다.',409);
  const effect=offer.effect;
  if(effect.kind==='machine'&&ownsMachine(this.db,runId,effect.move))throw new BattleRequestError('이미 배낭에 보유한 기술머신입니다.',409);
  if(effect.kind==='trainer-equipment'&&this.db.prepare('SELECT 1 FROM run_trainer_equipment WHERE run_id=? AND item=?').get(runId,effect.item))throw new BattleRequestError('이미 보유한 트레이너 장비입니다.',409);
  if(effect.kind==='item-exchange'&&ownsRunItem(this.db,runId,effect.items[0]))throw new BattleRequestError('이미 보유한 지닌 도구입니다.',409);
  const paid=offer.currency==='coins'?spendCoins(this.db,owner,offer.price):!!this.db.prepare('UPDATE players SET growth_points=growth_points-? WHERE id=? AND growth_points>=?').run(offer.price,owner,offer.price).changes;
  if(!paid)throw new BattleRequestError(`${offer.currency==='coins'?'타워 코인':'성장 포인트'}가 부족합니다.`,409);
  if(effect.kind==='item-exchange')grantRunItem(this.db,runId,effect.items[0],effect.amount);
  else applyRewardOption(this.db,owner,{id:offer.id,title:offer.name,tone:'good',entries:[effect]},runId);
  offer.purchased=true;
  this.db.prepare('UPDATE hidden_shop_events SET snapshot_json=? WHERE event_id=?').run(JSON.stringify(snapshot),eventId);
 }
}
