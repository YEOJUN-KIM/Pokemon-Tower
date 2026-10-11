import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam} from '../src/data/teams';
import {classicCollection} from '../tests/classic-team-fixture';

for(const teraType of ['Ghost','Fire'])test(`move matchup indicators and readable ${teraType} tera control`,async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);classicCollection(store,owner);
  const names=['Gengar','Gyarados','Scizor'];for(const name of names)store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,name);
  const id=store.start(owner,names),own=Showdown.Teams.unpack(packTeam(names))!,enemy=Showdown.Teams.unpack(packTeam(['Garchomp','Snorlax','Scizor']))!;
  own[0].teraType=teraType;own[0].moves=['Icy Wind','Fire Punch','Thunderbolt','Shadow Ball'];enemy[0].moves=['Dragon Claw'];
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:1600,height:1000});await page.goto('/battle');
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  await expect(page.locator('.battle-move-row:has([data-command="move 1"]) [data-matchup="strong"]')).toContainText('×4');
  await expect(page.locator('.battle-move-row:has([data-command="move 2"]) [data-matchup="weak"]')).toContainText('×0.5');
  await expect(page.locator('.battle-move-row:has([data-command="move 3"]) [data-matchup="immune"]')).toContainText('효과 없음');
  await expect(page.locator('[data-command="move 4"] [data-testid="move-matchup"]')).toHaveCount(0);
  await expect(page.locator('.enemy-position .pokemon-image-frame')).toHaveAttribute('data-framing-ready','true',{timeout:30000});
  await expect(page.locator('.player-position .pokemon-image-frame')).toHaveAttribute('data-framing-ready','true',{timeout:30000});
  await expect(page.getByTestId('action-grid')).not.toContainText('PP');
  await expect(page.getByTestId('battle-move-details')).toContainText('PP');
  await page.keyboard.press('ArrowRight');await expect(page.locator('[data-command="move 2"]')).toHaveAttribute('data-game-cursor','true');
  await expect(page.getByTestId('tera-toggle')).not.toContainText(teraType==='Ghost'?'고스트':'불꽃');
  await expect(page.getByTestId('tera-toggle').locator(`[data-tera-symbol="${teraType}"]`)).toBeVisible();
  for(const slot of [1,2,3])await expect(page.locator(`[data-command="move ${slot}"] [data-testid="move-matchup"]`)).toBeVisible();
  await page.screenshot({path:`test-results/move-matchup-${teraType.toLowerCase()}-desktop.png`});
  await page.getByTestId('tera-toggle').screenshot({path:`test-results/tera-button-${teraType.toLowerCase()}.png`});
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('[data-matchup="strong"]')).toBeVisible();await expect(page.locator('[data-matchup="immune"]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/move-matchup-${teraType.toLowerCase()}-mobile.png`});
 }finally{store.close();}
});
