import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';

for(const [width,height] of [[1920,1080],[1280,900],[390,844],[360,640]])test(`title art keeps proportions and menus open dedicated pages at ${width}x${height}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner=`title-crop-${suffix}`,store=new TowerStore('.data/e2e.sqlite');
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const account=await new Accounts(store.db).register(`tc_${suffix}`,'title-crop-password',owner,undefined);store.ensurePlayer(owner);
  await context.addCookies([{name:'tower_auth',value:account.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height});await page.goto('/');
  await expect(page.getByRole('heading',{name:'POKÉMON TOWER.'})).toBeVisible();
  await expect(page.locator('.title-menu a')).toHaveCount(5);await expect(page.locator('.title-backdrop')).toHaveCSS('image-rendering','pixelated');
  const art=await page.locator('.title-backdrop').boundingBox();expect(art!.width/art!.height).toBeCloseTo(414/466,2);
  const stage=await page.locator('.title-stage').boundingBox();expect(Math.abs(stage!.x+stage!.width/2-width/2)).toBeLessThan(2);
  expect((await page.locator('.title-menu').boundingBox())!.width).toBeLessThanOrEqual(461);
  const settings=await page.getByRole('link',{name:'설정',exact:true}).boundingBox();expect(settings!.y+settings!.height).toBeLessThanOrEqual(height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`artifacts/qa/screenshots/title-crop/title-${width}x${height}.png`,fullPage:true});
  await page.getByRole('link',{name:'알뽑기',exact:true}).click();await expect(page).toHaveURL(/\/eggs$/);await expect(page.getByRole('heading',{name:'알뽑기',exact:true})).toBeVisible();await expect(page.locator('.egg-station')).toBeVisible();await expect(page.locator('.permanent-products')).toHaveCount(0);await expect(page.getByRole('tablist')).toHaveCount(0);
  await page.reload();await expect(page.locator('.egg-station')).toBeVisible();
  await page.keyboard.press('x');await expect(page).toHaveURL(/\/$/);await page.getByRole('link',{name:'업그레이드',exact:true}).click();await expect(page).toHaveURL(/\/upgrades$/);await expect(page.locator('.permanent-products section')).toHaveCount(3);await expect(page.locator('.egg-station')).toHaveCount(0);
 }finally{store.close();}
});
