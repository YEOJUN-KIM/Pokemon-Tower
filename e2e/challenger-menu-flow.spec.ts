import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {Accounts} from '../src/server/accounts';
import {challengerFixture,finishChallengerBattle} from '../tests/challenger-fixture';

const intro='강해 보이는 트레이너들이 모여 있다.\n한 명을 골라 승부를 걸어보자.';
for(const width of [1280,390]){
 test(`challenger intro then plain text menu and shared footer at ${width}`,async({page,context})=>{
  const owner='chmenu_'+randomBytes(7).toString('hex'),f=challengerFixture('.data/e2e.sqlite',owner),s=f.store;
  try{
   s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(s.db).register(owner,'challenger-test-password',owner,undefined);await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);await page.setViewportSize({width,height:width===390?844:900});await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+10000));await page.goto('/battle');
   const menu=page.getByTestId('challenger-candidates'),log=page.getByRole('log',{name:'이벤트 안내'}),footer=page.locator('[data-menu-context]');
   await expect(menu).toHaveCount(0);await expect(page.getByTestId('challenger-detail')).toHaveCount(0);await expect(log.locator('[data-dialogue-text]')).toHaveText('');await expect(footer).toContainText('계속');await page.keyboard.press('2');expect(s.currentBattle(owner)).toBeNull();
   await page.keyboard.press('z');await expect(log.locator('[data-dialogue-text]')).toHaveText(intro);await expect(menu).toHaveCount(0);await page.keyboard.press('z');await expect(menu).toBeVisible();
   const rows=menu.locator('[data-challenger]');await expect(rows).toHaveCount(4);await expect(menu.getByRole('button',{name:'도전한다',exact:true})).toHaveCount(0);await expect(menu.locator('small')).toHaveCount(0);await expect(rows.first()).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(rows.first()).toHaveCSS('border-top-width','0px');await expect(rows.first()).toHaveCSS('box-shadow','none');
   await expect(footer).toContainText('1–3');await expect(footer).toContainText('도전');await expect(footer).toContainText('돌아가기');await page.keyboard.press('2');await expect(page.getByTestId('challenger-detail')).toHaveAttribute('data-candidate',f.event.challengers![1].id);expect(s.currentBattle(owner)).toBeNull();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);mkdirSync('artifacts/qa/screenshots/challenger-menu',{recursive:true});await page.screenshot({path:`artifacts/qa/screenshots/challenger-menu/menu-${width}.png`,animations:'disabled'});
   await page.keyboard.press('x');await expect(menu).toHaveCount(0);await expect(page.getByTestId('team-selection')).toBeVisible();expect(s.view(owner).run!.event).toBeNull();
  }finally{s.close();}
 });
 test(`challenger selection plays the standard trainer introduction and battle entrance at ${width}`,async({page,context})=>{
  const owner='chclick_'+randomBytes(7).toString('hex'),f=challengerFixture('.data/e2e.sqlite',owner),s=f.store;
  try{
   s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(s.db).register(owner,'challenger-test-password',owner,undefined);await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);await page.setViewportSize({width,height:900});await page.goto('/battle');await expect(page.getByRole('log',{name:'이벤트 안내'})).toHaveAttribute('data-typing','false');await page.locator('[data-event-confirm]').click();
   const chosen=f.event.challengers![2],button=page.locator(`[data-challenger="${chosen.id}"]`);await button.hover();await expect(page.getByTestId('challenger-detail')).toHaveAttribute('data-candidate',chosen.id);expect(s.currentBattle(owner)).toBeNull();if(width===1280)await button.click();else{await page.keyboard.press('3');await page.keyboard.press('z');}await expect.poll(()=>s.currentBattle(owner)?.id).toBeTruthy();const battle=s.currentBattle(owner)!;expect(s.db.prepare('SELECT selected_id FROM challenger_encounters WHERE event_id=?').get(f.event.id)!.selected_id).toBe(chosen.id);
   const entrance=page.getByTestId('trainer-entrance'),log=page.getByRole('log',{name:'현재 배틀 상황'});await expect(entrance).toHaveAttribute('data-phase','enter');await expect(entrance.locator('.intro-player')).toBeVisible();await expect(entrance.locator('.intro-enemy')).toBeVisible();await expect(log).toHaveAttribute('data-typing','false');await expect(log).toContainText(chosen.title);await expect(page.locator('.action-grid button')).toHaveCount(0);await page.keyboard.press('Enter');await expect(entrance).toHaveAttribute('data-phase','throw');await expect(page.locator('.player-back-sprite')).toHaveCSS('animation-name',/player-throw-frames$/);await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:15000});await expect(entrance).toHaveCount(0);await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeVisible();
   finishChallengerBattle(s,battle.id);await page.reload();await expect(page.getByRole('log',{name:'이벤트 결과'})).toHaveAttribute('data-typing','false');await expect(page.getByRole('log',{name:'이벤트 결과'}).locator('[data-dialogue-text]')).toHaveText('도전한 트레이너에게 승리했다!\n승리의 보상을 확인해보자.');await expect(page.getByTestId('reward-modal')).toHaveCount(0);await expect(page.locator('[data-event-player]')).toBeVisible();await expect(page.locator('[data-event-target] img')).toBeVisible();await page.locator('[data-event-confirm]').click();await expect(page.getByTestId('reward-modal')).toBeVisible();
  }finally{s.close();}
 });
}
