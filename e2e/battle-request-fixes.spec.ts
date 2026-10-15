import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';

test('slot 2 and 4 swap, persist, and current types fit PC/mobile HP cards',async({page,context})=>{
  const suffix=randomBytes(7).toString('hex'),owner='request-'+suffix,store=new TowerStore('.data/e2e.sqlite');
  let token='';
  try{token=(await new Accounts(store.db).register('fix_'+suffix,'test-password',owner,undefined)).token;store.ensurePlayer(owner);}finally{store.close();}
  await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/pokedex');
  await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();
  await page.getByRole('button',{name:'기술배치',exact:true}).click();
  const slots=page.locator('.move-slots button'),before=await slots.locator('strong').allTextContents();
  await slots.nth(1).click();
  const target=page.locator('.move-library button').filter({has:page.locator('strong',{hasText:before[3]})});
  const points=(await page.request.get('/api/battle').then(r=>r.json())).tower.growthPoints;
  await expect(target).toBeEnabled();await target.click();
  await expect(page.locator('.move-editor')).toHaveAttribute('aria-busy','false');
  await expect(page.getByRole('button',{name:/기술배치 저장/})).toHaveCount(0);
  await expect(slots.nth(1)).toHaveAttribute('data-game-cursor','true');
  expect((await page.request.get('/api/battle').then(r=>r.json())).tower.growthPoints).toBe(points);
  await expect(slots.nth(1).locator('strong')).toHaveText(before[3]);
  await expect(slots.nth(3).locator('strong')).toHaveText(before[1]);

  await page.reload();await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.getByRole('button',{name:'기술배치',exact:true}).click();
  await expect(slots.nth(1).locator('strong')).toHaveText(before[3]);await expect(slots.nth(3).locator('strong')).toHaveText(before[1]);
  const saved=await slots.locator('strong').allTextContents();
  await page.route('**/api/battle',route=>route.request().method()==='POST' && route.request().postDataJSON()?.type==='train'?route.fulfill({status:503,json:{error:'자동 저장 테스트 실패'}}):route.continue());
  await slots.nth(1).click();await page.locator('.move-library button').filter({has:page.locator('strong',{hasText:saved[3]})}).click();
  await expect(page.locator('.move-editor').getByRole('alert')).toHaveText('자동 저장 테스트 실패');await expect(slots.locator('strong')).toHaveText(saved);
  await page.unroute('**/api/battle');
  const response=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'start',selected:starters,rule:'basic'}});
  expect(response.ok(),await response.text()).toBe(true);
  await page.goto('/battle');
  await expect(page.locator('.player-health .health-types')).toHaveText('불꽃비행');
  await expect(page.locator('.enemy-health .health-types')).not.toBeEmpty();
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const card of await page.locator('.health-card').all())expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.screenshot({path:`test-results/battle-request-fixes-${width}.png`,fullPage:true});
  }
});

for(const width of [1280,390])test(`maintenance move changes save immediately and retain slot at ${width}`,async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner='auto-'+suffix,store=new TowerStore('.data/e2e.sqlite');
 try{
  const account=await new Accounts(store.db).register('auto_'+suffix,'autosave-password',owner,undefined);
  store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;
  store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(run);
  await context.addCookies([{name:'tower_auth',value:account.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:900});await page.goto('/battle');await page.getByTestId('maintenance-adjust').click();await page.locator('[data-adjust-partner="Charizard"]').click();await page.getByRole('button',{name:'기술배치',exact:true}).click();
  const editor=page.locator('.move-editor'),slots=editor.locator('.move-slots button'),original=await slots.locator('strong').allTextContents(),points=store.view(owner).growthPoints;
  await slots.nth(1).click();await editor.locator('.move-library button').filter({has:page.locator('strong',{hasText:original[3]})}).click();
  await expect(editor).toHaveAttribute('aria-busy','false');await expect(slots.nth(1)).toHaveAttribute('aria-pressed','true');if(width===1280)await expect(slots.nth(1)).toHaveAttribute('data-game-cursor','true');await expect(slots.nth(1).locator('strong')).toHaveText(original[3]);await expect(editor.getByRole('button',{name:/기술배치 저장/})).toHaveCount(0);expect(store.view(owner).growthPoints).toBe(points);
  await page.reload();await page.getByTestId('maintenance-adjust').click();await page.locator('[data-adjust-partner="Charizard"]').click();await page.getByRole('button',{name:'기술배치',exact:true}).click();await expect(slots.nth(1).locator('strong')).toHaveText(original[3]);
 }finally{store.close();}
});
