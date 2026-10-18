import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {normalNpcTemplate} from '../src/server/npc-templates';

for(const [id,width] of [['brock',1280],['blaine',390],['ltsurge',1280],['sabrina',390],['giovanni-gym',1280],['blue',390]] as const)test(`${id}: Kanto candidate battle, gimmick and frozen reload ${width}px`,async({page,context})=>{
 const owner='kanto_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();store.ensurePlayer(owner);
  const auth=await new Accounts(store.db).register(owner,'kanto-test-password',owner,undefined);
  let run='',floor=0;
  for(let n=0;n<40&&!floor;n++){
   run=store.battle(store.start(owner,starters,'basic')).run_id;
   floor=id==='blue'?100:([55,65,75,85,95].find(f=>towerTrainerEncounter(f,run,'kanto',true)!.boss.id==='named-'+id)??0);
   if(!floor)store.abandon(owner,run);
  }
  expect(floor).toBeGreaterThan(0);
  store.db.prepare("UPDATE run_routes SET second_theme='kanto' WHERE run_id=?").run(run);
  store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/battle');await expect(page.getByTestId('team-selection')).toBeVisible();
  await page.getByRole('button',{name:floor+'층 보스 도전'}).click();await page.getByRole('button',{name:'연출 건너뛰기',exact:true}).click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const before=store.currentBattle(owner)!,template=normalNpcTemplate('named-'+id,floor,id==='blue'?'champion':'gym')!,sets=Showdown.Teams.unpack(before.opponent_team)!;
  expect(sets.map(p=>p.species)).toContain(template.ace);expect(sets.map(p=>p.species)).toContain(template.signature!.species);
  expect(sets.every(p=>template.team.some(c=>c.species===p.species))).toBe(true);
  expect(JSON.parse(before.boss!).npcAi.tier).toBe('expert');expect(JSON.parse(before.boss!).gimmick.species).toBe(template.signature!.species);
  if(template.selectionRules?.atLeastOneOf)expect(template.selectionRules.atLeastOneOf.some(n=>sets.some(p=>p.species===n))).toBe(true);
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await page.keyboard.press('Shift');const state=await (await page.request.get('/api/battle')).json();
  await page.reload();await expect(page.locator('.arena')).toBeVisible();
  const restored=await (await page.request.get('/api/battle')).json();
  expect(restored.battle.id).toBe(state.battle.id);expect(restored.battle.messages).toEqual(state.battle.messages);
  const after=store.battle(before.id);expect(after.opponent_team).toBe(before.opponent_team);expect(after.seed).toBe(before.seed);expect(after.boss).toBe(before.boss);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});
