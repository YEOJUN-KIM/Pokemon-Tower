import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';

for(const size of [{width:1920,height:902},{width:2560,height:1440}])test(`wide PC uses the viewport at ${size.width}px`,async({page})=>{
 await page.setViewportSize(size);await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');
 const screen=page.locator('.dex-center'),bounds=await screen.boundingBox();expect(bounds!.x).toBe(0);expect(bounds!.width).toBe(size.width);
 const list=page.getByTestId('dex-list');await expect.poll(()=>list.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(10);
 const preview=page.getByTestId('dex-partner-display'),previewBounds=await preview.boundingBox();expect(previewBounds!.width).toBeGreaterThan(300);
 expect(await preview.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 const cards=list.locator('.dex-card');await cards.nth(9).click();await page.keyboard.press('x');await page.keyboard.press('ArrowRight');await expect(page.locator('.dex-pagination')).toContainText('2 /');await expect(cards.first()).toHaveAttribute('data-game-cursor','true');
 await page.keyboard.press('ArrowLeft');await expect(page.locator('.dex-pagination')).toContainText('1 /');await cards.first().click();await page.keyboard.press('x');
 await expect(cards.first()).toHaveCSS('background-color','rgb(214, 240, 223)');
 await page.screenshot({path:`artifacts/qa/screenshots/pokedex-updated/full-width-${size.width}.png`});
});

for(const size of [{width:1280,height:720},{width:390,height:844}])test(`PC settings keep training and move saves at ${size.width}px`,async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);store.db.prepare('UPDATE players SET growth_points=100 WHERE id=?').run(owner);
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize(size);await page.goto('/pokedex');
  await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await expect(page.getByRole('dialog',{name:'리자몽 선택 메뉴'})).toBeVisible();await page.getByRole('button',{name:'능력치 조정',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'리자몽 능력치 조정'}),editor=page.getByTestId('training-editor');
  await expect(dialog).toHaveCSS('background-color','rgb(238, 242, 233)');
  await editor.getByLabel('특수공격 능력 포인트',{exact:true}).fill('12');
  const saveBounds=await editor.getByRole('button',{name:'12P로 설정 저장'}).boundingBox();expect(saveBounds!.y+saveBounds!.height).toBeLessThan(size.height);
  await page.screenshot({path:`artifacts/qa/screenshots/pokedex-updated/adjustment-${size.width}.png`});
  await editor.getByRole('tab',{name:'성격',exact:true}).click();
  await page.screenshot({path:`artifacts/qa/screenshots/pokedex-updated/nature-${size.width}.png`});
  await page.keyboard.press('e');await expect(editor.getByRole('tab',{name:'특성·테라스탈'})).toHaveAttribute('aria-selected','true');
  await editor.getByRole('button',{name:'테라스탈 선택',exact:true}).click();await page.getByRole('dialog',{name:'테라스탈 선택',exact:true}).getByRole('button',{name:'고스트',exact:true}).click();
  await page.screenshot({path:`artifacts/qa/screenshots/pokedex-updated/traits-${size.width}.png`});
  await editor.getByRole('button',{name:'12P로 설정 저장'}).click();await expect(dialog.getByRole('status')).toContainText('설정 저장 완료');await page.keyboard.press('x');await expect(dialog).not.toBeVisible();
  await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await expect(page.getByRole('dialog',{name:'리자몽 선택 메뉴'})).toBeVisible();await page.getByRole('button',{name:'기술배치',exact:true}).click();
  const moves=page.getByRole('dialog',{name:'리자몽 기술배치'});
  const replacement=moves.locator('.move-library button:not(:disabled):not(.selected)').first();
  const name=await replacement.locator('strong').innerText();await replacement.click();
  await expect(moves.locator('.move-slots button').first()).toContainText(name);
  expect(await moves.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:`artifacts/qa/screenshots/pokedex-updated/moves-${size.width}.png`});
  await moves.getByRole('button',{name:'기술배치 저장 · 무료'}).click();await expect(moves.getByRole('status')).toContainText('설정 저장 완료');await page.keyboard.press('x');await expect(moves).not.toBeVisible();
  await page.reload();await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await expect(page.getByRole('dialog',{name:'리자몽 선택 메뉴'})).toBeVisible();await page.getByRole('button',{name:'능력치 조정',exact:true}).click();
  await expect(editor.getByLabel('특수공격 능력 포인트',{exact:true})).toHaveValue('12');
  await editor.getByRole('tab',{name:'특성·테라스탈'}).click();await expect(editor.getByRole('button',{name:'테라스탈 선택',exact:true})).toContainText('고스트');
  await page.keyboard.press('x');await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await expect(page.getByRole('dialog',{name:'리자몽 선택 메뉴'})).toBeVisible();await page.getByRole('button',{name:'기술배치',exact:true}).click();
  await expect(moves.locator('.move-slots button').first()).toContainText(name);
  expect(store.view(owner).growthPoints).toBe(88);
 }finally{store.close();}
});

