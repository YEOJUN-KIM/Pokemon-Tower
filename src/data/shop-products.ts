import {heldItems,heldItemKeys,isHeldItem,type HeldItem} from './held-items';
import {formItems} from './form-items';
import {itemShopRule,itemRarityWeights,gimmickItemFamily,type ItemRarity} from './held-item-shop';
export type ShopChoiceGroup={id:string;name:string;description:string;category:'special-form';rarity:ItemRarity;price:number;options:readonly HeldItem[]};
const choice=(id:string,name:string,options:HeldItem[],price:number):ShopChoiceGroup=>({id,name,options,price,category:'special-form',rarity:'legendary',description:'구매 시 보유하지 않은 실제 아이템 하나를 선택합니다. 선택을 확정할 때 결제합니다.'});
export const shopChoiceGroups:Record<string,ShopChoiceGroup>={
 'choice:ogerpon':choice('choice:ogerpon','오거폰 가면 선택',['Wellspring Mask','Hearthflame Mask','Cornerstone Mask'],5000),
 'choice:arceus':choice('choice:arceus','아르세우스 플레이트 선택',Object.keys(formItems).filter(i=>i.endsWith(' Plate')),3000),
 'choice:silvally':choice('choice:silvally','실버디 메모리 선택',Object.keys(formItems).filter(i=>i.endsWith(' Memory')),3000),
 'choice:genesect':choice('choice:genesect','게노세크트 카세트 선택',['Burn Drive','Chill Drive','Douse Drive','Shock Drive'],3000),
 'choice:charizard':choice('choice:charizard','리자몽나이트 선택',['Charizardite X','Charizardite Y'],heldItems['Charizardite X'].price),
 'choice:mewtwo':choice('choice:mewtwo','뮤츠나이트 선택',['Mewtwonite X','Mewtwonite Y'],heldItems['Mewtwonite X'].price),
};
export function isShopChoice(value:unknown):value is string{return typeof value==='string'&&Object.hasOwn(shopChoiceGroups,value);}
export function choiceForItem(item:string){return Object.values(shopChoiceGroups).find(g=>g.options.includes(item));}
export function shopProductOptions(id:string):readonly HeldItem[]{return shopChoiceGroups[id]?.options??(isHeldItem(id)?[id]:[]);}
export function shopProductInfo(id:string){const group=shopChoiceGroups[id];return group??(isHeldItem(id)?{...heldItems[id],id,options:[id],...itemShopRule(id)}:undefined);}
export function canonicalShopProduct(id:string){return choiceForItem(id)?.id??id;}
export const shopProductKeys=[...heldItemKeys.filter(i=>!choiceForItem(i)),...Object.keys(shopChoiceGroups)];
export function shopProductEligible(id:string,eligible:(item:HeldItem)=>boolean){return shopProductOptions(id).some(eligible);}
// Shares the existing rarity/family distribution, but each choice group has one ticket.
export function rollShopProducts(floor:number,random:()=>number,eligible:(item:HeldItem)=>boolean,existing:readonly string[]=[]):string[]{
 const result=[...new Set(existing.map(canonicalShopProduct))].slice(0,4);
 const remaining=shopProductKeys.filter(id=>!result.includes(id)&&shopProductOptions(id).some(item=>itemShopRule(item).minClearedFloor<=floor&&eligible(item))),weights=itemRarityWeights(floor);
 const rarity=(id:string)=>shopChoiceGroups[id]?.rarity??itemShopRule(id).rarity;
 const family=(id:string)=>gimmickItemFamily(shopProductOptions(id)[0]);
 while(result.length<4&&remaining.length){
  const groups=(Object.entries(weights) as [ItemRarity,number][]).filter(([r])=>remaining.some(id=>rarity(id)===r));
  let pick=random()*groups.reduce((n,[,w])=>n+w,0),chosen=groups.at(-1)![0];for(const [r,w] of groups){pick-=w;if(pick<0){chosen=r;break;}}
  let candidates=remaining.filter(id=>rarity(id)===chosen);
  if(chosen==='legendary'){const families=[...new Set(candidates.map(family))],f=families[Math.floor(random()*families.length)];candidates=candidates.filter(id=>family(id)===f);}
  const id=candidates[Math.floor(random()*candidates.length)];result.push(id);remaining.splice(remaining.indexOf(id),1);
 }
 return result;
}
