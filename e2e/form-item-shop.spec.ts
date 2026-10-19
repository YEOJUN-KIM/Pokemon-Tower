import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import Showdown from 'pokemon-showdown';
import {packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
for(const width of [1280,390])test(`form choice cancellation, held ownership and last option at ${width}`,async({page,context})=>{
 const owner='choice_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register(owner,'choice-shop-password',owner,undefined);store.ensurePlayer(owner);store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,'Ogerpon');
  const run=store.battle(store.start(owner,['Ogerpon','Blastoise','Venusaur'],'chaos')).run_id;
  store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(run);store.db.prepare('UPDATE players SET coins=30000 WHERE id=?').run(owner);
  for(const item of ['Hearthflame Mask','Wellspring Mask'])store.db.prepare('INSERT INTO run_item_bag VALUES (?,?,1)').run(run,item);
  store.equipItem(owner,run,11,'Ogerpon','Hearthflame Mask');
  store.db.prepare('INSERT INTO item_shops VALUES (?,?,?)').run(run,11,JSON.stringify(['choice:ogerpon','Leftovers','Sitrus Berry','Life Orb']));
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:900});await page.goto('/battle');
  await page.getByTestId('maintenance-shop').click();await page.getByRole('button',{name:'지닌 도구',exact:true}).click();
  await page.locator('[data-held-item="choice:ogerpon"]').click();let dialog=page.getByRole('dialog',{name:'오거폰 가면 선택',exact:true});await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-choice-item="Hearthflame Mask"]')).toBeDisabled();await expect(dialog.locator('[data-choice-item="Wellspring Mask"]')).toBeDisabled();await expect(dialog.locator('[data-choice-item="Cornerstone Mask"]')).toBeEnabled();
  for(const img of await dialog.locator('img').all())expect(await img.evaluate(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0)).toBe(true);
  await dialog.getByRole('button',{name:'취소',exact:true}).click();expect(store.view(owner).coins).toBe(30000);expect(store.view(owner).run!.itemBag!['Cornerstone Mask']).toBeUndefined();
  await page.locator('[data-held-item="choice:ogerpon"]').click();dialog=page.getByRole('dialog',{name:'오거폰 가면 선택',exact:true});await dialog.screenshot({path:`test-results/form-choice-${width}.png`});await dialog.locator('[data-choice-item="Cornerstone Mask"]').click();await expect(dialog).toBeHidden();
  expect(store.view(owner).coins).toBe(25000);expect(store.view(owner).run!.itemBag!['Cornerstone Mask']).toBe(1);expect(store.view(owner).run!.itemBag!['choice:ogerpon']).toBeUndefined();
  await page.reload();expect(store.view(owner).coins).toBe(25000);store.db.prepare('INSERT INTO shop_rerolls VALUES (?,?,?,?)').run(run,11,'items',1);store.db.prepare('DELETE FROM item_shops WHERE run_id=?').run(run);expect(store.view(owner).run!.itemOffers).not.toContain('choice:ogerpon');
 }finally{store.close();}
});
for(const [base,forme,item,kind,name] of [['Rayquaza',undefined,'','mega','메가레쿠쟈'],['Necrozma','Necrozma-Dusk-Mane','Ultranecrozium Z','ultra','울트라네크로즈마']] as const)test(`${base} exposes the native ${kind} command without a fake stone`,async({page,context})=>{
 const owner='transform_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register(owner,'transform-password',owner,undefined);store.ensurePlayer(owner);store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,base);
  const profile=defaultProfile(base,forme);profile.moves=[base==='Rayquaza'?'Dragon Ascent':'Photon Geyser','Protect'];
  store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1)').run(owner,base,JSON.stringify(profile));
  const id=store.start(owner,[base,'Blastoise','Venusaur'],'chaos');
  const enemy=Showdown.Teams.unpack(packTeam(['Blastoise','Venusaur','Snorlax']))!;for(const p of enemy)p.moves=['Protect'];
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(packTeam([base,'Blastoise','Venusaur'],{[base]:profile},item?{[base]:item}:{}),Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();
  const toggle=page.locator(`[data-gimmick="${kind}"]`);await expect(toggle).toBeEnabled();await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');await page.locator('[data-command="move 2"]').click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:30000});await expect(page.locator('.player-position img')).toHaveAttribute('alt',name);await expect.poll(()=>page.locator('.player-position img').evaluate(i=>(i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.reload();await expect(page.locator('.player-position img')).toHaveAttribute('alt',name);await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(page.locator(`[data-gimmick="${kind}"]:not(:disabled)`)).toHaveCount(0);
 }finally{store.close();}
});
