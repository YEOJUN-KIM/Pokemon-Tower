import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';

for(const width of [1280,390])test(`allowance purchase and basic eggs at ${width}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner=`research-${suffix}`,store=new TowerStore('.data/e2e.sqlite');
 try{
  const auth=await new Accounts(store.db).register(`r_${suffix}`,'research-test-password',owner,undefined);
  store.ensurePlayer(owner);store.db.prepare('UPDATE players SET growth_points=20000 WHERE id=?').run(owner);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/upgrades');await expect(page.getByTestId('permanent-wallet')).toHaveText('20,000P');
  const allowance=page.locator('.permanent-products section').filter({has:page.getByRole('heading',{name:'출발 지원금',exact:true})});
  await allowance.getByRole('button').click();
  const complete=page.getByRole('dialog',{name:'업그레이드 완료',exact:true});
  await expect(complete).toHaveCSS('background-color','rgb(32, 44, 50)');
  await expect(complete.getByRole('heading',{name:'출발 지원금',exact:true})).toBeVisible();await expect(complete).toContainText('150코인');await expect(complete).toContainText('−800P');await expect(complete).toContainText('19,200P');await expect(complete).toContainText('다음 도전부터 적용');
  await complete.screenshot({path:`artifacts/qa/screenshots/upgrade-popup/allowance-${width}.png`});
  await complete.getByRole('button',{name:'확인',exact:true}).click();await expect(allowance).toContainText('시작 자금 150코인');await expect(allowance.getByRole('button')).toBeFocused();
  await expect(page.getByRole('heading',{name:'알 탐색 연구',exact:true})).toHaveCount(0);
  await expect(page.locator('[data-permanent-product="eggFocus"]')).toHaveCount(0);
  await expect(page.locator('.permanent-products section')).toHaveCount(3);
  await page.reload();await expect(page.getByTestId('permanent-wallet')).toHaveText('19,200P');
  await page.keyboard.press('x');await expect(page).toHaveURL(/\/$/);await page.getByRole('link',{name:'알뽑기',exact:true}).click();await expect(page).toHaveURL(/\/eggs$/);
  await expect(page.getByRole('button',{name:'1회 뽑기 · 200P',exact:true})).toBeEnabled();await expect(page.getByRole('tablist')).toHaveCount(0);
  const response=page.waitForResponse(r=>r.url().includes('/api/battle')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'1회 뽑기 · 200P',exact:true}).click();const paid=await response;expect(paid.ok()).toBe(true);expect(paid.request().postDataJSON()).not.toHaveProperty('tuning');expect(store.view(owner).growthPoints).toBe(19000);
 }finally{store.close();}
});
