import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {hiddenShopFixture} from '../tests/hidden-shop-fixture';
import {grantRunItem,grantStoredReward} from '../src/server/inventory-grants';

for(const width of [1280,390])test(`maintenance shop omits Bag and preserves purchases across the menu Bag at ${width}`,async({page,context})=>{
 const owner='utility-'+randomUUID(),f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.chooseEvent(owner,f.run,f.eventId,'leave');f.store.db.prepare('UPDATE runs SET floor=11 WHERE id=?').run(f.run);grantStoredReward(f.store.db,f.run,{kind:'machine',move:'Earthquake',amount:1});
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register('u_'+randomUUID().replaceAll('-','').slice(0,12),'bag-test-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);await page.setViewportSize({width,height:900});await page.goto('/battle');await page.getByTestId('maintenance-shop').click();const shop=page.getByTestId('tower-shop');
  await expect(shop.locator('[data-open-bag]')).toHaveCount(0);await expect(shop.getByTestId('shop-wallet')).toBeVisible();await expect(shop.locator('.shop-categories button')).toHaveCount(3);
  for(const category of ['지닌 도구','배틀 아이템','기술머신']){await shop.getByRole('button',{name:category,exact:true}).click();await expect(shop.locator('[data-keyboard-tab-products]')).toHaveCount(1);expect(await shop.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);}
  const move=f.store.view(owner).run!.machineShop!.offers[0].move;await shop.locator(`[data-machine="${move}"]`).click();await expect(shop.locator(`[data-machine-offer="${move}"] .shop-product-status`)).toHaveText('구매 완료');
  await shop.getByTestId('shop-reroll').click();await expect.poll(()=>f.store.view(owner).run!.machineShop!.offers.every(offer=>offer.move!==move)).toBe(true);const before=f.store.view(owner);
  await page.getByRole('button',{name:'정비 상점 닫기',exact:true}).click();const trigger=page.getByTestId('run-maintenance').locator('[data-open-bag]');await trigger.click();const bag=page.getByTestId('bag');await expect(bag).toBeVisible();
  await bag.getByRole('button',{name:'기술머신',exact:true}).click();await expect(bag.locator('[data-bag-entry]').filter({hasText:'지진'})).toBeVisible();await page.keyboard.press('x');await expect(bag).toHaveCount(0);await expect(trigger).toBeFocused();
  const after=f.store.view(owner);expect(after.coins).toBe(before.coins);expect(after.run!.machineShop!.offers).toEqual(before.run!.machineShop!.offers);expect(after.run!.shopRerolls).toEqual(before.run!.shopRerolls);
 }finally{f.store.close();}
});

test('target cursor skips two disabled Pokemon for TM, held item and vitamin; immediate vitamin and all-disabled are safe',async({page,context})=>{
 const owner='eligibility-'+randomUUID(),f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.pin(['vitamin-atk','item-Life Orb','machine-Calm Mind','egg-ticket-5']);
  grantStoredReward(f.store.db,f.run,{kind:'machine',move:'Earthquake',amount:1});grantRunItem(f.store.db,f.run,'Charizardite X',1);grantStoredReward(f.store.db,f.run,{kind:'vitamin',stat:'atk',amount:2});
  const machine=f.store.view(owner).run!.bag!.entries.find(e=>e.move==='Earthquake')!;f.store.useBag(owner,f.run,randomUUID(),machine.id,'Blastoise',0);
  f.store.db.prepare('DELETE FROM members WHERE run_id=?').run(f.run);for(const [slot,name] of ['Urshifu','Blastoise','Charizard'].entries())f.store.db.prepare('INSERT INTO members VALUES (?,?,?)').run(f.run,slot,name);
  for(const [i,name] of ['Urshifu','Blastoise'].entries())for(let n=0;n<3;n++)f.store.db.prepare('INSERT INTO vitamin_purchases VALUES (?,?,?,?,?)').run(f.run,-10+i*3+n,'hp',name,0);
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register('el_'+randomUUID().replaceAll('-','').slice(0,12),'bag-test-password',owner,undefined);await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);await page.goto('/battle');await expect(page.getByTestId('hidden-shop')).toBeVisible();await page.keyboard.press('b');const bag=page.getByTestId('bag');
  for(const [pocket,label] of [['도구','지니게 하기'],['소모품','사용'],['기술머신','사용']]){
   await bag.getByRole('button',{name:pocket,exact:true}).click();if(pocket==='소모품')await bag.getByRole('button',{name:label,exact:true}).click();else await bag.locator('[data-bag-entry]').first().click();await expect(bag.locator('[data-bag-target=Urshifu]')).toBeDisabled();await expect(bag.locator('[data-bag-target=Blastoise]')).toBeDisabled();await expect(bag.locator('[data-bag-target=Charizard]')).toHaveAttribute('data-initial-focus','true');await expect(bag.locator('[data-game-cursor=true][data-bag-target]')).toHaveAttribute('data-bag-target','Charizard');if(pocket==='소모품')await expect(bag.locator('[data-bag-target=Blastoise]')).toContainText('영양제 한도 도달');await page.keyboard.press('x');
  }
  await page.keyboard.press('x');const shop=page.getByTestId('hidden-shop');await shop.locator('[data-shop-offer="vitamin-atk"]').click();await page.locator('[data-hidden-shop-buy]').click();const acquisition=page.getByTestId('item-acquisition');await acquisition.getByRole('button',{name:'바로 사용',exact:true}).click();await expect(acquisition.locator('[data-partner=Urshifu]')).toBeDisabled();await expect(acquisition.locator('[data-partner=Blastoise]')).toContainText('영양제 한도 도달');await expect(acquisition.locator('[data-partner=Charizard]')).toHaveAttribute('data-game-cursor','true');const before=f.store.view(owner);
  await acquisition.getByRole('button',{name:'취소',exact:true}).click();await acquisition.getByRole('button',{name:'취소',exact:true}).click();expect(f.store.view(owner).coins).toBe(before.coins);
  const rejected=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'hidden-shop-purchase',runId:f.run,eventId:f.eventId,productId:'vitamin-atk',destination:'use',species:'Blastoise'}});expect(rejected.ok()).toBe(false);expect(f.store.view(owner)).toEqual(before);
  await page.locator('[data-hidden-shop-buy]').click();await acquisition.getByRole('button',{name:'바로 사용',exact:true}).click();await expect(acquisition.locator('[data-partner=Charizard]')).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('Enter');await expect(acquisition).toHaveCount(0);expect(f.store.view(owner).coins).toBe(before.coins-400);expect(f.store.db.prepare('SELECT points FROM run_stat_boosts WHERE run_id=? AND species=? AND stat=?').get(f.run,'Charizard','atk')!.points).toBe(5);
  // Every member is now blocked for this vitamin by the cap or the existing floor/stat ledger.
  await page.keyboard.press('b');await bag.getByRole('button',{name:'소모품',exact:true}).click();await bag.getByRole('button',{name:'사용',exact:true}).click();await expect(bag.locator('[data-bag-target]:not(:disabled)')).toHaveCount(0);await expect(bag.locator('[data-bag-target][data-initial-focus]')).toHaveCount(0);await expect(bag).toContainText('사용할 수 있는 포켓몬이 없습니다.');await expect(bag.locator('[data-bag-target][data-game-cursor]')).toHaveCount(0);const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.postData()??'');});await page.keyboard.press('z');await page.keyboard.press('Enter');expect(posts).toHaveLength(0);
 }finally{f.store.close();}
});
