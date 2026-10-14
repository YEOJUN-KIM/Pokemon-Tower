import {test,expect,type BrowserContext} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters} from '../src/data/teams';
import {moves,pokemonName} from '../src/web/catalog';

async function checkpoint(context:BrowserContext) {
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;
  store.db.prepare("UPDATE runs SET total_floors=50,floor=6,state='select' WHERE id=?").run(run);
  store.db.prepare('UPDATE players SET coins=1000 WHERE id=?').run(owner);
  const shop=store.view(owner).run!.machineShop!;
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  return {store,owner,run,shop};
}

for(const viewport of [{width:1280,height:540},{width:390,height:650}])test(`every machine move remains reachable by arrows in a scrolling ${viewport.width}px dialog`,async({page,context})=>{
  const {store,owner,shop}=await checkpoint(context);
  try {
    const offer=shop.offers[0],target=offer.targets[0];await page.setViewportSize(viewport);
    await page.goto('/battle');await page.getByRole('button',{name:'기술머신',exact:true}).click();await page.locator(`button[data-machine="${offer.move}"]`).click();
    const dialog=page.getByTestId('machine-confirmation');await dialog.locator(`[data-target="${target}"]`).click();await dialog.getByRole('button',{name:'바로 장착',exact:true}).click();
    const slots=dialog.locator('[data-learning-slot]');
    // Park the mouse over the list: keyboard scrolling must not move its cursor.
    const box=await slots.nth(2).boundingBox();await page.mouse.move(box!.x+box!.width/2,Math.min(viewport.height-50,box!.y+box!.height/2));
    await slots.first().evaluate(element=>document.dispatchEvent(new CustomEvent('game-cursor-select',{detail:element})));
    await expect(slots.first()).toHaveAttribute('data-game-cursor','true');
    await page.keyboard.press('ArrowUp');await expect(slots.first()).toHaveAttribute('data-game-cursor','true');
    for(let index=1;index<4;index++){await page.keyboard.press('ArrowDown');await expect(slots.nth(index)).toHaveAttribute('data-game-cursor','true');}
    await page.keyboard.press('ArrowDown');await expect(slots.nth(3)).toHaveAttribute('data-game-cursor','true');
    await page.keyboard.press('Enter');await expect(dialog.getByLabel('기술머신 교체 확인',{exact:true})).toBeVisible();
    await page.keyboard.press('x');await expect(slots.nth(3)).toHaveAttribute('data-game-cursor','true');
    for(let index=2;index>=0;index--){await page.keyboard.press('ArrowUp');await expect(slots.nth(index)).toHaveAttribute('data-game-cursor','true');}
    expect(store.view(owner).coins).toBe(1000);
  }finally {store.close();}
});

test('all four shop offers and nested target dialogs share keyboard and Tab selection',async({page,context})=>{
  const {store,owner}=await checkpoint(context);
  try {
    await page.goto('/battle');await page.getByRole('button',{name:'기술머신',exact:true}).click();
    const cards=page.locator('button[data-machine]');await expect(cards).toHaveCount(4);
    await cards.first().evaluate(element=>document.dispatchEvent(new CustomEvent('game-cursor-select',{detail:element})));
    for(const [key,index] of [['ArrowRight',1],['ArrowDown',3],['ArrowLeft',2],['ArrowUp',0]] as const){await page.keyboard.press(key);await expect(cards.nth(index)).toHaveAttribute('data-game-cursor','true');}
    await page.keyboard.press('Enter');const dialog=page.getByTestId('machine-confirmation');await expect(dialog).toBeVisible();
    await page.keyboard.press('Tab');const target=dialog.locator('[data-target][aria-disabled=false]').first();await target.focus();await expect(target).toHaveAttribute('data-game-cursor','true');
    await page.keyboard.press('Enter');await expect(dialog.getByRole('group',{name:'기술머신 사용 방식'})).toBeVisible();
    await page.keyboard.press('x');await expect(dialog.locator('.machine-party')).toBeVisible();
    await page.keyboard.press('x');await expect(dialog).toHaveCount(0);await expect(cards.first()).toHaveAttribute('data-game-cursor','true');
    expect(store.view(owner).coins).toBe(1000);
  }finally {store.close();}
});

