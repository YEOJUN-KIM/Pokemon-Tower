import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {hiddenShopFixture} from '../tests/hidden-shop-fixture';

for(const width of [1280,390])test(`maintenance shared settings, shop purchase and zero-turn battle item at ${width}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='maint-'+suffix,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.chooseEvent(owner,f.run,f.eventId,'leave');f.store.db.prepare('UPDATE runs SET floor=11 WHERE id=?').run(f.run);f.store.db.prepare('INSERT INTO consumable_shops VALUES (?,?,?)').run(f.run,11,JSON.stringify(['attack','speed','guard']));
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register('mi_'+suffix,'maintenance-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);await page.setViewportSize({width,height:width===390?844:900});await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));await page.goto('/battle');
  await page.getByTestId('maintenance-shop').click();const shop=page.getByTestId('tower-shop');await expect(shop.locator('[data-open-bag]')).toHaveCount(0);
  await shop.getByRole('button',{name:'배틀 아이템',exact:true}).click();await shop.getByRole('button',{name:'플러스파워 · 300코인 구매',exact:true}).click();await expect.poll(()=>f.store.view(owner).run!.battleItems!.attack).toBe(1);
  await page.getByRole('button',{name:'정비 상점 닫기',exact:true}).click();await page.getByTestId('maintenance-adjust').click();await page.locator('[data-adjust-partner=Charizard]').click();
  const settings=page.getByTestId('pokemon-settings');await expect(settings).toBeVisible();await settings.locator('[data-settings-row=atk]').click();await expect(page.getByTestId('ev-picker')).toBeVisible();for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');await expect(page.getByTestId('ev-amount')).toHaveText('4');await page.keyboard.press('Enter');const original=f.store.view(owner).run!.adjustment!.entries.find(entry=>entry.species==='Charizard')!.profile;
  await settings.locator('[data-settings-row=gender]').click();await settings.locator('[data-settings-row=nature]').click();await page.locator('[data-nature=Modest]').click();
  await settings.locator('[data-settings-row=ability]').click();await page.getByTestId('ability-picker').getByRole('button',{name:/선파워/}).click();await settings.locator('[data-settings-row=tera]').click();await page.getByTestId('tera-picker').getByRole('button',{name:'물',exact:true}).click();
  await settings.locator('[data-settings-row=move-0]').click();await page.locator(`[data-move="${original.moves[1]}"]`).click();
  await settings.locator('[data-settings-save]').click();await expect(settings.getByRole('status')).toHaveText('설정 저장 완료');
  const saved=f.store.view(owner).run!.adjustment!.entries.find(entry=>entry.species==='Charizard')!.profile;expect(saved.evs.atk).toBe(4);expect(saved.gender).not.toBe(original.gender);expect(saved.nature).toBe('Modest');expect(saved.ability).toBe('Solar Power');expect(saved.teraType).toBe('Water');expect(saved.moves[0]).toBe(original.moves[1]);
  await page.keyboard.press('Escape');await expect(page.locator('[data-adjust-partner=Charizard]')).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('Escape');await page.getByRole('button',{name:'출전 팀 선택 →',exact:true}).click();
  await page.getByRole('button',{name:/11층 (배틀 시작|보스 도전)/}).click();await expect(page.locator('[data-intro-message]')).toBeVisible();await page.keyboard.press('Enter');await page.keyboard.press('Shift');await expect(page.locator('.battle-root-menu')).toBeVisible();
  const before=await page.request.get('/api/battle').then(response=>response.json());await page.getByRole('button',{name:'도구',exact:true}).click();await page.locator('[data-battle-item=attack]').click();await page.keyboard.press('Shift');await expect(page.getByRole('dialog',{name:'배틀 도구',exact:true})).toHaveCount(0);
  const after=await page.request.get('/api/battle').then(response=>response.json());expect(after.battle.turn).toBe(before.battle.turn);expect(after.tower.run.battleItems.attack).toBeUndefined();await page.reload();await page.getByRole('button',{name:'도구',exact:true}).click();await expect(page.getByRole('dialog',{name:'배틀 도구',exact:true})).toContainText('보유한 배틀 아이템이 없습니다');
 }finally{f.store.close();}
});
