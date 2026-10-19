import {test,expect,type Page,type BrowserContext} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import {classicCollection} from '../tests/classic-team-fixture';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {matchesSpecialForm} from '../src/web/pokedex-controls';

async function collection(context:BrowserContext){
 const owner='dex-menu-'+randomBytes(12).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 store.ensurePlayer(owner);classicCollection(store,owner);store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
 const auth=await new Accounts(store.db).register('dex_'+randomBytes(8).toString('hex'),randomBytes(16).toString('hex'),owner,undefined);
 await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);return {store,owner};
}
async function filter(page:Page,kind:string,label:string){await page.locator(`[data-dex-filter="${kind}"]`).click();await page.locator('dialog[open]').getByRole('button',{name:label,exact:true}).click();}
async function choose(page:Page,name:string){
 await page.getByRole('searchbox',{name:'이름 검색',exact:true}).fill(name);await page.getByRole('button',{name:`${name} 상세 보기`,exact:true}).click();await page.keyboard.press('1');
}
async function bounded(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 const side=await page.locator('.dex-right-panel').boundingBox(),catalog=await page.locator('.dex-catalog').boundingBox();expect(side!.x).toBeGreaterThan(catalog!.x);expect(Math.abs(side!.y-catalog!.y)).toBeLessThan(2);
 await expect(page.getByTestId('challenge-rule-choice')).toBeInViewport();
}

