import {test, expect} from '@playwright/test';
import {selectStarters} from './select-starters';

test('bottom dialogue follows playback, expands history, survives reload and fits mobile', async ({page}) => {
  await page.setViewportSize({width:1440,height:1100});
  await page.goto('/battle');
  const dialogue = page.getByRole('region',{name:'배틀 상황',exact:true});
  const current = page.getByRole('log',{name:'현재 배틀 상황'});
  await selectStarters(page);
  await page.getByRole('button',{name:'새 도전 시작'}).click();await page.getByRole('button',{name:'이 룰로 도전 시작',exact:true}).click();await page.getByRole('button',{name:'포켓몬 내보내기 · Z',exact:true}).click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await expect(current).toContainText('등장!');
  const arenaBox = await page.locator('.arena').boundingBox();
  const dialogueBox = await dialogue.boundingBox();
  expect(dialogueBox!.y).toBeCloseTo(arenaBox!.y + arenaBox!.height,0);
  const commandBox=await page.locator('.command-area').boundingBox();
  expect(dialogueBox!.width+commandBox!.width).toBeCloseTo(arenaBox!.width,0);
  await expect(current.locator('.latest')).toHaveCSS('font-size','18px');
  await expect(page.locator('.right-column .log-panel')).toHaveCount(0);

  await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.motion-move')).toBeVisible();
  await expect(current.locator('.latest')).toContainText('의 ');
  await expect(page.locator('[data-command="move 1"]')).toBeDisabled();
  await expect(current).toContainText('HP가 줄었다');
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await page.getByRole('button',{name:'로그 · S'}).click();
  const history = page.getByRole('region',{name:'배틀 기록',exact:true});
  await expect(history).toContainText('화염방사');
  await expect(history).toContainText('HP가 줄었다');
  await page.screenshot({path:'test-results/battle-messages-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'배틀 기록 닫기'}).click();
  await expect(history).toHaveCount(0);

  await page.locator('[data-command="move 1"]').click();
  await page.getByRole('button',{name:'연출 건너뛰기'}).click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  const server = await page.request.get('/api/battle').then(response=>response.json());
  const own = server.battle.team.find((pokemon:{active:boolean})=>pokemon.active);
  await expect(page.locator('.player-health .hp-number')).toHaveText(own.condition.includes('fnt') ? '기절' : own.condition.split(' ')[0]);
  const lastMessage = await current.locator('.latest').textContent();
  await page.reload();
  await expect(current.locator('.latest')).toHaveText(lastMessage!);
  await page.setViewportSize({width:390,height:844});
  await expect(current.locator('.latest')).toHaveCSS('font-size','14px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await dialogue.scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/battle-messages-mobile.png',fullPage:true});
});
