import {snapshotRankReward} from '../src/server/challenger-rewards';
import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {challengerFixture,finishChallengerBattle} from '../tests/challenger-fixture';

test.beforeEach(()=>{const store=new TowerStore('.data/e2e.sqlite');try{store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();}finally{store.close();}});
for(const width of [1280,390])test(`challenger candidates at ${width}: random three, keyboard/mobile, restore and back`,async({page,context})=>{
 const owner='cc_'+randomBytes(8).toString('hex'),{store,run,event}=challengerFixture('.data/e2e.sqlite',owner,2,'random');
 try{
  const auth=await new Accounts(store.db).register(owner,'challenger-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  const candidates=page.getByTestId('challenger-candidates');await expect(candidates).toBeVisible();
  await expect(candidates.locator('[data-challenger]:not([data-challenger=back])')).toHaveCount(3);
  const expected=event.challengers!;
  expect(new Set(expected.map(c=>c.id)).size).toBe(3);expect(new Set(expected.map(c=>c.title)).size).toBe(3);
  const detail=page.getByTestId('challenger-detail');
  for(const [index,candidate] of expected.entries()){
   await page.keyboard.press(String(index+1));await expect(detail).toHaveAttribute('data-candidate',candidate.id);
   await expect(candidates.locator(`[data-challenger=${candidate.id}]`)).toHaveAttribute('aria-pressed','true');
   await expect(detail).toContainText(candidate.title);await expect(detail).toContainText(candidate.rewardPreview);
   await expect(detail).toContainText(candidate.difficulty+' '+'★'.repeat(candidate.danger));
   await expect(detail).not.toContainText(candidate.battleStyle);await expect(detail).not.toContainText('위험도');
   await expect(page.getByTestId('challenger-special-hint')).toHaveCount(0);
   expect(store.view(owner).run!.event!.phase).toBe('choice');
   expect(await detail.locator('img').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0&&getComputedStyle(el).imageRendering==='pixelated')).toBe(true);
  }
  await page.keyboard.press('1');await page.keyboard.press('ArrowDown');await expect(detail).toHaveAttribute('data-candidate',expected[1].id);
  await page.keyboard.press('ArrowUp');await expect(detail).toHaveAttribute('data-candidate',expected[0].id);
  if(width===1280){
   await candidates.locator(`[data-challenger=${expected[1].id}]`).hover();await expect(detail).toHaveAttribute('data-candidate',expected[1].id);
   await candidates.locator(`[data-challenger=${expected[1].id}]`).focus();await page.keyboard.press('Tab');
   await expect(candidates.locator(`[data-challenger=${expected[2].id}]`)).toBeFocused();await expect(detail).toHaveAttribute('data-candidate',expected[2].id);
  }
  await candidates.locator(`[data-challenger=${expected[2].id}]`).click();await expect(detail).toHaveAttribute('data-candidate',expected[2].id);
  expect(store.view(owner).run!.event!.phase).toBe('choice');
  const info=await detail.boundingBox(),bottom=await candidates.boundingBox(),back=await candidates.locator('[data-challenger=back]').boundingBox();expect(info!.y+info!.height).toBeLessThanOrEqual(bottom!.y);expect(info!.x).toBeGreaterThanOrEqual(0);expect(info!.x+info!.width).toBeLessThanOrEqual(width);expect(back!.y+back!.height).toBeLessThanOrEqual(width===390?844:900);
  if(width===390)expect(Math.abs(info!.x+info!.width/2-width/2)).toBeLessThan(1);else expect(info!.x+info!.width).toBeLessThan(width/2);
  mkdirSync('artifacts/qa/screenshots/challengers',{recursive:true});
  await page.screenshot({path:`artifacts/qa/screenshots/challengers/candidates-${width}.png`});
  await page.screenshot({path:`artifacts/qa/screenshots/challengers/hard-info-${width}.png`});
  await page.reload();await expect(candidates).toBeVisible();expect(store.view(owner).run!.event!.challengers).toEqual(event.challengers);
  expect(await candidates.locator('[data-challenger]:not([data-challenger=back])').evaluateAll(els=>els.map(el=>el.getAttribute('data-challenger')))).toEqual(expected.map(c=>c.id));
  if(width===1280){await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await expect(detail).toHaveCount(0);await page.keyboard.press('z');}else await candidates.getByRole('button',{name:'4. 돌아간다',exact:false}).click();
  await expect(candidates).toHaveCount(0);await expect(page.getByRole('dialog',{name:'2층 출전 준비',exact:true})).toBeVisible();expect(store.view(owner).run!.floor).toBe(2);expect(store.view(owner).run!.event).toBeNull();
 }finally{store.close();}
});
for(const id of ['easy','medium','hard'])test(`challenger ${id}: actual battle, victory popup and server choice`,async({page,context})=>{
 const owner='ch_'+randomBytes(8).toString('hex'),{store,run,event}=challengerFixture('.data/e2e.sqlite',owner);
 try{
  const auth=await new Accounts(store.db).register(owner,'challenger-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:id==='hard'?390:1280,height:900});await page.goto('/battle');
  await expect(page.getByTestId('challenger-candidates')).toBeVisible();
  if(id==='medium'||id==='hard'){await page.keyboard.press(id==='medium'?'2':'3');await expect(page.getByTestId('challenger-detail')).toHaveAttribute('data-candidate',id);await page.keyboard.press(id==='medium'?'Enter':'z');}else{await page.locator(`[data-challenger=${id}]`).click();await page.getByRole('button',{name:'도전한다',exact:true}).click();}await expect(page.getByTestId('run-event')).toHaveCount(0);
  await expect.poll(()=>store.view(owner).run!.state).toBe('battle');const battle=store.currentBattle(owner)!;
  expect(JSON.parse(battle.trainer!).id).toContain(id==='easy'?'breeder':id==='medium'?'gentleman':'tactician');
  await page.reload();await expect(page.locator('.opponent-heading')).toContainText(id==='easy'?'브리더':id==='medium'?'신사':'에이스 트레이너');
  // Complete through the same internal validated callback used by BattleSession.
  finishChallengerBattle(store,battle.id);await page.reload();const modal=page.getByTestId('reward-modal');await expect(modal).toBeVisible();
  await expect(page.getByRole('dialog',{name:'승리 · 동료 영입',exact:true})).toHaveCount(0);
  await expect(modal).toContainText('전투 보상');mkdirSync('artifacts/qa/screenshots/challengers',{recursive:true});
  await page.screenshot({path:`artifacts/qa/screenshots/challengers/reward-${id}.png`});
  if(id==='hard'){
   const confirm=modal.getByRole('button',{name:'확인',exact:true});await expect(confirm).toBeDisabled();
   const blocked=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'event-continue',runId:run,eventId:event.id}});expect(blocked.status()).toBe(409);
   await modal.getByRole('button',{name:'선택하기 >'}).click();await expect(modal.getByRole('button',{name:'알 뽑기권 3장',exact:true})).toBeVisible();
   await page.screenshot({path:'artifacts/qa/screenshots/challengers/reward-candidates-mobile.png'});
   const before=store.permanentView(owner).eggTickets;await modal.getByRole('button',{name:'알 뽑기권 3장',exact:true}).click();await expect(modal).toContainText('선택 완료');
   await page.reload();await expect(modal).toContainText('선택 완료');
   const payload={type:'event-reward-select',runId:run,eventId:event.id,selectionId:'bonus',candidateId:'tickets',effects:[{kind:'coins',amount:999999}]};
   const responses=await Promise.all([1,2].map(()=>page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:payload})));expect(responses.every(response=>response.ok())).toBe(true);expect(store.permanentView(owner).eggTickets).toBe(before+3);
   expect(store.view(owner).coins).toBe(1100); // prior floor 100 + hard 1,000; forged effects ignored
  }
  await modal.getByRole('button',{name:'확인',exact:true}).click();await expect(modal).toHaveCount(0);
  await expect(page.getByRole('dialog',{name:'2층 출전 준비',exact:true})).toBeVisible();
  expect(store.view(owner).run!.floor).toBe(2);expect(store.view(owner).run!.candidates).toEqual([]);
 }finally{store.close();}
});
import {npcSamples} from '../src/data/npc-samples';
import {challengerDefinition} from '../src/data/challengers';
import {generateNpcEncounter} from '../src/server/npc-encounters';
import type {NpcRank} from '../src/data/npc-ranks';

