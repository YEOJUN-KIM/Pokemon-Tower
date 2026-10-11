'use client';
import {battleItemDescription} from '../data/battle-items';
import {TeraCrystal} from './tera-crystal';
import {TypeBadge} from './type-badge';
import {MoveCategoryBadge} from './move-category-badge';
import {upgrades,isShopFloor,vitamins,VITAMIN_BOOST,SHOP_REROLL_LIMIT,type UpgradeKind} from '../data/shop';
import type {RunView} from './contracts';
import {useState} from 'react';
import {PokedexDialog} from './pokedex-dialog';
import {statNames,type StatKey} from '../data/training';
import {moves,pokemonName} from './catalog';
import {moveInfo} from '../data/move-info';
import {MachineDialog} from './machine-dialog';
import {HeldItemShop,HeldItemManager} from './held-item-controls';
import {machineRarity} from '../data/machine-rarities';
import {rarityColors} from '../data/held-item-shop';
import {RunPartnerList} from './run-partner-list';

export function TowerShop({run,coins,busy,submit,error,onContinue}:{run:RunView;coins:number;busy:boolean;error?:string;onContinue:()=>void;submit:(body:Record<string,unknown>)=>Promise<void>}) {
  const [chosen,setChosen]=useState<string|null>(null),[vitamin,setVitamin]=useState<StatKey|null>(null);
  const [category,setCategory]=useState<'vitamins'|'machines'|'items'|'battle'>('items');
  if(run.state!=='select' || !isShopFloor(run.floor,run.totalFloors)) return null;
  const offer=run.machineShop?.offers.find(item=>item.move===chosen);
  return <section className="tower-shop" data-tab-scope data-keyboard-tab-scope aria-labelledby="shop-title" data-testid="tower-shop">
    <div className="shop-heading"><div><h2 id="shop-title" className="sr-only">정비 상점</h2><small>←/→ 탭 이동 · Z 물품 선택 · X 돌아가기</small></div><div className="shop-wallet" role="status" aria-label="상점 보유 코인"><span>보유 코인</span><strong data-testid="shop-wallet">{coins.toLocaleString()}코인</strong></div></div>
    <div className="shop-categories" data-game-tabs role="group" aria-label="상점 상품 종류">{([['items','지닌 도구'],['battle','배틀 아이템'],['machines','기술머신'],['vitamins','육성']] as const).map(([id,label])=><button key={id} data-keyboard-tab data-initial-focus={category===id || undefined} className="secondary-button" aria-pressed={category===id} onClick={()=>setCategory(id)}>{label}</button>)}</div>
    <div data-keyboard-tab-panel key={category}>
    {category==='items' && <HeldItemShop run={run} coins={coins} busy={busy} submit={submit} error={error}/>}
    {category==='items' && <HeldItemManager run={run} busy={busy} submit={submit} error={error}/>}
    {category==='battle' && <div className="shop-products consumable-products">{(run.consumableOffers ?? []).map(kind=>{
      const item=upgrades[kind];
      return <div className="shop-product" key={kind}><img className="shop-consumable-icon" src={`/sprites/items/${item.icon}.png`} width={40} height={40} alt=""/><strong>{item.name}</strong><p>{battleItemDescription(kind)}</p><small>배틀 도구칸에서 사용 · 보유 {run.battleItems?.[kind]??0}개</small>
        <button className="secondary-button" disabled={busy || coins<item.price} onClick={()=>void submit({type:'purchase',runId:run.id,floor:run.floor,kind})}>{coins<item.price ? `${item.price}코인 · 자금 부족` : `${item.price}코인에 구매`}</button></div>;
    })}</div>}
    {category==='battle' && run.teraShop && <div className="shop-product tera-ticket-product" data-testid="tera-ticket-product"><TeraCrystal type="Grass"/><strong>테라권 · 에픽</strong><p>팀 공용 · 누구든 사용 가능 · 테라스탈을 선택하고 기술을 결정하면 1장 소모</p><small>보유 {run.teraTickets ?? 0}장 · 상점마다 1장 구매</small><button className="secondary-button" data-testid="purchase-tera" disabled={busy||run.teraShop.purchased||coins<run.teraShop.price} onClick={()=>void submit({type:'purchase-tera',runId:run.id,floor:run.floor})}>{run.teraShop.purchased?'구매 완료 ✓':run.teraShop.price+'코인에 구매'}</button></div>}
    {category==='machines' && <div className="shop-products machine-products" data-testid="machine-products">{run.machineShop?.offers.map(item=>{const info=moveInfo[item.move];return <div className="shop-product" key={item.move} data-machine-offer={item.move}>
      <strong style={{color:rarityColors[item.rarity ?? machineRarity(item.move)]}}>{moves[item.move]?.name ?? item.move}</strong><p>{info && <><TypeBadge type={info.type}/> <MoveCategoryBadge category={info.category}/> · 위력 {info.power || '—'} · PP {info.pp}</>}</p><small>대상: {item.targets.map(pokemonName).join(' · ')}</small>
      <button className="secondary-button" data-machine={item.move} disabled={busy || item.purchased || coins<item.price} onClick={()=>setChosen(item.move)}>{item.purchased ? `${pokemonName(item.buyer ?? '')}에게 구매 완료` : coins<item.price ? `${item.price}코인 · 자금 부족` : `${item.price}코인 · 기술 확인`}</button>
    </div>;})}</div>}
    {(category==='machines'||category==='items') && <div className="shop-reroll"><button className="secondary-button" data-keyboard-tab-utility data-testid="shop-reroll" disabled={busy||(run.shopRerolls?.[category].count??0)>=(run.shopRerolls?.[category].limit??SHOP_REROLL_LIMIT)||coins<(run.shopRerolls?.[category].price??0)||(category==='machines'&&!run.machineShop?.offers.length)} onClick={()=>{setChosen(null);void submit({type:'reroll-shop',runId:run.id,floor:run.floor,kind:category,revision:run.shopRerolls?.[category].count??0});}}>{(run.shopRerolls?.[category].count??0)>=(run.shopRerolls?.[category].limit??SHOP_REROLL_LIMIT)?'리롤 사용 완료':`↻ ${category==='items'?'지닌 도구':'기술머신'} 리롤 · 무료`}</button><small>종류별 상점당 {run.shopRerolls?.[category==='machines'?'machines':'items'].limit??1}회 · 지닌 도구 또는 기술머신을 다시 뽑습니다 · 소모품은 고정</small></div>}
    {category==='machines' && !run.machineShop?.offers.length && <p>현재 파티에 판매할 미수집 기술머신이 없어요.</p>}
    {category==='vitamins' && run.vitaminShop && <section className="vitamin-shop"><h3>능력치 영양제</h3><p>선택한 1마리 +{VITAMIN_BOOST}포인트 · 도전 종료까지 · 리롤 없음</p><div className="shop-products">{run.vitaminShop.offers.map(offer=><div className="shop-product" key={offer.stat}><img className="shop-consumable-icon" src={`/sprites/items/${vitamins[offer.stat].icon}.png`} width={40} height={40} alt=""/><strong>{vitamins[offer.stat].name}</strong><p>{statNames[offer.stat]} 능력 포인트 +{VITAMIN_BOOST}</p><button className="secondary-button" data-vitamin={offer.stat} disabled={busy||offer.purchased||coins<offer.price} onClick={()=>setVitamin(offer.stat)}>{offer.purchased?'구매 완료 ✓':offer.price.toLocaleString()+'코인 · '+(coins<offer.price?'자금 부족':'포켓몬 선택')}</button></div>)}</div></section>}
    </div>
    {vitamin && <PokedexDialog title={vitamins[vitamin].name+' 사용'} large className="maintenance-dialog" returnFocus={`[data-vitamin="${vitamin}"]`} onClose={()=>setVitamin(null)}><RunPartnerList run={run} attribute="data-vitamin-target" disabled={()=>busy||!run.vitaminShop?.offers.some(x=>x.stat===vitamin&&!x.purchased&&coins>=x.price)} onChoose={species=>void submit({type:'purchase-vitamin',runId:run.id,floor:run.floor,stat:vitamin,species})} detail={name=>{const partner=run.vitaminShop?.partners[name],bonus=run.vitaminShop?.bonuses[name]?.[vitamin]??0;return `현재 ${statNames[vitamin]} ${partner?.stats[vitamin]??'—'} · 추가 포인트 ${bonus} → ${bonus+VITAMIN_BOOST}`;}}/>{run.vitaminShop?.offers.find(x=>x.stat===vitamin)?.purchased && <p role="status">능력치 강화 완료!</p>}{error && <p role="alert">{error}</p>}<button className="secondary-button" onClick={()=>setVitamin(null)}>돌아가기 · X</button></PokedexDialog>}
    {offer && <MachineDialog key={offer.move} run={run} offer={offer} coins={coins} busy={busy} error={error} submit={submit} onClose={()=>setChosen(null)}/>}
  </section>;
}