for(const viewport of [{width:1280,height:900},{width:390,height:740}]){
 test(`dex keyboard, filters, favorites and right party cards at ${viewport.width}`,async({page,context})=>{
  const {store,owner}=await collection(context);try{
   await page.setViewportSize(viewport);await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toContainText('27 /');
   await expect(page.locator('.dex-nav a,.dex-wallet,.dex-inspect-button,.dex-start-button')).toHaveCount(0);await expect(page.getByRole('heading',{name:'포켓몬 목록'})).toHaveCount(0);
   await expect(page.locator('[data-settings-choice="challenge-rule"]')).toHaveText('혼합 룰▾');await bounded(page);
   await expect(page.locator('.dex-nav [data-testid="challenge-rule-choice"]')).toHaveCount(1);await expect(page.locator('.dex-bottom [data-testid="challenge-rule-choice"]')).toHaveCount(0);
   expect((await page.getByRole('searchbox',{name:'이름 검색'}).boundingBox())!.width).toBeGreaterThanOrEqual(220);
   if(viewport.width===1280){const search=(await page.locator('.dex-search').boundingBox())!,filters=(await page.locator('.dex-filters').boundingBox())!,last=(await page.locator('[data-dex-reset]').boundingBox())!,bar=(await page.locator('.dex-toolbar').boundingBox())!;expect(search.width/filters.width).toBeCloseTo(300/478,2);expect(Math.abs(bar.x+bar.width-8-(last.x+last.width))).toBeLessThan(2);}
   await expect(page.locator('.dex-pagination')).toHaveCount(0);await expect(page.locator('.dex-card-wrap .dex-favorite')).toHaveCount(0);await expect(page.locator('.dex-bottom [data-dex-favorite-toggle]')).toHaveCount(1);await expect(page.locator('.dex-toolbar [data-dex-favorite-toggle]')).toHaveCount(0);
   await filter(page,'type','불꽃');await page.getByRole('searchbox',{name:'이름 검색'}).fill('리자몽');await page.keyboard.press('ArrowRight');await expect(page.getByRole('button',{name:'검색 초기화',exact:true})).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('Enter');await expect(page.getByRole('searchbox',{name:'이름 검색'})).toHaveValue('');await expect(page.getByRole('searchbox',{name:'이름 검색'})).toBeFocused();await expect(page.locator('[data-dex-filter=type]')).toContainText('불꽃');await page.locator('[data-dex-reset]').click();
   await page.mouse.move(0,0);await expect(page.locator('.dex-card:not([aria-pressed=true])').first()).toHaveCSS('background-color','rgba(0, 0, 0, 0)');for(const card of await page.locator('.dex-card').all())await expect(card).toHaveCSS('border-top-color','rgba(0, 0, 0, 0)');
   await expect(page.locator('.dex-favorites-filter kbd')).toHaveText('V');
   const cards=page.locator('.dex-list .dex-card'),columns=await page.getByTestId('dex-list').evaluate(el=>Number(getComputedStyle(el).getPropertyValue('--dex-columns')));
   await cards.first().evaluate(el=>document.dispatchEvent(new CustomEvent('game-cursor-select',{detail:el})));await page.keyboard.press('v');await expect(page.locator('[data-dex-empty-cursor]')).toHaveAttribute('data-game-cursor','true');await expect(page.getByRole('searchbox',{name:'이름 검색'})).not.toBeFocused();await page.keyboard.press('v');await expect(page.locator('.dex-list [data-game-cursor=true]')).toHaveCount(1);await expect(page.locator('.dex-toolbar [data-game-cursor=true]')).toHaveCount(0);
   for(let i=0;i<Math.min(columns,3);i++){
    await cards.nth(i).evaluate(el=>document.dispatchEvent(new CustomEvent('game-cursor-select',{detail:el})));await page.keyboard.press('ArrowUp');await expect(page.getByRole('searchbox',{name:'이름 검색'})).toBeFocused();
    await page.keyboard.press('ArrowRight');await expect(page.locator('[data-dex-filter=display]')).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowDown');await expect(page.locator('.dex-card[data-game-cursor=true]')).toHaveCount(1);
   }
   for(const [kind,label] of [['display','보유 중'],['type','불꽃'],['generation','1세대']])await filter(page,kind,label);
   await expect(page.locator('.dex-card[data-species=Charizard]')).toBeVisible();await page.keyboard.press('r');await expect(page.locator('[data-dex-filter=display]')).toContainText('모두 보기');
   for(const [label,value] of [['메가진화 가능','mega'],['거다이맥스 가능','gigantamax'],['별도 폼 존재','alternate'],['기타 특수 변신','transformation']] as const){
    await filter(page,'special',label);const valid=new Set(pokedexEntries().filter(entry=>matchesSpecialForm(entry,value)).map(entry=>entry.species));const shown=await page.locator('.dex-card').evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).dataset.species));expect(shown.length).toBeGreaterThan(0);for(const name of shown)expect(valid.has(name!)).toBe(true);
   }
   await page.locator('[data-dex-reset]').click();await page.getByRole('searchbox',{name:'이름 검색'}).fill('리자몽');await page.keyboard.press('ArrowDown');await page.keyboard.press('f');const star=page.locator('.dex-card-wrap .dex-favorite');await expect(star).toHaveText('★');await expect(star).toHaveAttribute('aria-pressed','true');await expect(star).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(star).toHaveCSS('border-top-color','rgba(0, 0, 0, 0)');await expect(page.locator('dialog[open]')).toHaveCount(0);expect(store.view(owner).favorites).toContain('Charizard');await star.click();await expect(star).toHaveCount(0);await page.keyboard.press('f');await expect(page.locator('[data-dex-favorite-toggle]')).toHaveAttribute('aria-pressed','true');expect(store.view(owner).favorites).toContain('Charizard');
   await page.keyboard.press('v');await expect(page.locator('.dex-card')).toHaveCount(1);await expect(page.locator('.dex-card[data-game-cursor=true]')).toHaveCount(1);await expect(page.locator('.dex-toolbar [data-game-cursor=true]')).toHaveCount(0);await page.keyboard.press('r');await expect(page.getByRole('button',{name:/^★만 보기/})).toHaveAttribute('aria-pressed','false');await expect(page.locator('.dex-card[data-game-cursor=true]')).toHaveAttribute('data-species','Charizard');expect(store.view(owner).favorites).toContain('Charizard');
   await page.locator('.dex-card').first().evaluate(el=>document.dispatchEvent(new CustomEvent('game-cursor-select',{detail:el})));await page.keyboard.press('PageDown');await expect(page.getByTestId('dex-list')).toHaveAttribute('data-page','2');await page.keyboard.press('PageUp');await expect(page.getByTestId('dex-list')).toHaveAttribute('data-page','1');await page.locator('.dex-card').nth(columns-1).evaluate(el=>document.dispatchEvent(new CustomEvent('game-cursor-select',{detail:el})));await page.keyboard.press('ArrowRight');await expect(page.getByTestId('dex-list')).toHaveAttribute('data-page','2');await page.keyboard.press('ArrowLeft');await expect(page.getByTestId('dex-list')).toHaveAttribute('data-page','1');
   for(const name of ['리자몽','거북왕'])await choose(page,name);
   const party=page.getByTestId('team-preview');await expect(party.locator('[data-party-slot]')).toHaveCount(3);await expect(party.locator('[data-party-slot="0"]')).toContainText('01선봉');await expect(party.locator('[data-party-slot="1"]')).toContainText('02중견');await expect(party.locator('[data-party-slot="2"]')).toContainText('03마무리');
   for(const slot of await party.locator('[data-party-slot]').all())await expect(slot).toBeInViewport();
   await expect(party.locator('[data-party-slot="0"] .dex-party-types')).toContainText('불꽃');await expect(party.locator('[data-party-slot="1"] .dex-party-types')).toContainText('물');
   const slots=await party.locator('[data-party-slot]').evaluateAll(nodes=>nodes.map(node=>{const card=node.getBoundingClientRect(),role=node.querySelector('.dex-party-role')!.getBoundingClientRect();return {height:card.height,roleX:role.x-card.x,roleY:role.y-card.y};}));for(const slot of slots.slice(1)){expect(Math.abs(slot.height-slots[0].height)).toBeLessThan(2);expect(slot.roleX).toBeCloseTo(slots[0].roleX,0);expect(slot.roleY).toBeCloseTo(slots[0].roleY,0);}
   await page.getByRole('searchbox',{name:'이름 검색'}).fill('');await bounded(page);
   const favoriteWrap=page.locator('.dex-card-wrap').filter({has:page.locator('.dex-card[data-species=Charizard]')}),favoriteBox=(await favoriteWrap.locator('.dex-favorite').boundingBox())!,orderBox=(await favoriteWrap.locator('.dex-party-order').boundingBox())!,spriteBox=(await favoriteWrap.locator('.pokemon-image-frame').boundingBox())!;expect(favoriteBox.x+favoriteBox.width).toBeLessThanOrEqual(orderBox.x);expect(favoriteBox.y).toBeGreaterThan(orderBox.y);expect(favoriteBox.y+favoriteBox.height/2).toBeLessThan(spriteBox.y+spriteBox.height/2);
   await page.screenshot({path:`test-results/dex-menu-${viewport.width}.png`});
   await party.getByRole('button',{name:'리자몽 파티 메뉴',exact:true}).click();await page.getByRole('button',{name:'파티에서 제외',exact:true}).click();await expect(party.getByRole('button',{name:'리자몽 파티 메뉴',exact:true})).toHaveCount(0);await expect(party.locator('[data-party-slot="0"]')).toContainText('거북왕');
  }finally{store.close();}
 });

 test(`third partner confirms safely and sends the selected rule at ${viewport.width}`,async({page,context})=>{
  const {store,owner}=await collection(context);try{
   await page.setViewportSize(viewport);await page.goto(viewport.width===390?'/battle?prepare=1':'/pokedex');await expect(page.getByTestId('dex-progress')).toContainText('27 /');
   if(viewport.width===1280){await page.locator('[data-settings-choice=challenge-rule]').click();await page.getByRole('dialog',{name:'도전 룰 선택',exact:true}).getByRole('button',{name:'테라스탈 룰',exact:true}).click();}
   for(const name of ['리자몽','거북왕','이상해꽃'])await choose(page,name);
   const confirmation=page.getByRole('dialog',{name:'도전을 시작하시겠습니까?',exact:true});await expect(confirmation).toBeVisible();await expect(confirmation.getByRole('button',{name:'아니요',exact:true})).toHaveAttribute('data-game-cursor','true');await expect(confirmation.getByRole('button',{name:'아니요',exact:true})).toBeFocused();
   await page.keyboard.press('Enter');await expect(confirmation).toHaveCount(0);await expect(page.getByTestId('team-preview').locator('[data-empty]')).toHaveCount(0);expect(store.view(owner).run).toBeNull();
   await page.getByRole('searchbox',{name:'이름 검색'}).fill('');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(confirmation).toBeVisible();await page.keyboard.press('Escape');await expect(confirmation).toHaveCount(0);
   await page.keyboard.press('Enter');await expect(confirmation).toBeVisible();await page.keyboard.press('ArrowUp');await expect(confirmation.getByRole('button',{name:'예',exact:true})).toHaveAttribute('data-game-cursor','true');
   const request=page.waitForRequest(r=>r.method()==='POST'&&r.url().endsWith('/api/battle')&&r.postDataJSON()?.type==='start');await page.keyboard.press('Enter');const payload=(await request).postDataJSON();expect(payload.selected).toEqual(['Charizard','Blastoise','Venusaur']);expect(payload.rule).toBe(viewport.width===1280?'tera':'chaos');await expect(page).toHaveURL(/\/battle(?:\?.*)?$/);await expect(page.locator('.battle-progress')).toBeVisible();expect(store.view(owner).run!.rule).toBe(payload.rule);
  }finally{store.close();}
 });
}