for(const rank of ['normal','elite','master'] as NpcRank[])test(`common NPC challenger ${rank}: rank display, frozen battle and reward popup`,async({page,context})=>{
 const owner='rank_'+randomBytes(8).toString('hex'),{store,run,event}=challengerFixture('.data/e2e.sqlite',owner,20,'random');
 try{
  const definitions=([['breeder-balanced','normal'],['ace-setup','elite'],['veteran-balanced','master']] as const).map(([id,r],index)=>{
   const concept=npcSamples.find(s=>s.id===id)!,offer=challengerDefinition(concept,r,20);
   Object.assign(offer,snapshotRankReward(store.db,run,r,()=>0));
   offer.encounter=generateNpcEncounter(20,[17,29,43,71+index],concept,r,'basic');return offer;
  });
  store.db.prepare('UPDATE challenger_encounters SET candidates_json=? WHERE event_id=?').run(JSON.stringify(definitions),event.id);
  const auth=await new Accounts(store.db).register(owner,'challenger-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:rank==='master'?390:1280,height:900});await page.goto('/battle');
  const cards=page.getByTestId('challenger-candidates');
  for(const [index,label] of ['일반','엘리트','마스터'].entries()){await page.keyboard.press(String(index+1));await expect(page.getByTestId('challenger-detail')).toContainText(label);}
  const selected=definitions.find(c=>c.rank===rank)!;await cards.locator(`[data-challenger=${selected.id}]`).click();await page.getByRole('button',{name:'도전한다',exact:true}).click();
  await expect.poll(()=>store.view(owner).run!.state).toBe('battle');const battle=store.currentBattle(owner)!;
  expect(JSON.parse(battle.trainer!).npcRank).toBe(rank);
  await page.reload();await expect(page.locator('.opponent-heading')).toContainText(selected.title);
  finishChallengerBattle(store,battle.id);await page.reload();const modal=page.getByTestId('reward-modal');await expect(modal).toBeVisible();
  await expect(page.getByRole('dialog',{name:'승리 · 동료 영입',exact:true})).toHaveCount(0);
  if(rank==='master'){
   await expect(modal.getByRole('button',{name:'확인',exact:true})).toBeDisabled();
   await modal.getByRole('button',{name:'알 뽑기권 10장',exact:true}).click();
   await page.reload();await expect(modal).toContainText('선택 완료');expect(store.permanentView(owner).eggTickets).toBe(10);
  }
  await modal.getByRole('button',{name:'확인',exact:true}).click();await expect(modal).toHaveCount(0);
  expect(store.view(owner).run!.floor).toBe(20);expect(store.view(owner).run!.event).toBeNull();
 }finally{store.close();}
});

for(const key of ['4','x'])test(`challenger cancel shortcut ${key} uses existing back flow`,async({page,context})=>{
 const owner='cx_'+randomBytes(8).toString('hex'),{store}=challengerFixture('.data/e2e.sqlite',owner,2,'random');
 try{
  const auth=await new Accounts(store.db).register(owner,'challenger-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/battle');await expect(page.getByTestId('challenger-detail')).toBeVisible();await page.keyboard.press(key);
  await expect(page.getByTestId('challenger-candidates')).toHaveCount(0);expect(store.view(owner).run!.event).toBeNull();expect(store.view(owner).run!.floor).toBe(2);
 }finally{store.close();}
});

test.describe('touch selection',()=>{
 test.use({hasTouch:true,viewport:{width:390,height:844}});
 test('tap previews without battle; explicit confirmation starts selected opponent',async({page,context})=>{
  const owner='ct_'+randomBytes(8).toString('hex'),{store,event}=challengerFixture('.data/e2e.sqlite',owner,2,'random');
  try{
   const auth=await new Accounts(store.db).register(owner,'challenger-password',owner,undefined);
   await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');
   const candidate=event.challengers![1],button=page.locator(`[data-challenger=${candidate.id}]`);
   await button.tap();await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.getByTestId('challenger-detail')).toHaveAttribute('data-candidate',candidate.id);
   expect(store.view(owner).run!.event!.phase).toBe('choice');await page.getByRole('button',{name:'도전한다',exact:true}).tap();await expect.poll(()=>store.view(owner).run!.state).toBe('battle');
   expect(JSON.parse(store.currentBattle(owner)!.trainer!).id).toBe(candidate.trainerId);
  }finally{store.close();}
 });
});
