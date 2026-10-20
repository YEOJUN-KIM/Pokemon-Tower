import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
import {mkdirSync} from 'node:fs';

// A completed event can retain the game's existing villain follow-up instead of team selection.
async function nextStage(page:import('@playwright/test').Page,store:TowerStore,owner:string){
 const next=store.view(owner).run!;
 if(next.state==='battle'||next.event){
  await expect(page.locator('.battle-panel')).toBeVisible();expect(next.floor).toBe(2);
  expect(next.event?.villain||store.currentBattle(owner)?.trainer).toBeTruthy();
 }else await expect(page.getByRole('dialog',{name:'출전 준비',exact:true})).toBeVisible();
}

// Each scenario provisions an account; isolate the shared test DB's signup quota.
test.beforeEach(()=>{const store=new TowerStore('.data/e2e.sqlite');try{store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();}finally{store.close();}});

for(const width of [1280,390])for(const choice of ['open','skip','resume-ticket'] as const)test(`mystery chest ${choice} at ${width}, persists without spending a floor`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='chest-'+suffix,store=new TowerStore('.data/e2e.sqlite',()=>0);
 try{
  const auth=await new Accounts(store.db).register('chest_'+suffix,'chest-test-password',owner,undefined);store.ensurePlayer(owner);
  const id=store.start(owner,starters,'basic',{events:true}),runId=store.battle(id).run_id;
  store.db.prepare('UPDATE run_event_rules SET version=1 WHERE run_id=?').run(runId);
  store.db.prepare("UPDATE battles SET status='complete',view=? WHERE id=?").run(JSON.stringify({id,status:'complete',requestId:1,turn:2,team:[],opponent:null,actions:[],messages:['|win|Player'],winner:'Player',error:null}),id);
  store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(runId);store.recruit(owner,runId,id,null,null);
  const event=store.view(owner).run!.event!;expect(event).toBeTruthy();
  if(choice==='resume-ticket'){
   // A real saved ticket reward, restored through the same API as a browser reload.
   const saved=new TowerStore('.data/e2e.sqlite',()=>80);try{saved.chooseEvent(owner,runId,event.id,'open');}finally{saved.close();}
  }
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
  await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  const dialog=page.getByTestId('run-event');await expect(dialog).toBeVisible();await expect(dialog.getByRole('log',{name:'이벤트 안내'})).toBeVisible();
  expect(store.view(owner).run!.floor).toBe(2);await expect(page.getByTestId('run-maintenance')).toHaveCount(0);
  await expect(page.locator('dialog[open]')).toHaveCount(0);await expect(dialog).toHaveAttribute('data-event','true');
  await expect(dialog.getByTestId('event-info').locator('img,svg')).toHaveCount(0);await expect(dialog.getByTestId('event-artwork').getByRole('img',{name:'보물 상자'})).toBeVisible();
  const arena=(await dialog.locator('.arena').boundingBox())!,messages=(await dialog.locator('.battle-messages').boundingBox())!;
  expect(messages.y).toBeGreaterThanOrEqual(arena.y+arena.height-1);expect(Math.abs(messages.x-arena.x)).toBeLessThan(2);expect(Math.abs(messages.width-arena.width)).toBeLessThan(2);
  await expect(dialog.locator('.command-area')).toHaveCount(0);
  await expect(dialog.locator('.arena-orbit')).toHaveCount(0);
  const player=(await dialog.locator('[data-event-player]').boundingBox())!,target=(await dialog.locator('[data-event-target]').boundingBox())!;
  expect(player.x+player.width/2).toBeLessThan(target.x+target.width/2);expect(player.y+player.height).toBeGreaterThan(target.y+target.height);
  const info=dialog.getByTestId('event-info');
  if(choice==='resume-ticket')await expect(info).toHaveCount(0);
  else{
   await expect(info).toContainText('코인이나 알 뽑기권');const infoBox=(await info.boundingBox())!;
   expect(infoBox.width).toBeLessThanOrEqual(310);expect(infoBox.height).toBeLessThan(arena.height/2);
   expect(infoBox.y).toBeGreaterThanOrEqual(arena.y);expect(infoBox.y-arena.y).toBeLessThanOrEqual(16);
   expect(infoBox.y+infoBox.height).toBeLessThanOrEqual(messages.y);
  }

  await page.keyboard.press('Escape');await expect(dialog).toBeVisible();
  mkdirSync('artifacts/qa/screenshots/events',{recursive:true});
  if(choice!=='resume-ticket'){
   await expect(dialog).toHaveAttribute('data-phase','choice');
   await page.reload();await expect(dialog).toHaveAttribute('data-phase','choice');expect(store.view(owner).run!.event!.id).toBe(event.id);
   const blocked=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'enter',runId,floor:2,selected:starters}});expect(blocked.status()).toBe(409);
   await expect(dialog.getByRole('log',{name:'이벤트 안내'})).toHaveAttribute('data-typing','false');
   const textBox=(await dialog.getByRole('log',{name:'이벤트 안내'}).boundingBox())!;
   const messageBox=(await dialog.locator('.battle-messages').boundingBox())!;
   expect(textBox.y+textBox.height).toBeLessThanOrEqual(messageBox.y+messageBox.height+1);
   const nextBox=(await dialog.getByRole('button',{name:'선택지 보기',exact:true}).boundingBox())!;
   expect(nextBox.y+nextBox.height).toBeLessThanOrEqual(messageBox.y+messageBox.height+1);
   await dialog.getByRole('button',{name:'선택지 보기',exact:true}).click();
   await expect(dialog.getByRole('log',{name:'이벤트 안내'})).toHaveCount(0);await expect(dialog.getByTestId('event-info')).toBeVisible();
   const options=dialog.getByRole('group',{name:'이벤트 선택'}).getByRole('button'),first=(await options.nth(0).boundingBox())!,second=(await options.nth(1).boundingBox())!;
   expect(second.y).toBeGreaterThanOrEqual(first.y+first.height);expect(second.x).toBe(first.x);
   for(const option of await options.all()){await expect(option).toHaveCSS('border-top-width','0px');await expect(option).toHaveCSS('outline-style','none');await expect(option).toHaveCSS('box-shadow','none');await expect(option).toHaveCSS('background-color','rgba(0, 0, 0, 0)');}
   if(width===1280){
    await options.nth(0).hover();await page.keyboard.press('ArrowDown');await expect(options.nth(0).locator('[aria-hidden=true]')).toHaveCSS('opacity','0');await expect(options.nth(1)).toHaveAttribute('data-game-cursor','true');await expect(options.nth(1).locator('[aria-hidden=true]')).toHaveCSS('opacity','1');await expect(options.nth(1)).toHaveCSS('outline-style','none');
    await page.keyboard.press('ArrowUp');await expect(options.nth(0)).toHaveAttribute('data-game-cursor','true');
   }
   await dialog.screenshot({path:`artifacts/qa/screenshots/events/chest-choice-${width}.png`});
   const originalLabels=await options.locator('span:last-child').allTextContents();
   await options.nth(0).locator('span:last-child').evaluate(el=>el.textContent='상자를 조심스럽게 열고 안쪽에 어떤 선물이 들어 있는지 하나씩 살펴본다');
   await options.nth(1).locator('span:last-child').evaluate(el=>el.textContent='상자를 원래 있던 자리에 그대로 두고 아무 일도 없었던 것처럼 다음 길로 향한다');
   for(const option of await options.all())expect(await option.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   for(let i=0;i<originalLabels.length;i++)await options.nth(i).locator('span:last-child').evaluate((el,text)=>el.textContent=text,originalLabels[i]);
   if(choice==='skip')await dialog.getByRole('button',{name:'지나간다',exact:true}).click();
   else if(width===1280)await page.keyboard.press('z');else await dialog.getByRole('button',{name:'상자를 연다',exact:true}).click();
  }
  if(choice!=='skip'){
   await expect(dialog).toHaveAttribute('data-phase','reward');await expect(info).toHaveCount(0);const saved=store.view(owner),reward=saved.run!.event!.reward!;
   await expect(dialog.getByTestId('event-reward')).toHaveText(reward.kind==='coins'?`${reward.amount}코인`:`알 뽑기권 ${reward.amount}장`);
   await page.reload();await expect(dialog).toHaveAttribute('data-phase','reward');await expect(info).toHaveCount(0);
   // Simulate duplicate delivery from two clients after a lost response.
   const duplicate=await Promise.all([1,2].map(()=>page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'event-choice',runId,eventId:event.id,choice:'open'}})));expect(duplicate.every(response=>response.ok())).toBe(true);
   expect(store.view(owner).coins).toBe(saved.coins);expect(store.permanentView(owner).eggTickets).toBe(saved.permanent!.eggTickets);
   if(choice==='resume-ticket')expect(store.permanentView(owner).eggTickets).toBe(1);
   await expect(dialog.getByRole('log',{name:'이벤트 안내'})).toHaveAttribute('data-typing','false');
   const rewardPanel=(await dialog.locator('.battle-messages').boundingBox())!,continueBox=(await dialog.getByRole('button',{name:'계속하기',exact:true}).boundingBox())!;
   expect(continueBox.y+continueBox.height).toBeLessThanOrEqual(rewardPanel.y+rewardPanel.height+1);
   await dialog.screenshot({path:`artifacts/qa/screenshots/events/chest-${choice}-${width}.png`});
   await dialog.getByRole('button',{name:'계속하기',exact:true}).click();
  }
  await expect(dialog).toHaveCount(0);await nextStage(page,store,owner);
  expect(store.view(owner).run!.floor).toBe(2);expect(store.view(owner).run!.event).toBeNull();
  await page.reload();await expect(dialog).toHaveCount(0);await nextStage(page,store,owner);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});

