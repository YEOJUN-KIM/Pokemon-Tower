import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {hiddenShopFixture} from '../tests/hidden-shop-fixture';
import {grantRunItem} from '../src/server/inventory-grants';
const definition=JSON.parse(readFileSync('docs/assets/manifests/mixed-runtime-assets.json','utf8'));
const external=new Set<string>(definition.groups.flatMap((g:any)=>g.files.map((f:any)=>'/sprites/'+f.path)));

for(const width of [1280,390])test(`missing mixed external assets preserve bag, shop and held-item interaction at ${width}`,async({page,context},info)=>{
 const owner='mixed-'+randomUUID(),f=hiddenShopFixture('.data/e2e.sqlite',owner),errors:string[]=[],requested:string[]=[];
 try{
  f.store.db.prepare("UPDATE player_tutorial SET step='Completed' WHERE player_id=?").run(owner);
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
  const auth=await new Accounts(f.store.db).register('mixed_'+randomUUID().slice(0,8),randomUUID(),owner,undefined);
  f.pin(['item-Life Orb','equipment-Tera Orb']);grantRunItem(f.store.db,f.run,'Focus Sash',1);grantRunItem(f.store.db,f.run,'Leftovers',1);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:900});page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/sprites/**',route=>{const pathname=new URL(route.request().url()).pathname;if(external.has(pathname)){requested.push(pathname);return route.fulfill({status:404,body:'External provider absent'});}return route.continue();});
  await page.goto('/battle');const shop=page.getByTestId('hidden-shop');await expect(shop).toBeVisible();
  await expect(shop.locator('img[src="/assets/original/item-placeholder.svg"]').first()).toBeVisible();
  await page.getByRole('button',{name:'배낭',exact:true}).click();const bag=page.getByTestId('bag');await expect(bag).toBeVisible();
  await expect(bag.locator('img[src="/assets/original/item-placeholder.svg"]').first()).toBeVisible();
  await bag.locator('[data-bag-entry="held:Focus Sash"]').click();await bag.locator('[data-bag-target=Charizard]').click();
  await expect.poll(()=>f.store.view(owner).run!.heldItems?.Charizard).toBe('Focus Sash');
  await expect(bag.locator('img[src="/assets/original/item-placeholder.svg"]').first()).toBeVisible();
  await page.screenshot({path:info.outputPath('mixed-missing-bag.png')});
  await page.getByRole('button',{name:'배낭 · 이번 도전 닫기',exact:true}).click();await expect(shop).toBeVisible();
  expect(requested.length).toBeGreaterThan(0);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{f.store.close();}
});

test('restored mixed providers and retained original/user files serve their golden bytes',async({request})=>{
 for(const file of [...definition.groups.map((g:any)=>g.files[0]),...definition.retained.filter((f:any)=>!f.text)]){
  const response=await request.get('/sprites/'+file.path);expect(response.ok(),file.path).toBe(true);
  const bytes=await response.body();expect(bytes.length,file.path).toBe(file.bytes);expect(createHash('sha256').update(bytes).digest('hex'),file.path).toBe(file.sha256);
 }
});
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {packTeam} from '../src/data/teams';
for(const kind of ['mega','terastallize'])test(`missing mixed art still permits real ${kind} activation and original player portrait`,async({page,context},info)=>{
 const owner='mixed-battle-'+randomUUID(),store=new TowerStore('.data/e2e.sqlite'),errors:string[]=[];
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const {token}=await new Accounts(store.db).register('mixed_b_'+randomUUID().slice(0,8),randomUUID(),owner,undefined);
  store.ensurePlayer(owner);const id=store.start(owner,['Charizard','Blastoise','Venusaur'],'chaos'),run=store.battle(id).run_id;
  store.db.prepare("UPDATE player_tutorial SET step='Completed' WHERE player_id=?").run(owner);
  if(kind==='terastallize'){store.db.prepare('INSERT INTO run_trainer_equipment VALUES (?,?)').run(run,'Tera Orb');store.db.prepare('UPDATE battles SET trainer_equipment=? WHERE id=?').run('["Tera Orb"]',id);}
  const own=Showdown.Teams.unpack(packTeam(['Charizard','Blastoise','Venusaur'],{},kind==='mega'?{Charizard:'Charizardite X'}:{}))!;own[0].moves=['Flamethrower','Growl'];
  const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
  await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  page.on('pageerror',error=>errors.push(error.message));await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
  await page.route('**/sprites/**',route=>external.has(new URL(route.request().url()).pathname)?route.fulfill({status:404,body:'External provider absent'}):route.continue());
  await page.goto('/battle');
  const portrait=await page.request.get('/sprites/trainers/player-back-sheet.png');expect(portrait.ok()).toBe(true);
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  const toggle=page.locator(`[data-gimmick="${kind}"]`);await expect(toggle).toBeEnabled();await toggle.click();
  const moved=page.waitForResponse(r=>r.url().endsWith('/api/battle')&&r.request().method()==='POST');await page.locator('[data-command="move 1"]').click();const response=await moved;expect(response.ok()).toBe(true);expect(JSON.stringify((await response.json()).battle.messages)).toContain(kind==='mega'?'|-mega|':'|-terastallize|');
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:20000});await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeEnabled();
  expect(errors).toEqual([]);await page.screenshot({path:info.outputPath('mixed-missing-'+kind+'.png')});
 }finally{store.close();}
});