test('tall PC preview shows a large radar and configured traits',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.goto('/pokedex');
 const preview=page.getByTestId('dex-partner-display');
 await expect(preview.getByRole('img',{name:'종족값 육각형 그래프'})).toBeVisible();
 await expect(preview.locator('.dex-partner-stats dl')).toHaveCount(0);await expect(preview.locator('.dex-partner-traits')).toContainText('심록');await expect(preview.locator('.dex-partner-traits')).toContainText('성실');const chart=await preview.locator('.dex-partner-stats svg').boundingBox();expect(chart!.height).toBeGreaterThan(270);
 await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.keyboard.press('x');
 await expect(preview.locator('svg title')).toContainText('특수공격 109');
 expect(await preview.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
 await page.screenshot({path:'artifacts/qa/screenshots/pokedex-updated/radar-1920.png'});
});

for(const size of [{width:1280,height:720},{width:390,height:844}])test(`PC-style collection preserves menus and fits ${size.width}px`,async({page})=>{
 await page.setViewportSize(size);await page.goto('/pokedex');
 await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');
 await expect(page.getByRole('heading',{name:'포켓몬 도감',exact:true})).toBeVisible();
 const preview=page.getByTestId('dex-partner-display');
 await expect(preview).toContainText('이상해꽃');
 await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'리자몽 선택 메뉴'})).toBeVisible();
 await page.getByRole('dialog',{name:'리자몽 선택 메뉴'}).screenshot({path:`artifacts/qa/screenshots/pokedex-updated/partner-menu-${size.width}.png`});
 await page.keyboard.press('x');await expect(preview).toContainText('리자몽');
 await preview.getByRole('button',{name:'리자몽 기본 정보 ↗'}).click();
 await expect(page.getByTestId('dex-detail')).toContainText('종족값');
 await page.keyboard.press('x');
 await page.getByRole('button',{name:'표시 선택 열기'}).click();await page.keyboard.press('x');await page.keyboard.press('z');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('x');await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 for(const locator of [preview,page.getByTestId('dex-list'),page.getByTestId('team-selection')]){
  const bounds=await locator.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.y).toBeGreaterThanOrEqual(0);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(size.height);
 }
 await page.screenshot({path:`artifacts/qa/screenshots/pokedex-updated/collection-${size.width}.png`});
});

