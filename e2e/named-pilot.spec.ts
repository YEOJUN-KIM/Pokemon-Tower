import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
import {towerTrainerEncounter} from '../src/data/tower-trainers';

test.beforeEach(()=>{const s=new TowerStore('.data/e2e.sqlite');try{s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();}finally{s.close();}});
for(const [id,name,ace] of [['falkner','비상','Pidgeot'],['whitney','꼭두','Miltank'],['clair','이향','Kingdra']])for(const width of [1280,390])test(`${id} canonical named entry and reload ${width}px`,async({page,context})=>{
 const owner='pilot_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);
  const auth=await new Accounts(store.db).register(owner,'pilot-test-password',owner,undefined);
  let run='',floor=0;
  for(let n=0;n<40&&!floor;n++){
   run=store.battle(store.start(owner,starters,'basic')).run_id;
   floor=[5,15,25,35,45].find(f=>towerTrainerEncounter(f,run,'johto',true)!.boss.id==='named-'+id)??0;
   if(!floor)store.abandon(owner,run);
  }
  expect(floor).toBeGreaterThan(0);
  store.db.prepare("UPDATE run_themes SET theme='johto' WHERE run_id=?").run(run);
  store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/battle');await expect(page.getByTestId('team-selection')).toContainText(name);
  await page.getByRole('button',{name:floor+'층 보스 도전'}).click();
  await page.getByRole('button',{name:'연출 건너뛰기',exact:true}).click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const before=store.currentBattle(owner)!;
  expect(Showdown.Teams.unpack(before.opponent_team)!.map(p=>p.species)).toContain(ace);
  expect(JSON.parse(before.boss!).npcAi).toMatchObject({tier:'tactical'});
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
  await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  const state=await (await page.request.get('/api/battle')).json();
  await page.reload();await expect(page.locator('.arena')).toBeVisible();
  const restored=await (await page.request.get('/api/battle')).json();
  expect(restored.battle.id).toBe(state.battle.id);expect(restored.battle.messages).toEqual(state.battle.messages);
  const after=store.battle(before.id);
  expect(after.opponent_team).toBe(before.opponent_team);expect(after.seed).toBe(before.seed);expect(after.boss).toBe(before.boss);expect(after.ai_version).toBe('tower-policy-v12');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});
