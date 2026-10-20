import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {trackFixture} from '../tests/villain-track-fixture';

for(const [width,organization] of [[1280,'rocket'],[390,'skull']] as const)test(`villain waits for one confirmation, then battle intro waits at ${width}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='vconfirm-'+suffix,f=trackFixture('.data/e2e.sqlite',organization,owner);
 try{
  f.store.chooseEvent(owner,f.run,f.store.view(owner).run!.event!.id,'skip');const event=f.store.view(owner).run!.event!;
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register('vc_'+suffix,'villain-confirm-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);await page.setViewportSize({width,height:width===390?844:900});await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
  let requests=0;page.on('request',request=>{if(request.method()==='POST'&&request.postDataJSON()?.type==='event-choice')requests++;});
  await page.goto('/battle');await expect(page.getByTestId('rocket-ambush-notice')).toBeAttached();await expect(page.locator('[data-event-confirm]')).toBeVisible();await expect(page.locator('[data-event-choice]')).toHaveCount(0);
  // Longer than the removed animation/auto-advance timer, including 4× playback.
  await page.waitForTimeout(1700);expect(f.store.view(owner).run!.event!.id).toBe(event.id);expect(requests).toBe(0);await expect(page.locator('[data-event-target]')).toBeVisible();await expect(page.locator('[data-menu-context]')).toHaveText(/계속/);
  if(width===1280)await page.locator('[data-event-confirm]').evaluate(el=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));el.dispatchEvent(new MouseEvent('click',{bubbles:true}));el.dispatchEvent(new MouseEvent('click',{bubbles:true}));});else await page.locator('[data-event-confirm]').dblclick();
  await expect(page.getByTestId('trainer-entrance')).toHaveAttribute('data-phase','enter');expect(requests).toBe(1);
  await page.waitForTimeout(1200);await expect(page.getByTestId('trainer-entrance')).toHaveAttribute('data-phase','enter');
  await page.keyboard.press('z');await expect(page.locator('.battle-root-menu')).toBeVisible();expect(requests).toBe(1);expect(f.store.view(owner).run!.state).toBe('battle');
 }finally{f.store.close();}
});
