import {dexSearch,dexFilter} from './dex-filters';
import {test,expect} from '@playwright/test';
import {selectStarters} from './select-starters';

test('battle uses animated front/back sprites and falls back to PNG when GIFs fail',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/battle?prepare=1');await selectStarters(page);
  await page.getByRole('button',{name:'새 도전 시작'}).click();await page.getByRole('button',{name:'이 룰로 도전 시작',exact:true}).click();await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();await expect(page.getByTestId('action-grid')).toBeVisible();
  const player=page.locator('.player-position img'),enemy=page.locator('.enemy-position img');
  await expect(player).toHaveAttribute('src',/animated\/back\/6\.gif$/);
  await expect(enemy).toHaveAttribute('src',/\.(gif|png)$/);
  await expect(player).toHaveJSProperty('complete',true);
  expect(await player.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('action-grid').getByRole('button').first()).toBeEnabled();
  await expect(enemy).toHaveJSProperty('complete',true);
  expect(await enemy.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({path:'test-results/animated-battle.png'});
  await page.route('**/*.gif',route=>route.abort());
  await page.reload();await expect(page.getByTestId('action-grid')).toBeVisible();
  await expect(player).toHaveAttribute('src',/pokemon\/back\/6\.png$/);
  await expect(enemy).toHaveAttribute('src',/\.png$/);
  await page.getByRole('button',{name:'교체',exact:true}).click();
  await page.locator('[data-command="switch 2"]').click();
  await expect(player).toHaveAttribute('src',/pokemon\/back\/9\.png$/);
  expect(errors).toEqual([]);
});

test('modern archive species and menus use 2D pixel images',async({page})=>{
  await page.goto('/pokedex');
  const search=dexSearch(page);
  await search.fill('마스카나');await page.getByRole('button',{name:'마스카나 상세 보기',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'마스카나 선택 메뉴'}).locator('img')).toHaveAttribute('src',/gen5\/meowscarada\.png$/);
  await page.getByRole('button',{name:'취소',exact:true}).click();
  await expect(page.getByRole('button',{name:'마스카나 상세 보기',exact:true}).locator('img')).toHaveAttribute('src',/gen5\/meowscarada\.png$/);
  await search.fill('미라이돈');await page.getByRole('button',{name:'미라이돈 상세 보기',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'미라이돈 선택 메뉴'}).locator('img')).toHaveAttribute('src',/gen5ani\/miraidon\.gif$/);
});


test('archive freezes the same GIF frame and resumes without changing its framing',async({page})=>{
  await page.goto('/pokedex');const card=page.getByRole('button',{name:'리자몽 상세 보기',exact:true});
  await expect(card.locator('img')).toHaveAttribute('src',/^data:image\/png/);const frame=await card.locator('.pokemon-image-frame').boundingBox(),style=await card.locator('img').getAttribute('style');
  await page.keyboard.press('ArrowRight');await expect(card.locator('img')).toHaveAttribute('src',/6\.gif$/);await expect(card.locator('img')).toHaveAttribute('style',style!);expect(await card.locator('.pokemon-image-frame').boundingBox()).toEqual(frame);
  await page.keyboard.press('ArrowRight');await expect(card.locator('img')).toHaveAttribute('src',/^data:image\/png/);await expect(card.locator('img')).toHaveAttribute('style',style!);
});
