'use client';
import {BagButton} from './bag';
import {battleItemDescription} from '../data/battle-items';
import {TeraCrystal} from './tera-crystal';
import {TypeBadge} from './type-badge';
import {MoveCategoryBadge} from './move-category-badge';
import {upgrades,isShopFloor,SHOP_REROLL_LIMIT,type UpgradeKind} from '../data/shop';
import type {RunView} from './contracts';
import {useState} from 'react';
import {moves,pokemonName} from './catalog';
import {moveInfo} from '../data/move-info';
import {HeldItemShop} from './held-item-controls';
import {machineRarity} from '../data/machine-rarities';
import {rarityColors} from '../data/held-item-shop';
import {ShopProduct} from './shop-product';

export function TowerShop({run,coins,busy,submit,error,onContinue}:{run:RunView;coins:number;busy:boolean;error?:string;onContinue:()=>void;submit:(body:Record<string,unknown>)=>Promise<void>}) {
  const [category,setCategory]=useState<'machines'|'items'|'battle'>('items');
  if(run.state!=='select' || !isShopFloor(run.floor,run.totalFloors)) return null;
  return <section className="tower-shop" data-tab-scope data-keyboard-tab-scope aria-labelledby="shop-title" data-testid="tower-shop">
    <div className="shop-heading"><div><h2 id="shop-title" className="sr-only">정비 상점</h2><small>←/→ 탭 이동 · Z 물품 선택 · X 돌아가기</small></div><div className="shop-wallet" role="status" aria-label="상점 보유 코인"><span>보유 코인</span><strong data-testid="shop-wallet">{coins.toLocaleString()}코인</strong></div></div>
    <BagButton run={run} busy={busy} submit={submit} error={error}/><div className="shop-categories" data-game-tabs role="group" aria-label="상점 상품 종류">{([['items','지닌 도구'],['battle','배틀 아이템'],['machines','기술머신']] as const).map(([id,label])=><button key={id} data-keyboard-tab data-initial-focus={category===id || undefined} className="secondary-button" aria-pressed={category===id} onClick={()=>setCategory(id)}>{label}</button>)}</div>
    <div data-keyboard-tab-panel key={category}>
    {category==='items' && <HeldItemShop run={run} coins={coins} busy={busy} submit={submit} error={error}/>}

    {category==='battle' && <div className="shop-products consumable-products">{(run.consumableOffers ?? []).map(kind=>{
      const item=upgrades[kind];
      return <ShopProduct key={kind}><img className="shop-consumable-icon" src={`/sprites/items/${item.icon}.png`} width={40} height={40} alt=""/><strong>{item.name}</strong><p>{battleItemDescription(kind)}</p><small>배틀 도구칸에서 사용 · 보유 {run.battleItems?.[kind]??0}개</small>
        <button className="secondary-button" disabled={busy || coins<item.price} onClick={()=>void submit({type:'purchase',runId:run.id,floor:run.floor,kind})}>{coins<item.price ? `${item.price}코인 · 자금 부족` : `${item.price}코인에 구매`}</button></ShopProduct>;
    })}</div>}
    {category==='machines' && <div className="shop-products machine-products" data-testid="machine-products">{run.machineShop?.offers.map(item=>{const info=moveInfo[item.move];return <ShopProduct key={item.move} data-machine-offer={item.move}>
      <strong style={{color:rarityColors[item.rarity ?? machineRarity(item.move)]}}>{moves[item.move]?.name ?? item.move}</strong><p>{info && <><TypeBadge type={info.type}/> <MoveCategoryBadge category={info.category}/> · 위력 {info.power || '—'} · PP {info.pp}</>}</p><small>배낭에 등록 · 이번 Run 동안 반복 사용</small>
      <button className="secondary-button" data-machine={item.move} disabled={busy || item.purchased || coins<item.price} onClick={()=>void submit({type:'purchase-machine',revision:run.shopRerolls?.machines.count??0,runId:run.id,floor:run.floor,move:item.move})}>{item.purchased ? '구매 완료 · 배낭 등록' : coins<item.price ? `${item.price}코인 · 자금 부족` : `${item.price}코인 · 배낭에 구매`}</button>
    </ShopProduct>;})}</div>}
    {(category==='machines'||category==='items') && <div className="shop-reroll"><button className="secondary-button" data-keyboard-tab-utility data-testid="shop-reroll" disabled={busy||(run.shopRerolls?.[category].count??0)>=(run.shopRerolls?.[category].limit??SHOP_REROLL_LIMIT)||coins<(run.shopRerolls?.[category].price??0)||(category==='machines'&&!run.machineShop?.offers.length)} onClick={()=>{void submit({type:'reroll-shop',runId:run.id,floor:run.floor,kind:category,revision:run.shopRerolls?.[category].count??0});}}>{(run.shopRerolls?.[category].count??0)>=(run.shopRerolls?.[category].limit??SHOP_REROLL_LIMIT)?'리롤 사용 완료':`↻ ${category==='items'?'지닌 도구':'기술머신'} 리롤 · 무료`}</button><small>종류별 상점당 {run.shopRerolls?.[category==='machines'?'machines':'items'].limit??1}회 · 지닌 도구 또는 기술머신을 다시 뽑습니다 · 소모품은 고정</small></div>}
    {category==='machines' && !run.machineShop?.offers.length && <p>판매 가능한 미보유 기술머신이 없습니다.</p>}
    </div>
  </section>;
}
