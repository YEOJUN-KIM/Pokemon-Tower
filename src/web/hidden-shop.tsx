'use client';
import {GameMenuFooter,GameStatus} from './game-menu';
import {useLayoutEffect,useRef} from 'react';
import type {HiddenShopView} from '../data/hidden-shop';
import {GameDialogue} from './game-dialogue';
import {selectGameCursor} from './game-keyboard';
import styles from './styles/hidden-shop.module.css';

type Offer=HiddenShopView['offers'][number];
export function hiddenShopPayment(offer:Offer){return `${offer.currency==='growth-points'?'성장 포인트':'타워 코인'} ${offer.price.toLocaleString()}${offer.currency==='growth-points'?'P':''}`;}
export function hiddenShopAvailability(shop:HiddenShopView,offer:Offer,coins:number,growthPoints:number){
 if(offer.purchased)return '구매 완료';
 if(shop.purchasedCount>=shop.purchaseLimit)return '이번 상점에서는 더 이상 구매할 수 없습니다.';
 if((offer.currency==='growth-points'?growthPoints:coins)<offer.price)return `${offer.currency==='growth-points'?'성장 포인트가':'타워 코인이'} 부족합니다.`;
 return '구매 가능';
}
function ProductIcon({offer}:{offer:Offer}){return offer.category==='machine'?<svg width="60" height="60" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#bdd1e8" stroke="#536782" strokeWidth="3"/><path d="M9 13 16 8M24 32 32 24" stroke="#eef5fa" strokeWidth="3"/><circle cx="20" cy="20" r="5" fill="#263341" stroke="#7595ba" strokeWidth="2"/></svg>:<img src={offer.icon} width="60" height="60" alt=""/>;}

export function HiddenShop({shop,coins,growthPoints,busy,selectedId,onFocus}:{shop:HiddenShopView;coins:number;growthPoints:number;busy:boolean;selectedId?:string;onFocus:(id:string)=>void}){
 const ref=useRef<HTMLElement>(null);
 useLayoutEffect(()=>{selectGameCursor(ref.current?.querySelector<HTMLButtonElement>('[data-initial-focus]'));},[]);
 const selected=shop.offers.find(o=>o.id===selectedId)??shop.offers[0];
 return <section ref={ref} className={`${styles.scope} ${styles.shop} event-choices`} aria-label="히든상점" data-testid="hidden-shop" aria-busy={busy}>
  <header className={styles.heading}><h2>수상한 상인</h2><div className={styles.wallets} aria-label="보유 재화"><span className={styles.coins}>🪙 타워 코인 {coins.toLocaleString()}</span><span className={styles.growth}>◆ 성장 포인트 {growthPoints.toLocaleString()}P</span></div><p role="status">구매 {shop.purchasedCount} / {shop.purchaseLimit}</p></header>
  <div className={styles.layout}><div className={styles.products} data-keyboard-list aria-label="히든상점 상품">{shop.offers.map((offer,index)=><button key={offer.id} data-product-id={offer.id} data-currency={offer.currency} data-purchased={offer.purchased} data-shop-offer={offer.id} data-initial-focus={index===0||undefined} disabled={busy} aria-pressed={selected?.id===offer.id} onFocus={event=>{onFocus(offer.id);selectGameCursor(event.currentTarget);}} onClick={()=>onFocus(offer.id)}><ProductIcon offer={offer}/><span>{index+1}. {offer.name}{offer.quantity>1?` ×${offer.quantity}`:''}</span><small className={offer.currency==='growth-points'?styles.growth:styles.coins}>{offer.purchased?'구매 완료':`${offer.currency==='growth-points'?'◆':'🪙'} ${offer.price.toLocaleString()}${offer.currency==='growth-points'?'P':''}`}</small></button>)}</div>
  {selected&&<aside id="hidden-shop-detail" className={styles.productDetail} data-testid="hidden-shop-detail" data-offer-id={selected.id} aria-live="polite"><ProductIcon offer={selected}/><h3>{selected.name}{selected.quantity>1?` ×${selected.quantity}`:''}</h3><p>{selected.category==='machine'&&selected.description.includes('영구')?'배낭에 등록 · 이번 Run 동안 반복 사용 가능':selected.description.replace('보상 보관함','배낭')}</p><strong className={selected.currency==='growth-points'?styles.growth:styles.coins}>{hiddenShopPayment(selected)}</strong><GameStatus>{hiddenShopAvailability(shop,selected,coins,growthPoints)}</GameStatus></aside>}</div>
 </section>;
}

export function HiddenShopDetail({shop,selectedId,coins,growthPoints,busy,onPurchase,onLeave,bagButton}:{shop:HiddenShopView;selectedId?:string;coins:number;growthPoints:number;busy:boolean;onPurchase:(id:string)=>void;onLeave:()=>void;bagButton?:import('react').ReactNode}){
 const offer=shop.offers.find(o=>o.id===selectedId)??shop.offers[0];if(!offer)return null;
 const status=hiddenShopAvailability(shop,offer,coins,growthPoints),available=status==='구매 가능';
 const speech=shop.purchasedCount>=shop.purchaseLimit?'감사합니다. 오늘 거래는 여기까지야.':status.includes('부족')?'가진 재화가 조금 부족한 것 같은데.':shop.purchasedCount===1?'감사합니다. 하나 더 고를 수 있어.':offer.purchased?'그건 이미 가져갔잖아.':'흔히 볼 수 없는 물건들이야. 천천히 골라.';
 return <section className={`${styles.scope} ${styles.dialogue} battle-messages`} aria-label="수상한 상인 대화"><strong>수상한 상인</strong><GameDialogue text={speech} label="상인 대화"/><div className={`${styles.actions} event-choices`}><button disabled={busy||!available} data-hidden-shop-buy onClick={()=>onPurchase(offer.id)}>구매</button>{bagButton}<button disabled={busy} data-hidden-shop-leave onClick={onLeave}>나가기</button></div><GameMenuFooter controls={[{key:'↑ / ↓ · 1–5',label:'상품 확인'},{key:'Enter / Z',label:'구매'},{key:'B',label:'배낭'},{key:'X',label:'나가기'}]}/></section>;
}
