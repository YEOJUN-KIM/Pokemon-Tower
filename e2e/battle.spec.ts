import { test, expect } from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam,starters} from '../src/data/teams';
import {classicCollection} from '../tests/classic-team-fixture';
import {selectStarters} from './select-starters';
import {prepareBattleCommand} from './battle-input';

test('browser battle: start, switch, restore on reload, finish and retry', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  // Keep the start button in view so Playwright's click does not scroll the document.
  await page.setViewportSize({width: 1440, height: 1100});
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/battle');
  await expect(page.getByRole('heading', {name: '포켓몬 도감'})).toBeVisible();
  await page.screenshot({path: 'test-results/lobby-desktop.png', fullPage: true});
  await selectStarters(page);
  await page.getByRole('button', {name: '새 도전 시작'}).click();await page.getByRole('button',{name:'이 룰로 도전 시작',exact:true}).click();await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  await page.getByRole('button', {name: '교체', exact: true}).click();
  await page.locator('[data-command="switch 2"]').click();
  await expect(page.locator('.current-messages')).toContainText('거북왕');
  const before = await page.request.get('/api/battle').then(r => r.json());
  await page.reload();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const after = await page.request.get('/api/battle').then(r => r.json());
  expect(after.battle.id).toBe(before.battle.id);
  expect(after.battle.requestId).toBe(before.battle.requestId);
  await page.screenshot({path: 'test-results/battle-desktop.png', fullPage: true});
  let endState;
  for (let i = 0; i < 120; i++) {
    const state=await page.request.get('/api/battle').then(r=>r.json());
    const command=state.battle.actions[0].command;await prepareBattleCommand(page,command);
    const response = page.waitForResponse(r => r.url().endsWith('/api/battle') && r.request().method() === 'POST');
    await page.locator(`[data-command="${command}"]`).click();
    const reply = await response;
    expect(reply.status()).toBe(200);
    endState = await reply.json();
    if (endState.battle.status === 'complete') break;
  }
  await expect(page.getByTestId('result-dialog')).toBeVisible({timeout:20000});
  const resultDialog = page.getByTestId('result-dialog');
  await expect(resultDialog.getByRole('heading', {name:endState.battle.winner === 'Player' ? '승리!' : endState.battle.winner === 'tie' ? '무승부' : '패배', exact:true})).toBeVisible();
  await resultDialog.getByRole('button').click();
  await expect(resultDialog).toHaveCount(0);
  if (endState.tower.run.state === 'recruit') {
    await page.getByRole('button', {name: '영입 없이 계속'}).click();
    await page.getByRole('button', {name: '2층 배틀 시작'}).click();await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();
  } else {await selectStarters(page);await page.getByRole('button', {name: '새 도전 시작'}).click();await page.getByRole('button',{name:'이 룰로 도전 시작',exact:true}).click();await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();}
  await expect(page.getByTestId('action-grid')).toBeVisible();
  expect(errors).toEqual([]);
});

test('HTTP validation: owner, origin, malformed and duplicate actions', async ({page, browser}) => {
  await page.goto('/battle');
  await selectStarters(page);
  await page.getByRole('button', {name: '새 도전 시작'}).click();await page.getByRole('button',{name:'이 룰로 도전 시작',exact:true}).click();await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const {battle} = await page.request.get('/api/battle').then(r => r.json());
  const input = {type: 'action', battleId: battle.id, requestId: battle.requestId, action: 'move 1'};
  const origin = {'Origin': 'http://127.0.0.1:3001'};
  const foreign = await browser.newContext();
  await foreign.request.get('http://127.0.0.1:3001/api/battle');
  expect((await foreign.request.post('http://127.0.0.1:3001/api/battle', {data: input, headers: origin})).status()).toBe(404);
  await foreign.close();
  expect((await page.request.post('/api/battle', {data: input, headers: {'Origin': 'https://example.com'}})).status()).toBe(403);
  expect((await page.request.post('/api/battle', {data: {type:'start', selected:starters}, headers: origin})).status()).toBe(409);
  expect((await page.request.post('/api/battle', {data: {type:'complete', winner:'Player', reward:999999}, headers: origin})).status()).toBe(400);
  expect((await page.request.post('/api/battle', {data: {...input, action: 'move 1 terastallize'}, headers: origin})).status()).toBe(400);
  expect((await page.request.post('/api/battle', {data: '{', headers: {...origin, 'Content-Type': 'application/json'}})).status()).toBe(400);
  const responses = await Promise.all([page.request.post('/api/battle', {data: input, headers: origin}), page.request.post('/api/battle', {data: input, headers: origin})]);
  expect(responses.map(r => r.status()).sort()).toEqual([200, 409]);
});

