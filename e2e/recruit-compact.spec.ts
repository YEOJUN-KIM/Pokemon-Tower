import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {packTeam,starters} from '../src/data/teams';

for(const width of [390,1280])for(const archiveOnly of [false,true])test(`compact recruitment ${archiveOnly?'archive':'join'} at ${width}`,async({page,context})=>{
 const owner='compact_'+randomUUID(),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);const id=store.start(owner,starters),run=store.battle(id).run_id;
  const view={id,status:'complete',requestId:1,turn:1,team:[],opponent:null,actions:[],messages:[],winner:'Player',error:null};
  store.db.prepare("UPDATE battles SET status='complete',opponent_team=?,view=? WHERE id=?").run(packTeam(['Skarmory']),JSON.stringify(view),id);
  store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run);
  const account=await new Accounts(store.db).register('compact_'+randomUUID().slice(0,8),randomUUID(),owner,undefined);
  await context.addCookies([{name:'tower_auth',value:account.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?740:900});await page.goto('/battle',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'영입으로 계속'}).click();
  await page.getByRole('button',{name:'무장조 영입 선택'}).click();
  await page.getByRole('button',{name:archiveOnly?'도감에 등록':'동료로 데려가기'}).click();
  const dialog=page.getByTestId('recruit-confirmation');await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('group',{name:'기술 가져오기 방식'})).toHaveCount(0);
  await expect(dialog.getByText('바로 장착',{exact:true})).toHaveCount(0);
  await expect(dialog.locator('.collected-moves')).toHaveCount(0);
  const cancel=(await dialog.getByRole('button',{name:'취소',exact:true}).boundingBox())!;
  const confirm=dialog.getByRole('button',{name:archiveOnly?'도감에 등록':'동료로 데려가기',exact:true});const confirmBox=(await confirm.boundingBox())!;
  expect(Math.abs(cancel.y-confirmBox.y)).toBeLessThan(1);expect(confirmBox.width/cancel.width).toBeCloseTo(7/3,1);
  expect(await dialog.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
  if(!archiveOnly){await expect(dialog.locator('details')).not.toHaveAttribute('open');await dialog.locator('summary').click();await expect(dialog.getByRole('table')).toBeVisible();await dialog.locator('summary').click();}
  await dialog.screenshot({path:`test-results/recruit-compact-${width}-${archiveOnly}.png`});
  await confirm.click();await expect(page.getByTestId('recruit-celebration')).toBeVisible();
  const saved=store.view(owner);expect(saved.unlocked).toContain('Skarmory');expect(saved.run!.roster.includes('Skarmory')).toBe(!archiveOnly);
 }finally{store.close();}
});
