import {dexSearch,dexFilter} from './dex-filters';
import {test,expect} from '@playwright/test';

test('archive pages through all 605 species without scrolling and resets pages for search and filters',async({page})=>{
  await page.setViewportSize({width:1920,height:960});await page.goto('/pokedex');
  const list=page.getByTestId('dex-list'),pager=page.getByRole('navigation',{name:'도감 페이지'}),next=page.getByRole('button',{name:'다음 페이지',exact:true}),previous=page.getByRole('button',{name:'이전 페이지',exact:true});
  await expect(page.getByTestId('dex-progress')).toHaveText('3 / 605');
  await expect(list.locator('.dex-card')).toHaveCount(50);await expect(previous).toBeDisabled();
  await expect(list.locator('.dex-status')).toHaveCount(0);
  const inputs=await page.locator('.dex-filter-control>button').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().bottom));
  expect(Math.max(...inputs)-Math.min(...inputs)).toBeLessThanOrEqual(1);
  expect((await list.locator('.dex-card').first().boundingBox())!.width).toBeLessThan(125);
  const names=new Set<string>();
  for(let n=0;n<100;n++) {
    const cards=await list.locator('.dex-card').evaluateAll(elements=>elements.map(el=>el.getAttribute('aria-label')!));cards.forEach(name=>names.add(name));
    if(await next.isDisabled())break;
    await next.click();
  }
  expect(names.size).toBe(605);await expect(list.getByRole('button',{name:'복숭악동 상세 보기',exact:true})).toBeVisible();
  await expect(next).toBeDisabled();await previous.click();await expect(next).toBeEnabled();
  await next.click();await list.getByRole('button',{name:'복숭악동 상세 보기',exact:true}).click();await page.getByRole('button',{name:'취소',exact:true}).click();
  const search=dexSearch(page);
  for(const query of ['마스카나','ㅁㅅㅋㄴ','aktmzksk','Meowscarada']) {
    await search.fill(query);await expect(list.getByRole('button',{name:'마스카나 상세 보기',exact:true})).toBeVisible();await expect(pager).toContainText('1 / 1');
  }
  await list.getByRole('button',{name:'마스카나 상세 보기',exact:true}).click();await expect(page.getByRole('button',{name:'포켓몬 선택하기',exact:true})).toBeDisabled();await page.getByRole('button',{name:'취소',exact:true}).click();
  await page.locator('.dex-inspect-button').click();await expect(page.getByTestId('dex-detail')).toContainText('영입하면 영구 해금');await expect(page.getByTestId('dex-detail')).toContainText('심록');await page.getByRole('button',{name:'마스카나 기본 정보 닫기'}).click();
  await search.fill('');await next.click();await dexFilter(page,'세대').selectOption('9');await expect(pager.locator('strong')).toHaveText(/^1 \/ /);
  await page.getByRole('button',{name:'필터 초기화 · R',exact:true}).click();
  for(const size of [{width:1920,height:960},{width:1536,height:864},{width:1280,height:720},{width:390,height:844}]) {
    await page.setViewportSize(size);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect.poll(()=>list.evaluate(el=>el.scrollHeight<=el.clientHeight+1 && el.scrollWidth<=el.clientWidth+1)).toBe(true);
    const cards=await list.locator('.dex-card').count();expect(cards).toBeGreaterThan(0);expect(cards).toBeLessThanOrEqual(50);
    const bounds=await page.getByTestId('team-selection').boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(size.height);
    await page.mouse.wheel(0,800);expect(await page.evaluate(()=>scrollY)).toBe(0);expect(await list.evaluate(el=>el.scrollTop)).toBe(0);
    await page.screenshot({path:`test-results/paged-dex-${size.width}.png`});
  }
});
