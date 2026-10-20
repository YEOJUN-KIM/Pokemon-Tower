import {test,expect,type Page} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';

async function fixture(context:import('@playwright/test').BrowserContext){
 const id=randomBytes(8).toString('hex'),owner=`egg-menu-${id}`,store=new TowerStore('.data/e2e.sqlite');
 store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
 const auth=await new Accounts(store.db).register(`em_${id}`,'egg-menu-test-password',owner,undefined);
 store.ensurePlayer(owner);store.db.prepare('UPDATE players SET growth_points=20000 WHERE id=?').run(owner);
 store.db.prepare('INSERT INTO permanent_research VALUES (?,?,?)').run(owner,'eggFocus',1);
 store.db.prepare('INSERT INTO permanent_upgrades(player_id,egg_tickets) VALUES (?,?)').run(owner,2);
 store.db.prepare('INSERT INTO reward_egg_tickets VALUES (?,?,?)').run(owner,'superRare',1);
 await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
 return {store,owner};
}
async function start(page:Page){await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/eggs');await expect(page.getByTestId('permanent-wallet')).toHaveText('20,000P');}
async function pad(page:Page,button:number){
 await page.evaluate(button=>{(window as unknown as {eggPad:{buttons:{pressed:boolean}[]}}).eggPad.buttons[button].pressed=true;},button);
 await page.waitForTimeout(70);
 await page.evaluate(button=>{(window as unknown as {eggPad:{buttons:{pressed:boolean}[]}}).eggPad.buttons[button].pressed=false;},button);
 await page.waitForTimeout(35);
}
test('game cursor, remembered tabs, odds, tickets and region/type requests retain their behavior',async({page,context})=>{
 const {store,owner}=await fixture(context);
 try{
  await start(page);await expect(page.locator('select')).toHaveCount(0);
  await page.keyboard.press('e');await expect(page.getByRole('tab',{name:'지역',exact:true})).toHaveAttribute('aria-selected','true');
  const targets=page.locator('[data-egg-target]');await expect(targets).toHaveCount(9);await expect(targets.first()).toBeFocused();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('z');
  await expect(page.getByRole('button',{name:'호연',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.egg-station')).toContainText('지정 대상 비중 50 + 5%');await expect(page.locator('.egg-station')).not.toContainText('같은 알 등급');
  await page.keyboard.press('e');await expect(targets).toHaveCount(18);await expect(page.getByRole('button',{name:'스텔라',exact:true})).toHaveCount(0);
  await page.keyboard.press('q');await expect(page.getByRole('button',{name:'호연',exact:true})).toBeFocused();
  await page.keyboard.press('y');const odds=page.getByRole('dialog',{name:'알 확률',exact:true});await expect(odds).toBeVisible();await expect(odds).toContainText('대상이 없는 등급은 기존 풀');await page.keyboard.press('x');await expect(odds).toHaveCount(0);
  await page.getByRole('button',{name:'호연',exact:true}).click();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-egg-draw="10"]')).toBeFocused();
  const request=page.waitForResponse(r=>r.url().includes('/api/battle')&&r.request().method()==='POST');
  await page.keyboard.press('z');const response=await request;expect(response.ok()).toBe(true);expect(response.request().postDataJSON()).toMatchObject({action:'hatch',count:10,tuning:{kind:'region',region:'hoenn'}});
  await expect(page.getByRole('dialog',{name:'알 부화 결과',exact:true})).toBeVisible();expect(store.view(owner).growthPoints).toBe(18000);
  await page.keyboard.press('x');await expect(page.getByRole('button',{name:'확인',exact:true})).toBeEnabled();await page.keyboard.press('x');await page.keyboard.press('e');await page.getByRole('button',{name:'불꽃',exact:true}).click();
  const typed=page.waitForResponse(r=>r.url().includes('/api/battle')&&r.request().method()==='POST');await page.locator('[data-egg-draw="1"]').click();const typeResponse=await typed;expect(typeResponse.ok()).toBe(true);expect(typeResponse.request().postDataJSON().tuning).toEqual({kind:'type',pokemonType:'Fire'});
  await expect(page.getByRole('dialog',{name:'알 부화 결과',exact:true})).toBeVisible();expect(store.view(owner).growthPoints).toBe(17750);
  await page.keyboard.press('x');await expect(page.getByRole('button',{name:'확인',exact:true})).toBeEnabled();await page.keyboard.press('x');await page.keyboard.press('x');await expect(page).toHaveURL(/\/$/);
 }finally{store.close();}
});
test('standard pad shoulders, D-pad, A/B and Y share the keyboard cursor',async({page,context})=>{
 const {store,owner}=await fixture(context);
 try{
  await start(page);
  await page.evaluate(()=>{const eggPad={connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[eggPad],configurable:true});(window as unknown as {eggPad:typeof eggPad}).eggPad=eggPad;window.dispatchEvent(new Event('gamepadconnected'));});
  await pad(page,5);await expect(page.getByRole('tab',{name:'지역',exact:true})).toHaveAttribute('aria-selected','true');
  await pad(page,15);await pad(page,0);await expect(page.getByRole('button',{name:'성도',exact:true})).toHaveAttribute('aria-pressed','true');
  await pad(page,3);await expect(page.getByRole('dialog',{name:'알 확률',exact:true})).toBeVisible();await pad(page,1);await expect(page.getByRole('dialog')).toHaveCount(0);
  await pad(page,4);await expect(page.getByRole('tab',{name:'기본',exact:true})).toHaveAttribute('aria-selected','true');
  await pad(page,14);await expect(page.locator('[data-egg-reward]')).toHaveAttribute('data-game-cursor','true');
  await pad(page,0);await expect(page.getByRole('dialog',{name:'알 부화 결과',exact:true})).toBeVisible();expect(store.view(owner).growthPoints).toBe(20000);
 }finally{store.close();}
});
for(const [width,height] of [[1920,1080],[1280,900],[390,844],[360,640],[320,568],[844,390]])test(`all categories stay visible without scrolling at ${width}x${height}`,async({page,context})=>{
 const {store}=await fixture(context);
 try{
  await page.setViewportSize({width,height});await start(page);
  for(const [tab,count] of [['기본',1],['지역',9],['타입',18]] as const){
   await page.getByRole('tab',{name:tab,exact:true}).click();await expect(page.locator('[data-egg-target]')).toHaveCount(count);
   for(const card of await page.locator('[data-egg-target],[role=tab]').all()){
    expect(await card.evaluate(el=>{const box=el.getBoundingClientRect(),parent=el.parentElement!.getBoundingClientRect();return box.top>=parent.top-1&&box.bottom<=parent.bottom+1;})).toBe(true);
   }
   expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}))).toEqual({width,height});
   const footer=await page.locator('[data-menu-context="eggs"]').boundingBox();expect(footer).not.toBeNull();
   for(const guide of await page.locator('[data-menu-context="eggs"] .game-menu-footer>span').all()){
    const rect=await guide.boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(footer!.x);expect(rect!.x+rect!.width).toBeLessThanOrEqual(footer!.x+footer!.width);expect(rect!.y).toBeGreaterThanOrEqual(footer!.y);expect(rect!.y+rect!.height).toBeLessThanOrEqual(footer!.y+footer!.height);
   }
   for(const element of await page.locator('[data-egg-target],[data-egg-draw],[data-egg-reward],[role=tab]').all()){
    const rect=await element.boundingBox();expect(rect).not.toBeNull();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(width);expect(rect!.y).toBeGreaterThanOrEqual(0);expect(rect!.y+rect!.height).toBeLessThanOrEqual(footer!.y);
   }
   await page.screenshot({path:`artifacts/qa/screenshots/egg-menu/${width}x${height}-${tab}.png`});
  }
 }finally{store.close();}
});
