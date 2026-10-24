import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

for(const speed of [1,2,4])test(`shared motion, rank batching and cleanup at ${speed}x`,async({page,context})=>{
 const origin='http://127.0.0.1:3001';
 const registered=await context.request.post(origin+'/api/account',{headers:{Origin:origin},data:{action:'register',username:'rank_'+randomUUID().slice(0,8),password:randomUUID()}});
 expect(registered.ok()).toBe(true);
 const response=await context.request.post(origin+'/api/battle',{headers:{Origin:origin},data:{type:'start',selected:['Charizard','Blastoise','Venusaur']}});
 expect(response.ok()).toBe(true);const initial=await response.json();
 let move='Close Combat';
 await context.route('**/api/battle',async route=>{
  if(route.request().method()!=='POST'||route.request().postDataJSON().type!=='action')return route.continue();
  const target=move==='Double Team'?'p1a: Charizard':'p2a: Opponent';
  const results=move==='Close Combat'?['|-damage|p2a: Opponent|80/100','|-unboost|p1a: Charizard|def|1','|-unboost|p1a: Charizard|spd|1']:[];
  await route.fulfill({json:{...initial,battle:{...initial.battle,requestId:initial.battle.requestId+1,messages:[...initial.battle.messages,`|move|p1a: Charizard|${move}|${target}`,...results]}}});
 });
 await page.addInitScript(value=>{
  localStorage.setItem('tower-playback-speed-v1',String(value));
  const state=window as typeof window&{rankEffects?:number;testAnimations?:Animation[]};
  state.rankEffects=0;state.testAnimations=[];
  const original=Element.prototype.animate;
  Element.prototype.animate=function(keyframes,options){const animation=original.call(this,keyframes,options);state.testAnimations!.push(animation);return animation;};
  const seen=new WeakSet<Element>();
  new MutationObserver(()=>{
   document.querySelectorAll('.feedback-stat-down').forEach(element=>{if(!seen.has(element)){seen.add(element);state.rankEffects!++;}});
  }).observe(document,{childList:true,subtree:true});
 },speed);
 await page.goto('/battle');
 await page.getByRole('button',{name:'싸운다',exact:true}).click();
 await page.locator('[data-command="move 1"]').click();
 await expect(page.locator('.feedback-stat-down')).toBeVisible();
 await expect(page.locator('.feedback-stat-down strong')).toHaveCount(0);
 await expect(page.getByRole('log',{name:'현재 배틀 상황'})).toContainText('방어가 떨어졌다!');
 await expect(page.getByRole('log',{name:'현재 배틀 상황'})).toContainText('특수방어가 떨어졌다!');
 await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
 expect(await page.evaluate(()=>(window as typeof window&{rankEffects:number}).rankEffects)).toBe(1);
 expect(await page.evaluate(()=>(window as typeof window&{testAnimations:Animation[]}).testAnimations.some(animation=>animation.playbackRate===Number(localStorage.getItem('tower-playback-speed-v1'))))).toBe(true);
 for(const name of ['Double Team','Earthquake','Quick Attack','Growl','Air Slash']){
  move=name;await page.goto('/battle');
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  await page.locator('[data-command="move 1"]').click();
  const canvas=page.getByTestId('move-visuals');
  await expect(canvas).toHaveAttribute('data-move',move);
  // At 4x a hit can last under 100ms; default assertion intervals can skip
  // its entire visible window. Sample at display-frame cadence instead.
  await expect.poll(()=>canvas.evaluate(element=>{const c=element as HTMLCanvasElement;return c.getContext('2d')!.getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n>25);}),{intervals:[16,16,32],message:`${name} draws visible pixels at ${speed}x`}).toBe(true);
  await page.keyboard.press('Shift');
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  expect(await canvas.evaluate(element=>{const c=element as HTMLCanvasElement;return c.getContext('2d')!.getImageData(0,0,c.width,c.height).data.every((n,i)=>i%4!==3||n===0);})).toBe(true);
 }
});
