import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {mkdirSync} from 'node:fs';

test('PC flee feedback is local; Z focus/selection and automatic reading remain distinct',async({page,context})=>{
 const owner='follow_'+randomBytes(6).toString('hex'),s=new TowerStore('.data/e2e.sqlite');
 try{
  s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
  const auth=await new Accounts(s.db).register(owner,'feedback-password',owner,undefined);s.ensurePlayer(owner);
  const id=s.start(owner,['Charizard','Blastoise','Venusaur']);
  s.db.prepare('UPDATE battles SET player_team=?,opponent_team=? WHERE id=?').run(packTeam(['Charizard','Blastoise','Venusaur'],{Charizard:{...defaultProfile('Charizard'),moves:['Flamethrower','Growl','Protect','Air Slash']}},{Charizard:'Firium Z'}),packTeam(['Snorlax','Shuckle','Blissey']),id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);
  await page.setViewportSize({width:1280,height:900});await page.goto('/battle');
  const flee=page.locator('[data-mode=run]');await expect(flee).toBeEnabled();
  const before=(await (await page.request.get('/api/battle')).json()).battle;
  let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
  await flee.click();await expect(page.getByRole('log',{name:'현재 배틀 상황'})).toContainText('안 돼! 다른 사람과의 배틀 중에 도망칠 순 없어!');
  expect(posts).toBe(0);expect((await (await page.request.get('/api/battle')).json()).battle).toEqual(before);
  await expect(page.getByTestId('battle-growth-points')).toBeVisible();
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  const z=page.getByTestId('zmove-toggle');await expect(z).toHaveAttribute('aria-pressed','false');await z.focus();await z.hover();
  const image=z.locator('.gimmick-item-visual');expect(await image.evaluate(el=>getComputedStyle(el).filter)).toContain('brightness');
  await z.click();await expect(z).toHaveAttribute('aria-pressed','true');expect(await image.evaluate(el=>getComputedStyle(el).animationName)).toContain('selected-symbol');
  expect(await z.evaluate(el=>({border:getComputedStyle(el).borderTopWidth,shadow:getComputedStyle(el).boxShadow,background:getComputedStyle(el).backgroundColor}))).toEqual({border:'0px',shadow:'none',background:'rgba(0, 0, 0, 0)'});
  mkdirSync('artifacts/qa/play-feedback',{recursive:true});await page.screenshot({path:'artifacts/qa/play-feedback/followup-gimmick-selected.png'});
  const description=page.locator('p[aria-label="기술 설명"]');
  await expect(description).not.toContainText('팀당');await expect(description).toContainText('불꽃');
  await page.mouse.move(650,250);
  const metrics=await description.evaluate(el=>({scroll:el.scrollHeight,height:el.clientHeight,bar:getComputedStyle(el).scrollbarWidth}));
  expect(metrics.scroll).toBeGreaterThan(metrics.height);expect(metrics.bar).toBe('none');
  await expect.poll(()=>description.evaluate(el=>el.scrollTop),{timeout:6500}).toBeGreaterThan(3);
  await description.hover();const held=await description.evaluate(el=>el.scrollTop);await page.waitForTimeout(500);expect(await description.evaluate(el=>el.scrollTop)).toBe(held);
  // Base Growl is short enough to fit and must remain stationary.
  await z.click();await page.locator('[data-command="move 2"]').focus();await page.mouse.move(650,250);
  await expect(description).not.toContainText('불꽃');await page.waitForTimeout(2200);expect(await description.evaluate(el=>el.scrollTop)).toBe(0);
  mkdirSync('artifacts/qa/play-feedback',{recursive:true});await page.screenshot({path:'artifacts/qa/play-feedback/followup-z-reading.png'});
 }finally{s.close();}
});
