import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {Accounts} from '../src/server/accounts';
import {hiddenShopFixture} from '../tests/hidden-shop-fixture';

for(const width of [1280,390])test(`hidden shop at ${width}: immediate/cancel, mixed payment, duplicate receipt, two purchases and restore`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='hidden-'+suffix,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register('hs_'+suffix,'hidden-shop-test-password',owner,undefined);
  f.pin(['vitamin-atk','item-Life Orb','machine-Earthquake','egg-ticket-5','equipment-Dynamax Band'],['coins','growth-points','coins','growth-points','growth-points']);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  const shop=page.getByTestId('hidden-shop'),detail=page.getByTestId('hidden-shop-detail'),buy=page.locator('[data-hidden-shop-buy]');await expect(shop).toBeVisible();await expect(detail).toHaveAttribute('data-offer-id','vitamin-atk');await expect(shop).toContainText('구매 0 / 2');
  for(const [index,id] of ['vitamin-atk','item-Life Orb','machine-Earthquake','egg-ticket-5','equipment-Dynamax Band'].entries()){await page.keyboard.press(String(index+1));await expect(detail).toHaveAttribute('data-offer-id',id);}expect(f.store.view(owner).run!.event!.hiddenShop!.purchasedCount).toBe(0);
  await page.keyboard.press('1');await page.keyboard.press('ArrowDown');await expect(detail).toHaveAttribute('data-offer-id','item-Life Orb');await page.keyboard.press('ArrowUp');await expect(detail).toHaveAttribute('data-offer-id','vitamin-atk');
  mkdirSync('artifacts/qa/screenshots/hidden-shop',{recursive:true});await page.screenshot({path:`artifacts/qa/screenshots/hidden-shop/entry-${width}.png`});
  await buy.click();let acquisition=page.getByTestId('item-acquisition');await expect(acquisition).toBeVisible();await acquisition.getByRole('button',{name:'취소',exact:true}).click();expect(f.store.view(owner).run!.event!.hiddenShop!.purchasedCount).toBe(0);
  await buy.click();await acquisition.getByRole('button',{name:'바로 사용',exact:true}).click();await acquisition.locator('[data-partner=Charizard]').click();await expect(shop).toContainText('구매 1 / 2');await expect(page.getByRole('region',{name:'수상한 상인 대화'})).toContainText('하나 더 고를 수 있어');
  const before=f.store.view(owner),payload={type:'hidden-shop-purchase',runId:f.run,eventId:f.eventId,productId:'vitamin-atk',price:0,quantity:100};const repeated=await Promise.all([1,2].map(()=>page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:payload})));expect(repeated.every(r=>r.ok())).toBe(true);expect(f.store.view(owner)).toEqual(before);
  await shop.locator('[data-shop-offer="item-Life Orb"]').click();await buy.click();await acquisition.getByRole('button',{name:'배낭에 넣기',exact:true}).click();await expect(shop).toContainText('구매 2 / 2');await page.reload();await expect(shop).toContainText('구매 2 / 2');await page.keyboard.press('3');await expect(detail).toContainText('더 이상 구매할 수 없습니다.');await expect(buy).toBeDisabled();await expect(page.getByRole('button',{name:'배낭',exact:true})).toBeEnabled();
  const after=f.store.view(owner);expect(after.coins).toBe(49600);expect(after.growthPoints).toBe(9750);const third=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{...payload,productId:'egg-ticket-5'}});expect(third.status()).toBe(409);expect(f.store.view(owner)).toEqual(after);
  await page.screenshot({path:`artifacts/qa/screenshots/hidden-shop/purchased-${width}.png`});await page.getByRole('button',{name:'나가기',exact:true}).click();await expect(shop).toHaveCount(0);
 }finally{f.store.close();}
});

test('hidden shop can be left without purchasing and cannot be reopened by purchase API',async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner=`hidden-leave-${suffix}`,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register(`hl_${suffix}`,'hidden-shop-test-password',owner,undefined);
  const productId=f.store.view(owner).run!.event!.hiddenShop!.offers[0].id;
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');
  await expect(page.getByTestId('hidden-shop')).toBeVisible();const before=f.store.view(owner);await page.getByRole('button',{name:'나가기',exact:true}).click();await expect(page.getByTestId('hidden-shop')).toHaveCount(0);
  const replay=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'hidden-shop-purchase',runId:f.run,eventId:f.eventId,productId}});expect(replay.status()).toBe(409);expect(f.store.view(owner).coins).toBe(before.coins);expect(f.store.view(owner).growthPoints).toBe(before.growthPoints);
 }finally{f.store.close();}
});

