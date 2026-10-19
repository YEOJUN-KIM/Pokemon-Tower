import {test,expect,type Locator,type Page,type BrowserContext} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {classicCollection} from '../tests/classic-team-fixture';
import {hiddenShopFixture} from '../tests/hidden-shop-fixture';
import {grantStoredReward} from '../src/server/inventory-grants';

async function login(context:BrowserContext,store:TowerStore,owner:string){
 store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
 const account=await new Accounts(store.db).register('menu_'+randomBytes(8).toString('hex'),randomBytes(16).toString('hex'),owner,undefined);
 await context.addCookies([{name:'tower_auth',value:account.token,url:'http://127.0.0.1:3001'}]);
}
const paint=(node:Locator)=>node.evaluate(el=>{const s=getComputedStyle(el);return {border:s.borderTopColor,background:s.backgroundColor,outline:s.outlineStyle,radius:s.borderRadius};});
async function withinViewport(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 const dialog=page.locator('dialog[open]').last();
 const box=(await dialog.boundingBox())!;expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual((await page.viewportSize())!.height);
}

for(const viewport of [{width:1280,height:900},{width:390,height:740}]){
 test(`shared selection, adjustment limits, save and move layout at ${viewport.width}`,async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{store.ensurePlayer(owner);classicCollection(store,owner);store.db.prepare('UPDATE players SET growth_points=1000 WHERE id=?').run(owner);await login(context,store,owner);}finally{store.close();}
  
  await page.setViewportSize(viewport);await page.goto('/pokedex');
  const card=page.getByRole('button',{name:'리자몽 상세 보기',exact:true});await card.hover();
  const selectedPaint=await paint(card);expect(selectedPaint).toMatchObject({border:'rgb(152, 239, 209)',background:'rgb(64, 93, 89)',outline:'none',radius:'0px'});
  await card.click();const action=page.getByRole('button',{name:'능력치 조정',exact:true});await action.hover();
  await expect(action).toBeEnabled();await expect.poll(()=>paint(action)).toEqual(selectedPaint);
  await action.focus();await page.keyboard.press('Tab');await expect.poll(()=>paint(page.locator(':focus'))).toEqual(selectedPaint);
  const choices=page.locator('.dex-action-options>button');for(const row of await choices.all())expect((await row.boundingBox())!.height).toBe(48);
  await action.click();const editor=page.getByTestId('training-editor');await withinViewport(page);
  await expect(editor.locator('input[type=number],input[type=range],[data-point-delta]')).toHaveCount(0);
  const hp=editor.locator('[data-training-stat=hp]');await hp.evaluate(el=>document.dispatchEvent(new CustomEvent('game-cursor-select',{detail:el})));
  await page.keyboard.press('ArrowRight');await expect(editor.locator('[data-point-value=hp]')).toHaveText('1');
  await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowRight');await expect(editor.locator('[data-point-value=atk]')).toHaveText('1');
  // Clamp against both per-stat and total budgets using the actual command path.
  for(let i=0;i<35;i++)await page.keyboard.press('ArrowRight');await expect(editor.locator('[data-point-value=atk]')).toHaveText('32');
  await page.keyboard.press('ArrowDown');for(let i=0;i<35;i++)await page.keyboard.press('ArrowRight');await expect(editor.locator('[data-point-value=def]')).toHaveText('32');
  await page.keyboard.press('ArrowDown');for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');await expect(editor.locator('[data-point-value=spa]')).toHaveText('1');await expect(editor.getByTestId('stat-point-total')).toHaveText('66 / 66');
  await editor.getByRole('tab',{name:'성격·특성·테라스탈',exact:true}).click();
  await editor.getByRole('button',{name:'특성 선택',exact:true}).click();
  const ability=page.getByRole('dialog',{name:'특성 선택',exact:true});await withinViewport(page);
  const option=ability.getByRole('button',{name:'선파워',exact:true});await option.hover();await expect.poll(()=>paint(option)).toEqual(selectedPaint);await option.click();
  await editor.getByRole('button',{name:/P로 설정 저장$/}).click();await expect(page.getByRole('status').filter({hasText:'설정 저장 완료'})).toBeVisible();
  const saved=await (await page.request.get('/api/battle?view=collection')).json();const entry=saved.training.find((e:{species:string})=>e.species==='Charizard');expect(entry.profile.evs.hp).toBe(1);expect(entry.profile.evs.atk).toBe(32);expect(entry.profile.ability).toBe('Solar Power');
  await page.locator('dialog[open]').getByRole('button',{name:'리자몽 능력치 조정 닫기',exact:true}).click();
  await card.click();await page.getByRole('button',{name:'기술배치',exact:true}).click();await withinViewport(page);
  await expect(page.locator('.move-library')).toBeVisible();expect(await page.locator('.move-library').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  await expect(page.locator('dialog[open] .game-menu-footer:visible')).toHaveCount(1);
  await page.screenshot({path:`test-results/game-menu-moves-${viewport.width}.png`});
 });

 test(`whole product purchases, passive price and bag TM at ${viewport.width}`,async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),f=hiddenShopFixture('.data/e2e.sqlite',owner);
  try{
   f.store.chooseEvent(owner,f.run,f.eventId,'leave');f.store.db.prepare('UPDATE runs SET floor=11 WHERE id=?').run(f.run);grantStoredReward(f.store.db,f.run,{kind:'machine',move:'Earthquake',amount:1});
   await login(context,f.store,owner);await page.setViewportSize(viewport);await page.goto('/battle');await page.getByTestId('maintenance-shop').click();
   const shop=page.getByTestId('tower-shop');await withinViewport(page);await expect(shop.locator('.game-menu-footer')).toBeInViewport();
   await shop.getByRole('button',{name:'배틀 아이템',exact:true}).click();
   const product=shop.locator('button.shop-product').first();await expect(product.locator('button')).toHaveCount(0);await expect(product.locator('.game-price')).toBeVisible();
   const before=f.store.view(owner),cost=Number((await product.locator('.game-price').innerText()).replace(/\D/g,''));await product.click();await expect(shop.getByTestId('shop-wallet')).toHaveText(`${(before.coins-cost).toLocaleString()}코인`);
   expect(f.store.view(owner).run!.battleItems).not.toEqual(before.run!.battleItems);
   await shop.getByRole('button',{name:'기술머신',exact:true}).click();const machine=shop.locator('[data-machine]').first(),move=await machine.getAttribute('data-machine');await machine.click();await expect(shop.locator(`[data-machine="${move}"]`)).toBeDisabled();await expect(shop.locator(`[data-machine="${move}"] .game-status`)).toHaveText('구매 완료');
   await page.keyboard.press('b');const bag=page.getByTestId('bag');await expect(bag).toBeVisible();await withinViewport(page);
   await bag.getByRole('button',{name:'기술머신',exact:true}).click();await bag.locator('[data-bag-entry]').filter({hasText:'지진'}).click();await bag.locator('[data-bag-target=Charizard]').click();await bag.locator('[data-learning-slot="0"]').click();await expect(bag.locator('[data-bag-entry]').first()).toBeVisible();
   await page.keyboard.press('x');await expect(bag).toHaveCount(0);await expect(shop.locator('[data-open-bag]')).toBeFocused();
   await page.screenshot({path:`test-results/game-menu-shop-${viewport.width}.png`});
  }finally{f.store.close();}
 });

 test(`battle menu, moves and party share selection at ${viewport.width}`,async({page,context})=>{
  const owner='battle-menu-'+randomBytes(12).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
  try{store.ensurePlayer(owner);classicCollection(store,owner);store.start(owner,starters);await login(context,store,owner);}finally{store.close();}
  await page.setViewportSize(viewport);await page.goto('/battle');await page.keyboard.press('Shift');
  const fight=page.getByRole('button',{name:'싸운다',exact:true});await expect(fight).toBeVisible();await fight.hover();const expected=await paint(fight);expect(expected.border).toBe('rgb(152, 239, 209)');await fight.click();
  const move=page.locator('[data-command="move 1"]');await expect(move).toHaveAttribute('data-game-cursor','true');await expect.poll(()=>paint(move)).toEqual(expected);
  await page.keyboard.press('x');await page.getByRole('button',{name:'교체',exact:true}).click();const party=page.getByTestId('battle-party');await expect(party).toBeVisible();await withinViewport(page);
  const candidate=party.locator('.battle-party-option').first();await candidate.hover();await expect.poll(()=>paint(candidate)).toEqual(expected);
  await page.keyboard.press('x');await expect(party).toHaveCount(0);
  await page.getByRole('button',{name:'배틀 메뉴 · 설정',exact:true}).click();const menu=page.getByRole('dialog',{name:'배틀 메뉴',exact:true});await expect(menu).toBeVisible();await withinViewport(page);await expect(menu.locator('.game-menu-footer:visible')).toHaveCount(1);await page.keyboard.press('x');await expect(menu).toHaveCount(0);
 });
}

test('standard pad uses the same menu cursor and confirms only once per press',async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');try{store.ensurePlayer(owner);classicCollection(store,owner);await login(context,store,owner);}finally{store.close();}
 await page.goto('/pokedex');
 await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();
 await page.evaluate(()=>{const state={connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[state],configurable:true});(window as unknown as {testPad:typeof state}).testPad=state;window.dispatchEvent(new Event('gamepadconnected'));});
 const choices=page.locator('.dex-action-options>button');await expect(choices.first()).toHaveAttribute('data-game-cursor','true');
 await page.evaluate(()=>{(window as unknown as {testPad:{buttons:{pressed:boolean}[]}}).testPad.buttons[13].pressed=true;});await expect(choices.nth(1)).toHaveAttribute('data-game-cursor','true');
 await page.evaluate(()=>{const p=(window as unknown as {testPad:{buttons:{pressed:boolean}[]}}).testPad;p.buttons[13].pressed=false;p.buttons[0].pressed=true;});
 await expect(page.getByTestId('training-editor')).toBeVisible();await expect(page.locator('dialog[open]')).toHaveCount(1);
 await page.evaluate(()=>{(window as unknown as {testPad:{buttons:{pressed:boolean}[]}}).testPad.buttons[0].pressed=false;});
});
