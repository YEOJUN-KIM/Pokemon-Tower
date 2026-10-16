'use client';
import type {HiddenShopView} from '../data/hidden-shop';
import {ShopProduct} from './shop-product';
import styles from './styles/hidden-shop.module.css';

export function HiddenShop({shop,coins,growthPoints,busy,onPurchase}:{shop:HiddenShopView;coins:number;growthPoints:number;busy:boolean;onPurchase:(id:string)=>void}){
 const remaining=Math.max(0,shop.purchaseLimit-shop.purchasedCount);
 return <section className={`${styles.scope} ${styles.shop} tower-shop event-choices`} aria-labelledby="hidden-shop-title" data-testid="hidden-shop">
  <header className={styles.heading}><div><h2 id="hidden-shop-title">수상한 상인</h2><p>“흔히 볼 수 없는 물건들이야.”</p></div><div className={styles.wallets} aria-label="보유 재화"><span>🪙 타워 코인 <strong>{coins.toLocaleString()}</strong></span><span className={styles.growth}>◆ 성장 포인트 <strong>{growthPoints.toLocaleString()}P</strong></span></div></header>
  <p className={styles.limit} role="status">{remaining?`남은 구매 횟수 ${remaining}`:'구매 한도를 모두 사용했습니다.'}<small> · 총 {shop.purchasedCount} / {shop.purchaseLimit}개 구매</small></p>
  <div className={`${styles.products} shop-products`} data-keyboard-list>{shop.offers.map(offer=>{
   const growth=offer.currency==='growth-points',balance=growth?growthPoints:coins,affordable=balance>=offer.price;
   const payment=`${growth?'성장 포인트':'타워 코인'} ${offer.price.toLocaleString()}${growth?'P':''}`;
   const status=offer.purchased?'품절':!remaining?'구매 한도 사용 완료':!affordable?'재화 부족':'구매';
   return <ShopProduct className={styles.product} key={offer.id} data-product-id={offer.id} data-currency={offer.currency} data-purchased={offer.purchased}>
    {offer.category==='machine'?<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#bdd1e8" stroke="#536782" strokeWidth="3"/><path d="M9 13 16 8M24 32 32 24" stroke="#eef5fa" strokeWidth="3"/><circle cx="20" cy="20" r="5" fill="#263341" stroke="#7595ba" strokeWidth="2"/></svg>:<img src={offer.icon} width={40} height={40} alt=""/>}<strong>{offer.name}{offer.quantity>1?` ×${offer.quantity}`:''}</strong><p>{offer.description}</p>
    <button className="secondary-button" disabled={busy||offer.purchased||!remaining||!affordable} onClick={()=>onPurchase(offer.id)} aria-label={`${offer.name}${offer.quantity>1?` ×${offer.quantity}`:''} · ${payment} · ${status}`}><span className={growth?styles.growth:styles.coins}>{growth?'◆':'🪙'} {payment}</span><span>{status}</span></button>
   </ShopProduct>;
  })}</div>
 </section>;
}
