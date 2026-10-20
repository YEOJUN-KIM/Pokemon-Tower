import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {Accounts} from '../src/server/accounts';
import {hiddenShopFixture} from '../tests/hidden-shop-fixture';

for(const width of [1280,390])for(const confirm of ['z','Enter','click'])test(`preparation and battle controls ${width} ${confirm}`,async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner='polish-'+suffix,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.chooseEvent(owner,f.run,f.eventId,'leave');
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
  const auth=await new Accounts(f.store.db).register('polish_'+suffix,'polish-test-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);
  await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
  await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  const prep=page.getByTestId('team-selection');await expect(prep).toBeVisible();await expect(prep).not.toContainText('선봉');
  const cards=prep.locator('[data-party-species]');await expect(cards).toHaveCount(3);
  for(let i=0;i<3;i++){
   await expect(cards.nth(i).locator('[data-party-order]')).toHaveText(String(i+1).padStart(2,'0'));
   expect(parseFloat(await cards.nth(i).locator('[data-party-order]').evaluate(el=>getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(19);
   await expect(cards.nth(i).locator('.move-type-badge').first()).toBeVisible();
  }
  await cards.nth(0).hover();await expect(cards.nth(0)).toHaveAttribute('data-game-cursor','true');
  await expect.poll(async()=>await cards.nth(0).evaluate(el=>getComputedStyle(el).backgroundColor)!==await cards.nth(1).evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(true);
  await page.keyboard.press('ArrowRight');await expect(cards.nth(1)).toHaveAttribute('data-game-cursor','true');
  await cards.nth(0).click();await expect(cards.nth(0).locator('[data-party-order]')).toHaveCount(0);
  await expect(cards.nth(1).locator('[data-party-order]')).toHaveText('01');
  await cards.nth(0).click();await expect(cards.nth(0).locator('[data-party-order]')).toHaveText('03');
  const bagButton=prep.getByRole('button',{name:'배낭',exact:true});expect((await bagButton.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await bagButton.click();const bag=page.getByTestId('bag');await expect(bag).toBeVisible();await expect(bag.getByRole('button',{name:'닫기',exact:true})).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(bag).toHaveCount(0);
  await bagButton.click();await page.getByRole('button',{name:'배낭 · 이번 도전 닫기',exact:true}).click();await expect(bag).toHaveCount(0);
  await expect(prep.locator('[aria-pressed=true]')).toHaveCount(3);
  mkdirSync('artifacts/qa/screenshots/battle-ui',{recursive:true});
  await page.screenshot({path:`artifacts/qa/screenshots/battle-ui/preparation-${width}.png`});
  let enters=0;page.on('request',request=>{if(request.url().endsWith('/api/battle')&&request.postDataJSON()?.type==='enter')enters++;});
  await prep.getByRole('button',{name:/2층 배틀 시작/}).click();
  const message=page.locator('[data-intro-message]');await expect(message).toBeVisible();await expect(page.getByRole('button',{name:'포켓몬 내보내기',exact:true})).toHaveCount(0);
  // The heading and a selected passage must not confirm the encounter.
  await page.locator('.message-heading').click();await expect(message).toBeVisible();
  await expect(message.locator('[data-typing]')).toHaveAttribute('data-typing','false');
  await message.locator('[data-dialogue-text]').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);window.getSelection()?.removeAllRanges();window.getSelection()?.addRange(range);});
  await message.dispatchEvent('click');await expect(message).toBeVisible();await page.evaluate(()=>window.getSelection()?.removeAllRanges());
  if(confirm==='click')await message.dblclick();else {await page.keyboard.press(confirm);await page.keyboard.press(confirm);}
  await expect(message).toHaveCount(0);const commands=page.locator('.battle-root-menu');await expect(commands).toBeVisible();
  expect(enters).toBe(1);await expect(commands.locator('button')).toHaveCount(4);
  const run=commands.getByRole('button',{name:'도망친다!',exact:true});await expect(run).toBeDisabled();await expect(run).toHaveAttribute('tabindex','-1');
  await run.evaluate((el:HTMLButtonElement)=>{el.focus();el.click();});await expect(run).not.toBeFocused();await expect(commands).toBeVisible();
  for(let i=0;i<8;i++){await page.keyboard.press(i%2?'ArrowRight':'ArrowDown');await expect(run).not.toHaveAttribute('data-game-cursor','true');}
  await page.screenshot({path:`artifacts/qa/screenshots/battle-ui/commands-${width}.png`});
  await commands.getByRole('button',{name:'도구',exact:true}).click();await expect(page.getByRole('dialog',{name:'배틀 도구',exact:true})).toBeVisible();await page.keyboard.press('x');
  await commands.getByRole('button',{name:'교체',exact:true}).click();await expect(page.getByTestId('battle-party')).toBeVisible();await page.keyboard.press('x');
  await commands.getByRole('button',{name:'싸운다',exact:true}).click();await expect(page.getByTestId('battle-move-menu')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{f.store.close();}
});