test('concurrent purchase requests serialize both duplicate receipts and the last purchase slot',async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner=`hidden-race-${suffix}`,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register(`hr_${suffix}`,'hidden-shop-test-password',owner,undefined);
  f.pin(['vitamin-atk','vitamin-def','vitamin-spa'],['coins','growth-points','growth-points']);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  const buy=(productId:string)=>page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'hidden-shop-purchase',runId:f.run,eventId:f.eventId,productId}});
  const duplicate=await Promise.all([buy('vitamin-atk'),buy('vitamin-atk')]);expect(duplicate.every(r=>r.ok())).toBe(true);
  expect(f.store.view(owner).coins).toBe(49600);expect(f.store.view(owner).run!.event!.hiddenShop!.purchasedCount).toBe(1);
  const last=await Promise.all([buy('vitamin-def'),buy('vitamin-spa')]);expect(last.map(r=>r.status()).sort()).toEqual([200,409]);
  expect(f.store.view(owner).growthPoints).toBe(9920);expect(f.store.view(owner).run!.event!.hiddenShop!.purchasedCount).toBe(2);
  expect(f.store.db.prepare('SELECT COUNT(*) AS n FROM run_reward_inventory WHERE run_id=?').get(f.run)!.n).toBe(2);
 }finally{f.store.close();}
});

test('checkpoint regression: normal consumable, trainer equipment and TM still purchase through existing shop UI',async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner=`hidden-checkpoint-${suffix}`,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register(`hc_${suffix}`,'hidden-shop-test-password',owner,undefined);
  f.store.chooseEvent(owner,f.run,f.eventId,'leave');f.store.db.prepare('UPDATE runs SET floor=11 WHERE id=?').run(f.run);
  f.store.db.prepare('INSERT OR REPLACE INTO item_shops VALUES (?,?,?)').run(f.run,11,JSON.stringify(['Dynamax Band','Tera Orb','Life Orb','Leftovers']));
  f.store.db.prepare('INSERT OR REPLACE INTO consumable_shops VALUES (?,?,?)').run(f.run,11,JSON.stringify(['attack','speed','guard']));
  const machine=f.store.view(owner).run!.machineShop!.offers[0];
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');await page.getByTestId('maintenance-shop').click();
  await page.locator('[data-held-item="Dynamax Band"]').click();await expect.poll(()=>f.store.trainerEquipment(f.run)).toContain('Dynamax Band');
  await page.getByRole('button',{name:'배틀 아이템',exact:true}).click();await page.locator('.shop-product').filter({hasText:'플러스파워'}).click();await expect.poll(()=>f.store.view(owner).run!.battleItems?.attack).toBe(1);
  await page.getByRole('button',{name:'기술머신',exact:true}).click();await page.locator(`[data-machine="${machine.move}"]`).click();
  await expect.poll(()=>f.store.view(owner).run!.bag!.entries.some(e=>e.move===machine.move)).toBe(true);await expect(page.getByTestId('machine-confirmation')).toHaveCount(0);
  expect(f.store.view(owner).growthPoints).toBe(10000);await expect(page.getByText('영양제',{exact:true})).toHaveCount(0);
 }finally{f.store.close();}
});

for(const width of [1280,900,390])for(const count of [4,5])test(`hidden list/detail ${count} products at ${width}: Z TM purchase, restore, X`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='hl-'+suffix,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register('hy_'+suffix,'hidden-shop-test-password',owner,undefined);f.pin(['vitamin-atk','item-Life Orb','machine-Earthquake','egg-ticket-5','equipment-Dynamax Band'].slice(0,count));
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:900});await page.goto('/battle');const shop=page.getByTestId('hidden-shop'),detail=page.getByTestId('hidden-shop-detail');await expect(shop.locator('[data-product-id]')).toHaveCount(count);
  const list=await shop.locator('[data-keyboard-list]').boundingBox(),info=await detail.boundingBox();if(width>760)expect(list!.x+list!.width).toBeLessThan(info!.x);else expect(list!.y+list!.height).toBeLessThanOrEqual(info!.y);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('3');await expect(detail).toHaveAttribute('data-offer-id','machine-Earthquake');await expect(page.getByRole('log',{name:'상인 대화'})).toHaveAttribute('data-typing','false');await page.keyboard.press('z');await expect(shop).toContainText('구매 1 / 2');await expect(page.getByTestId('item-acquisition')).toHaveCount(0);expect(f.store.view(owner).run!.bag!.entries.some(e=>e.move==='Earthquake')).toBe(true);await page.reload();await expect(shop).toContainText('구매 1 / 2');await page.keyboard.press('x');await expect(shop).toHaveCount(0);
 }finally{f.store.close();}
});