test('new game API enables events without changing already saved runs',async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='event-start-'+suffix,store=new TowerStore('.data/e2e.sqlite');
 try{
  const account=await new Accounts(store.db).register('evt_'+suffix,'event-start-password',owner,undefined);store.ensurePlayer(owner);
  await context.addCookies([{name:'tower_auth',value:account.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  const response=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'start',selected:starters,rule:'basic'}});expect(response.ok()).toBe(true);
  const runId=(await response.json()).tower.run.id;
  expect(store.db.prepare('SELECT version FROM run_event_rules WHERE run_id=?').get(runId)).toMatchObject({version:2});
 }finally{store.close();}
});

for(const width of [1280,390])for(const kind of ['breeder-gift','traveling-merchant'] as const)for(const accept of [true,false])test(`${kind} ${accept?'accept':'decline'} at ${width}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='meet-'+suffix,store=new TowerStore('.data/e2e.sqlite',()=>0);
 try{
  const auth=await new Accounts(store.db).register('meet_'+suffix,'event-meet-password',owner,undefined);store.ensurePlayer(owner);
  const battle=store.start(owner,starters,'basic',{events:true}),runId=store.battle(battle).run_id;
  store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(battle);store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(runId);store.recruit(owner,runId,battle,null,null);
  store.db.prepare('UPDATE run_events SET kind=? WHERE run_id=?').run(kind,runId);store.db.prepare('UPDATE players SET coins=300 WHERE id=?').run(owner);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  const event=page.getByTestId('run-event'),info=event.getByTestId('event-info');
  await expect(info).toContainText(kind==='breeder-gift'?'브리더의 응원':'여행 상인의 제안');
  await expect(info.locator('img,svg')).toHaveCount(0);await expect(event.locator('.arena-orbit')).toHaveCount(0);
  await expect(event.getByRole('img',{name:kind==='breeder-gift'?'브리더':'여행 상인',exact:true})).toBeVisible();
  await page.reload();await expect(info).toBeVisible();
  await event.getByRole('button',{name:'선택지 보기',exact:true}).click();
  await event.screenshot({path:`artifacts/qa/screenshots/events/${kind}-${width}.png`});
  await event.getByRole('button',{name:accept?(kind==='breeder-gift'?'선물을 받는다':'300코인으로 산다'):'지나간다',exact:true}).click();
  if(accept){
   await expect(event).toHaveAttribute('data-phase','reward');await expect(info).toHaveCount(0);
   await expect(event.getByTestId('event-reward')).toHaveText('알 뽑기권 1장');
   await page.reload();await expect(info).toHaveCount(0);await expect(event).toHaveAttribute('data-phase','reward');
   expect(store.permanentView(owner).eggTickets).toBe(1);expect(store.view(owner).coins).toBe(kind==='traveling-merchant'?0:300);
   await event.getByRole('button',{name:'계속하기',exact:true}).click();
  }else{expect(store.permanentView(owner).eggTickets).toBe(0);expect(store.view(owner).coins).toBe(300);}
  await expect(event).toHaveCount(0);await nextStage(page,store,owner);expect(store.view(owner).run!.floor).toBe(2);
 }finally{store.close();}
});