for(const size of [{width:1280,height:720},{width:390,height:844}])test(`party removal, visible cursor and ready focus at ${size.width}px`,async({page})=>{
 await page.setViewportSize(size);await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');
 const party=page.getByTestId('team-selection');
 await page.getByRole('button',{name:'이상해꽃 상세 보기',exact:true}).click();await page.keyboard.press('1');await expect(party).toContainText('1 / 3');
 await page.keyboard.press('z');const remove=page.getByRole('button',{name:'포켓몬 제외하기',exact:true});await expect(remove).toBeEnabled();await page.keyboard.press('1');await expect(party).toContainText('0 / 3');
 for(const name of ['이상해꽃','리자몽','거북왕']){await page.getByRole('button',{name:name+' 상세 보기',exact:true}).click();await page.keyboard.press('1');}
 const start=page.getByRole('button',{name:'새 도전 시작 ↗',exact:true});await expect(start).toHaveAttribute('data-game-cursor','true');
 await page.keyboard.press('ArrowUp');
 const slot=page.getByRole('button',{name:'거북왕 파티 메뉴',exact:true});await expect(slot).toHaveAttribute('data-game-cursor','true');await expect(slot).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await expect(slot.locator('..').getByText('거북왕',{exact:true})).toBeVisible();await expect(slot.locator('..').locator('img')).toBeVisible();await expect(slot.locator('..').locator('.pokemon-image-frame')).toHaveCSS('position','relative');
 await page.screenshot({path:`artifacts/qa/screenshots/pokedex-updated/party-focus-${size.width}.png`});
 await expect(page.locator('.dex-rule-settings')).toHaveCount(0);await start.click();const settings=page.getByRole('dialog',{name:'새 도전 · 배틀 룰 선택',exact:true});await expect(settings).toBeVisible();await settings.getByRole('button',{name:'테라스탈 룰',exact:true}).click();await settings.screenshot({path:`artifacts/qa/screenshots/pokedex-updated/start-rule-${size.width}.png`});await page.keyboard.press('x');await expect(page.getByTestId('rule-picker')).toHaveCount(0);await expect(start).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('z');await expect(settings.getByRole('button',{name:'테라스탈 룰',exact:true})).toHaveAttribute('aria-pressed','true');await page.keyboard.press('x');
 await expect(start).toBeEnabled();
});

for(const width of [1280,390])test(`horizontal card edges change pages instead of selecting party at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');
 const list=page.getByTestId('dex-list'),cards=list.locator('.dex-card'),pagination=page.locator('.dex-pagination');
 const columns=await list.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
 const lastInRow=cards.nth(columns-1),species=await lastInRow.getAttribute('data-species');await lastInRow.click();await page.keyboard.press('x');await page.keyboard.press('ArrowRight');
 await expect(pagination).toContainText('2 /');await expect(cards.first()).toHaveAttribute('data-game-cursor','true');await expect(page.locator('.dex-right-panel [data-game-cursor=true]')).toHaveCount(0);
 await page.keyboard.press('ArrowLeft');await expect(pagination).toContainText('1 /');await expect(list.locator('[data-game-cursor=true]')).toHaveAttribute('data-species',species!);
 await cards.first().click();await page.keyboard.press('x');await page.keyboard.press('ArrowLeft');await expect(pagination).toContainText('1 /');await expect(cards.first()).toHaveAttribute('data-game-cursor','true');
 await expect(page.locator('.dex-rule-settings')).toHaveCount(0);await page.keyboard.press('ArrowUp');await expect(page.getByRole('searchbox',{name:'검색'})).toBeFocused();
});

for(const name of ['리자몽','피카츄','싸리용'])test(`large dex sprite limits source pixel enlargement for ${name}`,async({page})=>{
 await page.setViewportSize({width:1920,height:902});await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');
 const input=page.getByRole('searchbox',{name:'검색'});await input.fill(name);await page.keyboard.press('Enter');
 await page.getByRole('button',{name:name+' 상세 보기',exact:true}).click();await page.keyboard.press('x');
 const preview=page.getByTestId('dex-partner-display'),img=preview.locator('img');
 await expect(img.locator('..')).toHaveAttribute('data-animation-measured','true');
 await expect(img).toHaveCSS('image-rendering','pixelated');await expect(img).toHaveCSS('filter','none');
 await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.getBoundingClientRect().width/el.naturalWidth)).toBeLessThanOrEqual(2.01);
 await preview.screenshot({path:`artifacts/qa/screenshots/pokedex-updated/sprite-${name}.png`});
});
