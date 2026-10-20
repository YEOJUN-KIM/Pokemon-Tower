import {test,expect,type BrowserContext} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import {raidFixture} from '../tests/raid-fixture';
import {starters} from '../src/data/teams';
import {finishChallengerBattle} from '../tests/challenger-fixture';
import {eventDefinitions} from '../src/data/run-events';
async function login(store:TowerStore,owner:string,context:BrowserContext){store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register(owner,'third-ui-password',owner,undefined);await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);}
for(const width of [1280,390]){
 test(`raid shared confirmation, silhouette and anchors ${width}`,async({page,context})=>{
  const owner='thirdraid'+randomBytes(6).toString('hex'),f=raidFixture('.data/e2e.sqlite',owner);
  try{await login(f.store,owner,context);await page.setViewportSize({width,height:900});await page.goto('/battle');
   const confirm=page.locator('[data-event-confirm]');await expect(confirm).toBeVisible();await expect(page.locator('[data-event-choice]')).toHaveCount(0);
   await page.waitForTimeout(1600);expect(f.store.view(owner).run!.state).toBe('select');
   const player=(await page.locator('[data-event-player]').boundingBox())!,target=(await page.locator('[data-event-target]').boundingBox())!;
   expect(player.x+player.width/2).toBeLessThan(target.x+target.width/2);expect(player.y+player.height).toBeGreaterThan(target.y+target.height);
   await expect(page.getByTestId('raid-silhouette')).toHaveCSS('filter','brightness(0)');
   let posts=0;page.on('request',request=>{if(request.method()==='POST'&&request.postDataJSON()?.type==='event-choice')posts++;});
   await confirm.evaluate(el=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'z',bubbles:true}));el.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
   await expect.poll(()=>f.store.view(owner).run!.state).toBe('battle');expect(posts).toBe(1);await expect(page.getByTestId('raid-encounter')).toHaveCount(0);
  }finally{f.store.close();}
 });
 for(const kind of ['empty','coins','choice'] as const)test(`result before actual rewards, no empty modal, persisted claim ${kind} ${width}`,async({page,context})=>{
  const owner='thirdbox'+randomBytes(6).toString('hex'),s=new TowerStore('.data/e2e.sqlite',max=>max===100?0:max-1,{'mystery-chest':eventDefinitions['mystery-chest']});
  try{s.ensurePlayer(owner);const first=s.start(owner,starters,'basic',{events:true}),run=s.battle(first).run_id;finishChallengerBattle(s,first);s.recruit(owner,run,first,null,null);
   const event=s.view(owner).run!.event!,result=kind==='empty'?{optionId:'empty',title:'상자는 비어 있었다.',tone:'neutral',entries:[{kind:'message',text:'아무것도 얻지 못했다.'}]}:kind==='coins'?{optionId:'coins',title:'전리품',tone:'good',entries:[{kind:'coins',amount:300}]}:{optionId:'choice',title:'보상을 발견했다.',tone:'good',entries:[],selections:[{id:'pick',title:'선택해주세요',state:'pending',candidates:[{id:'a',label:'성장 포인트 10P'},{id:'b',label:'성장 포인트 20P'}]}]};
   s.db.prepare("UPDATE run_events SET status='reward',choice_id='open',result_json=? WHERE id=?").run(JSON.stringify(result),event.id);
   if(kind==='choice')s.db.prepare('INSERT INTO event_reward_selections VALUES (?,?,?)').run(event.id,'pick',JSON.stringify({id:'pick',title:'선택해주세요',candidates:[{id:'a',label:'성장 포인트 10P',effects:[{kind:'growth-points',amount:10}]},{id:'b',label:'성장 포인트 20P',effects:[{kind:'growth-points',amount:20}]}]}));
   await login(s,owner,context);await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/battle');
   const message=page.getByRole('log',{name:'이벤트 결과'}),modal=page.getByTestId('reward-modal');await expect(message).toBeVisible();await expect(modal).toHaveCount(0);await expect(page.getByTestId('team-selection')).toHaveCount(0);
   if(kind==='empty')await expect(message).toContainText('아무것도 얻지 못했다.');
   await page.waitForTimeout(900);await expect(modal).toHaveCount(0);await page.keyboard.press('z');
   if(kind==='empty'){await expect(message).toHaveCount(0);await expect(modal).toHaveCount(0);await expect(page.getByTestId('team-selection')).toBeVisible();return;}
   await expect(modal).toBeVisible();await expect(modal).not.toContainText(/전리품|상자를 열었다|선택해주세요/);await expect(modal.locator('li button')).toHaveCount(0);
   const before=s.view(owner).growthPoints;
   if(kind==='choice'){await modal.getByRole('button',{name:'성장 포인트 10P',exact:true}).click();await expect(modal.getByRole('button',{name:'받기',exact:true})).toBeEnabled();expect(s.view(owner).growthPoints).toBe(before+10);}
   await page.reload();await expect(message).toBeVisible();await expect(modal).toHaveCount(0);await page.keyboard.press('z');await expect(modal).toBeVisible();
   await page.screenshot({path:`test-results/third-reward-${kind}-${width}.png`});await modal.getByRole('button',{name:'받기',exact:true}).click();await expect(modal).toHaveCount(0);await expect(page.getByTestId('team-selection')).toBeVisible();
   if(kind==='choice')expect(s.view(owner).growthPoints).toBe(before+10);
  }finally{s.close();}
 });
}

