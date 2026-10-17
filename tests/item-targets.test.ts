import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {hiddenShopFixture} from './hidden-shop-fixture';
import {vitaminDisabledReason} from '../src/shared/vitamin-eligibility';

test('shared target rows mark only the first eligible Pokemon, including held/vitamin/TM and empty eligibility',async()=>{
 const hooks=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {}',shortCircuit:true}:next(url,context);}}),f=hiddenShopFixture();
 try{
  const {ItemTargetList}=await import('../src/web/item-target-list'),run=f.store.view(f.owner).run!;
  for(const extra of [{showHeldItem:true},{disabledReason:(name:string)=>name!=='Venusaur'?'영양제 한도 도달':undefined},{move:'Earthquake',learnable:(name:string)=>name==='Venusaur'}]){
   const html=renderToStaticMarkup(createElement(ItemTargetList,{run,onChoose:()=>{},disabled:name=>name!=='Venusaur',...extra}));
   assert.equal((html.match(/data-initial-focus="true"/g)??[]).length,1);assert.match(html,/<button[^>]*data-bag-target="Venusaur"[^>]*data-initial-focus="true"/);assert.doesNotMatch(html,/<button[^>]*data-initial-focus="true"[^>]*disabled/);
  }
  const html=renderToStaticMarkup(createElement(ItemTargetList,{run,onChoose:()=>{},disabled:()=>true}));assert.ok(html.includes('사용할 수 있는 포켓몬이 없습니다.'));assert.ok(!html.includes('data-initial-focus'));
 }finally{hooks.deregister();f.store.close();}
});

test('vitamin display eligibility distinguishes total cap and existing floor/stat restriction',()=>{
 const usage={counts:{Blastoise:3,Charizard:2},limit:3,usedStats:['atk']};
 assert.equal(vitaminDisabledReason(usage,'Blastoise','타우린'),'영양제 한도 도달');assert.equal(vitaminDisabledReason(usage,'Charizard','타우린'),'이번 층에서 이미 사용한 영양제');assert.equal(vitaminDisabledReason(usage,'Charizard','맥스업'),undefined);
});
