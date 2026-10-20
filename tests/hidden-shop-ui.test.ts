import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {HiddenShopView} from '../src/data/hidden-shop';

const shop:HiddenShopView={purchaseLimit:2,purchasedCount:0,offers:[{id:'vitamin-atk',name:'타우린',quantity:1,category:'vitamin',icon:'/items/protein.png',description:'보상 보관함에 보관 · 포켓몬당 영양제 총 3개 제한',currency:'coins',price:400,purchased:false},{id:'life-orb',name:'생명의구슬',quantity:1,category:'held-item',icon:'/items/lifeorb.png',description:'공격 기술의 위력이 30% 증가하지만 공격 후 최대 HP의 1/10을 잃습니다.',currency:'growth-points',price:250,purchased:false}]};

test('hidden shop compact cards move snapshot descriptions into the selected bottom message',async()=>{
 const hooks=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,context);}});
 try{
  const {HiddenShop,HiddenShopDetail,hiddenShopAvailability,hiddenShopPayment}=await import('../src/web/hidden-shop');
  const props={shop,coins:500,growthPoints:300,busy:false};
  const cards=renderToStaticMarkup(createElement(HiddenShop,{...props,onFocus:()=>{}}));
  assert.ok(cards.includes(shop.offers[0].description.replace('보상 보관함','배낭')));assert.ok(!cards.includes(shop.offers[1].description));assert.equal((cards.match(/aria-pressed="true"/g)??[]).length,1);assert.ok(cards.includes('구매 0 / 2'));
  const detail=renderToStaticMarkup(createElement(HiddenShopDetail,{...props,selectedId:'life-orb',onPurchase:()=>{},onLeave:()=>{}}));
  assert.ok(!detail.includes(shop.offers[1].description));assert.ok(detail.includes('수상한 상인'));assert.ok(detail.includes('aria-label="상인 대화"'));const right=renderToStaticMarkup(createElement(HiddenShop,{...props,selectedId:'life-orb',onFocus:()=>{}}));assert.ok(right.includes(shop.offers[1].description));assert.ok(right.includes('성장 포인트 250P'));
  assert.equal(hiddenShopPayment(shop.offers[0]),'타워 코인 400');assert.equal(hiddenShopAvailability(shop,shop.offers[0],0,300),'타워 코인이 부족합니다.');
  assert.equal(hiddenShopAvailability(shop,shop.offers[1],500,0),'성장 포인트가 부족합니다.');
  for(const changed of [{...shop,purchasedCount:2},{...shop,offers:shop.offers.map(o=>({...o,purchased:true}))}]){
   const html=renderToStaticMarkup(createElement(HiddenShop,{...props,shop:changed,onFocus:()=>{}}));assert.ok(!html.includes(' disabled=""'));
   const bottom=renderToStaticMarkup(createElement(HiddenShopDetail,{...props,shop:changed,onPurchase:()=>{},onLeave:()=>{}}));assert.ok(bottom.includes('disabled=""'));assert.ok(bottom.includes('aria-label="상인 대화"'));
  }
 }finally{hooks.deregister();}
});
