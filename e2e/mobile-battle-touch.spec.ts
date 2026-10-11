import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

test('mobile holds inspect moves and field without executing an attack',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 const page=await context.newPage();
 try{
  const account=await context.request.post('http://127.0.0.1:3001/api/account',{headers:{Origin:'http://127.0.0.1:3001'},data:{action:'register',username:'touch_'+randomUUID().slice(0,8),password:randomUUID()}});
  expect(account.ok()).toBe(true);
  const response=await context.request.post('http://127.0.0.1:3001/api/battle',{headers:{Origin:'http://127.0.0.1:3001'},data:{type:'start',selected:['Charizard','Blastoise','Venusaur']}});
  expect(response.ok()).toBe(true);const initial=await response.json();
  await page.addInitScript(id=>sessionStorage.setItem('tower-pending-intro',id),initial.battle.id);
  await page.goto('http://127.0.0.1:3001/battle');
  await expect(page.getByTestId('trainer-entrance')).toHaveAttribute('data-phase','enter');
  await expect(page.locator('.trainer-intro-confirm')).not.toBeVisible();
  await page.touchscreen.tap(20,20);
  await expect(page.getByTestId('trainer-entrance')).toHaveCount(0);
  await page.getByRole('button',{name:'싸운다',exact:true}).tap();
  await expect(page.getByTestId('battle-move-details')).not.toBeVisible();
  await expect(page.locator('[data-game-cursor=true]')).toHaveCount(0);
  const client=await context.newCDPSession(page);
  const hold=async(x:number,y:number,duration=600)=>{await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(duration);};
  const release=()=>client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const move=page.locator('[data-command="move 1"]');const box=(await move.boundingBox())!;
  await hold(box.x+box.width/2,box.y+box.height/2,1800);
  const tooltip=page.getByRole('tooltip');await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('위력');await expect(tooltip).toContainText('명중률');
  expect((await context.request.get('http://127.0.0.1:3001/api/battle').then(r=>r.json())).battle.requestId).toBe(initial.battle.requestId);
  await tooltip.screenshot({path:'test-results/mobile-move-hold.png'});
  await release();await expect(tooltip).toHaveCount(0);
  expect((await context.request.get('http://127.0.0.1:3001/api/battle').then(r=>r.json())).battle.requestId).toBe(initial.battle.requestId);
  // Releasing outside the original move still dismisses the held tooltip.
  await hold(box.x+20,box.y+20);
  await expect(tooltip).toBeVisible();
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+20,y:box.y-40}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await expect(tooltip).toHaveCount(0);
  // A cancelled touch (e.g. scrolling) must neither open details nor send a move.
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+20,y:box.y+20}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.waitForTimeout(550);await expect(tooltip).toHaveCount(0);
  const arena=(await page.locator('.arena').boundingBox())!;
  await hold(arena.x+arena.width*.5,arena.y+arena.height*.45);
  const field=page.getByRole('dialog',{name:'현재 필드 상태'});await expect(field).toBeVisible();
  await expect(field).toContainText('날씨 효과 없음');await expect(field.locator('.field-rank-row')).toHaveCount(14);
  await field.screenshot({path:'test-results/mobile-field-hold.png'});
  await release();await expect(field).not.toBeVisible();
  expect((await context.request.get('http://127.0.0.1:3001/api/battle').then(r=>r.json())).battle.requestId).toBe(initial.battle.requestId);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/mobile-moves-filled.png'});
  await move.tap();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
  await page.touchscreen.tap(arena.x+arena.width*.5,arena.y+arena.height*.45);
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
  await page.touchscreen.tap(arena.x+arena.width*.5,arena.y+arena.height*.45);
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  const rows=await page.locator('.current-messages p').evaluateAll(elements=>elements.map(el=>{const css=getComputedStyle(el);return {left:el.getBoundingClientRect().left,font:css.fontSize,line:css.lineHeight,align:css.textAlign};}));
  expect(rows.length).toBeGreaterThan(0);for(const row of rows)expect(row).toEqual(rows[0]);
 }finally{await context.close();}
});

test('desktop keeps keyboard cursor and selected move information',async({page})=>{
 const origin='http://127.0.0.1:3001';
 await page.request.post(origin+'/api/account',{headers:{Origin:origin},data:{action:'register',username:'desktop_'+randomUUID().slice(0,8),password:randomUUID()}});
 await page.request.post(origin+'/api/battle',{headers:{Origin:origin},data:{type:'start',selected:['Charizard','Blastoise','Venusaur']}});
 await page.goto('/battle');await expect(page.getByRole('button',{name:'싸운다',exact:true})).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('z');
 await expect(page.getByTestId('battle-move-details')).toBeVisible();
 await expect(page.locator('[data-command="move 1"]')).toHaveAttribute('data-game-cursor','true');
 await page.keyboard.press('ArrowRight');await expect(page.locator('[data-command="move 2"]')).toHaveAttribute('data-game-cursor','true');
});
