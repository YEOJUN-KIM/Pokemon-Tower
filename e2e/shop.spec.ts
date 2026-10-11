import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters} from '../src/data/teams';

test('legacy checkpoint purchases and restores battle item stock before entering floor six',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token);const store=new TowerStore('.data/e2e.sqlite');
  try {
    store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;
    store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);
    store.db.prepare('UPDATE players SET coins=1200 WHERE id=?').run(owner);
    store.db.prepare('INSERT INTO consumable_shops VALUES (?,?,?)').run(run,6,JSON.stringify(['attack','speed','guard']));
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
    await page.goto('/battle');
    await expect(page.getByTestId('tower-shop')).toBeVisible();
    await expect(page.getByTestId('shop-wallet')).toHaveText('1,200코인');
    await page.locator('.shop-product').filter({hasText:'플러스파워'}).getByRole('button').click();
    await expect(page.getByTestId('wallet')).toHaveText('900코인');
    await expect(page.getByTestId('shop-wallet')).toHaveText('900코인');
    await expect(page.locator('.consumable-products').filter({hasText:'플러스파워'})).toContainText('보유 1개');
    await page.locator('.shop-product').filter({hasText:'스피드업'}).getByRole('button').click();
    await expect(page.getByTestId('wallet')).toHaveText('600코인');
    await page.reload();
    expect(store.view(owner).run!.battleItems).toEqual({attack:1,speed:1});
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const dialog=page.getByRole('dialog',{name:'6층 출전 준비',exact:true});
    expect(await dialog.evaluate(el=>el.getBoundingClientRect().height<=innerHeight)).toBe(true);
    await page.getByTestId('tower-shop').screenshot({path:'test-results/checkpoint-shop.png'});
    await page.getByRole('button',{name:'출전 팀 선택'}).click();
    await page.getByRole('button',{name:'6층 배틀 시작'}).click();await page.getByRole('button',{name:'포켓몬 내보내기 · Enter',exact:true}).click();
    await expect(page.getByTestId('tower-shop')).toHaveCount(0);
    const saved=store.currentBattle(owner)!;expect(JSON.parse(saved.battle_items)).toEqual({attack:1,speed:1});
    await page.reload();expect(store.view(owner).run!.battleItems).toEqual({attack:1,speed:1});
  } finally {store.close();}
});
