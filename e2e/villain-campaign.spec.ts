import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {findVillainBattle,villainResult} from '../tests/helpers/villain';

const capture='artifacts/qa/screenshots/villain-campaign';mkdirSync(capture,{recursive:true});
for(const width of [1280,390])for(const rank of ['executive','boss'] as const){
 test(`${rank} portrait, victory bonus and persisted campaign at ${width}px`,async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
   const row=findVillainBattle(store,owner,rank),event=JSON.parse(row.villain_event!),trainer=JSON.parse(row.trainer!);
   await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
   await page.setViewportSize({width,height:width===390?844:900});
   await page.addInitScript(id=>{if(!sessionStorage.getItem('campaign-intro')){sessionStorage.setItem('campaign-intro','1');sessionStorage.setItem('tower-pending-intro',id);}},row.id);
   await page.goto('/battle');await expect(page.locator('body')).toHaveAttribute('data-music-track','villain');
   await expect.poll(()=>page.locator('.intro-enemy img').evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
   await page.screenshot({path:`${capture}/${rank}-intro-${width}.png`,fullPage:true,animations:'disabled'});
   await page.keyboard.press('Shift');await expect(page.locator('.enemy-trainer')).toContainText(trainer.title);
   await expect(page.locator('.enemy-trainer')).toContainText(rank==='boss'?'BOSS':'EXECUTIVE');
   const result=await villainResult(store,row.id);expect(result.log.winner).toBe('Player');store.complete(row.id,result.log,result.view);
   await page.reload();const dialog=page.getByTestId('result-dialog');await expect(dialog).toBeVisible();
   await expect(dialog.getByTestId('villain-outcome')).toContainText(`추가 ${event.bonus.toLocaleString()}코인`);
   await expect(dialog).toContainText(`+${row.reward}코인`);
   await expect.poll(()=>dialog.locator('.boss-portrait').evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
   if(rank==='boss')await expect(dialog).toContainText('조직 이벤트가 종료되었습니다.');
   else await expect(dialog.getByTestId('villain-outcome')).not.toContainText('종료');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`${capture}/${rank}-reward-${width}.png`,fullPage:true,animations:'disabled'});
   const coins=store.view(owner).coins;await page.reload();expect(store.view(owner).coins).toBe(coins);
   await page.getByRole('button',{name:'영입으로 계속'}).click();await expect(page.getByTestId('recruitment').getByTestId('villain-outcome')).toBeVisible();
   await page.getByRole('button',{name:'영입 없이 계속'}).click();
   const ended=store.db.prepare('SELECT defeated_battle_id FROM run_villain_campaigns WHERE run_id=?').get(row.run_id)!.defeated_battle_id;
   expect(ended).toBe(rank==='boss'?row.id:null);
  }finally{store.close();}
 });
}
