import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters} from '../src/data/teams';

for(const width of [1280,390])test('tabbed training, Enter/Z confirm and X cancel controls and ten-floor merged shop at '+width+'px',async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');try{
  store.ensurePlayer(owner);const id=store.battle(store.start(owner,starters)).run_id;
  store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(id);
  store.db.prepare('UPDATE players SET coins=20000,growth_points=1000 WHERE id=?').run(owner);
  store.db.prepare('INSERT INTO item_shops VALUES (?,?,?)').run(id,11,JSON.stringify(['Leftovers','Charizardite X']));
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:844});await page.goto('/pokedex');
  await page.getByRole('button',{name:'리자몽 상세 보기'}).click();await page.getByRole('button',{name:'능력치 조정',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'리자몽 능력치 조정'}),editor=page.getByTestId('training-editor');
  await expect(editor.getByRole('tab',{name:'능력치',exact:true})).toHaveAttribute('aria-selected','true');
  await editor.getByLabel('공격 능력 포인트',{exact:true}).fill('12');await editor.getByRole('tab',{name:'능력치',exact:true}).click();
  await page.keyboard.press('e');await expect(editor.getByRole('tab',{name:'성격',exact:true})).toHaveAttribute('aria-selected','true');
  const matrix=editor.getByLabel('성격 선택표').locator('tbody button');await matrix.nth(12).click();await page.keyboard.press('ArrowRight');await expect(matrix.nth(13)).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowDown');await expect(matrix.nth(18)).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowLeft');await expect(matrix.nth(17)).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowUp');await expect(matrix.nth(12)).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('e');await expect(editor.getByRole('button',{name:'테라스탈 선택',exact:true})).toBeVisible();
  await page.keyboard.press('q');await page.keyboard.press('q');await expect(editor.getByLabel('공격 능력 포인트',{exact:true})).toHaveValue('12');
  expect(await dialog.evaluate(el=>el.scrollHeight<=el.clientHeight+2)).toBe(true);
  await dialog.screenshot({path:'test-results/training-tabs-'+width+'.png'});
  await page.keyboard.press('x');await expect(dialog).toHaveCount(0);
  expect(store.trainingCollection(owner).find(x=>x.species==='Charizard')!.profile.evs.atk).toBe(0);
  await page.goto('/battle');const shop=page.getByTestId('tower-shop');await expect(shop).toBeVisible();
  await expect(shop.getByRole('button',{name:'일반 상점',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.consumable-products .shop-product')).toHaveCount(3);await expect(page.locator('[data-vitamin]')).toHaveCount(0);
  await page.locator('[data-held-item="Leftovers"]').click();await page.getByTestId('purchase-item-bag').click();
  await expect(page.getByRole('status').filter({hasText:'구매 완료!'})).toBeVisible();await page.keyboard.press('x');
  expect(store.view(owner).run!.itemBag!.Leftovers).toBe(1);expect(store.view(owner).run!.heldItems).toEqual({});
  const coins=store.view(owner).coins;await page.getByTestId('shop-reroll').click();await expect(page.getByTestId('shop-reroll')).toBeDisabled();
  expect(store.view(owner).coins).toBe(coins);await expect(page.locator('[data-held-item="Leftovers"]')).toHaveCount(0);
  await page.keyboard.press('e');await expect(shop.getByRole('button',{name:'기술머신',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId('shop-reroll')).toBeEnabled();await page.getByTestId('shop-reroll').click();await expect(page.getByTestId('shop-reroll')).toBeDisabled();
  await page.keyboard.press('e');await expect(page.locator('[data-vitamin]')).toHaveCount(4);await expect(page.getByTestId('shop-reroll')).toHaveCount(0);
  await page.reload();expect(store.view(owner).run!.shopRerolls!.items.count).toBe(1);expect(store.view(owner).run!.shopRerolls!.machines.count).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});
