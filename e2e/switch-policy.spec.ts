import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam} from '../src/data/teams';

mkdirSync('artifacts/qa/screenshots/switch-ai',{recursive:true});
for(const width of [1280,390])test(`v6 opponent voluntarily switches and reloads at ${width}px`,async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,'Garchomp');
  const id=store.start(owner,['Garchomp','Charizard','Blastoise']);
  const own=Showdown.Teams.unpack(packTeam(['Garchomp','Charizard','Blastoise']))!,enemy=Showdown.Teams.unpack(packTeam(['Pikachu','Gyarados','Blastoise']))!;
  own[0].moves=['Swords Dance','Earthquake','Dragon Claw','Rock Slide'];enemy[0].moves=['Thunderbolt','Thunder Wave','Volt Switch','Nasty Plot'];enemy[1].moves=['Ice Fang','Waterfall','Dragon Dance','Earthquake'];
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=?,tera_tickets=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'[2,3,4,5]','{"p1":0,"p2":0}',id);
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  await expect(page.locator('.enemy-health')).toContainText('피카츄');
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await expect(page.locator('.enemy-health')).not.toContainText('피카츄');await expect(page.locator('.player-health')).toContainText('한카리아스');
  const health=(await page.locator('.enemy-health').textContent())!;await page.reload();await expect(page.locator('.enemy-health')).toHaveText(health);
  expect(store.history(id)).toEqual(['move 1']);expect(store.battle(id).ai_version).toBe('tower-policy-v6');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`artifacts/qa/screenshots/switch-ai/switch-${width}.png`,fullPage:true,animations:'disabled'});
 }finally{store.close();}
});
