import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';

for(const width of [1280,390])test(`research purchases and focused eggs at ${width}`,async({page,context})=>{
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
  const research=page.locator('.permanent-products section').filter({has:page.getByRole('heading',{name:'알 탐색 연구',exact:true})});
  await research.getByRole('button').click();await expect(complete.getByRole('heading',{name:'알 탐색 연구',exact:true})).toBeVisible();await expect(complete).toContainText('50%');await expect(complete).toContainText('55%');await expect(complete).toContainText('−1,000P');await expect(complete).toContainText('18,200P');await expect(complete.getByLabel('업그레이드 1 / 3단계')).toBeVisible();
  expect(await complete.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await complete.screenshot({path:`artifacts/qa/screenshots/upgrade-popup/focus-${width}.png`});
  await page.keyboard.press('Escape');await expect(complete).toHaveCount(0);await expect(research).toContainText('지정 대상 비중 55%');
  await page.reload();await expect(page.getByTestId('permanent-wallet')).toHaveText('18,200P');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`artifacts/qa/screenshots/currency-balance/research-${width}.png`,fullPage:true});
  await page.keyboard.press('x');await expect(page).toHaveURL(/\/$/);await page.getByRole('link',{name:'알뽑기',exact:true}).click();await expect(page).toHaveURL(/\/eggs$/);await page.getByRole('tab',{name:'지역',exact:true}).click();await page.getByRole('button',{name:'호연',exact:true}).click();await expect(page.locator('.egg-station')).toContainText('지정 대상 비중 50 + 5%');
  await expect(page.getByRole('button',{name:'1회 뽑기 · 250P',exact:true})).toBeEnabled();
  await page.screenshot({path:`artifacts/qa/screenshots/currency-balance/focus-${width}.png`,fullPage:true});
  const response=page.waitForResponse(r=>r.url().includes('/api/battle')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'1회 뽑기 · 250P',exact:true}).click();const paid=await response;expect(paid.ok()).toBe(true);expect(paid.request().postDataJSON().tuning).toEqual({kind:'region',region:'hoenn'});expect(store.view(owner).growthPoints).toBe(17950);
 }finally{store.close();}
});
