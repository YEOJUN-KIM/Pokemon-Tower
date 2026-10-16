import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';

test('capture the real inline chest encounter and its reward for a GIF preview',async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='preview-'+suffix,store=new TowerStore('.data/e2e.sqlite',()=>0);
 const output='test-results/run-event-preview';mkdirSync(output,{recursive:true});
 try{
  const account=await new Accounts(store.db).register('pv_'+suffix,'event-preview-password',owner,undefined);store.ensurePlayer(owner);
  const battle=store.start(owner,starters,'basic',{events:true}),run=store.battle(battle).run_id;
  store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(battle);store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run);
  store.recruit(owner,run,battle,null,null);
  await context.addCookies([{name:'tower_auth',value:account.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:1100,height:760});
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+10000));
  await page.goto('/battle');const scene=page.getByTestId('run-event');await expect(scene).toBeVisible();await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.evaluate(()=>document.fonts.ready);
  let index=0;
  async function frames(count:number){
   await scene.evaluate(el=>{for(const animation of el.getAnimations({subtree:true})){animation.pause();animation.currentTime=0;}});
   for(let step=0;step<count;step++){
    await page.clock.runFor(100);
    await scene.evaluate((el,time)=>{for(const animation of el.getAnimations({subtree:true}))animation.currentTime=time;},step*100);
    await scene.screenshot({path:`${output}/frame-${String(index++).padStart(3,'0')}.png`,animations:'allow'});
   }
  }
  await frames(20);await scene.getByRole('button',{name:'선택지 보기',exact:true}).click();await frames(10);await page.keyboard.press('ArrowDown');await frames(8);await page.keyboard.press('ArrowUp');await frames(8);
  await scene.getByRole('button',{name:'상자를 연다',exact:true}).click();await expect(scene).toHaveAttribute('data-phase','reward');
  await frames(26);
  await expect(scene.getByRole('log',{name:'이벤트 안내'})).toHaveAttribute('data-typing','false');
  writeFileSync(`${output}/manifest.json`,JSON.stringify({frames:index,durationMs:100,reward:store.view(owner).run!.event?.reward,result:store.view(owner).run!.event?.result,viewport:{width:1100,height:760}}));
 }finally{store.close();}
});
