import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters} from '../src/data/teams';

test('random four-offer stock is stable across browser reloads with no shop pagination',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);store.db.prepare('UPDATE players SET coins=1000 WHERE id=?').run(owner);
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');await page.getByRole('button',{name:'일반 상점',exact:true}).click();
    await expect(page.locator('[data-held-item]')).toHaveCount(4);const offers=await page.locator('[data-held-item]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-held-item')));expect(offers).toEqual(store.view(owner).run!.itemOffers);expect(new Set(offers).size).toBe(4);
    await expect(page.getByRole('button',{name:'다음 도구'})).toHaveCount(0);await page.reload();await page.getByRole('button',{name:'일반 상점',exact:true}).click();expect(await page.locator('[data-held-item]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-held-item')))).toEqual(offers);
    await page.getByTestId('held-item-products').screenshot({path:'test-results/random-item-shop-desktop.png'});
  }finally{store.close();}
});

test('held items buy with Z, cancel with X, transfer, and persist on mobile',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;
    store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);
    store.db.prepare('INSERT OR REPLACE INTO item_shops VALUES (?,?,?)').run(run,6,JSON.stringify(['Sitrus Berry','Leftovers','Miracle Seed','Charcoal']));
    store.db.prepare('UPDATE players SET coins=1000 WHERE id=?').run(owner);
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
    await page.goto('/battle');await page.getByRole('button',{name:'일반 상점',exact:true}).click();
    await page.locator('[data-held-item="Leftovers"]').click();
    await page.keyboard.press('x');
    await expect(page.getByRole('dialog',{name:'먹다남은음식 구매·장착',exact:true})).toHaveCount(0);
    expect(store.view(owner).coins).toBe(1000);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog',{name:'먹다남은음식 구매·장착',exact:true})).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog',{name:'먹다남은음식 구매·장착',exact:true}).getByRole('status')).toContainText('구매·장착 완료');
    expect(store.view(owner).run!.heldItems).toEqual({Charizard:'Leftovers'});
    await page.keyboard.press('x');
    await expect(page.getByTestId('shop-wallet')).toHaveText('600코인');
    await page.getByTestId('held-item-manager').click();
    const manager=page.getByRole('dialog',{name:'지닌 도구 관리',exact:true});
    await page.keyboard.press('Enter');
    await expect(manager).toContainText('리자몽 · 현재 먹다남은음식');
    await expect(manager.locator('[data-bag-item]')).toHaveCount(1);await expect(manager.locator('[data-bag-item="Sitrus Berry"]')).toHaveCount(0);
    await expect(manager.locator('[data-game-cursor=true]')).toContainText('도구 해제');
    await page.keyboard.press('Enter');
    await expect(manager).toContainText('가방 1개');
    await page.keyboard.press('x');
    await manager.getByRole('button').filter({hasText:'거북왕'}).click();
    await expect(manager.locator('[data-game-cursor=true]')).toContainText('먹다남은음식');
    await page.keyboard.press('Enter');
    await expect(manager).toContainText('거북왕 · 현재 먹다남은음식');
    expect(store.view(owner).run!.heldItems).toEqual({Blastoise:'Leftovers'});
    await page.keyboard.press('x');await page.keyboard.press('x');
    store.db.prepare('UPDATE run_item_bag SET quantity=1 WHERE run_id=? AND item=?').run(run,'Leftovers');
    await page.reload();await page.getByRole('button',{name:'일반 상점',exact:true}).click();await page.getByTestId('held-item-manager').click();
    await manager.getByRole('button').filter({hasText:'이상해꽃'}).click();
    const duplicate=manager.getByRole('button').filter({hasText:'가방 1개'});await expect(duplicate).toBeDisabled();await expect(duplicate).toContainText('거북왕 장착 중');
    await page.keyboard.press('x');await page.keyboard.press('x');
    await page.reload();await page.getByRole('button',{name:'일반 상점',exact:true}).click();
    await expect(page.getByTestId('held-item-manager')).toContainText('1마리 장착');
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('[data-held-item="Sitrus Berry"]').click();await page.keyboard.press('x');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-game-cursor=true]')).toHaveAttribute('data-held-item','Miracle Seed');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog',{name:'기적의씨 구매·장착',exact:true})).toBeVisible();
    await page.keyboard.press('x');
    await page.getByTestId('tower-shop').screenshot({path:'test-results/held-item-shop-mobile.png'});
  }finally{store.close();}
});

test('four saved shop tools buy new equipment and the bag lists only owned tools',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;
    store.db.prepare("UPDATE runs SET floor=16,state='select' WHERE id=?").run(run);store.db.prepare('UPDATE players SET coins=3000 WHERE id=?').run(owner);
    store.db.prepare('INSERT OR REPLACE INTO item_shops VALUES (?,?,?)').run(run,16,JSON.stringify(['Life Orb','Choice Band','Wide Lens','Charcoal']));
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width:390,height:844});await page.goto('/battle');await page.getByRole('button',{name:'일반 상점',exact:true}).click();
    await page.getByTestId('held-item-manager').click();const manager=page.getByRole('dialog',{name:'지닌 도구 관리',exact:true});await page.keyboard.press('Enter');await expect(manager).toContainText('보유한 도구가 없습니다');await expect(manager.locator('[data-bag-item]')).toHaveCount(0);await page.keyboard.press('x');await page.keyboard.press('x');
    await expect(page.getByRole('navigation',{name:'도구 상점 페이지'})).toHaveCount(0);await expect(page.locator('[data-held-item]')).toHaveCount(4);
    await expect(page.locator('[data-held-item="Life Orb"]').locator('..').locator('.held-item-label>span')).toHaveCSS('color','rgb(255, 130, 130)');
    await page.reload();await page.getByRole('button',{name:'일반 상점',exact:true}).click();await expect(page.locator('[data-held-item]')).toHaveCount(4);await expect(page.locator('[data-held-item="Life Orb"]')).toBeVisible();
    for(const item of ['Life Orb','Choice Band']){await page.locator(`[data-held-item="${item}"]`).click();await page.getByRole('button',{name:/^리자몽에게 구매·장착/}).click();await expect(page.getByRole('status').last()).toContainText('구매·장착 완료');await page.keyboard.press('x');}
    expect(store.view(owner).run!.heldItems!.Charizard).toBe('Choice Band');expect(store.view(owner).run!.itemBag!['Life Orb']).toBe(1);
    await page.getByTestId('held-item-manager').click();await page.keyboard.press('Enter');await expect(manager.locator('[data-bag-item]')).toHaveCount(2);await expect(manager.locator('[data-bag-item="Sitrus Berry"]')).toHaveCount(0);await expect(manager.locator('[data-bag-item="Life Orb"]')).toBeEnabled();await expect(manager.locator('[data-bag-item="Choice Band"]')).toBeDisabled();
    await page.screenshot({path:'test-results/expanded-owned-bag-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{store.close();}
});
