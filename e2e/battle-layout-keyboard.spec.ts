import {test,expect} from '@playwright/test';
import {selectStarters} from './select-starters';

test('keyboard archive navigation and a full viewport stadium with keyboard battle commands',async({page})=>{
  await page.setViewportSize({width:1920,height:960});
  await page.goto('/battle');
  const cards=page.locator('.dex-card');
  await expect(cards.first()).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('ArrowRight');await expect(cards.nth(1)).toHaveAttribute('data-game-cursor','true');
  await expect(cards.nth(1)).toHaveAttribute('aria-pressed','true');await expect(cards.nth(1).locator('img')).toHaveAttribute('src',/\.gif$/);
  await expect.poll(()=>cards.nth(1).locator('img').evaluate((img:HTMLImageElement)=>img.style.width),{timeout:20000}).not.toBe('');
  await page.screenshot({path:'test-results/normalized-dex.png'});
  await page.getByRole('button',{name:'다음 페이지'}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'리자몽 파티 메뉴'})).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('x');await expect(page.getByRole('button',{name:'리자몽 파티 메뉴'})).toHaveCount(0);await page.keyboard.press('Enter');
  await page.keyboard.press('e');await expect(page.getByRole('navigation',{name:'도감 페이지'})).toContainText('2 /');await page.keyboard.press('q');await page.keyboard.press('ArrowRight');
  await page.keyboard.press('c');await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button',{name:'능력치 조정',exact:true})).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('x');await expect(page.getByRole('dialog')).toHaveCount(0);
  for(let i=0;i<8;i++)await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(page.getByRole('button',{name:'리자몽 파티 메뉴'})).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('Enter');await expect(page.getByRole('dialog',{name:'리자몽 파티 메뉴'})).toBeVisible();
  await expect(page.getByRole('button',{name:'파티에서 제외',exact:true})).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'리자몽 파티 메뉴'})).toHaveCount(0);
  await page.keyboard.press('x');await expect(cards.nth(1)).toHaveAttribute('data-game-cursor','true');
  const search=page.getByRole('searchbox',{name:'검색',exact:true});await search.focus();await page.keyboard.type('Pikachu');await page.keyboard.press('ArrowLeft');await expect(search).toBeFocused();await search.fill('');await page.keyboard.press('Enter');
  await selectStarters(page);await page.getByRole('button',{name:'새 도전 시작'}).click();await page.getByRole('button',{name:'이 룰로 도전 시작',exact:true}).click();await page.getByRole('button',{name:'포켓몬 내보내기 · Z',exact:true}).click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  for(const size of [{width:1920,height:960},{width:1280,height:720},{width:390,height:844}]) {
    await page.setViewportSize(size);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const actions=await page.getByTestId('action-grid').boundingBox();expect(actions!.y+actions!.height).toBeLessThan(size.height);
    for(const side of ['player','enemy']) {
      const pokemon=await page.locator(`.${side}-position`).boundingBox(),platform=await page.locator(side==='player'?'.orbit-one':'.orbit-two').boundingBox();
      expect(Math.abs(pokemon!.x+pokemon!.width/2-platform!.x-platform!.width/2)).toBeLessThan(2);
      expect(Math.abs(pokemon!.y+pokemon!.height-platform!.y-platform!.height/2)).toBeLessThan(2);
    }
    await page.screenshot({path:`test-results/stadium-${size.width}.png`});
  }
  await page.setViewportSize({width:1280,height:720});
  await expect(page.getByRole('button',{name:'싸운다',exact:true})).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-command="move 1"]')).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('a');await expect(page.locator('[data-command="switch 2"]')).toBeVisible();
  await page.keyboard.press('x');await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(page.locator('[data-command="move 1"]')).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('s');await expect(page.getByRole('dialog',{name:'배틀 기록'})).toBeVisible();await page.keyboard.press('x');
  await page.keyboard.press('x');await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeVisible();await page.keyboard.press('x');await expect(page.getByRole('dialog',{name:'배틀 메뉴'})).toBeVisible();await expect(page.getByRole('dialog')).toContainText('도전 포기');await page.keyboard.press('x');await page.getByRole('button',{name:'싸운다',exact:true}).click();
  await expect(page.locator('[data-command="move 1"]')).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowRight');await expect(page.locator('[data-command="move 2"]')).toHaveAttribute('data-game-cursor','true');
  const reply=page.waitForResponse(r=>r.url().endsWith('/api/battle') && r.request().method()==='POST');
  await page.keyboard.press('Enter');expect((await reply).status()).toBe(200);await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:20000});
  if(await page.getByRole('button',{name:'싸운다',exact:true}).isVisible())await page.getByRole('button',{name:'싸운다',exact:true}).click();
  // A random opponent may KO the starter, in which case forced replacement owns the cursor.
  const action=await page.locator('[data-command="move 2"]').count() ? page.locator('[data-command="move 2"]') : page.locator('[data-command="switch 2"]');
  await expect(action).toHaveAttribute('data-game-cursor','true');
  if(await page.getByRole('dialog',{name:'다음 포켓몬 선택'}).isVisible())return;
  await page.keyboard.press('s');await expect(page.getByRole('dialog',{name:'배틀 기록'})).toBeVisible();await page.keyboard.press('x');await expect(action).toHaveAttribute('data-game-cursor','true');
  if(await page.getByTestId('battle-move-menu').isVisible()){await page.keyboard.press('x');await page.keyboard.press('x');await expect(page.getByRole('dialog',{name:'배틀 메뉴'})).toBeVisible();await page.keyboard.press('x');}
});