test('typing starts empty; first click reveals, second click alone advances',async({page,context})=>{
 const owner='thirdtype'+randomBytes(6).toString('hex'),f=raidFixture('.data/e2e.sqlite',owner);
 try{await login(f.store,owner,context);
  // Freeze animation frames before the first paint to inspect the initial text and reveal action.
  await page.addInitScript(()=>{const raf=window.requestAnimationFrame;window.requestAnimationFrame=(fn:FrameRequestCallback)=>String(fn).includes('Math.floor')?0:raf.call(window,fn);});
  await page.goto('/battle');const message=page.locator('[data-event-confirm] .game-dialogue');await expect(message).toHaveAttribute('data-typing','true');await expect(message.locator('[data-dialogue-text]')).toHaveText('');
  await page.locator('[data-event-confirm]').click();await expect(message).toHaveAttribute('data-typing','false');await expect(message.locator('[data-dialogue-text]')).toHaveText('강한 기척이 느껴진다.');expect(f.store.view(owner).run!.state).toBe('select');
  await page.keyboard.press('Enter');await expect.poll(()=>f.store.view(owner).run!.state).toBe('battle');
 }finally{f.store.close();}
});

test('new event message replaces old text before paint; typing Enter reveals without claiming',async({page,context})=>{
 const owner='thirdreset'+randomBytes(6).toString('hex'),s=new TowerStore('.data/e2e.sqlite',max=>max===100?0:max-1,{'mystery-chest':eventDefinitions['mystery-chest']});
 try{s.ensurePlayer(owner);const first=s.start(owner,starters,'basic',{events:true}),run=s.battle(first).run_id;finishChallengerBattle(s,first);s.recruit(owner,run,first,null,null);s.db.prepare('UPDATE run_event_rules SET version=1 WHERE run_id=?').run(run);await login(s,owner,context);
  await page.addInitScript(()=>{const raf=window.requestAnimationFrame;window.requestAnimationFrame=(fn:FrameRequestCallback)=>String(fn).includes('Math.floor')?0:raf.call(window,fn);});
  await page.goto('/battle');await expect(page.getByRole('log',{name:'이벤트 안내'})).toBeVisible();await page.keyboard.press('Enter');
  await expect(page.getByRole('log',{name:'이벤트 안내'})).toHaveAttribute('data-typing','false');await page.getByRole('button',{name:'선택지 보기',exact:true}).click();await page.locator('[data-event-choice=open]').click();
  const result=page.getByRole('log',{name:'이벤트 결과'});await expect(result).toHaveAttribute('data-typing','true');await expect(result.locator('[data-dialogue-text]')).toHaveText('');await expect(page.getByTestId('team-selection')).toHaveCount(0);
  await page.keyboard.press('Enter');await expect(result).toHaveAttribute('data-typing','false');await expect(page.getByTestId('reward-modal')).toHaveCount(0);expect(s.view(owner).run!.event!.phase).toBe('reward');
  await page.keyboard.press('Enter');await expect(page.getByTestId('reward-modal')).toBeVisible();
 }finally{s.close();}
});

test('defeat has two actions and ending uses the existing settlement once',async({page,context})=>{
 const owner='thirdloss'+randomBytes(6).toString('hex'),s=new TowerStore('.data/e2e.sqlite');
 try{s.ensurePlayer(owner);s.db.prepare('UPDATE players SET growth_points=500 WHERE id=?').run(owner);s.permanentAction(owner,crypto.randomUUID(),'buy','retry',1,null);const id=s.start(owner,starters),run=s.battle(id).run_id;
  s.db.prepare("UPDATE battles SET status='complete',view=? WHERE id=?").run(JSON.stringify({id,status:'complete',requestId:1,turn:5,team:[],opponent:null,actions:[],messages:[],winner:'Tower AI',error:null}),id);s.db.prepare("UPDATE runs SET state='lost' WHERE id=?").run(run);
  await login(s,owner,context);await page.goto('/battle');const dialog=page.getByTestId('result-dialog');await expect(dialog.getByRole('button')).toHaveCount(2);await expect(dialog.getByRole('button',{name:'재도전 1/1'})).toBeEnabled();
  await dialog.getByRole('button',{name:'도전 종료',exact:true}).click();await expect(dialog).toHaveCount(0);expect(s.view(owner).run!.growthReward).toBe(10);await page.reload();await expect(dialog).toHaveCount(0);expect(s.view(owner).run!.growthReward).toBe(10);
 }finally{s.close();}
});
