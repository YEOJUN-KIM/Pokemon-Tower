import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {defaultProfile} from '../src/server/training';
import {hiddenShopFixture} from '../tests/hidden-shop-fixture';

for(const width of [1280,390])for(const floor of [2,11])test(`shared run settings, form preservation and focus at floor ${floor} ${width}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='runsettings-'+suffix,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.chooseEvent(owner,f.run,f.eventId,'leave');f.store.db.prepare('UPDATE runs SET floor=? WHERE id=?').run(floor,f.run);
  f.store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,'Shaymin');f.store.db.prepare('INSERT INTO members VALUES (?,?,?)').run(f.run,3,'Shaymin');
  const profile=defaultProfile('Shaymin','Shaymin-Sky');f.store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1)').run(owner,'Shaymin',JSON.stringify(profile));
  const profiles=JSON.parse(f.store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(f.run)!.profiles as string);profiles.Shaymin=profile;f.store.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),f.run);
  const permanent=structuredClone(profile);permanent.ivs.hp=31;f.store.db.prepare('UPDATE pokemon_training SET profile=? WHERE player_id=? AND species=?').run(JSON.stringify(permanent),owner,'Shaymin');
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register('rs_'+suffix,'run-settings-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  if(floor===11){
   const maintenance=page.getByTestId('run-maintenance');await expect(maintenance).toBeVisible();await expect(page.locator('[data-menu-context]')).toHaveAttribute('data-menu-context','maintenance-menu');await expect(maintenance).not.toContainText('지닌 도구 · 배틀 아이템 · 기술머신');await expect(maintenance).not.toContainText('기술배치 · 능력치');
   await page.getByTestId('maintenance-shop').click();await expect(page.getByTestId('tower-shop').locator('[data-open-bag]')).toHaveCount(0);await page.getByRole('button',{name:'정비 상점 닫기',exact:true}).click();
   await page.getByTestId('maintenance-adjust').click();await page.locator('[data-adjust-partner=Shaymin]').click();
  }else {await page.locator('[data-party-species=Shaymin]').hover();await page.keyboard.press('x');}
  const settings=page.getByTestId('pokemon-settings');await expect(settings).toBeVisible();await expect(settings.locator('[data-settings-row=form]')).toHaveCount(0);await expect(settings).toContainText('스카이');
  await expect(settings).toContainText('이번 출전부터 적용');await expect(page.getByRole('button',{name:'포켓몬 선택으로',exact:true})).toHaveCount(0);await expect(page.locator('.game-menu-footer')).toHaveCount(1);
  for(const stat of ['hp','atk','def','spa','spd','spe']){await settings.locator(`[data-settings-row=${stat}]`).click();await expect(page.getByTestId('ev-picker')).toBeVisible();await page.keyboard.press('ArrowRight');await expect(page.getByTestId('ev-amount')).toHaveText('1');await page.keyboard.press('Escape');await expect(page.getByTestId('ev-picker')).toHaveCount(0);}
  await settings.locator('[data-settings-row=atk]').click();await expect(page.getByTestId('ev-picker')).toBeVisible();await page.keyboard.press('ArrowRight');await expect(page.getByTestId('ev-amount')).toHaveText('1');await page.keyboard.press('Enter');await expect(page.getByTestId('ev-picker')).toHaveCount(0);await expect(settings.locator('[data-settings-row=atk]')).toContainText('+1');
  await settings.locator('[data-settings-row=nature]').click();await page.locator('[data-nature=Modest]').click();
  await settings.locator('[data-settings-row=move-0]').click();const move=page.locator('[data-move]').first();await move.click();
  await settings.locator('[data-settings-save]').click();await expect(settings.getByRole('status')).toHaveText('설정 저장 완료');await page.screenshot({path:`test-results/run-settings-${floor}-${width}.png`});
  const saved=f.store.view(owner).run!.adjustment!.entries.find(entry=>entry.species==='Shaymin')!;expect(saved.profile.forme).toBe('Shaymin-Sky');expect(saved.profile.evs.atk).toBe(1);expect(saved.profile.ivs.hp).toBe(0);expect(f.store.trainingCollection(owner).find(entry=>entry.species==='Shaymin')!.profile.ivs.hp).toBe(31);expect(saved.profile.nature).toBe('Modest');
  await page.keyboard.press('x');const card=page.locator(floor===11?'[data-adjust-partner=Shaymin]':'[data-party-species=Shaymin]');await expect(card).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press(floor===11?'z':'x');await expect(settings).toBeVisible();await expect(settings.locator('[data-settings-row=form]')).toHaveCount(0);await page.keyboard.press('Escape');await expect(card).toHaveAttribute('data-game-cursor','true');
  await page.reload();expect(f.store.view(owner).run!.adjustment!.entries.find(entry=>entry.species==='Shaymin')!.profile.forme).toBe('Shaymin-Sky');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{f.store.close();}
});
