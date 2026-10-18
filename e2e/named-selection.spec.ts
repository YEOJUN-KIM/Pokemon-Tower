import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
import {towerTrainerEncounter} from '../src/data/tower-trainers';

for(const [npc,width,skip] of [['lance',1280,false],['lance',390,true],['jasmine',1280,true]] as const)test(`${npc}: intro and saved selection ${width}px`,async({page,context})=>{
 const store=new TowerStore('.data/e2e.sqlite'),owner='select_'+randomBytes(7).toString('hex');
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();store.ensurePlayer(owner);
  const auth=await new Accounts(store.db).register(owner,'selection-test-password',owner,undefined);
  let run='',floor=0;
  for(let n=0;n<40&&!floor;n++){
   run=store.battle(store.start(owner,starters,'basic')).run_id;
   floor=npc==='lance'?50:([5,15,25,35,45].find(f=>towerTrainerEncounter(f,run,'johto',true)!.boss.id==='named-'+npc)??0);
   if(!floor)store.abandon(owner,run);
  }
  expect(floor).toBeGreaterThan(0);
  store.db.prepare("UPDATE run_themes SET theme='johto' WHERE run_id=?").run(run);
  store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
  await page.goto('/battle');await expect(page.getByTestId('team-selection')).toBeVisible();
  await page.getByRole('button',{name:floor+'층 보스 도전'}).click();
  await expect(page.getByTestId('trainer-entrance')).toBeVisible();
  if(npc==='lance')await expect(page.locator('[data-dialogue-text="true"]').filter({hasText:'드래곤 조련사 목호! 자아, 간다!'})).toBeVisible();
  if(skip)await page.getByRole('button',{name:'연출 건너뛰기',exact:true}).click();
  else await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const before=store.currentBattle(owner)!,names=Showdown.Teams.unpack(before.opponent_team)!.map(p=>p.species);
  if(npc==='lance')expect(names[2]).toBe('Dragonite');
  else{expect(names).toContain('Steelix');expect(names.some(n=>['Metagross','Magnezone','Empoleon'].includes(n))).toBe(true);expect(JSON.parse(before.boss!).introduction).toBe('');}
  await page.reload();await expect(page.locator('.arena')).toBeVisible();
  expect(store.currentBattle(owner)!.opponent_team).toBe(before.opponent_team);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});
