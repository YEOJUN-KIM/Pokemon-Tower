import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import type {EggResult} from '../src/data/permanent-upgrades';

const paletteSamples=[
 {species:'Articuno',rareCategory:'sublegendary',eggKind:'rare'},
 {species:'Nihilego',rareCategory:'ultrabeast',eggKind:'rare'},
 {species:'Flutter Mane',rareCategory:'paradox',eggKind:'rare'},
 {species:'Yveltal',rareCategory:'legendary',eggKind:'superRare'},
 {species:'Mew',rareCategory:'mythical',eggKind:'superRare'},
 {species:'Charizard',eggKind:'shiny'},
 {species:'Garchomp',eggKind:'normal'},
 {species:'Tyranitar',eggKind:'normal'},
 {species:'Gengar',eggKind:'normal'},
 {species:'Lapras',eggKind:'normal'},
] as const;
const eggs:EggResult[]=paletteSamples.map(sample=>({...sample,ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},isNew:true,newMoves:['Protect'],shiny:sample.eggKind==='shiny',newShiny:sample.eggKind==='shiny',ivGain:{species:sample.species,changes:[]}}));

for(const width of [1920,1280,390])test(`hatch result size, category backgrounds and effects at ${width}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),store=new TowerStore('.data/e2e.sqlite'),owner='egg-palette-'+suffix;
 try{
  const auth=await new Accounts(store.db).register('palette_'+suffix,'palette-test-password',owner,undefined);
  store.ensurePlayer(owner);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===1920?980:width===1280?900:844});await page.goto('/eggs');
  const state=await page.request.get('/api/battle?view=collection').then(response=>response.json());
  await page.route('**/api/battle*',route=>route.fulfill({json:{...state,tower:{...state.tower,growthPoints:20000},...(route.request().method()==='POST'?{permanentResult:{message:'10개의 알이 부화했어요!',eggs}}:{})}}));
  await page.reload();await page.getByRole('button',{name:'10회 뽑기 · 2,000P',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'알 부화 결과',exact:true}),grid=dialog.locator('.egg-results');
  await expect(dialog.getByTestId('sealed-egg')).toHaveCount(10);await dialog.getByRole('button',{name:'한 번에 열기',exact:true}).click();await expect(dialog.getByTestId('egg-result')).toHaveCount(10);
  const cards=dialog.getByTestId('egg-result');
  await expect(cards.first()).toHaveCSS('opacity','1');
  await expect.poll(()=>cards.locator('img').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  const backgrounds=[];
  for(let i=0;i<6;i++){
   await expect(cards.nth(i)).toHaveAttribute('data-rarity',i===5?'normal':(paletteSamples[i] as {rareCategory:string}).rareCategory);
   backgrounds.push(await cards.nth(i).evaluate(el=>getComputedStyle(el).backgroundImage));
  }
  expect(new Set(backgrounds).size).toBe(6);await expect(cards.nth(5)).toHaveClass(/shiny-result/);
  await expect(dialog.locator('.egg-rarity-label')).toHaveCount(0);await expect(dialog.locator('.egg-hatch-heading small')).toHaveCount(0);
  await expect(cards.nth(3).locator('.egg-legendary-stars i').first()).toHaveCSS('animation-name',/egg-legendary-twinkle/);
  expect(await cards.nth(0).locator('.hatch-sprite').evaluate(el=>getComputedStyle(el,'::before').animationName)).toContain('egg-result-breathe');
  expect(await cards.nth(1).locator('.hatch-sprite').evaluate(el=>getComputedStyle(el,'::before').animationName)).toContain('egg-result-orbit');
  expect(await cards.nth(2).locator('.hatch-sprite').evaluate(el=>getComputedStyle(el,'::before').animationName)).toContain('egg-result-flow');
  await page.emulateMedia({reducedMotion:'reduce'});expect(await cards.nth(1).locator('.hatch-sprite').evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('none');await expect(cards.nth(3).locator('.egg-legendary-stars i').first()).toHaveCSS('animation-name','none');await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(cards.first()).toHaveCSS('opacity','1');
  if(width>=1280){
   const dimensions=await grid.evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight,rows:getComputedStyle(el).gridTemplateRows}));
   expect(dimensions.scroll,JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.client+1);
   expect(await dialog.evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
   expect(await cards.evaluateAll(nodes=>nodes.every(node=>Array.from(node.querySelectorAll('dt,dd')).every(child=>{const r=child.getBoundingClientRect(),parent=child.parentElement!.getBoundingClientRect();return r.left>=parent.left-1&&r.right<=parent.right+1;})))).toBe(true);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await dialog.screenshot({path:`test-results/hatch-result-palettes-${width}.png`});
  if(width===1920){
   const directory='test-results/egg-palette-frames';mkdirSync(directory,{recursive:true});
   const gridBox=(await grid.boundingBox())!;
   const regions=[];for(let i=0;i<6;i++){const box=(await cards.nth(i).boundingBox())!;regions.push({x:box.x-gridBox.x,y:box.y-gridBox.y,width:box.width,height:box.height});}
   writeFileSync(`${directory}/regions.json`,JSON.stringify(regions));
   await expect.poll(()=>cards.locator('img').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
   for(let frame=0;frame<24;frame++){await grid.screenshot({path:`${directory}/frame-${String(frame).padStart(2,'0')}.png`,animations:'allow'});await page.waitForTimeout(120);}
  }
 }finally{store.close();}
});
