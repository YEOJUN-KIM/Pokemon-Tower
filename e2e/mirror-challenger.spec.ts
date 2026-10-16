import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {mirrorFixture} from '../tests/mirror-fixture';
import {finishChallengerBattle} from '../tests/challenger-fixture';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
import {statKeys} from '../src/data/training';

for(const width of [1280,390])for(const [roll,kind] of [[.92,'one-iv'],[.99,'six-iv'],[.995,'shiny']] as const)test(`Mirror ${kind} at ${width}: subtle card, same snapshot, pending targets, receipt and collection`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner=`mirror-${suffix}`,f=mirrorFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register(`mi_${suffix}`,'mirror-test-password',owner,undefined);
  f.save(roll);const raw=f.store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json;
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  const candidates=page.getByTestId('challenger-candidates'),mirror=page.getByTestId('challenger-detail');
  await candidates.locator(`[data-challenger="${f.mirror.id}"]`).click();
  await expect(candidates.locator('[data-challenger]:not([data-challenger=back])')).toHaveCount(3);await expect(mirror.locator('[data-mirror=true]')).toHaveCount(1);await expect(mirror).toContainText('어딘가 익숙한 기분이 든다.');await expect(mirror).toContainText('특별한 보상');
  await expect(mirror.locator('[data-player-mirror-portrait]')).toHaveCount(1);await expect(mirror.locator('svg image')).toHaveAttribute('href','/sprites/trainers/player-front.png');await expect(mirror.locator('[data-mirror-face-shadow]')).toHaveCount(1);await expect(candidates.locator('[data-challenger]').filter({hasNot:page.locator('[data-mirror=true]')}).locator('[data-player-mirror-portrait]')).toHaveCount(0);
  await expect(candidates).not.toContainText('Mirror');await expect(candidates).not.toContainText('복사');await expect(candidates).not.toContainText('1V 강화');
  mkdirSync('artifacts/qa/screenshots/mirror',{recursive:true});if(kind==='one-iv'){await expect(page.locator('.game-dialogue')).toHaveAttribute('data-typing','false');await page.screenshot({path:`artifacts/qa/screenshots/mirror/candidates-${width}.png`});}
  await page.reload();await candidates.locator(`[data-challenger="${f.mirror.id}"]`).click();await expect(mirror).toBeVisible();expect(f.store.db.prepare('SELECT candidates_json FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.candidates_json).toBe(raw);
  await page.getByRole('button',{name:'도전한다',exact:true}).click();await expect.poll(()=>f.store.currentBattle(owner)?.opponent_team).toBe(f.mirror.mirror.opponentTeam);
  finishChallengerBattle(f.store,f.store.currentBattle(owner)!.id);await page.reload();
  const reward=page.getByTestId('reward-panel');await expect(reward).toBeVisible();await expect(reward.getByRole('button',{name:'확인',exact:true})).toBeDisabled();
  await page.reload();await expect(reward).toBeVisible();
  if(kind==='one-iv'){
   await reward.getByRole('button',{name:'리자몽',exact:true}).click();await expect(reward).toContainText('V로 만들 능력치를 선택하세요.');await reward.getByRole('button',{name:'리자몽 · 공격 → V',exact:true}).click();
  }else await reward.getByRole('button',{name:'리자몽',exact:true}).click();
  await expect(reward.getByRole('button',{name:'확인',exact:true})).toBeEnabled();
  const selected=f.store.view(owner).run!.event!.result!.selections![0];
  const repeat=await Promise.all([1,2].map(()=>page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'event-reward-select',runId:f.run,eventId:f.event.id,selectionId:selected.id,candidateId:selected.selectedId,species:'Fake',stat:'hp',amount:999}})));expect(repeat.every(r=>r.ok())).toBe(true);
  const saved=f.store.trainingCollection(owner).find(t=>t.species===starters[0])!.profile;
  if(kind==='one-iv')expect(saved.ivs.atk).toBe(31);else if(kind==='six-iv')expect(statKeys.every(s=>saved.ivs[s]===31)).toBe(true);else expect(saved.shiny).toBe(true);
  await page.reload();await expect(reward.getByRole('button',{name:'확인',exact:true})).toBeEnabled();await page.screenshot({path:`artifacts/qa/screenshots/mirror/${kind}-${width}.png`});
  await reward.getByRole('button',{name:'확인',exact:true}).click();await expect(page.getByTestId('run-event')).toHaveCount(0);expect(f.store.view(owner).run!.floor).toBe(20);
  if(kind==='shiny'){await page.goto('/pokedex');expect(f.store.trainingCollection(owner).find(t=>t.species===starters[0])!.profile.shiny).toBe(true);}
 }finally{f.store.close();}
});

test('permanent shop retires shiny exchange UI/API while reward shiny egg hatching still works',async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner=`mirror-shop-${suffix}`,f=mirrorFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register(`ms_${suffix}`,'mirror-test-password',owner,undefined);
  f.store.db.prepare('UPDATE players SET growth_points=50000 WHERE id=?').run(owner);f.store.db.prepare("INSERT INTO reward_egg_tickets VALUES (?,'shiny',1)").run(owner);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/upgrades');await expect(page.getByTestId('permanent-wallet')).toHaveText('50,000P');await expect(page.getByText('이로치 교환권',{exact:true})).toHaveCount(0);await expect(page.getByText('교환권 사용 · 포켓몬 선택',{exact:true})).toHaveCount(0);
  const old=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'permanent',requestId:crypto.randomUUID(),action:'buy',product:'shiny',count:1}});expect(old.status()).toBe(409);expect(f.store.view(owner).growthPoints).toBe(50000);
  const hatch=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'permanent',requestId:crypto.randomUUID(),action:'hatch-reward',product:'egg',eggKind:'shiny',count:1}});expect(hatch.ok()).toBe(true);expect((await hatch.json()).permanentResult.eggs[0].shiny).toBe(true);
 }finally{f.store.close();}
});
