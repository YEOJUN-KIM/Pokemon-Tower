'use client';
import {canEquipGimmick} from '../data/gimmicks';
import {useState} from 'react';
import {heldItems,heldItemKeys,isHeldItem,type HeldItem} from '../data/held-items';
import type {RunView} from './contracts';
import {pokemonName} from './catalog';
import {PokedexDialog} from './pokedex-dialog';
import {HeldItemLabel} from './held-item-label';
import {RunPartnerList} from './run-partner-list';

type Props={run:RunView;busy:boolean;submit:(body:Record<string,unknown>)=>Promise<void>;error?:string};
export function HeldItemManager({run,busy,submit,error}:Props){
  const [open,setOpen]=useState(false),[target,setTarget]=useState<string|null>(null);
  const current=target ? run.heldItems?.[target] : null;
  const owned=heldItemKeys.filter(item=>(run.itemBag?.[item] ?? 0)>0 || Object.values(run.heldItems ?? {}).includes(item));
  async function equip(item:HeldItem|null){await submit({type:'equip-item',runId:run.id,floor:run.floor,species:target,item});}
  return <><button className="secondary-button" data-keyboard-tab-utility data-testid="held-item-manager" onClick={()=>{setTarget(null);setOpen(true);}}>지닌 도구 관리 · {Object.keys(run.heldItems ?? {}).length}마리 장착</button>
    {open && <PokedexDialog title="지닌 도구 관리" large className="maintenance-dialog" onClose={()=>target ? setTarget(null) : setOpen(false)} returnFocus="[data-testid=held-item-manager]">
      {target ? <div className="held-item-options"><p>{pokemonName(target)} · 현재 <HeldItemLabel item={current}/></p>
        {owned.map(item=>{const holder=Object.entries(run.heldItems ?? {}).find(([name,held])=>held===item)?.[0];return <button key={item} data-bag-item={item} disabled={busy || !(run.itemBag?.[item]) || !!holder || !canEquipGimmick(target,item)} onClick={()=>void equip(item)}><strong><HeldItemLabel item={item}/>{(run.itemBag?.[item] ?? 0)>0 && <> · 가방 {run.itemBag![item]}개</>}</strong><small>{!canEquipGimmick(target,item) ? '이 포켓몬은 사용할 수 없어요' : holder ? `${pokemonName(holder)} 장착 중 · 먼저 해제하면 옮길 수 있어요` : heldItems[item].description}</small></button>;})}
        {!owned.length && <p className="selection-note">보유한 도구가 없습니다. 상점에서 도구를 구매하세요.</p>}
        <button disabled={busy || !current} onClick={()=>void equip(null)}>도구 해제 · 가방으로 돌려놓기</button>
        <button onClick={()=>setTarget(null)}>포켓몬 선택으로 · X</button></div> : <RunPartnerList run={run} onChoose={setTarget} disabled={()=>busy}/>}
      {error && <p role="alert">{error}</p>}
    </PokedexDialog>}
  </>;
}
export function HeldItemShop({run,coins,busy,submit,error}:Props & {coins:number}){
  const [chosen,setChosen]=useState<HeldItem|null>(null);
  const offers=(run.itemOffers ?? []).filter(isHeldItem).filter(item=>run.roster.some(name=>canEquipGimmick(name,item)));
  return <><div className="shop-products held-item-products" data-keyboard-tab-products data-testid="held-item-products">{offers.map(item=>{
    const info=heldItems[item],purchased=run.itemPurchases?.includes(item),owned=(run.itemBag?.[item]??0)>0,holder=Object.entries(run.heldItems ?? {}).find(([,held])=>held===item)?.[0];
    return <div className="shop-product" key={item}><strong><HeldItemLabel item={item} colored/></strong><p>{info.description}</p><small>{info.consumable ? '발동하면 소모' : '계속 유지'} · 이번 도전 전용</small><button className="secondary-button" data-held-item={item} disabled={busy || purchased || owned || !!holder || coins<info.price} onClick={()=>setChosen(item)}>{holder ? `${pokemonName(holder)} 장착 중` : owned ? '가방에 보유 중' : purchased ? '구매 완료 ✓' : `${info.price}코인 · ${coins<info.price ? '자금 부족' : '구매·장착'}`}</button></div>;
  })}{Array.from({length:Math.max(0,4-offers.length)},(_,slot)=><div className="shop-product shop-sold-out" key={`sold-out-${slot}`} aria-label="품절 슬롯"><strong>품절</strong><p>추첨된 등급의 구매 가능한 도구가 없습니다.</p><small>보유·장착 중인 도구와 사용할 수 없는 기믹 도구는 제외됩니다.</small></div>)}</div>
    {chosen && <PokedexDialog title={`${heldItems[chosen].name} 구매·장착`} large className="maintenance-dialog" onClose={()=>setChosen(null)} returnFocus={`[data-held-item="${chosen}"]`}>
      <p><HeldItemLabel item={chosen}/></p><p>{heldItems[chosen].description}</p><p>보유 {coins.toLocaleString()}코인 · 가격 {heldItems[chosen].price}코인</p><p>교체되는 도구는 가방으로 돌아갑니다.</p>
      <RunPartnerList run={run} disabled={name=>busy || !canEquipGimmick(name,chosen) || coins<heldItems[chosen].price || !!run.itemPurchases?.includes(chosen) || run.heldItems?.[name]===chosen} onChoose={species=>void submit({type:'purchase-item',revision:run.shopRerolls?.items.count??0,runId:run.id,floor:run.floor,item:chosen,species})} detail={name=>!canEquipGimmick(name,chosen)?'이 포켓몬은 사용할 수 없어요':'구매·장착'}/>
      <div className="held-item-options"><button data-keyboard-list-next data-testid="purchase-item-bag" disabled={busy || coins<heldItems[chosen].price || run.itemPurchases?.includes(chosen) || (run.itemBag?.[chosen]??0)>0 || Object.values(run.heldItems??{}).includes(chosen)} onClick={()=>void submit({type:'purchase-item',revision:run.shopRerolls?.items.count??0,runId:run.id,floor:run.floor,item:chosen,species:null})}><strong>구매해서 가방에 넣기</strong><small>나중에 지닌 도구 관리에서 장착</small></button></div>
      {run.itemPurchases?.includes(chosen) && <p role="status">구매 완료!</p>}{error && <p role="alert">{error}</p>}
      <button className="secondary-button" onClick={()=>setChosen(null)}>돌아가기 · X</button>
    </PokedexDialog>}
  </>;
}
