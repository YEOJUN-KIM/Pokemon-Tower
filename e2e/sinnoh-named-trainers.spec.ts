import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {villainLeaders} from '../src/data/villain-organizations';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';

test.beforeEach(()=>{const s=new TowerStore('.data/e2e.sqlite');try{s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();}finally{s.close();}});
for(const [id,name,ace,width] of [['roark','강석','Rampardos',1280],['gardenia','유채','Roserade',390],['maylene','자두','Lucario',1280],['crasherwake','맥실러','Floatzel',390],['fantina','멜리사','Mismagius',1280],['byron','동관','Bastiodon',390],['candice','무청','Froslass',1280],['volkner','전진','Electivire',390],['aaron','충호','Drapion',1280],['bertha','들국화','Hippowdon',390],['flint','대엽','Infernape',1280],['lucian','오엽','Bronzong',390],['cynthia','난천','Garchomp',1280]] as const)test(`${id} canonical named entry and reload ${width}px`,async({page,context})=>{
 const owner='sinnoh_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);
  const auth=await new Accounts(store.db).register(owner,'pilot-test-password',owner,undefined);
  let run='',floor=0;
  for(let n=0;n<40&&!floor;n++){
   run=store.battle(store.start(owner,starters,'basic')).run_id;
   floor=[5,10,15,20,25,30,35,40,45,50].find(f=>towerTrainerEncounter(f,run,'sinnoh',true)!.boss.id==='named-'+id)??0;
   if(!floor)store.abandon(owner,run);
  }
  expect(floor).toBeGreaterThan(0);
  store.db.prepare("UPDATE run_themes SET theme='sinnoh' WHERE run_id=?").run(run);
  store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/battle');await expect(page.getByTestId('team-selection')).toContainText(name);
  await page.getByRole('button',{name:floor+'층 보스 도전'}).click();
  await page.getByRole('button',{name:'연출 건너뛰기',exact:true}).click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const before=store.currentBattle(owner)!;
  expect(Showdown.Teams.unpack(before.opponent_team)!.map(p=>p.species)).toContain(ace);
  expect(JSON.parse(before.boss!).npcAi).toMatchObject({tier:id==='cynthia'?'expert':'tactical'});
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
  await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  const state=await (await page.request.get('/api/battle')).json();
  await page.reload();await expect(page.locator('.arena')).toBeVisible();
  const restored=await (await page.request.get('/api/battle')).json();
  expect(restored.battle.id).toBe(state.battle.id);expect(restored.battle.messages).toEqual(state.battle.messages);
  const after=store.battle(before.id);
  expect(after.opponent_team).toBe(before.opponent_team);expect(after.seed).toBe(before.seed);expect(after.boss).toBe(before.boss);expect(after.ai_version).toBe('tower-policy-v13');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});
for(const portrait of ['mars','jupiter','saturn','cyrus'])test(`Galactic ${portrait}: reviewed snapshot and browser reconnect`,async({page,context})=>{
 const owner='galactic_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);const auth=await new Accounts(store.db).register(owner,'pilot-test-password',owner,undefined);
  const first=store.battle(store.start(owner,starters,'basic'));
  const group=villainLeaders.galactic,base=portrait==='cyrus'?group.boss:[group.executive,...group.executives!].find(s=>s.portrait===portrait)!;
  const sample={...base,id:`galactic-${portrait==='cyrus'?'boss':'executive'}-${portrait}`};
  const snap=snapshotTrainerEventBattle(`sinnoh-e2e:${owner}`,sample,95,'basic',CURRENT_PROGRESSION);
  store.db.prepare('UPDATE battles SET opponent_team=?,trainer=?,boss=NULL,ai_version=? WHERE id=?').run(snap.opponentTeam,JSON.stringify(snap.trainer),snap.aiVersion!,first.id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:390,height:844});await page.goto('/battle');
  const skip=page.getByRole('button',{name:'연출 건너뛰기',exact:true});if(await skip.isVisible())await skip.click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const before=await(await page.request.get('/api/battle')).json();await page.reload();await expect(page.getByTestId('action-grid')).toBeVisible();
  const after=await(await page.request.get('/api/battle')).json();expect(after.battle.id).toBe(before.battle.id);expect(after.battle.messages).toEqual(before.battle.messages);
  expect(store.battle(first.id).opponent_team).toBe(snap.opponentTeam);expect(snap.trainer.gimmick).toBeUndefined();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});



