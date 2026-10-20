import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {raidFixture,finishRaidBattle} from '../tests/raid-fixture';
import {Accounts} from '../src/server/accounts';

for(const width of [1280,390])for(const bossId of ['garchomp','mewtwo'])test(`raid ${bossId} silhouette, reveal, recruit and reward at ${width}`,async({page,context})=>{
 const owner='raid_'+randomBytes(8).toString('hex'),f=raidFixture('.data/e2e.sqlite',owner,bossId,bossId==='mewtwo'?'y':'mega');
 try{
  const auth=await new Accounts(f.store.db).register(owner,'raid-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/battle');
  const scene=page.getByTestId('raid-encounter');await expect(scene).toBeVisible();
  await expect(scene).toHaveAttribute('data-category',bossId==='mewtwo'?'legendary':'normal');
  await expect(scene).toContainText('정체불명의 강적');await expect(scene).toContainText('보상: 특별한 보상');
  await expect(page.getByTestId('run-event')).not.toContainText(/한카리아스|뮤츠|★★★★★|난이도/);
  await expect(scene.locator('img')).toHaveAttribute('alt','정체불명의 포켓몬');
  await expect.poll(()=>scene.locator('img').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  expect(await page.getByTestId('raid-silhouette').evaluate(el=>getComputedStyle(el).filter)).toBe('brightness(0)');
  const aura=await page.getByTestId('raid-aura').evaluate(el=>getComputedStyle(el).borderTopWidth);expect(aura).toBe(bossId==='mewtwo'?'2px':'0px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const button=page.locator('[data-event-confirm]');await expect(button).toBeVisible();
  const bounds=await button.boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(width===390?844:900);
  mkdirSync('artifacts/qa/screenshots/raids',{recursive:true});await page.screenshot({path:`artifacts/qa/screenshots/raids/${bossId}-${width}.png`});
  const raw=f.store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json;
  await page.reload();await expect(scene).toBeVisible();expect(f.store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json).toBe(raw);
  let confirms=0;page.on('dialog',async dialog=>{confirms++;await dialog.dismiss();});
  await page.locator('[data-event-confirm]').click();
  await expect.poll(()=>f.store.view(owner).run!.state).toBe('battle');await expect(scene).toHaveCount(0);expect(confirms).toBe(0);
  await expect(page.getByTestId('trainer-entrance')).toHaveCount(0);
  await expect(page.locator('.enemy-health')).toContainText(bossId==='mewtwo'?'뮤츠':'한카리아스');
  await page.reload();await expect(page.locator('.enemy-health')).toBeVisible();await page.screenshot({path:`test-results/battle-hud-${bossId}-${width}.png`});
  const battle=f.store.currentBattle(owner)!;finishRaidBattle(f.store,battle.id);await page.reload();
  await expect(scene).toHaveCount(0);
  const recruitment=page.getByRole('dialog',{name:'동료 영입',exact:true});await expect(recruitment).toBeVisible();
  await expect(scene).toHaveCount(0);
  const name=bossId==='mewtwo'?'뮤츠':'한카리아스';await recruitment.getByRole('button',{name:`${name} 영입 선택`,exact:true}).click();
  await page.getByTestId('recruit-menu').getByRole('button',{name:'동료로 데려가기',exact:true}).click();
  await expect(page.getByRole('log',{name:'영입 결과'})).toContainText('동료로 합류했다!');await expect(page.getByTestId('recruit-celebration')).toHaveCount(0);
  await expect(scene).toHaveCount(0);
  expect(f.store.view(owner).run!.roster).toContain(f.snapshot.species);expect(f.store.view(owner).run!.floor).toBe(2);
  const reward=page.getByTestId('reward-modal');await expect(reward).toHaveCount(0);await page.locator('[data-recruit-continue]').click();await expect(page.getByRole('log',{name:'이벤트 결과'})).toHaveAttribute('data-typing','false');await page.locator('[data-event-confirm]').click();await expect(reward).toBeVisible();await expect(reward).toContainText('보상');await expect(reward).not.toContainText('Elite');
  await expect(reward).toHaveAttribute('aria-label','보상');await expect(scene).toHaveCount(0);await expect(page.getByTestId('raid-victory')).toBeVisible();
  await page.reload();await expect(page.getByRole('log',{name:'이벤트 결과'})).toHaveAttribute('data-typing','false');await page.locator('[data-event-confirm]').click();await expect(reward).toBeVisible();await expect(scene).toHaveCount(0);await expect(page.getByTestId('raid-victory')).toBeVisible();
  await page.screenshot({path:`artifacts/qa/screenshots/raids/reward-${bossId}-${width}.png`});
  await reward.getByRole('button',{name:'받기',exact:true}).click();await expect(reward).toHaveCount(0);expect(f.store.view(owner).run!.event).toBeNull();expect(f.store.view(owner).run!.floor).toBe(2);
 }finally{f.store.close();}
});
for(const width of [1280,390])test(`declining Raid recruitment still opens special reward without discovery at ${width}`,async({page,context})=>{
 const owner='raid_no_'+randomBytes(6).toString('hex'),f=raidFixture('.data/e2e.sqlite',owner);
 try{
  const auth=await new Accounts(f.store.db).register(owner,'raid-password',owner,undefined);
  f.store.chooseEvent(owner,f.run,f.event.id,'challenge');finishRaidBattle(f.store,f.store.currentBattle(owner)!.id);
  const result=f.store.db.prepare('SELECT result_json FROM run_events WHERE id=?').get(f.event.id)!.result_json;
  const coins=f.store.view(owner).coins;
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  await expect(page.getByTestId('raid-encounter')).toHaveCount(0);await expect(page.getByTestId('result-dialog')).toHaveCount(0);await expect(page.getByTestId('recruitment')).toBeVisible();
  await page.keyboard.press('x');await page.getByTestId('recruit-skip').getByRole('button',{name:'넘어가기',exact:true}).click();
  const reward=page.getByTestId('reward-modal');await expect(page.getByRole('log',{name:'이벤트 결과'})).toHaveAttribute('data-typing','false');await page.locator('[data-event-confirm]').click();await expect(reward).toBeVisible();await expect(reward).toHaveAttribute('aria-label','보상');
  await expect(page.getByTestId('raid-encounter')).toHaveCount(0);await expect(page.getByTestId('raid-victory')).toBeVisible();
  expect(f.store.view(owner).coins).toBe(coins);expect(f.store.db.prepare('SELECT result_json FROM run_events WHERE id=?').get(f.event.id)!.result_json).toBe(result);
  expect(f.store.view(owner).run!.roster).not.toContain('Garchomp');
  await reward.getByRole('button',{name:'받기',exact:true}).click();await expect(reward).toHaveCount(0);expect(f.store.view(owner).run!.event).toBeNull();
 }finally{f.store.close();}
});
test('raid skip completes event with no battle or reward',async({page,context})=>{
 const owner='raid_skip_'+randomBytes(6).toString('hex'),f=raidFixture('.data/e2e.sqlite',owner);
 try{
  const auth=await new Accounts(f.store.db).register(owner,'raid-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/battle');await expect(page.locator('[data-event-confirm]')).toBeVisible();await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'event-choice',runId:f.run,eventId:f.event.id,choice:'skip'}});await page.reload();
  await expect(page.getByTestId('raid-encounter')).toHaveCount(0);expect(f.store.currentBattle(owner)).toBeNull();
  expect(f.store.db.prepare('SELECT result_json,status FROM run_events WHERE id=?').get(f.event.id)).toMatchObject({result_json:null,status:'complete'});
 }finally{f.store.close();}
});
