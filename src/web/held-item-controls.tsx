'use client';
import {useEffect,useState} from 'react';
import {zCrystals} from '../data/z-crystals';
import {ItemAcquisitionDialog} from './item-acquisition-dialog';
import {heldItems,type HeldItem} from '../data/held-items';
import {isTrainerEquipment} from '../data/trainer-equipment';
import {canEquipGimmick} from '../data/gimmicks';
import {hasFixedFormItem} from '../data/form-items';
import {selectedForm} from '../data/selectable-forms';
import {canonicalShopProduct,isShopChoice,shopProductInfo,shopProductOptions,shopChoiceGroups} from '../data/shop-products';
import {itemCategory} from '../data/held-item-shop';
import type {RunView} from './contracts';
import {pokemonName} from './catalog';
import {HeldItemLabel} from './held-item-label';
import {PokedexDialog} from './pokedex-dialog';
import {BagButton} from './bag';
type Props={run:RunView;busy:boolean;submit:(body:Record<string,unknown>)=>Promise<void>;error?:string};
export function HeldItemManager(props:Props&{targetSpecies?:string}){return <BagButton {...props}/>;}
export function HeldItemShop({run,coins,busy,submit,error}:Props&{coins:number}){
 const [chosen,setChosen]=useState<string|null>(null),purchased=(run.itemPurchases??[]).map(canonicalShopProduct);
 useEffect(()=>{if(chosen&&purchased.includes(chosen))setChosen(null);},[chosen,purchased.join(',')]);
 const owned=(item:string)=>(run.itemBag?.[item]??0)>0||Object.values(run.heldItems??{}).includes(item)||!!run.trainerEquipment?.some(i=>i===item);
 const compatible=(name:string,item:string)=>isTrainerEquipment(item)||!hasFixedFormItem(name,selectedForm(name,run.partnerForms?.[name])?.requiredItem)&&canEquipGimmick(name,item,run.partnerForms?.[name]);
 const offers=[...new Set((run.itemOffers??[]).map(canonicalShopProduct))].filter(id=>shopProductInfo(id)&&shopProductOptions(id).some(item=>run.roster.some(name=>compatible(name,item))));
 const purchase=(product:string,item:string,species:string|null=null)=>submit({type:'purchase-item',revision:run.shopRerolls?.items.count??0,runId:run.id,floor:run.floor,product,item,species});
 return <><div className="shop-products held-item-products compact-shop-products" data-keyboard-tab-products data-testid="held-item-products">{offers.map(id=>{
  const info=shopProductInfo(id)!,choice=isShopChoice(id),options=shopProductOptions(id),count=options.filter(owned).length,done=purchased.includes(id),holder=!choice?Object.entries(run.heldItems??{}).find(([,v])=>v===id)?.[0]:undefined;
  return <div className="shop-product" key={id} data-item-category={choice?'special-form':itemCategory(id)}><strong className="shop-product-title">{choice?info.name:<HeldItemLabel item={id} colored/>}</strong><span className="shop-product-meta">{choice?'특수 폼 도구 · 선택형 상품':itemCategory(id)==='special-form'?'특수 폼 도구':isTrainerEquipment(id)?'트레이너 장비':zCrystals[id]?'Z크리스탈':'지닌 도구'}</span><p className="shop-product-description">{info.description}</p><small className="shop-product-status">{choice?`보유 ${count} / ${options.length}${done?' · 구매 완료':''}`:holder?`${pokemonName(run.partnerForms?.[holder]??holder)} 장착 중`:count?'보유 중':done?'구매 완료':coins<info.price?'자금 부족':''}</small><button className="secondary-button" data-held-item={id} aria-label={`${info.name} · ${info.price}코인`} disabled={busy||done||count===options.length||coins<info.price} onClick={()=>choice?setChosen(id):isTrainerEquipment(id)||zCrystals[id]?void purchase(id,id):setChosen(id)}>{info.price}코인</button></div>;
 })}{Array.from({length:Math.max(0,4-offers.length)},(_,slot)=><div className="shop-product shop-sold-out" key={slot} aria-label="품절 슬롯"><strong>품절</strong><p>구매 가능한 도구가 없습니다.</p></div>)}</div>
 {chosen&&isShopChoice(chosen)?<PokedexDialog title={shopChoiceGroups[chosen].name} large onClose={()=>{if(!busy)setChosen(null);}}><p>실제 아이템 하나를 선택해 배낭에 넣습니다. 선택 확정 시 {shopChoiceGroups[chosen].price}코인을 지불합니다.</p><div className="held-item-options" data-testid="shop-choice-options" data-keyboard-list>{shopChoiceGroups[chosen].options.map(item=><button key={item} data-choice-item={item} disabled={busy||owned(item)||coins<shopChoiceGroups[chosen].price||!run.roster.some(name=>compatible(name,item))} onClick={()=>void purchase(chosen,item)}><HeldItemLabel item={item}/><small>{owned(item)?'보유 중':heldItems[item].description}</small></button>)}</div>{error&&<p role="alert">{error}</p>}<button className="secondary-button" data-target-cancel disabled={busy} onClick={()=>setChosen(null)}>취소</button></PokedexDialog>:chosen&&<ItemAcquisitionDialog run={run} name={heldItems[chosen].name} item={chosen as HeldItem} busy={busy} error={error} onClose={()=>setChosen(null)} onAcquire={async(destination,species)=>purchase(chosen,chosen,destination==='use'?species??null:null)}/>}
 </>;
}
