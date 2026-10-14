'use client';
import {isTrainerEquipment} from '../data/trainer-equipment';
import {selectedForm} from '../data/selectable-forms';
import {canEquipGimmick} from '../data/gimmicks';
import {useState} from 'react';
import {heldItems,heldItemKeys,isHeldItem,type HeldItem} from '../data/held-items';
import type {RunView} from './contracts';
import {pokemonName} from './catalog';
import {PokedexDialog} from './pokedex-dialog';
import {HeldItemLabel} from './held-item-label';
import {RunPartnerList} from './run-partner-list';

type Props={run:RunView;busy:boolean;submit:(body:Record<string,unknown>)=>Promise<void>;error?:string};
export function HeldItemManager({run,busy,submit,error,targetSpecies}:Props & {targetSpecies?:string}){
  const [open,setOpen]=useState(false),[target,setTarget]=useState<string|null>(null);
  const activeTarget=targetSpecies ?? target;
  const memberName=(name:string)=>pokemonName(run.partnerForms?.[name]??name);
  const fixedItem=activeTarget?selectedForm(activeTarget,run.partnerForms?.[activeTarget])?.requiredItem:undefined;
  const current=activeTarget ? run.heldItems?.[activeTarget] : null;
  const [transfer,setTransfer]=useState<{item:HeldItem;holder:string}|null>(null);
  const owned=heldItemKeys.filter(item=>!isTrainerEquipment(item)&&((run.itemBag?.[item] ?? 0)>0 || Object.values(run.heldItems ?? {}).includes(item)));
  async function equip(item:HeldItem|null,swapFrom?:string){await submit({type:'equip-item',runId:run.id,floor:run.floor,species:activeTarget,item,...(swapFrom?{swapFrom}:{})});setTransfer(null);}
  return <><button className="secondary-button" data-keyboard-tab-utility data-testid="held-item-manager" onClick={()=>{setTarget(null);setOpen(true);}}>지닌 도구 관리 · {Object.keys(run.heldItems ?? {}).length}마리 장착</button>
    {open && <PokedexDialog title="지닌 도구 관리" large className="maintenance-dialog" onClose={()=>target && !targetSpecies ? setTarget(null) : setOpen(false)} returnFocus="[data-testid=held-item-manager]">
      {activeTarget ? <div className="held-item-options"><p>{memberName(activeTarget)} · 현재 <HeldItemLabel item={current}/></p>
        {fixedItem && <p className="selection-note">이 모습의 전용 도구는 고정되어 있어 이동하거나 교환할 수 없어요.</p>}
        {owned.map(item=>{const holder=Object.entries(run.heldItems ?? {}).find(([name,held])=>held===item)?.[0],compatible=!fixedItem && (!holder || !selectedForm(holder,run.partnerForms?.[holder])?.requiredItem) && canEquipGimmick(activeTarget,item) && (!holder || !current || canEquipGimmick(holder,current));return <button key={item} data-bag-item={item} disabled={busy || holder===activeTarget || !compatible || (!holder && !(run.itemBag?.[item]))} onClick={()=>holder?setTransfer({item,holder}):void equip(item)}><strong><HeldItemLabel item={item}/>{(run.itemBag?.[item] ?? 0)>0 && <> · 가방 {run.itemBag![item]}개</>}</strong><small>{!compatible ? '두 포켓몬에게 맞는 도구만 교환할 수 있어요' : holder ? `${pokemonName(run.partnerForms?.[holder]??holder)} 장착 중 · 이동·교환` : heldItems[item].description}</small></button>;})}
        {!owned.length && <p className="selection-note">보유한 도구가 없습니다. 상점에서 도구를 구매하세요.</p>}
        <button disabled={busy || !current || !!fixedItem} onClick={()=>void equip(null)}>도구 해제 · 가방으로 돌려놓기</button>
        {!targetSpecies && <button onClick={()=>setTarget(null)}>포켓몬 선택으로 · X</button>}</div> : <RunPartnerList run={run} onChoose={setTarget} disabled={()=>busy}/>}
      {error && <p role="alert">{error}</p>}
    </PokedexDialog>}
    {transfer && activeTarget && <PokedexDialog title="도구 이동·교환 확인" onClose={()=>setTransfer(null)} returnFocus={`[data-bag-item="${transfer.item}"]`} initialFocus="[data-confirm-item-transfer]"><p>{memberName(transfer.holder)}이 <HeldItemLabel item={transfer.item}/>을 지니고 있습니다. {memberName(activeTarget)}에게 옮길까요?</p><p>{current?<>{memberName(activeTarget)}의 <HeldItemLabel item={current}/>은 {memberName(transfer.holder)}에게 옮겨 두 도구를 교환합니다.</>:<>{memberName(transfer.holder)}은 도구를 지니지 않게 됩니다.</>}</p><div className="recruit-dialog-actions" data-keyboard-horizontal role="group" aria-label="도구 이동·교환 선택"><button className="primary-button" data-confirm-item-transfer disabled={busy} onClick={()=>void equip(transfer.item,transfer.holder)}>예 · {current?'교환':'이동'}</button><button className="secondary-button" disabled={busy} onClick={()=>setTransfer(null)}>아니요</button></div>{error&&<p role="alert">{error}</p>}</PokedexDialog>}
  </>;
}
export function HeldItemShop({run,coins,busy,submit,error}:Props & {coins:number}){
  const [chosen,setChosen]=useState<HeldItem|null>(null);
  const compatible=(name:string,item:string)=>isTrainerEquipment(item)||!selectedForm(name,run.partnerForms?.[name])?.requiredItem && canEquipGimmick(name,item);
  const offers=(run.itemOffers ?? []).filter(isHeldItem).filter(item=>run.roster.some(name=>compatible(name,item)));
  return <><div className="shop-products held-item-products" data-keyboard-tab-products data-testid="held-item-products">{offers.map(item=>{
    const info=heldItems[item],purchased=run.itemPurchases?.includes(item),owned=(run.itemBag?.[item]??0)>0||!!run.trainerEquipment?.includes(item as 'Dynamax Band'|'Tera Orb'),holder=Object.entries(run.heldItems ?? {}).find(([,held])=>held===item)?.[0];
    return <div className="shop-product" key={item}><strong><HeldItemLabel item={item} colored/></strong><p>{info.description}</p><button className="secondary-button" data-held-item={item} disabled={busy || purchased || owned || !!holder || coins<info.price} onClick={()=>isTrainerEquipment(item)?void submit({type:'purchase-item',revision:run.shopRerolls?.items.count??0,runId:run.id,floor:run.floor,item,species:null}):setChosen(item)}>{holder ? `${pokemonName(run.partnerForms?.[holder]??holder)} 장착 중` : owned ? '보유 중' : purchased ? '구매 완료 ✓' : `${info.price}코인 · ${coins<info.price ? '자금 부족' : isTrainerEquipment(item)?'구매':'구매·장착'}`}</button></div>;
  })}{Array.from({length:Math.max(0,4-offers.length)},(_,slot)=><div className="shop-product shop-sold-out" key={`sold-out-${slot}`} aria-label="품절 슬롯"><strong>품절</strong><p>추첨된 등급의 구매 가능한 도구가 없습니다.</p><small>보유·장착 중인 도구와 사용할 수 없는 기믹 도구는 제외됩니다.</small></div>)}</div>
    {chosen && <PokedexDialog title={`${heldItems[chosen].name} 구매·장착`} large className="maintenance-dialog" onClose={()=>setChosen(null)} returnFocus={`[data-held-item="${chosen}"]`}>
      <p><HeldItemLabel item={chosen}/></p><p>{heldItems[chosen].description}</p><p>보유 {coins.toLocaleString()}코인 · 가격 {heldItems[chosen].price}코인</p><p>교체되는 도구는 가방으로 돌아갑니다.</p>
      <RunPartnerList run={run} disabled={name=>busy || !compatible(name,chosen) || coins<heldItems[chosen].price || !!run.itemPurchases?.includes(chosen) || run.heldItems?.[name]===chosen} onChoose={species=>void submit({type:'purchase-item',revision:run.shopRerolls?.items.count??0,runId:run.id,floor:run.floor,item:chosen,species})} detail={name=>!compatible(name,chosen)?'이 포켓몬은 사용할 수 없어요':'구매·장착'}/>
      <div className="held-item-options"><button data-keyboard-list-next data-testid="purchase-item-bag" disabled={busy || coins<heldItems[chosen].price || run.itemPurchases?.includes(chosen) || (run.itemBag?.[chosen]??0)>0 || Object.values(run.heldItems??{}).includes(chosen)} onClick={()=>void submit({type:'purchase-item',revision:run.shopRerolls?.items.count??0,runId:run.id,floor:run.floor,item:chosen,species:null})}><strong>구매해서 가방에 넣기</strong><small>나중에 지닌 도구 관리에서 장착</small></button></div>
      {run.itemPurchases?.includes(chosen) && <p role="status">구매 완료!</p>}{error && <p role="alert">{error}</p>}
      <button className="secondary-button" onClick={()=>setChosen(null)}>돌아가기 · X</button>
    </PokedexDialog>}
  </>;
}
