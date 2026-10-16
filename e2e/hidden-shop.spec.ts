import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {Accounts} from '../src/server/accounts';
import {hiddenShopFixture} from '../tests/hidden-shop-fixture';

for(const width of [1280,390])test(`hidden shop at ${width}: snapshot, mixed payment, duplicate API, limit and leave`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner=`hidden-${suffix}`,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
  const auth=await new Accounts(f.store.db).register(`hs_${suffix}`,'hidden-shop-test-password',owner,undefined);
  f.pin(['vitamin-atk','item-Life Orb','machine-Earthquake','egg-ticket-5','equipment-Dynamax Band'],['coins','growth-points','coins','growth-points','growth-points']);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  const shop=page.getByTestId('hidden-shop'),cards=shop.locator('[data-product-id]');
  await expect(shop).toBeVisible();await expect(cards).toHaveCount(5);await expect(shop).toContainText('남은 구매 횟수 2');
  for(const img of await shop.locator('img').all())expect(await img.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(shop.getByLabel('보유 재화')).toContainText('타워 코인');await expect(shop.getByLabel('보유 재화')).toContainText('성장 포인트');
  const before=await cards.allTextContents();await page.reload();await expect(shop).toBeVisible();expect(await cards.allTextContents()).toEqual(before);
  const vitaminButton=shop.locator('[data-product-id="vitamin-atk"] button');
  if(width===1280){await vitaminButton.evaluate(element=>document.dispatchEvent(new CustomEvent('game-cursor-select',{detail:element})));await expect(vitaminButton).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('Enter');}else await vitaminButton.click();
  await expect(shop).toContainText('남은 구매 횟수 1');
  await expect(shop.locator('[data-product-id="vitamin-atk"] button')).toBeDisabled();
  const saved=f.store.view(owner);
  const payload={type:'hidden-shop-purchase',runId:f.run,eventId:f.eventId,productId:'vitamin-atk',price:0,currency:'growth-points',quantity:100,item:'Life Orb'};
  const repeated=await Promise.all([1,2].map(()=>page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:payload})));
  expect(repeated.every(r=>r.ok())).toBe(true);expect(f.store.view(owner)).toEqual(saved);
  await shop.locator('[data-product-id="item-Life Orb"] button').click();await expect(shop).toContainText('구매 한도를 모두 사용했습니다.');
  await page.reload();await expect(shop).toContainText('총 2 / 2개 구매');
  for(const button of await shop.locator('button').all())await expect(button).toBeDisabled();
  const after=f.store.view(owner);expect(after.coins).toBe(49600);expect(after.growthPoints).toBe(9750);
  const third=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{...payload,productId:'egg-ticket-5'}});expect(third.status()).toBe(409);expect(f.store.view(owner)).toEqual(after);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await shop.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await expect(page.getByRole('button',{name:'나가기',exact:true})).toBeInViewport();
  mkdirSync('artifacts/qa/screenshots/hidden-shop',{recursive:true});await page.screenshot({path:`artifacts/qa/screenshots/hidden-shop/purchased-${width}.png`});
  await page.getByRole('button',{name:'나가기',exact:true}).click();await expect(shop).toHaveCount(0);
  expect(f.store.view(owner).run!.event).toBeNull();expect(f.store.view(owner).run!.floor).toBe(2);
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
  await page.getByRole('button',{name:'배틀 아이템',exact:true}).click();await page.locator('.shop-product').filter({hasText:'플러스파워'}).getByRole('button').click();await expect.poll(()=>f.store.view(owner).run!.battleItems?.attack).toBe(1);
  await page.getByRole('button',{name:'기술머신',exact:true}).click();await page.locator(`[data-machine="${machine.move}"]`).click();
  const dialog=page.getByTestId('machine-confirmation');await dialog.locator(`[data-target="${machine.targets[0]}"]`).click();await dialog.getByRole('button',{name:'도감에만 저장',exact:true}).click();await dialog.locator('.machine-buy').click();await expect(dialog).toContainText('기술머신 구매 완료');
  expect(f.store.db.prepare('SELECT 1 FROM move_unlocks WHERE player_id=? AND species=? AND move=?').get(owner,machine.targets[0],machine.move)).toBeTruthy();
  expect(f.store.view(owner).growthPoints).toBe(10000);await expect(page.getByText('영양제',{exact:true})).toHaveCount(0);
 }finally{f.store.close();}
});
