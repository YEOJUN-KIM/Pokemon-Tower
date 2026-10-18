import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {villainLeaders,organizationGrunt} from '../src/data/villain-organizations';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';

test.beforeEach(()=>{const s=new TowerStore('.data/e2e.sqlite');try{s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();}finally{s.close();}});
for(const [id,name,ace,width] of [["viola","비올라","Vivillon",1280],["grant","자크로","Tyrantrum",390],["korrina","코르니","Lucario",1280],["ramos","후쿠지","Gogoat",390],["clemont","시트론","Heliolisk",1280],["valerie","마슈","Sylveon",390],["olympia","고지카","Meowstic",1280],["wulfric","우르프","Avalugg",390],["malva","파키라","Talonflame",1280],["siebold","즈미","Clawitzer",390],["wikstrom","간피","Aegislash",1280],["drasna","드라세나","Noivern",390],["diantha","카르네","Gardevoir",1280]] as const)test(`${id} canonical named entry and reload ${width}px`,async({page,context})=>{
 const owner='kalos_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);
  const auth=await new Accounts(store.db).register(owner,'pilot-test-password',owner,undefined);
  let run='',floor=0;
  for(let n=0;n<40&&!floor;n++){
   run=store.battle(store.start(owner,starters,'basic')).run_id;
   floor=[5,10,15,20,25,30,35,40,45,50].find(f=>towerTrainerEncounter(f,run,'kalos',true)!.boss.id==='named-'+id)??0;
   if(!floor)store.abandon(owner,run);
  }
  expect(floor).toBeGreaterThan(0);
  store.db.prepare("UPDATE run_themes SET theme='kalos' WHERE run_id=?").run(run);
  store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/battle');await expect(page.getByTestId('team-selection')).toContainText(name);
  await page.getByRole('button',{name:floor+'층 보스 도전'}).click();
  await page.getByRole('button',{name:'연출 건너뛰기',exact:true}).click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const before=store.currentBattle(owner)!;
  expect(Showdown.Teams.unpack(before.opponent_team)!.map(p=>p.species)).toContain(ace);
  expect(JSON.parse(before.boss!).npcAi).toMatchObject({tier:id==='diantha'?'expert':'tactical'});
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
for(const portrait of ['aliana','xerosic','lysandre','flaregrunt'])test(`Flare ${portrait}: reviewed snapshot and browser reconnect`,async({page,context})=>{
 const owner='flare_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);const auth=await new Accounts(store.db).register(owner,'pilot-test-password',owner,undefined);
  const first=store.battle(store.start(owner,starters,'basic'));
  const group=villainLeaders.flare,base=portrait==='flaregrunt'?organizationGrunt('flare'):portrait==='lysandre'?group.boss:[group.executive,...group.executives!].find(s=>s.portrait===portrait)!;
  const sample=portrait==='flaregrunt'?base:{...base,id:`flare-${portrait==='lysandre'?'boss':'executive'}-${portrait}`};
  const snap=snapshotTrainerEventBattle(`kalos-e2e:${owner}`,sample,95,'basic',CURRENT_PROGRESSION);
  store.db.prepare('UPDATE battles SET opponent_team=?,trainer=?,boss=NULL,ai_version=? WHERE id=?').run(snap.opponentTeam,JSON.stringify(snap.trainer),snap.aiVersion!,first.id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:390,height:844});await page.goto('/battle');
  const skip=page.getByRole('button',{name:'연출 건너뛰기',exact:true});if(await skip.isVisible())await skip.click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const before=await(await page.request.get('/api/battle')).json();await page.reload();await expect(page.getByTestId('action-grid')).toBeVisible();
  const after=await(await page.request.get('/api/battle')).json();expect(after.battle.id).toBe(before.battle.id);expect(after.battle.messages).toEqual(before.battle.messages);
  expect(store.battle(first.id).opponent_team).toBe(snap.opponentTeam);if(portrait==='lysandre')expect(snap.trainer.gimmick?.species).toBe('Gyarados');else expect(snap.trainer.gimmick).toBeUndefined();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});




