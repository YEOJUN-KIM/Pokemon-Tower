import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
import {alolaTrainers,alolaSample} from '../src/data/alola-trainers';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';

test.beforeEach(()=>{const s=new TowerStore('.data/e2e.sqlite');try{s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();}finally{s.close();}});
for(const id of ['named-nanu','named-hapu','named-hala','named-kukui','skull-grunt','named-guzma','aether-grunt','named-faba','named-lusamine'])test(`${id}: reviewed battle, rendered portrait, command and reconnect`,async({page,context})=>{
 const owner='alola_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);const auth=await new Accounts(store.db).register(owner,'pilot-test-password',owner,undefined);
  const first=store.battle(store.start(owner,starters,'basic')),sample=alolaSample(alolaTrainers.find(t=>t.id===id)!);
  const snapshot=snapshotTrainerEventBattle(`alola-e2e:${owner}`,sample,95,'basic',CURRENT_PROGRESSION);
  store.db.prepare('UPDATE battles SET opponent_team=?,trainer=?,boss=NULL,ai_version=? WHERE id=?').run(snapshot.opponentTeam,JSON.stringify(snapshot.trainer),snapshot.aiVersion!,first.id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:id==='named-kukui'?1280:390,height:900});await page.goto('/battle');
  const skip=page.getByRole('button',{name:'연출 건너뛰기',exact:true});if(await skip.isVisible())await skip.click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  // The trainer entrance is removed after skipping; verify its asset over the
  // browser's authenticated session without depending on an animation frame.
  const portrait=await page.request.get(`/sprites/trainers/${sample.portrait}.png`);expect(portrait.status()).toBe(200);expect(portrait.headers()['content-type']).toContain('image/png');
  if(id==='named-lusamine')expect(Showdown.Teams.unpack(store.battle(first.id).opponent_team)!.map(p=>p.species)).toEqual(['Clefable','Lilligant','Necrozma-Dusk-Mane']);
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  const before=await(await page.request.get('/api/battle')).json();await page.reload();await expect(page.locator('.arena')).toBeVisible();
  const after=await(await page.request.get('/api/battle')).json();expect(after.battle.id).toBe(before.battle.id);expect(after.battle.messages).toEqual(before.battle.messages);
  expect(store.battle(first.id).opponent_team).toBe(snapshot.opponentTeam);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});
