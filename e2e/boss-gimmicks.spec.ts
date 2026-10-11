import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam,starters} from '../src/data/teams';
for(const [floor,ace,width] of [[40,'Dragonite',1280],[50,'Pikachu',1280],[50,'Pikachu',390]] as const)test(`boss ${floor} uses one dynamax with reload at ${width}px`,async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
 store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;
 store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
 const id=store.enter(owner,run,floor,starters),row=store.battle(id);expect(row.ai_version).toBe('tower-policy-v4');
 const enemy=Showdown.Teams.unpack(row.opponent_team)!;enemy.sort((a,b)=>Number(b.species===ace)-Number(a.species===ace));
 const own=Showdown.Teams.unpack(packTeam(starters))!;own[0].moves=['Growl','Slash','Flamethrower','Air Slash'];
 store.db.prepare('UPDATE battles SET opponent_team=?,player_team=? WHERE id=?').run(Showdown.Teams.pack(enemy),Showdown.Teams.pack(own),id);
 await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
 await page.setViewportSize({width,height:width===390?844:720});await page.goto('/battle');
 await page.keyboard.press('Shift');await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
 await expect(page.locator('.enemy-position .motion-dynamax-grow')).toBeVisible({timeout:30000});
 await expect(page.locator('.enemy-position .sprite')).toHaveAttribute('data-dynamax','true');
 await page.screenshot({path:`test-results/boss-${floor}-dynamax-${width}.png`,fullPage:true});
 await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
 await page.reload();await expect(page.locator('.enemy-position .sprite')).toHaveAttribute('data-dynamax','true');
 const frames=page.locator('.player-position .pokemon-image-frame, .enemy-position .pokemon-image-frame');for(let i=0;i<2;i++)await expect(frames.nth(i)).toHaveAttribute('data-framing-ready','true',{timeout:15000});
 await page.screenshot({path:`test-results/boss-${floor}-dynamax-final-${width}.png`,fullPage:true});
 }finally{store.close();}
});
