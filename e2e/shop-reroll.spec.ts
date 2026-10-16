import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
for(const width of [1280,390])test('checkpoint rerolls persist and vitamin sales are removed at '+width+'px',async({page,context})=>{
 const owner='sr_'+randomBytes(8).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register(owner,'shop-reroll-password',owner,undefined);
  store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(run);store.db.prepare('UPDATE players SET coins=20000 WHERE id=?').run(owner);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:900});await page.goto('/battle');
  await page.getByTestId('maintenance-shop').click();await expect(page.getByRole('button',{name:'육성',exact:true})).toHaveCount(0);await expect(page.locator('[data-vitamin]')).toHaveCount(0);expect(store.view(owner).run!.vitaminShop).toBeNull();
  await page.getByRole('button',{name:'기술머신',exact:true}).click();await page.getByTestId('shop-reroll').click();await expect(page.getByTestId('shop-reroll')).toHaveText('리롤 사용 완료');const offers=store.view(owner).run!.machineShop!.offers;
  await page.reload();await page.getByTestId('maintenance-shop').click();await page.getByRole('button',{name:'기술머신',exact:true}).click();await expect(page.getByTestId('shop-reroll')).toHaveText('리롤 사용 완료');expect(store.view(owner).run!.machineShop!.offers).toEqual(offers);expect(store.view(owner).coins).toBe(20000);
  await page.getByRole('button',{name:'지닌 도구',exact:true}).click();await page.getByTestId('shop-reroll').click();await expect(page.getByTestId('shop-reroll')).toHaveText('리롤 사용 완료');expect(store.view(owner).run!.itemOffers!.length).toBe(4);
 }finally{store.close();}
});
