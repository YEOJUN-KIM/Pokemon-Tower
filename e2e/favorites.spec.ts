import {dexSearch,dexFilter} from './dex-filters';
import {test,expect} from '@playwright/test';

test('star Pokémon without opening their menu, filter favorites, persist into preparation, and recover a failed save',async({page})=>{
  await page.setViewportSize({width:1440,height:1080});await page.goto('/pokedex');
  const search=dexSearch(page),list=page.getByTestId('dex-list');
  for(const name of ['한카리아스','팬텀']) {
    await search.fill(name);await page.getByRole('button',{name:`${name} 즐겨찾기 추가`,exact:true}).click();
    await expect(page.getByRole('button',{name:`${name} 즐겨찾기 해제`,exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await search.fill('');await page.getByRole('button',{name:/★ 즐겨찾기/}).click();await expect(list.locator('.dex-card')).toHaveCount(2);
  await dexFilter(page,'표시').selectOption('owned');await expect(list.locator('.dex-card')).toHaveCount(0);await dexFilter(page,'표시').selectOption('all');
  await page.screenshot({path:'test-results/favorites-desktop.png'});await page.reload();
  await page.getByRole('button',{name:/★ 즐겨찾기/}).click();await expect(list.locator('.dex-card')).toHaveCount(2);
  await page.goto('/battle?prepare=1');await page.getByRole('button',{name:/★ 즐겨찾기/}).click();await expect(list.locator('.dex-card')).toHaveCount(2);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/favorites-mobile.png'});
  const handler=(route:import('@playwright/test').Route)=>route.request().method()==='POST' && route.request().postDataJSON()?.type==='favorite' ? route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'즐겨찾기 저장 실패'})}) : route.continue();
  await page.route('**/api/battle',handler);await page.getByRole('button',{name:'팬텀 즐겨찾기 해제',exact:true}).click();await expect(page.locator('.error-banner[role=alert]')).toContainText('즐겨찾기 저장 실패');
  await expect(page.getByRole('button',{name:'팬텀 즐겨찾기 해제',exact:true})).toHaveAttribute('aria-pressed','true');await page.unroute('**/api/battle',handler);
  await page.getByRole('button',{name:'팬텀 즐겨찾기 해제',exact:true}).click();await expect(list.locator('.dex-card')).toHaveCount(1);await page.reload();
  await page.getByRole('button',{name:/★ 즐겨찾기/}).click();await expect(list.locator('.dex-card')).toHaveCount(1);await expect(page.getByRole('button',{name:'한카리아스 상세 보기'})).toBeVisible();
});
