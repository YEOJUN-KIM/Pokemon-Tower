'use client';
import {GameMenuFooter,GameStatus} from './game-menu';
import {BagButton} from './bag';
import headingStyles from './styles/shop-heading.module.css';

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
    <div className={`shop-heading ${headingStyles.heading}`}><div><h2 id="shop-title" className="sr-only">정비 상점</h2></div><div className={`shop-heading-actions ${headingStyles.actions}`}><BagButton run={run} busy={busy} submit={submit} error={error}/><div className="shop-wallet" role="status" aria-label="상점 보유 코인"><span>보유 코인</span><strong data-testid="shop-wallet">{coins.toLocaleString()}코인</strong></div></div></div>
    <div className="shop-categories" data-game-tabs role="group" aria-label="상점 상품 종류">{([['items','지닌 도구'],['battle','배틀 아이템'],['machines','기술머신']] as const).map(([id,label])=><button key={id} data-keyboard-tab data-initial-focus={category===id || undefined} className="secondary-button" aria-pressed={category===id} onClick={()=>setCategory(id)}>{label}</button>)}</div>
    <div data-keyboard-tab-panel key={category}>
    {category==='items' && <HeldItemShop run={run} coins={coins} busy={busy} submit={submit} error={error}/>}

    {category==='battle' && <div className="shop-products consumable-products compact-shop-products" data-keyboard-tab-products>{(run.consumableOffers ?? []).map(kind=>{
      const item=upgrades[kind];
      return <ShopProduct key={kind} price={item.price} aria-label={`${item.name} · ${item.price}코인 구매`} disabled={busy || coins<item.price} onClick={()=>void submit({type:'purchase',runId:run.id,floor:run.floor,kind})}><strong className="shop-product-title"><img className="shop-consumable-icon" src={`/sprites/items/${item.icon}.png`} width={24} height={24} alt=""/>{item.name}</strong><span className="shop-product-meta">배틀 도구 · 보유 {run.battleItems?.[kind]??0}개</span><p className="shop-product-description">{battleItemDescription(kind)}</p>{coins<item.price&&<GameStatus className="shop-product-status">자금 부족</GameStatus>}
        </ShopProduct>;
    })}</div>}
    {category==='machines' && <div className="shop-products machine-products compact-shop-products" data-keyboard-tab-products data-testid="machine-products">{run.machineShop?.offers.map(item=>{const info=moveInfo[item.move];return <ShopProduct key={item.move} data-machine-offer={item.move} price={item.price} data-machine={item.move} aria-label={`${moves[item.move]?.name??item.move} · ${item.price}코인`} disabled={busy || item.purchased || coins<item.price} onClick={()=>void submit({type:'purchase-machine',revision:run.shopRerolls?.machines.count??0,runId:run.id,floor:run.floor,move:item.move})}>
      <strong className="shop-product-title" style={{color:rarityColors[item.rarity ?? machineRarity(item.move)]}}>{moves[item.move]?.name ?? item.move}</strong><p className="shop-product-meta">{info && <><TypeBadge type={info.type}/> <MoveCategoryBadge category={info.category}/> · 위력 {info.power || '—'} · PP {info.pp}</>}</p><p className="shop-product-description">{info?.description}</p>{(item.purchased||coins<item.price)&&<GameStatus className="shop-product-status">{item.purchased?'구매 완료':'자금 부족'}</GameStatus>}

    </ShopProduct>;})}</div>}
    {(category==='machines'||category==='items') && <div className="shop-reroll"><button className="secondary-button" data-keyboard-tab-utility data-testid="shop-reroll" disabled={busy||(run.shopRerolls?.[category].count??0)>=(run.shopRerolls?.[category].limit??SHOP_REROLL_LIMIT)||coins<(run.shopRerolls?.[category].price??0)||(category==='machines'&&!run.machineShop?.offers.length)} onClick={()=>{void submit({type:'reroll-shop',runId:run.id,floor:run.floor,kind:category,revision:run.shopRerolls?.[category].count??0});}}>{(run.shopRerolls?.[category].count??0)>=(run.shopRerolls?.[category].limit??SHOP_REROLL_LIMIT)?'리롤 완료':'리롤'}</button><small>종류별 상점당 {run.shopRerolls?.[category==='machines'?'machines':'items'].limit??1}회 · 지닌 도구 또는 기술머신을 다시 뽑습니다 · 소모품은 고정</small></div>}
    {category==='machines' && !run.machineShop?.offers.length && <p>판매 가능한 미보유 기술머신이 없습니다.</p>}
    </div>
    <GameMenuFooter controls={[{key:'← / → · Q / E',label:'탭'},{key:'Enter / Z',label:'구매'},{key:'B',label:'배낭'},{key:'X',label:'뒤로'}]}/>
  </section>;
}
