import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';

// Run Coin shop (beta.6): Held Items / Support / Pokemon Scout, four cards each, no TM tab.
for(const width of [1280,390])test('shop has three four-card tabs, scouts a Pokemon and rerolls at '+width+'px',async({page,context})=>{
 const owner='rs_'+randomBytes(8).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register(owner,'run-shop-password',owner,undefined);
  store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;store.db.prepare("UPDATE runs SET floor=21,state='select' WHERE id=?").run(run);store.db.prepare('UPDATE players SET coins=30000 WHERE id=?').run(owner);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:900});await page.goto('/battle');
  await page.getByTestId('maintenance-shop').click();
  await expect(page.getByRole('button',{name:'기술머신',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'지닌 도구',exact:true})).toBeVisible();
  await expect(page.locator('[data-held-item]')).toHaveCount(4);
  await page.getByRole('button',{name:'서포트',exact:true}).click();await expect(page.locator('[data-support]')).toHaveCount(4);
  const kind=await page.locator('[data-support]').first().getAttribute('data-support');await page.locator('[data-support]').first().click();
  await expect.poll(()=>store.view(owner).run!.battleItems![kind as 'attack']).toBe(1);
  await page.getByRole('button',{name:'포켓몬 스카우트',exact:true}).click();await expect(page.locator('[data-scout]')).toHaveCount(4);
  const first=store.view(owner).run!.scoutShop!.offers.map(o=>o.species);
  await page.reload();await page.getByTestId('maintenance-shop').click();await page.getByRole('button',{name:'포켓몬 스카우트',exact:true}).click();
  expect(store.view(owner).run!.scoutShop!.offers.map(o=>o.species)).toEqual(first);
  const coins=store.view(owner).coins;await page.getByTestId('scout-reroll').click();
  await expect.poll(()=>store.view(owner).run!.scoutShop!.revision).toBe(1);expect(store.view(owner).coins).toBeLessThan(coins);
  const target=store.view(owner).run!.scoutShop!.offers[0];await page.locator(`[data-scout="${target.species}"]`).click();
  await expect.poll(()=>store.view(owner).run!.roster.includes(target.species)).toBe(true);
  await expect(page.locator(`[data-scout="${target.species}"]`)).toBeDisabled();
 }finally{store.close();}
});
