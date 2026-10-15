import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {packTeam,starters} from '../src/data/teams';

for(const recruit of [false,true])test(`final floor transitions directly to clear, recruit=${recruit}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='clear-'+suffix,store=new TowerStore('.data/e2e.sqlite');
 page.setDefaultTimeout(10000);
 try{
  const auth=await new Accounts(store.db).register('clear_'+suffix,'clear-test-password',owner,undefined);
  store.ensurePlayer(owner);const id=store.start(owner,starters),run=store.battle(id).run_id;
  store.db.prepare('DELETE FROM run_routes WHERE run_id=?').run(run);
  store.db.prepare("UPDATE runs SET state='recruit',floor=100,total_floors=100 WHERE id=?").run(run);
  const view={id,status:'complete',requestId:1,turn:30,team:[],opponent:null,actions:[],messages:['|win|Player'],winner:'Player',error:null};
  store.db.prepare("UPDATE battles SET floor=100,status='complete',opponent_team=?,view=? WHERE id=?").run(packTeam(['Snorlax']),JSON.stringify(view),id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/battle');await page.getByRole('button',{name:'영입으로 계속',exact:true}).click();
  await expect(page.getByTestId('recruitment')).toBeVisible();
  await page.evaluate(()=>{const frames:unknown[]=[];(window as unknown as {clearFrames:unknown[]}).clearFrames=frames;function tick(){frames.push({shell:document.querySelector('.app-shell')?.className,clear:!!document.querySelector('.tower-clear'),dialogs:[...document.querySelectorAll('dialog[open]')].map(el=>el.getAttribute('data-testid')||el.getAttribute('aria-label'))});if(frames.length<300)requestAnimationFrame(tick);}requestAnimationFrame(tick);});
  if(recruit){
   await page.getByRole('button',{name:'잠만보 영입 선택',exact:true}).click();await page.getByRole('button',{name:/동료로 데려가기/}).click();await page.getByTestId('recruit-confirmation').getByRole('button',{name:'동료로 데려가기',exact:true}).click();
   await expect(page.getByTestId('recruit-celebration')).toBeVisible();await expect(page.getByTestId('recruit-celebration')).toHaveAttribute('data-phase','joined');await page.getByRole('button',{name:'클리어 확인',exact:true}).click();
  }else await page.getByRole('button',{name:'영입 없이 계속',exact:true}).click();
  await expect(page.getByTestId('tower-clear')).toBeVisible();
  const frames=await page.evaluate(()=>(window as unknown as {clearFrames:{shell?:string;clear:boolean;dialogs:string[]}[]}).clearFrames);
  expect(frames.filter(frame=>!frame.clear && (!frame.dialogs.length || frame.shell?.includes('battle-between')))).toEqual([]);
  await page.reload();await expect(page.getByTestId('tower-clear')).toBeVisible();
  await page.screenshot({path:`test-results/clear-transition-${recruit}.png`,fullPage:true});
 }finally{store.close();}
});
