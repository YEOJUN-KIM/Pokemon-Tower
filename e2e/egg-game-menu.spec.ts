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
 store.db.prepare('INSERT INTO reward_egg_tickets VALUES (?,?,?)').run(owner,'shiny',1);
 await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
 return {store,owner};
}
async function start(page:Page){await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/eggs');await expect(page.getByTestId('permanent-wallet')).toHaveText('20,000P');}
async function closeHatch(page:Page){await expect(page.getByRole('dialog',{name:'알 부화 결과',exact:true})).toBeVisible();await page.keyboard.press('x');await expect(page.getByRole('button',{name:'확인',exact:true})).toBeEnabled();await page.keyboard.press('x');await expect(page.getByRole('dialog')).toHaveCount(0);}
async function pad(page:Page,button:number){
 await page.evaluate(button=>{(window as unknown as {eggPad:{buttons:{pressed:boolean}[]}}).eggPad.buttons[button].pressed=true;},button);
 await page.waitForTimeout(70);
 await page.evaluate(button=>{(window as unknown as {eggPad:{buttons:{pressed:boolean}[]}}).eggPad.buttons[button].pressed=false;},button);
 await page.waitForTimeout(35);
}
test('basic-only cursor, odds, tickets and 1/10 draws preserve payment and saved research',async({page,context})=>{
 const {store,owner}=await fixture(context);
 try{
  await start(page);await expect(page.locator('select,[role=tablist],[data-egg-target]')).toHaveCount(0);
  await expect(page.locator('.egg-station')).not.toContainText(/지정|현재 선택|지역|타입|50|5%/);
  await expect(page.locator('.egg-station')).toContainText('뽑기권 2장 · 1회 200P');
  await expect(page.locator('[data-egg-draw="1"]')).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('e');await page.keyboard.press('q');await expect(page.locator('[data-egg-draw]')).toHaveCount(2);
  await page.keyboard.press('y');const odds=page.getByRole('dialog',{name:'알 확률',exact:true});await expect(odds).toBeVisible();await expect(odds).not.toContainText(/지정 대상|같은 알 등급|기존 풀|탐색 연구/);await page.keyboard.press('x');await expect(odds).toHaveCount(0);
  await page.keyboard.press('ArrowRight');await expect(page.locator('[data-egg-draw="10"]')).toBeFocused();
  const request=page.waitForResponse(r=>r.url().includes('/api/battle')&&r.request().method()==='POST');
  await page.keyboard.press('z');const response=await request;expect(response.ok()).toBe(true);expect(response.request().postDataJSON()).toMatchObject({action:'hatch',count:10});expect(response.request().postDataJSON()).not.toHaveProperty('tuning');
  await closeHatch(page);expect(store.view(owner).growthPoints).toBe(18400);expect(store.view(owner).permanent?.eggTickets).toBe(0);
  await page.keyboard.press('ArrowLeft');const single=page.waitForResponse(r=>r.url().includes('/api/battle')&&r.request().method()==='POST');await page.keyboard.press('Enter');expect((await single).ok()).toBe(true);await closeHatch(page);expect(store.view(owner).growthPoints).toBe(18200);
  await page.reload();await expect(page.getByTestId('permanent-wallet')).toHaveText('18,200P');expect(store.view(owner).permanent?.eggFocusLevel).toBe(1);
  await page.keyboard.press('x');await expect(page).toHaveURL(/\/$/);
 }finally{store.close();}
});
test('standard pad moves draw choices, opens odds and spends reward tickets',async({page,context})=>{
 const {store,owner}=await fixture(context);
 try{
  await start(page);
  await page.evaluate(()=>{const eggPad={connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[eggPad],configurable:true});(window as unknown as {eggPad:typeof eggPad}).eggPad=eggPad;window.dispatchEvent(new Event('gamepadconnected'));});
  await pad(page,15);await expect(page.locator('[data-egg-draw="10"]')).toHaveAttribute('data-game-cursor','true');
  await pad(page,3);await expect(page.getByRole('dialog',{name:'알 확률',exact:true})).toBeVisible();await pad(page,1);await expect(page.getByRole('dialog')).toHaveCount(0);
  await pad(page,14);await pad(page,13);await expect(page.locator('[data-egg-reward]').first()).toHaveAttribute('data-game-cursor','true');
  const request=page.waitForResponse(r=>r.url().includes('/api/battle')&&r.request().method()==='POST');await pad(page,0);expect((await request).request().postDataJSON()).toMatchObject({action:'hatch-reward',eggKind:'superRare'});
  await closeHatch(page);expect(store.view(owner).growthPoints).toBe(20000);expect(store.view(owner).permanent?.rewardEggTickets?.superRare??0).toBe(0);
 }finally{store.close();}
});
test('insufficient points disable paid draws but a remaining ticket still works',async({page,context})=>{
 const {store,owner}=await fixture(context);
 try{
  store.db.prepare('UPDATE players SET growth_points=0 WHERE id=?').run(owner);store.db.prepare('UPDATE permanent_upgrades SET egg_tickets=1 WHERE player_id=?').run(owner);
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/eggs');await expect(page.getByTestId('permanent-wallet')).toHaveText('0P');
  await expect(page.locator('[data-egg-draw="1"]')).toBeEnabled();await expect(page.locator('[data-egg-draw="10"]')).toBeDisabled();
  await page.locator('[data-egg-draw="1"]').click();await closeHatch(page);expect(store.view(owner).growthPoints).toBe(0);await expect(page.locator('[data-egg-draw="1"]')).toBeDisabled();
 }finally{store.close();}
});
for(const [width,height] of [[1920,1080],[1280,900],[390,844],[360,640],[320,568],[844,390]])test(`machine and all actions fit without scrolling at ${width}x${height}`,async({page,context})=>{
 const {store}=await fixture(context);
 try{
  await page.setViewportSize({width,height});await start(page);
  await expect(page.locator('.egg-machine-art')).toHaveAttribute('src','/sprites/eggs/machine.png');
  expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}))).toEqual({width,height});
  const footer=await page.locator('[data-menu-context="eggs"]').boundingBox();expect(footer).not.toBeNull();
  for(const guide of await page.locator('[data-menu-context="eggs"] .game-menu-footer>span').all()){
   const rect=await guide.boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(footer!.x);expect(rect!.x+rect!.width).toBeLessThanOrEqual(footer!.x+footer!.width);expect(rect!.y).toBeGreaterThanOrEqual(footer!.y);expect(rect!.y+rect!.height).toBeLessThanOrEqual(footer!.y+footer!.height);
  }
  const art=await page.locator('.egg-machine-art').boundingBox();expect(art!.height).toBeGreaterThan(80);expect(art!.width/art!.height).toBeCloseTo(1122/1402,2);expect(Math.abs(art!.x+art!.width/2-width/2)).toBeLessThan(2);
  const draw=await page.locator('[data-egg-draw="1"]').boundingBox();expect(art!.y+art!.height).toBeLessThan(draw!.y);
  for(const element of await page.locator('.egg-machine-art,[data-egg-draw],[data-egg-reward]').all()){
   const rect=await element.boundingBox();expect(rect).not.toBeNull();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(width);expect(rect!.y).toBeGreaterThanOrEqual(0);expect(rect!.y+rect!.height).toBeLessThanOrEqual(footer!.y);
  }
  await page.screenshot({path:`artifacts/qa/screenshots/egg-basic/${width}x${height}.png`});
  await page.locator('[data-egg-odds-button]').click();await expect(page.getByRole('dialog',{name:'알 확률',exact:true})).toBeVisible();await page.keyboard.press('x');
 }finally{store.close();}
});
