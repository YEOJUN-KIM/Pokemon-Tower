'use client';
import {useEffect,useState} from 'react';
import {zCrystals} from '../data/z-crystals';
import {ItemAcquisitionDialog} from './item-acquisition-dialog';
import {heldItems,isHeldItem,type HeldItem} from '../data/held-items';
import {isTrainerEquipment} from '../data/trainer-equipment';
import {canEquipGimmick} from '../data/gimmicks';
import {selectedForm} from '../data/selectable-forms';
import type {RunView} from './contracts';
import {pokemonName} from './catalog';
import {HeldItemLabel} from './held-item-label';
import {BagButton} from './bag';
type Props={run:RunView;busy:boolean;submit:(body:Record<string,unknown>)=>Promise<void>;error?:string};
export function HeldItemManager(props:Props&{targetSpecies?:string}){return <BagButton {...props}/>;}
export function HeldItemShop({run,coins,busy,submit,error}:Props & {coins:number}){
  const [chosen,setChosen]=useState<HeldItem|null>(null);
  useEffect(()=>{if(chosen&&run.itemPurchases?.includes(chosen))setChosen(null);},[chosen,run.itemPurchases?.join(',')]);
  const compatible=(name:string,item:string)=>isTrainerEquipment(item)||!selectedForm(name,run.partnerForms?.[name])?.requiredItem && canEquipGimmick(name,item);
  const offers=(run.itemOffers ?? []).filter(isHeldItem).filter(item=>run.roster.some(name=>compatible(name,item)));
  return <><div className="shop-products held-item-products" data-keyboard-tab-products data-testid="held-item-products">{offers.map(item=>{
    const info=heldItems[item],purchased=run.itemPurchases?.includes(item),owned=(run.itemBag?.[item]??0)>0||!!run.trainerEquipment?.includes(item as 'Dynamax Band'|'Tera Orb'),holder=Object.entries(run.heldItems ?? {}).find(([,held])=>held===item)?.[0];
    return <div className="shop-product" key={item}><strong><HeldItemLabel item={item} colored/></strong><p>{info.description}</p><button className="secondary-button" data-held-item={item} disabled={busy || purchased || owned || !!holder || coins<info.price} onClick={()=>isTrainerEquipment(item)||zCrystals[item]?void submit({type:'purchase-item',revision:run.shopRerolls?.items.count??0,runId:run.id,floor:run.floor,item,species:null}):setChosen(item)}>{holder ? `${pokemonName(run.partnerForms?.[holder]??holder)} 장착 중` : owned ? '보유 중' : purchased ? '구매 완료 ✓' : `${info.price}코인 · ${coins<info.price ? '자금 부족' : isTrainerEquipment(item)?'구매':'구매·장착'}`}</button></div>;
  })}{Array.from({length:Math.max(0,4-offers.length)},(_,slot)=><div className="shop-product shop-sold-out" key={`sold-out-${slot}`} aria-label="품절 슬롯"><strong>품절</strong><p>추첨된 등급의 구매 가능한 도구가 없습니다.</p><small>보유·장착 중인 도구와 사용할 수 없는 기믹 도구는 제외됩니다.</small></div>)}</div>
    {chosen && <ItemAcquisitionDialog run={run} name={heldItems[chosen].name} item={chosen} busy={busy} error={error} onClose={()=>setChosen(null)} onAcquire={async(destination,species)=>{await submit({type:'purchase-item',revision:run.shopRerolls?.items.count??0,runId:run.id,floor:run.floor,item:chosen,species:destination==='use'?species:null});}}/>}
  </>;
}
