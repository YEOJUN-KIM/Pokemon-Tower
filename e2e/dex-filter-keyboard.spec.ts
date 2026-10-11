import {test,expect} from '@playwright/test';

test('filters apply with Z and return the cursor to their button',async({page})=>{
 await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');
 await page.getByRole('button',{name:'표시 선택 열기'}).click();const popup=page.getByRole('dialog',{name:'표시 선택'});await expect(popup.getByRole('button',{name:'전체',exact:true})).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowDown');await page.keyboard.press('z');await expect(popup).toHaveCount(0);await expect(page.getByRole('button',{name:'표시 선택 열기'})).toContainText('보유');await expect(page.getByRole('button',{name:'표시 선택 열기'})).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowDown');await expect(page.locator('.dex-card[data-game-cursor=true]')).toHaveCount(1);
 await page.keyboard.press('z');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('z');await expect(page.getByLabel('출발 파티')).toContainText('1 / 3');
});

test('search cursor immediately accepts text, preserves editing keys and returns to results',async({page})=>{
 await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');
 const input=page.getByRole('searchbox',{name:'검색',exact:true});await page.keyboard.press('ArrowUp');await expect(input).toBeFocused();await page.keyboard.type('Pikachu');await expect(input).toHaveValue('Pikachu');await expect(page.getByTestId('dex-list').locator('.dex-card')).toHaveCount(1);await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.keyboard.press('Home');await expect(input).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'피카츄 상세 보기'})).toHaveAttribute('data-game-cursor','true');await expect(input).not.toBeFocused();await page.keyboard.press('ArrowUp');await expect(input).toBeFocused();await input.fill('qezx');await expect(input).toHaveValue('qezx');await expect(page.getByRole('dialog')).toHaveCount(0);await input.fill('ㅍㅋㅊ');await page.keyboard.press('ArrowDown');await expect(page.getByRole('button',{name:'피카츄 상세 보기'})).toHaveAttribute('data-game-cursor','true');
 await page.keyboard.press('ArrowUp');await input.fill('없는이름');await page.keyboard.press('Escape');await expect(input).not.toBeFocused();await expect(page.getByRole('button',{name:'표시 선택 열기'})).toHaveAttribute('data-game-cursor','true');
});

test('mouse filters and mobile layout fit without native select traps',async({page})=>{
 await page.goto('/pokedex');await page.getByRole('button',{name:'타입 선택 열기'}).click();await page.getByRole('dialog',{name:'타입 선택'}).getByRole('button',{name:'전기',exact:true}).click();await expect(page.getByRole('button',{name:'타입 선택 열기'})).toContainText('전기');await page.keyboard.press('ArrowDown');await expect(page.locator('.dex-card[data-game-cursor=true]')).toHaveCount(1);
 for(const size of [{width:1920,height:960},{width:1280,height:720},{width:390,height:844}]){await page.setViewportSize(size);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

for(const width of [1280,390])test(`Q/E do not move the collection cursor at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');
 const card=page.getByRole('button',{name:'이상해꽃 상세 보기',exact:true});await card.click();await page.keyboard.press('x');
 await page.keyboard.press('q');await page.keyboard.press('e');await expect(card).toHaveAttribute('data-game-cursor','true');
 await expect(page.locator('.dex-control-hints')).not.toContainText('Q / E');
 await page.keyboard.press('ArrowUp');const input=page.getByRole('searchbox',{name:'검색'});await expect(input).toBeFocused();
 await page.keyboard.type('qe');await expect(input).toHaveValue('qe');
 await input.fill('');await page.keyboard.press('Enter');await page.keyboard.press('PageDown');await expect(page.locator('.dex-pagination')).toContainText('2 /');
});

for(const width of [1280,390])test(`inline reset clears only search and remains keyboard accessible at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');const reset=page.getByRole('button',{name:'검색 초기화',exact:true}),input=page.getByRole('searchbox',{name:'검색',exact:true});await expect(reset).toBeDisabled();await page.getByRole('button',{name:'타입 선택 열기'}).click();await page.getByRole('dialog',{name:'타입 선택'}).getByRole('button',{name:'전기',exact:true}).click();await input.fill('피카츄');await expect(page.getByTestId('dex-list').locator('.dex-card')).toHaveCount(1);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'검색 지우기'})).toHaveCount(0);await page.keyboard.press('Tab');await expect(reset).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('z');await expect(reset).toBeDisabled();await expect(input).toHaveValue('');await expect(input).toBeFocused();await expect(page.getByRole('button',{name:'타입 선택 열기'})).toContainText('전기');await expect.poll(()=>page.getByTestId('dex-list').locator('.dex-card').count()).toBeGreaterThan(1);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});

for(const width of [1920,1280,390])test(`toolbar heights and horizontal search navigation at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:960});await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');
 const input=page.getByRole('searchbox',{name:'검색',exact:true}),reset=page.getByRole('button',{name:'검색 초기화',exact:true}),display=page.getByRole('button',{name:'표시 선택 열기'});
 await input.fill('팬텀');await page.keyboard.press('ArrowRight');await expect(reset).toHaveAttribute('data-game-cursor','true');await expect(input).not.toBeFocused();await expect(input).toHaveValue('팬텀');await page.keyboard.press('ArrowRight');await expect(display).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowLeft');await expect(reset).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowLeft');await expect(input).toBeFocused();
 await input.fill('');await page.keyboard.press('ArrowRight');await expect(display).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowLeft');await expect(input).toBeFocused();
 const heights=await page.locator('.dex-toolbar input,.dex-toolbar button').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().height));expect(Math.max(...heights)-Math.min(...heights)).toBeLessThanOrEqual(1);
 await input.fill('팬텀');await page.keyboard.press('ArrowRight');await expect(reset).toHaveCSS('background-color','rgb(128, 81, 94)');await page.screenshot({path:`artifacts/screenshots/pokedex-center/search-controls-${width}.png`});
});
