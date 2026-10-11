import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam} from '../src/data/teams';
import {classicCollection} from '../tests/classic-team-fixture';
import Showdown from 'pokemon-showdown';

test('C holds the field panel without committing an action and balls update after a KO',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{store.ensurePlayer(owner);classicCollection(store,owner);for(const name of ['Lucario','Garchomp','Metagross'])store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,name);
    const id=store.start(owner,['Lucario','Garchomp','Metagross']),team=Showdown.Teams.unpack(packTeam(['Lucario','Garchomp','Metagross']))!;team[0].moves[3]='Close Combat';store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(Showdown.Teams.pack(team),packTeam(['Tyranitar','Pikachu','Golem']),'[1,2,3,4]',id);
  }finally{store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');await expect(page.locator('.action-grid button').first()).toBeVisible();
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  await page.keyboard.press('ArrowRight');const command=await page.locator('.action-grid [data-game-cursor=true]').getAttribute('data-command'),before=await page.request.get('/api/battle').then(r=>r.json());
  await page.keyboard.down('c');await expect(page.getByRole('dialog')).toContainText('배틀 효과 상태');await page.keyboard.up('c');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.action-grid [data-game-cursor=true]')).toHaveAttribute('data-command',command!);
  expect((await page.request.get('/api/battle').then(r=>r.json())).battle.requestId).toBe(before.battle.requestId);
  await page.keyboard.press('d');await expect(page.getByRole('dialog')).toHaveCount(0);await page.keyboard.down('c');await expect(page.getByRole('dialog',{name:'현재 필드 상태'})).toContainText('모래바람');await expect(page.getByRole('dialog')).toContainText('5–8턴 남음');await page.keyboard.up('c');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('a');await expect(page.getByTestId('battle-party')).toContainText('현재 출전 중');await page.keyboard.press('x');await page.getByRole('button',{name:'싸운다',exact:true}).click();
  const response=page.waitForResponse(r=>r.url().endsWith('/api/battle') && r.request().method()==='POST');await page.locator('[data-command="move 4"]').click();await response;await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await expect(page.getByRole('group',{name:'상대 남은 포켓몬 2 / 3'})).toBeVisible();await expect(page.locator('.opponent-balls .ball-fainted')).toHaveCount(1);
  await page.keyboard.down('c');await expect(page.getByRole('dialog')).toContainText('4–7턴 남음');await page.keyboard.up('c');
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.keyboard.down('c');await expect(page.getByRole('dialog')).toContainText('배틀 효과 상태');await page.keyboard.up('c');
  await page.screenshot({path:'test-results/retro-battle.png'});await page.reload();await expect(page.getByRole('group',{name:'상대 남은 포켓몬 2 / 3'})).toBeVisible();await page.keyboard.down('c');await expect(page.getByRole('dialog')).toContainText('4–7턴 남음');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/retro-field-mobile.png'});await page.keyboard.up('c');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight)).toBe(true);await page.screenshot({path:'test-results/retro-battle-mobile.png'});
});

test('local pixel font loads and the archive fits the viewport with the retro skin',async({page})=>{
  await page.goto('/pokedex');await expect(page.locator('.dex-card').first()).toBeVisible();await expect(page.locator('.dex-progress')).toContainText('3');await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.fonts.check('16px TowerPixel'))).toBe(true);
  await expect.poll(()=>page.locator('.dex-card img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth>0)),{timeout:20000}).toBe(true);
  await page.screenshot({path:'test-results/retro-pokedex.png'});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/retro-pokedex-mobile.png'});
});
