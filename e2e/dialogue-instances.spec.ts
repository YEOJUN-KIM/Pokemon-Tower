import {test,expect,type Page,type BrowserContext,type Locator} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import {packTeam,starters} from '../src/data/teams';
import {finishChallengerBattle} from '../tests/challenger-fixture';
import {trackFixture} from '../tests/villain-track-fixture';
import {raidFixture} from '../tests/raid-fixture';

async function login(context:BrowserContext,store:TowerStore,owner:string){
 store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register(owner,'dialogue-test-password',owner,undefined);
 await context.clearCookies();await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);
}
async function freeze(page:Page){
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+10000));
 await page.addInitScript(()=>{
  const seen=new WeakSet<Element>(),initial:{key:string;text:string}[]=[];(window as any).__dialogueInitial=initial;
  new MutationObserver(()=>{for(const node of document.querySelectorAll('[data-message-key]'))if(!seen.has(node)){seen.add(node);initial.push({key:node.getAttribute('data-message-key')!,text:node.querySelector('.latest')?.textContent??''});}}).observe(document,{childList:true,subtree:true});
 });
}
async function blank(log:Locator){await expect(log).toHaveAttribute('data-typing','true');await expect(log.locator('.latest')).toHaveText('');await expect(log.locator('[data-full-text]')).toHaveCount(0);expect(await log.textContent()).toBe('▍');}
async function audit(page:Page){const initial=await page.evaluate(()=>(window as any).__dialogueInitial as {key:string;text:string}[]);expect(initial.length).toBeGreaterThan(0);expect(initial.filter(entry=>entry.text!=='')).toEqual([]);}

for(const width of [1280,390]){
 test(`empty first paint and reveal/advance across recruitment, preparation, intro and maintenance ${width}`,async({page,context})=>{
  const owner='msg_'+randomBytes(8).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
  try{
   store.ensurePlayer(owner);const id=store.start(owner,starters,'basic'),run=store.battle(id).run_id;
   store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam(['Pikachu','Golem','Snorlax']),id);finishChallengerBattle(store,id);
   await login(context,store,owner);await page.setViewportSize({width,height:900});await freeze(page);await page.goto('/battle');
   await blank(page.getByRole('log',{name:'승리 보상'}));await page.locator('[data-recruit-candidate=Pikachu]').click();await page.getByRole('button',{name:'도감에 넣기',exact:true}).click();
   const recruit=page.getByRole('log',{name:'영입 결과'});await blank(recruit);const recruitKey=await recruit.getAttribute('data-message-key');
   await page.keyboard.press('z');await expect(recruit).toHaveAttribute('data-typing','false');await expect(recruit).toContainText('피카츄를 도감에 등록했다.');await expect(page.getByTestId('team-selection')).toHaveCount(0);
   await page.keyboard.press('z');const prep=page.getByRole('log',{name:'현재 배틀 상황'});await blank(prep);expect(await prep.getAttribute('data-message-key')).not.toBe(recruitKey);await expect(recruit).toHaveCount(0);await expect(page.getByTestId('team-selection')).toBeVisible();
   await page.getByRole('button',{name:'2층 배틀 시작',exact:false}).click();const intro=page.locator('[data-intro-message] [role=log]');await blank(intro);const newId=store.currentBattle(owner)!.id;
   await page.keyboard.press('Enter');await expect(intro).toHaveAttribute('data-typing','false');await expect(page.getByTestId('trainer-entrance')).toHaveAttribute('data-phase','enter');
   await page.keyboard.press('Enter');await page.clock.runFor(3000);await audit(page);
   finishChallengerBattle(store,newId);store.db.prepare("UPDATE runs SET state='select',floor=11 WHERE id=?").run(run);await page.reload();await expect(page.getByTestId('run-maintenance')).toBeVisible();await blank(page.locator('.battle-messages [role=log]'));await audit(page);
  }finally{store.close();}
 });

 test(`empty event instances and one-input confirmation for chest, villain and raid ${width}`,async({page,context})=>{
  const owner='eventmsg_'+randomBytes(7).toString('hex'),f=trackFixture('.data/e2e.sqlite','flare',owner),s=f.store;
  try{
   await login(context,s,owner);await page.setViewportSize({width,height:900});await freeze(page);await page.goto('/battle');const intro=page.getByRole('log',{name:'이벤트 안내'});await blank(intro);
   const chest=s.view(owner).run!.event!;await page.locator('[data-event-confirm]').click();await expect(intro).toHaveAttribute('data-typing','false');expect(s.view(owner).run!.event!.phase).toBe('choice');await page.locator('[data-event-confirm]').click();await page.locator('[data-event-choice=open]').click();
   const result=page.getByRole('log',{name:'이벤트 결과'});await blank(result);await page.keyboard.press('z');await expect(result).toHaveAttribute('data-typing','false');expect(s.view(owner).run!.event!.id).toBe(chest.id);await page.keyboard.press('z');
   await expect.poll(async()=>await page.getByTestId('reward-modal').count()||Number(s.view(owner).run!.event?.id!==chest.id)).toBe(1);await audit(page);
  }finally{s.close();}
  const villainOwner='villmsg_'+randomBytes(7).toString('hex'),v=trackFixture('.data/e2e.sqlite','flare',villainOwner);
  try{
   const pending=v.store.view(villainOwner).run!.event!;v.store.chooseEvent(villainOwner,v.run,pending.id,'skip');
   await login(context,v.store,villainOwner);await page.goto('/battle');const intro=page.getByRole('log',{name:'이벤트 안내'});await blank(intro);
   await page.keyboard.press('z');expect(v.store.currentBattle(villainOwner)).toBeNull();await expect(intro).toHaveAttribute('data-typing','false');await page.keyboard.press('z');await expect.poll(()=>v.store.currentBattle(villainOwner)?.id).toBeTruthy();
   finishChallengerBattle(v.store,v.store.currentBattle(villainOwner)!.id);await page.reload();const result=page.getByRole('log',{name:'이벤트 결과'});await blank(result);await page.keyboard.press('Enter');await expect(result).toHaveAttribute('data-typing','false');await expect(page.getByTestId('reward-modal')).toHaveCount(0);await page.keyboard.press('Enter');await expect(page.getByTestId('reward-modal')).toBeVisible();await audit(page);
  }finally{v.store.close();}
  const raidOwner='raidmsg_'+randomBytes(7).toString('hex'),r=raidFixture('.data/e2e.sqlite',raidOwner);
  try{await login(context,r.store,raidOwner);await page.goto('/battle');const log=page.getByRole('log',{name:'이벤트 안내'});await blank(log);await expect(page.getByTestId('raid-encounter')).not.toContainText('강한 기척이 느껴진다.');await page.keyboard.press('z');await expect(log).toHaveText('강한 기척이 느껴진다.▾');expect(r.store.currentBattle(raidOwner)).toBeNull();await page.keyboard.press('z');await expect.poll(()=>r.store.currentBattle(raidOwner)?.id).toBeTruthy();await audit(page);}finally{r.store.close();}
 });
}
