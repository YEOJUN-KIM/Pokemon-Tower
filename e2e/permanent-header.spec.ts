import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';

for(const width of [1280,390])for(const pageName of ['eggs','upgrades'])test(`title-only ${pageName} header, unfocusable footer and X return at ${width}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner=`header-${suffix}`,store=new TowerStore('.data/e2e.sqlite');
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register(`ph_${suffix}`,'permanent-header-password',owner,undefined);store.ensurePlayer(owner);store.db.prepare('UPDATE players SET growth_points=20000 WHERE id=?').run(owner);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:900});await page.goto(`/${pageName}`);await expect(page.getByTestId('permanent-wallet')).toHaveText('20,000P');
  const header=page.locator('.permanent-page-header'),back=page.getByRole('link',{name:'돌아가기',exact:true});
  await expect(header.getByRole('heading',{name:pageName==='eggs'?'알뽑기':'영구 업그레이드',exact:true})).toBeVisible();await expect(header.locator('a,button')).toHaveCount(0);await expect(page.locator('.permanent-shop nav')).toHaveCount(0);
  await expect(back).toHaveAttribute('tabindex','-1');await expect(back).toHaveAttribute('href','/');
  for(let n=0;n<8;n++){await page.keyboard.press('ArrowDown');await expect(back).not.toHaveAttribute('data-game-cursor','true');}
  for(let n=0;n<8;n++){await page.keyboard.press('Tab');await expect(back).not.toBeFocused();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`artifacts/qa/screenshots/permanent-header/${pageName}-${width}.png`,fullPage:true});
  if(pageName==='eggs')await page.locator('[data-egg-draw="1"]').focus();else await page.locator('[data-permanent-product="allowance"]').focus();
  await page.keyboard.press('x');await expect(page).toHaveURL(/\/$/);
  await page.goto(`/${pageName}`);await back.click();await expect(page).toHaveURL(/\/$/);
 }finally{store.close();}
});
