import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {packTeam} from '../src/data/teams';

mkdirSync('artifacts/qa/screenshots/switch-ai',{recursive:true});
test.beforeEach(()=>{const store=new TowerStore('.data/e2e.sqlite');try{store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();}finally{store.close();}});
for(const tier of ['v6','basic','tactical','expert'] as const)for(const width of [1280,390])test(`${tier} opponent switching and reload at ${width}px`,async({page,context})=>{
 const owner='switch_'+randomBytes(8).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,'Garchomp');
  const id=store.start(owner,['Garchomp','Charizard','Blastoise']);
  const own=Showdown.Teams.unpack(packTeam(['Garchomp','Charizard','Blastoise']))!,enemy=Showdown.Teams.unpack(packTeam(['Pikachu','Gyarados','Blastoise']))!;
  own[0].moves=['Swords Dance','Earthquake','Dragon Claw','Rock Slide'];enemy[0].moves=['Thunderbolt','Thunder Wave','Volt Switch','Nasty Plot'];enemy[1].moves=['Ice Fang','Waterfall','Dragon Dance','Earthquake'];
  const version=tier==='v6'?'tower-policy-v6':'tower-policy-v13';
  const trainer=JSON.parse(store.battle(id).trainer!);
  if(tier!=='v6')trainer.npcAi={tier,tactic:'balanced'};
  store.db.prepare('UPDATE battles SET ai_version=?,trainer=?,player_team=?,opponent_team=?,seed=?,tera_tickets=? WHERE id=?').run(version,JSON.stringify(trainer),Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'[2,3,4,5]','{"p1":0,"p2":0}',id);
  const auth=await new Accounts(store.db).register(owner,'switch-test-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  await expect(page.locator('.enemy-health')).toContainText('피카츄');
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  if(tier==='basic')await expect(page.locator('.enemy-health')).toContainText('피카츄');
  else await expect(page.locator('.enemy-health')).not.toContainText('피카츄');
  await expect(page.locator('.player-health')).toContainText('한카리아스');
  const health=(await page.locator('.enemy-health').textContent())!;await page.reload();await expect(page.locator('.enemy-health')).toHaveText(health);
  expect(store.history(id)).toEqual(['move 1']);expect(store.battle(id).ai_version).toBe(version);
  if(tier!=='v6')expect(JSON.parse(store.battle(id).trainer!).npcAi).toEqual({tier,tactic:'balanced'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`artifacts/qa/screenshots/switch-ai/switch-${tier}-${width}.png`,fullPage:true,animations:'disabled'});
 }finally{store.close();}
});
