'use client';
import {AssetImage} from './asset-image';
import {GameStatus} from './game-menu';
import headingStyles from './styles/shop-heading.module.css';

import {battleItemDescription} from '../data/battle-items';
import {upgrades,isShopFloor,SHOP_REROLL_LIMIT,type UpgradeKind} from '../data/shop';
import {supportCatalog,supportPrice,supportTierLabels,FIRST_GIMMICK_FLOOR} from '../data/run-economy';
import type {RunView} from './contracts';
import {useState} from 'react';
import {pokemonName,species} from './catalog';
import {HeldItemShop} from './held-item-controls';
import {HeldItemLabel} from './held-item-label';
import {ShopProduct} from './shop-product';
import {PokemonImage} from './pokemon-image';
import {TypeBadge} from './type-badge';
import {PokedexDialog} from './pokedex-dialog';
import {RecruitReplacementPicker} from './recruit-dialog';

type Submit=(body:Record<string,unknown>)=>Promise<void>;
type Tab='items'|'support'|'scout';

// 50F champion reward: the first player gimmick is a free pick (build progression only).
function FreeGimmick({run,busy,submit}:{run:RunView;busy:boolean;submit:Submit}){
  const [open,setOpen]=useState(false),[item,setItem]=useState<string|null>(null),options=run.freeGimmick;
  if(!options)return null;
  const claim=(name:string,holder:string|null)=>{setOpen(false);setItem(null);void submit({type:'claim-free-gimmick',runId:run.id,floor:run.floor,item:name,species:holder});};
  return <div className="free-gimmick" data-testid="free-gimmick"><button className="secondary-button" data-keyboard-tab-utility disabled={busy||!Object.keys(options).length} onClick={()=>setOpen(true)}>{FIRST_GIMMICK_FLOOR}층 클리어 보상 · 첫 기믹 무료 선택</button>
    {open&&<PokedexDialog title="첫 기믹 선택 (무료)" large onClose={()=>{if(!busy){setOpen(false);setItem(null);}}}>
      {item===null?<div className="held-item-picker" data-testid="free-gimmick-items">{Object.keys(options).map((name,index)=><button key={name} className="secondary-button" data-initial-focus={index===0||undefined} data-free-gimmick={name} disabled={busy} onClick={()=>options[name].length?setItem(name):claim(name,null)}><HeldItemLabel item={name}/></button>)}</div>
        :<div className="held-item-picker"><p>지니게 할 포켓몬을 선택하세요.</p>{options[item].map((name,index)=><button key={name} className="secondary-button" data-initial-focus={index===0||undefined} data-free-gimmick-holder={name} disabled={busy} onClick={()=>claim(item,name)}>{pokemonName(name)}</button>)}<button className="secondary-button" onClick={()=>setItem(null)}>돌아가기</button></div>}
    </PokedexDialog>}
  </div>;
}

function SupportShop({run,coins,busy,submit}:{run:RunView;coins:number;busy:boolean;submit:Submit}){
  return <div className="shop-products consumable-products compact-shop-products" data-keyboard-tab-products data-testid="support-products">{(run.consumableOffers??[]).map(kind=>{
    const item=upgrades[kind as UpgradeKind],price=supportPrice(kind),tier=supportCatalog[kind]?.tier;
    return <ShopProduct key={kind} data-support={kind} data-support-tier={tier} price={price} aria-label={`${item.name} · ${price}코인 구매`} disabled={busy||coins<price} onClick={()=>void submit({type:'purchase',runId:run.id,floor:run.floor,kind})}>
      <strong className="shop-product-title"><AssetImage className="shop-consumable-icon" src={`/sprites/items/${item.icon}.png`} width={24} height={24} alt=""/>{item.name}</strong>
      <span className="shop-product-meta">{tier?supportTierLabels[tier]:'서포트'} · 일회용 · 한 전투 · 보유 {run.battleItems?.[kind as UpgradeKind]??0}개</span>
      <p className="shop-product-description">{battleItemDescription(kind as UpgradeKind)}</p>{coins<price&&<GameStatus className="shop-product-status">자금 부족</GameStatus>}
    </ShopProduct>;
  })}</div>;
}