test('victory reward, recruitment, reload and fielding the recruited Pokemon', async ({page, context}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  // Seed a persisted battle before the server sees it; no test-only HTTP endpoint exists.
  const token = randomBytes(32).toString('hex');
  const owner = playerKey(token);
  const store = new TowerStore('.data/e2e.sqlite');
  store.ensurePlayer(owner);
  classicCollection(store,owner);
  const id = store.start(owner, starters);
  store.db.prepare("UPDATE battles SET seed=?,opponent_team=?,ai_version='damage-policy-v1' WHERE id=?").run('[1,2,3,4]',packTeam(['Pikachu','Golem','Cloyster']),id);
  store.close();
  await context.addCookies([{name: 'tower_session', value: token, url: 'http://127.0.0.1:3001', httpOnly: true, sameSite: 'Strict'}]);
  await page.goto('/battle');
  await expect(page.getByTestId('action-grid')).toBeVisible();
  for (let i = 0; i < 100; i++) {
    const {battle} = await page.request.get('/api/battle').then(r => r.json());
    if (battle.status === 'complete') break;
    const active = battle.team.find((p: {active: boolean}) => p.active).species;
    const foe = battle.opponent.species;
    let command = battle.actions[0].command;
    if (battle.actions.some((a: {command:string}) => a.command.startsWith('move'))) {
      command = active === 'Charizard' && foe === 'Gyarados' ? 'move 2' : active === 'Blastoise' && foe === 'Gyarados' ? 'move 2' : 'move 1';
      if (!battle.actions.some((a: {command:string}) => a.command === command)) command = battle.actions[0].command;
    }
    await prepareBattleCommand(page,command);
    const response = page.waitForResponse(r => r.url().endsWith('/api/battle') && r.request().method() === 'POST');
    await page.locator(`[data-command="${command}"]`).click();
    expect((await response).status()).toBe(200);
  }
  await expect(page.getByTestId('result-dialog').getByRole('heading', {name:'승리!',exact:true})).toBeVisible({timeout:20000});
  await expect(page.getByTestId('result-dialog')).toContainText('+100코인');
  await page.screenshot({path:'test-results/victory-dialog.png',fullPage:true});
  await page.getByRole('button', {name:'영입으로 계속'}).click();
  await expect(page.getByTestId('wallet')).toHaveText('100코인');
  await page.reload();
  await expect(page.getByTestId('result-dialog')).toBeVisible();
  await page.getByRole('button', {name:'영입으로 계속'}).click();
  await expect(page.getByTestId('recruitment')).toBeVisible();
  await expect(page.getByTestId('wallet')).toHaveText('100코인');
  await page.screenshot({path: 'test-results/tower-reward.png', fullPage: true});
  await page.getByRole('button', {name: '피카츄 영입 선택'}).click();
  const beforeRecruit = await page.request.get('/api/battle').then(r => r.json());
  await page.getByRole('button', {name: '영입하고 계속'}).click();
  await page.getByRole('button', {name: '영입하기',exact:true}).click();
  await expect(page.getByTestId('recruit-celebration')).toContainText('피카츄가 동료가 되었다!');
  await page.getByRole('button',{name:'다음 층 준비',exact:true}).click();
  await expect(page.getByTestId('team-selection')).toBeVisible();
  const duplicate = await page.request.post('/api/battle', {headers:{Origin:'http://127.0.0.1:3001'}, data:{type:'recruit',runId:beforeRecruit.tower.run.id,battleId:id,chosen:'Pikachu',replaced:null}});
  expect(duplicate.status()).toBe(409);
  await page.reload();
  await expect(page.getByRole('button', {name: '피카츄 선택', exact: true})).toBeVisible();
  await page.getByRole('button', {name: '리자몽 선택', exact: true}).click();
  await page.getByRole('button', {name: '피카츄 선택', exact: true}).click();
  await expect(page.getByRole('button', {name:'피카츄 선택',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path: 'test-results/tower-selection.png', fullPage: true});
  await page.getByRole('button', {name: '2층 배틀 시작'}).click();await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const {battle, tower} = await page.request.get('/api/battle').then(r => r.json());
  expect(tower.run.floor).toBe(2);
  expect(tower.unlocked).toContain('Pikachu');
  expect(battle.team.map((p: {species:string}) => p.species)).toContain('Pikachu');
});

test('mobile layout and unavailable images still allow play', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.route('https://raw.githubusercontent.com/**', route => route.abort());
  await page.goto('/battle');
  await expect(page.getByRole('button', {name: '새 도전 시작'})).toBeDisabled();
  await selectStarters(page);
  await expect(page.getByRole('button', {name: '새 도전 시작'})).toBeEnabled();
  await page.screenshot({path: 'test-results/lobby-mobile.png', fullPage: true});
  await page.getByRole('button', {name: '새 도전 시작'}).click();await page.getByRole('button',{name:'이 룰로 도전 시작',exact:true}).click();await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  await expect(page.locator('.sprite-fallback').first()).toBeVisible();
  await expect(page.locator('.sprite img')).toHaveCount(0);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
  await page.screenshot({path: 'test-results/battle-mobile.png', fullPage: true});
});