test('keyboard machine purchase compares moves, persists once, and equips the next battle',async({page,context})=>{
  const {store,owner,run,shop}=await checkpoint(context);
  try {
    const offer=shop.offers[0],target=offer.targets[0],original=store.trainingCollection(owner).find(entry=>entry.species===target)!.profile.moves;
    await page.goto('/battle');
    await page.getByRole('button',{name:'기술머신',exact:true}).click();
    await expect(page.locator('[data-machine-offer]')).toHaveCount(4);
    await page.locator(`button[data-machine="${offer.move}"]`).click();
    const dialog=page.getByTestId('machine-confirmation');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-target]')).toHaveCount(starters.length);
    await expect(dialog.locator(`button[data-target="${target}"]`)).toContainText('배울 수 있다');
    const blocked=dialog.locator('[data-target][aria-disabled="true"]');
    if(await blocked.count()){await blocked.first().click({force:true});await expect(dialog.locator('.machine-party')).toBeVisible();expect(store.view(owner).coins).toBe(1000);}
    await dialog.locator(`button[data-target="${target}"]`).click();
    await dialog.getByRole('button',{name:'바로 장착',exact:true}).click();
    await expect(dialog.getByRole('region',{name:`${pokemonName(target)} 능력치`})).toContainText('특수공격');
    await expect(dialog.locator('[data-learning-slot="0"]')).toHaveAttribute('data-game-cursor','true');
    await expect(dialog.getByLabel('선택한 기술 상세', {exact:true})).toContainText(moves[original[0]].name);
    await page.keyboard.press('ArrowDown');
    await expect(dialog.locator('[data-learning-slot="1"]')).toHaveAttribute('data-game-cursor','true');
    await expect(dialog.getByLabel('선택한 기술 상세', {exact:true})).toContainText(moves[original[1]].name);
    await page.keyboard.press('ArrowDown');await expect(dialog.locator('[data-learning-slot="2"]')).toHaveAttribute('data-game-cursor','true');
    await page.keyboard.press('ArrowDown');await expect(dialog.locator('[data-learning-slot="3"]')).toHaveAttribute('data-game-cursor','true');
    await expect(dialog.getByLabel('선택한 기술 상세', {exact:true})).toContainText(moves[original[3]].name);
    await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');await expect(dialog.getByLabel('기술머신 교체 확인', {exact:true})).toContainText('잊고');
    await page.keyboard.press('x');await expect(dialog.locator('[data-learning-slot="1"]')).toHaveAttribute('data-game-cursor','true');expect(store.view(owner).coins).toBe(1000);
    await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
    await expect(dialog.getByLabel('기술머신 교체 비교', {exact:true})).toContainText(moves[offer.move].name);
    await expect(dialog.locator('.machine-buy')).toHaveAttribute('data-game-cursor','true');
    await page.keyboard.press('Enter');
    await expect(dialog).toContainText('기술머신 구매 완료!');
    await expect(page.getByTestId('wallet')).toHaveText((1000-offer.price)+'코인');
    await dialog.getByRole('button',{name:'상점으로 돌아가기',exact:true}).click();
    await page.reload();
    await page.getByRole('button',{name:'기술머신',exact:true}).click();
    await expect(page.locator(`button[data-machine="${offer.move}"]`)).toBeDisabled();
    expect(store.trainingCollection(owner).find(entry=>entry.species===target)!.profile.moves).toEqual(original);
    const duplicate=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'purchase-machine',runId:run,floor:6,move:offer.move,species:target,slot:0}});
    expect(duplicate.status()).toBe(409);expect(store.view(owner).coins).toBe(1000-offer.price);
    expect(store.view(owner).run!.machineShop!.offers.map(item=>item.move)).toEqual(shop.offers.map(item=>item.move));
    await page.getByRole('button',{name:'출전 팀 선택'}).click();
    await page.getByRole('button',{name:'6층 배틀 시작'}).click();
    await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();
    const team=Showdown.Teams.unpack(store.currentBattle(owner)!.player_team)!;
    expect(team.find(set=>set.species===target)!.moves[0]).toBe(offer.move);
  } finally {store.close();}
});

test('mobile machine selection cancels for free and saves a move without changing the run moves',async({page,context})=>{
  const {store,owner,shop}=await checkpoint(context);
  try {
    const offer=shop.offers[0],target=offer.targets[0];
    await page.setViewportSize({width:390,height:844});await page.goto('/battle');
    await page.getByRole('button',{name:'기술머신',exact:true}).click();
    const shopDialog=page.getByRole('dialog',{name:'6층 출전 준비',exact:true});
    expect(await shopDialog.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
    await page.setViewportSize({width:1280,height:800});await shopDialog.screenshot({path:'test-results/machine-shop-icons-desktop.png'});
    await page.setViewportSize({width:390,height:844});await shopDialog.screenshot({path:'test-results/machine-shop-icons-mobile.png'});
    await page.locator(`button[data-machine="${offer.move}"]`).click();
    await expect(page.getByTestId('machine-confirmation')).toBeVisible();
    await page.keyboard.press('x');
    await expect(page.getByTestId('machine-confirmation')).toHaveCount(0);expect(store.view(owner).coins).toBe(1000);
    await expect(page.getByRole('dialog',{name:'6층 출전 준비',exact:true})).toBeVisible();
    await page.locator(`button[data-machine="${offer.move}"]`).click();
    const dialog=page.getByTestId('machine-confirmation');
    await dialog.locator(`button[data-target="${target}"]`).click();
    await dialog.getByRole('button',{name:'바로 장착',exact:true}).click();
    const screen=page.getByRole('dialog',{name:`기술머신 · ${moves[offer.move].name}`,exact:true});
    expect(await screen.evaluate(element=>element.scrollHeight<=element.clientHeight)).toBe(true);
    await screen.screenshot({path:'test-results/machine-learning-mobile.png'});
    await page.keyboard.press('x');
    await dialog.getByRole('button',{name:'도감에만 저장',exact:true}).click();
    expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    await dialog.locator('xpath=..').screenshot({path:'test-results/machine-shop-mobile.png'});
    await dialog.getByRole('button',{name:offer.price+'코인에 구매·저장',exact:true}).click();
    await expect(dialog).toContainText('기술머신 구매 완료!');
    expect(store.view(owner).run!.machineShop!.currentMoves).toEqual(shop.currentMoves);
    expect(store.trainingCollection(owner).find(entry=>entry.species===target)!.unlockedMoves).toContain(offer.move);
    await page.keyboard.press('x');await page.reload();
    await page.getByRole('button',{name:'기술머신',exact:true}).click();
    await expect(page.locator(`button[data-machine="${offer.move}"]`)).toBeDisabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  } finally {store.close();}
});
