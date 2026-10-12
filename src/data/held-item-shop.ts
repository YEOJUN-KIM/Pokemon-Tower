import {zCrystals} from './z-crystals';
import megaItems from './mega-items.json' with {type:'json'};
import {heldItemKeys,type HeldItem} from './held-items';

export type ItemRarity='uncommon'|'rare'|'unique'|'epic'|'legendary';
export const rarityColors:Record<ItemRarity,string>={uncommon:'#f7f7ff',rare:'#79b9ff',unique:'#ffdc76',epic:'#ff8282',legendary:'#d4a1ff'};
const rare=new Set<HeldItem>(['Sitrus Berry','Leftovers','Muscle Band','Wise Glasses','Wide Lens','Scope Lens']);
const unique=new Set<HeldItem>(['Expert Belt','Rocky Helmet','Heavy-Duty Boots','Light Clay']);
const epic=new Set<HeldItem>(['Choice Band','Choice Specs','Choice Scarf','Focus Sash','Assault Vest','Eviolite','Life Orb']);
const legendary=new Set<HeldItem>();
export function itemShopRule(item:HeldItem):{rarity:ItemRarity;minClearedFloor:number}{
  if(zCrystals[item])return {rarity:'legendary',minClearedFloor:5};
  if(legendary.has(item) || Object.hasOwn(megaItems,item) || item==='Dynamax Band')return {rarity:'legendary',minClearedFloor:5};
  if(epic.has(item))return {rarity:'epic',minClearedFloor:5};
  if(unique.has(item))return {rarity:'unique',minClearedFloor:5};
  if(rare.has(item))return {rarity:'rare',minClearedFloor:5};
  return {rarity:'uncommon',minClearedFloor:5};
}
export function itemRarityWeights(clearedFloor:number):Record<ItemRarity,number>{
  if(clearedFloor>=30)return {uncommon:25,rare:35,unique:28,epic:10,legendary:2};
  if(clearedFloor>=25)return {uncommon:35,rare:35,unique:23,epic:6,legendary:1};
  if(clearedFloor>=20)return {uncommon:45,rare:32,unique:19,epic:3.5,legendary:0.5};
  if(clearedFloor>=15)return {uncommon:60,rare:28,unique:10,epic:1.8,legendary:0.2};
  if(clearedFloor>=10)return {uncommon:74,rare:20,unique:5,epic:0.9,legendary:0.1};
  return {uncommon:85,rare:13,unique:1.7,epic:0.29,legendary:0.01};
}
// Sold-out tiers are excluded; keep the relative weights of the stocked tiers.
// Existing stock is retained when filling a previously saved short shop.
export function rollItemOffers(clearedFloor:number,random:()=>number=Math.random,eligible:(item:HeldItem)=>boolean=()=>true,existing:readonly HeldItem[]=[]):HeldItem[]{
  const result=[...new Set(existing)].slice(0,4),remaining=heldItemKeys.filter(item=>!result.includes(item) && itemShopRule(item).minClearedFloor<=clearedFloor && eligible(item)),weights=itemRarityWeights(clearedFloor);
  while(result.length<4 && remaining.length){
    const groups=(Object.entries(weights) as [ItemRarity,number][]).filter(([rarity])=>remaining.some(item=>itemShopRule(item).rarity===rarity));
    let pick=random()*groups.reduce((sum,[,weight])=>sum+weight,0),rarity=groups.at(-1)![0];
    for(const [candidate,weight] of groups){pick-=weight;if(pick<0){rarity=candidate;break;}}
    const candidates=remaining.filter(item=>itemShopRule(item).rarity===rarity);
    const item=candidates[Math.floor(random()*candidates.length)];result.push(item);remaining.splice(remaining.indexOf(item),1);
  }
  return result;
}