// Separate from post-battle recruitment: any shown Pokemon can be bought for coins, even with a full party.
function ScoutShop({run,coins,busy,submit}:{run:RunView;coins:number;busy:boolean;submit:Submit}){
  const scout=run.scoutShop,[picked,setPicked]=useState<string|null>(null);
  if(!scout)return null;
  const full=run.roster.length>=6,buy=(name:string,replaced:string|null)=>{setPicked(null);void submit({type:'purchase-scout',runId:run.id,floor:run.floor,revision:scout.revision,species:name,replaced});};
  return <>
    <p className="shop-product-meta" role="note">이번 Run 한정 · 승리 후 영입과 별개로 코인으로 영입합니다.</p>
    <div className="shop-products scout-products compact-shop-products" data-keyboard-tab-products data-testid="scout-products">{scout.offers.map(offer=>{
      const catalog=species[offer.species];
      return <ShopProduct key={offer.species} data-scout={offer.species} data-scout-group={offer.group} data-scout-shiny={offer.shiny||undefined} price={offer.price} aria-label={`${pokemonName(offer.species)}${offer.shiny?' (이로치)':''} · ${offer.price}코인 영입`} disabled={busy||offer.purchased||coins<offer.price} onClick={()=>full?setPicked(offer.species):buy(offer.species,null)}>
        <PokemonImage id={catalog?.id??0} spriteKey={catalog?.spriteKey} name={pokemonName(offer.species)} shiny={offer.shiny} width={64} height={64} fallback={<span>◇</span>}/>
        <strong className="shop-product-title">{pokemonName(offer.species)}{offer.shiny?' ★':''}</strong>
        <span className="shop-product-meta">{offer.types.map(type=><TypeBadge key={type} type={type}/>)} · {offer.groupLabel} · 종족값 {offer.bst}</span>
        {(offer.purchased||coins<offer.price)&&<GameStatus className="shop-product-status">{offer.purchased?'영입 완료':'자금 부족'}</GameStatus>}
      </ShopProduct>;
    })}{Array.from({length:Math.max(0,4-scout.offers.length)},(_,slot)=><div className="shop-product shop-sold-out" key={slot}><strong>품절</strong></div>)}</div>
    <div className="shop-reroll"><button className="secondary-button" data-keyboard-tab-utility data-testid="scout-reroll" disabled={busy||coins<scout.rerollPrice} onClick={()=>void submit({type:'reroll-shop',runId:run.id,floor:run.floor,kind:'scout',revision:scout.revision})}>후보 리롤 · {scout.rerollPrice.toLocaleString()}코인</button><small>후보 4마리를 모두 다시 뽑습니다 · 횟수 제한 없음 · 파티 {run.roster.length}/6{full?' · 영입 시 교체':''}</small></div>
    {picked&&<RecruitReplacementPicker chosen={picked} roster={run.roster} busy={busy} onCancel={()=>setPicked(null)} onChoose={name=>buy(picked,name)}/>}
  </>;
}

export function TowerShop({run,coins,busy,submit,error,onContinue}:{run:RunView;coins:number;busy:boolean;error?:string;onContinue:()=>void;submit:Submit}) {
  const [category,setCategory]=useState<Tab>('items');
  if(run.state!=='select' || !isShopFloor(run.floor,run.totalFloors)) return null;
  const itemRerolls=run.shopRerolls?.items;
  return <section className="tower-shop" data-tab-scope data-keyboard-tab-scope aria-labelledby="shop-title" data-testid="tower-shop">
    <div className={`shop-heading ${headingStyles.heading}`}><div><h2 id="shop-title" className="sr-only">정비 상점</h2></div><div className={`shop-heading-actions ${headingStyles.actions}`}><div className="shop-wallet" role="status" aria-label="상점 보유 코인"><span>보유 코인</span><strong data-testid="shop-wallet">{coins.toLocaleString()}코인</strong></div></div></div>
    {run.gimmickUnlockFloor&&run.floor<=run.gimmickUnlockFloor&&<p role="note">특수기믹은 {run.gimmickUnlockFloor}층을 클리어하면 첫 장비를 무료로 고를 수 있고, 이후 장비는 지닌 도구 상점에서 구매합니다.</p>}
    <div className="shop-categories" data-game-tabs role="group" aria-label="상점 상품 종류">{([['items','지닌 도구'],['support','서포트'],['scout','포켓몬 스카우트']] as const).map(([id,label])=><button key={id} data-keyboard-tab data-initial-focus={category===id || undefined} className="secondary-button" aria-pressed={category===id} onClick={()=>setCategory(id)}>{label}</button>)}</div>
    <div data-keyboard-tab-panel key={category}>
    {category==='items' && <><FreeGimmick run={run} busy={busy} submit={submit}/><HeldItemShop run={run} coins={coins} busy={busy} submit={submit} error={error}/></>}
    {category==='support' && <SupportShop run={run} coins={coins} busy={busy} submit={submit}/>}
    {category==='scout' && <ScoutShop run={run} coins={coins} busy={busy} submit={submit}/>}
    {category==='items' && <div className="shop-reroll"><button className="secondary-button" data-keyboard-tab-utility data-testid="shop-reroll" disabled={busy||(itemRerolls?.count??0)>=(itemRerolls?.limit??SHOP_REROLL_LIMIT)||coins<(itemRerolls?.price??0)} onClick={()=>{void submit({type:'reroll-shop',runId:run.id,floor:run.floor,kind:'items',revision:itemRerolls?.count??0});}}>{(itemRerolls?.count??0)>=(itemRerolls?.limit??SHOP_REROLL_LIMIT)?'리롤 완료':'리롤'}</button><small>상점당 {itemRerolls?.limit??1}회 · 지닌 도구를 다시 뽑습니다</small></div>}
    </div>
  </section>;
}
