import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import {packTeam,starters} from '../src/data/teams';

for(const width of [1280,390])for(const kind of ['dynamax','terastallize'] as const)test(`trainer equipment purchase, HUD and team use: ${kind} at ${width}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='equipment-'+suffix,store=new TowerStore('.data/e2e.sqlite');
 try{
  const auth=await new Accounts(store.db).register('equip_'+suffix,'equipment-test-password',owner,undefined);
  store.ensurePlayer(owner);const first=store.battle(store.start(owner,starters)),run=first.run_id;
  // A v29 battle may still contain capabilities from the incorrect automatic grant.
  store.db.prepare('UPDATE battles SET trainer_equipment=? WHERE id=?').run('["Dynamax Band","Tera Orb"]',first.id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:900});await page.goto('/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();
  await expect(page.getByTestId('tera-toggle')).toHaveCount(0);await expect(page.locator('[data-gimmick=dynamax]')).toHaveCount(0);await expect(page.getByTestId('trainer-equipment')).toHaveCount(0);
  store.db.prepare("UPDATE runs SET state='select',floor=11 WHERE id=?").run(run);
  store.db.prepare('UPDATE players SET coins=15000 WHERE id=?').run(owner);
  store.db.prepare('INSERT OR REPLACE INTO item_shops VALUES (?,?,?)').run(run,11,JSON.stringify(['Dynamax Band','Tera Orb','Leftovers','Sitrus Berry']));
  await page.reload();await page.getByTestId('maintenance-shop').click();
  await page.locator('[data-held-item="Dynamax Band"]').click();await page.locator('[data-held-item="Tera Orb"]').click();
  await expect.poll(()=>store.trainerEquipment(run)).toEqual(['Dynamax Band','Tera Orb']);expect(store.view(owner).run!.heldItems).toEqual({});
  await expect(page.getByTestId('tera-ticket-product')).toHaveCount(0);
  store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(run,'Charizard','Leftovers');
  const row=store.battle(store.enter(owner,run,11,starters));
  const own=Showdown.Teams.unpack(row.player_team)!;own.forEach(p=>p.moves=['Protect','Rest']);
  const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),row.id);
  await page.reload();const hud=page.getByTestId('trainer-equipment');await expect(hud.locator('[data-equipment]')).toHaveCount(2);await expect(hud).not.toContainText('트레이너');
  await expect(hud.locator('img')).toHaveCount(2);
  expect(await hud.locator('img').evaluateAll(nodes=>nodes.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  const button=page.locator(`[data-gimmick="${kind}"]`);await expect(button).toBeEnabled();
  await page.keyboard.press('a');await expect(page.getByTestId('tera-toggle')).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('a');await expect(page.locator('[data-gimmick=dynamax]')).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('a');await expect(page.locator('.gimmick-icon-button[aria-pressed=true]')).toHaveCount(0);
  await button.click();await page.locator('[data-command="move 1"]').click();await page.keyboard.press('Shift');
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await page.getByRole('button',{name:'교체',exact:true}).click();await page.locator('[data-command="switch 2"]').click();await page.keyboard.press('Shift');
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(button).toBeVisible();await expect(button).toBeDisabled();
  expect(await button.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeLessThan(1);
  expect(store.view(owner).run!.heldItems!.Charizard).toBe('Leftovers');expect(store.trainerEquipment(run)).toEqual(['Dynamax Band','Tera Orb']);
  await page.screenshot({path:`test-results/trainer-equipment-${kind}-${width}.png`,fullPage:true});
  await page.reload();await expect(hud.locator('[data-equipment]')).toHaveCount(2);
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(button).toBeDisabled();
 }finally{store.close();}
});
