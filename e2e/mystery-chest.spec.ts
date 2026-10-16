import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';

// Each case owns an isolated account; don't let the shared fixture DB's signup
// rate counter couple these 12 UI cases to the existing event tests.
test.beforeEach(()=>{
 const store=new TowerStore('.data/e2e.sqlite');
 try{store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();}finally{store.close();}
});

for(const width of [1280,390])for(const [draw,id,coins,tickets] of [[0,'empty',1000,0],[25,'trap',850,0],[50,'coins',1300,0],[65,'ticket',1000,1],[80,'treasure',2000,1],[90,'tickets',1000,3]] as const){
 test(`mystery ${id} at ${width}: saved result, duplicate API, keyboard and confirmation`,async({page,context})=>{
  const suffix=randomBytes(8).toString('hex'),owner='mystery-'+suffix;
  let rolled=0;const store=new TowerStore('.data/e2e.sqlite',()=>rolled);
  try{
   const auth=await new Accounts(store.db).register('my_'+suffix,'mystery-test-password',owner,undefined);store.ensurePlayer(owner);
   const battle=store.start(owner,starters,'basic',{events:true}),run=store.battle(battle).run_id;
   store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(battle);
   store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run);store.recruit(owner,run,battle,null,null);
   store.db.prepare('UPDATE players SET coins=1000 WHERE id=?').run(owner);
   const event=store.view(owner).run!.event!;rolled=draw;
   store.chooseEvent(owner,run,event.id,'open');
   const result=store.view(owner).run!.event!.result!;expect(result.optionId).toBe(id);
   await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
   await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
   const scene=page.getByTestId('run-event'),panel=scene.getByTestId('reward-panel');
   await expect(panel).toBeVisible();await expect(scene).toHaveAttribute('data-phase','reward');
   await expect(panel.getByRole('log',{name:'이벤트 안내'})).toHaveAttribute('data-typing','false');
   await expect(panel).toContainText(result.title);
   const entries=panel.getByRole('list',{name:'결과 항목'}).getByRole('listitem');
   await expect(entries).toHaveCount(result.entries.length);
   if(id==='trap')await expect(entries).toContainText(['-15% · 실제 150코인 손실']);
   if(id==='empty')await expect(entries).toContainText(['아무것도 얻지 못했다.']);
   if(id==='treasure'){await expect(entries.nth(0)).toContainText('1,000');await expect(entries.nth(1)).toContainText('1장');}
   await page.reload();await expect(panel).toBeVisible();
   expect(store.view(owner).run!.event!.result).toEqual(result);
   const payload={type:'event-choice',runId:run,eventId:event.id,choice:'open'};
   const duplicate=await Promise.all([1,2].map(()=>page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:payload})));
   expect(duplicate.every(response=>response.ok())).toBe(true);
   expect(store.view(owner).coins).toBe(coins);expect(store.permanentView(owner).eggTickets).toBe(tickets);
   const blocked=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'enter',runId:run,floor:2,selected:starters}});expect(blocked.status()).toBe(409);
   await expect(panel.getByRole('log',{name:'이벤트 안내'})).toHaveAttribute('data-typing','false');
   const confirm=panel.getByRole('button',{name:'확인',exact:true});await expect(confirm).toBeVisible();
   expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const bounds=(await scene.locator('.battle-messages').boundingBox())!,button=(await confirm.boundingBox())!;
   expect(button.y+button.height).toBeLessThanOrEqual(bounds.y+bounds.height+1);
   mkdirSync('artifacts/qa/screenshots/mystery-chest',{recursive:true});
   await scene.screenshot({path:`artifacts/qa/screenshots/mystery-chest/${id}-${width}.png`});
   if(width===1280){await expect(confirm).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('z');}else await confirm.click();
   await expect(scene).toHaveCount(0);await expect(page.getByRole('dialog',{name:'2층 출전 준비',exact:true})).toBeVisible();
   expect(store.view(owner).run!.floor).toBe(2);expect(store.view(owner).run!.event).toBeNull();
  }finally{store.close();}
 });
}
