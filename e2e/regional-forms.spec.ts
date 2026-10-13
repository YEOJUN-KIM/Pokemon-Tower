import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';

for(const width of [1280,390])test('original and Alolan Golem appear together with separate details at '+width,async({page,context})=>{
 const response=await context.request.post('/api/account',{headers:{origin:'http://127.0.0.1:3001'},data:{action:'register',username:'regional_'+randomBytes(7).toString('hex'),password:'test-password'}});
 expect(response.ok()).toBe(true);
 await page.setViewportSize({width,height:900});await page.goto('/pokedex');
 await page.getByRole('searchbox',{name:'검색',exact:true}).fill('딱구리');
 const cards=page.locator('.dex-card');await expect(cards).toHaveCount(2);
 await expect(cards.nth(0)).toHaveAttribute('aria-label','딱구리 상세 보기');
 await expect(cards.nth(1)).toHaveAttribute('aria-label','알로라 딱구리 상세 보기');
 await cards.nth(1).click();await expect(page.getByTestId('dex-partner-display').locator('h2')).toHaveText('딱구리');await expect(page.getByTestId('dex-partner-display').locator('header')).toContainText('알로라7세대');await page.getByRole('button',{name:'기본 정보',exact:true}).click();
 const detail=page.getByTestId('dex-detail');await expect(detail.locator('h2')).toHaveText('딱구리');
 await expect(detail.locator('.summary-number')).toContainText('076');await expect(detail.locator('.summary-number')).toContainText('7세대');await expect(detail.locator('.dex-region-label')).toHaveText('알로라');
 await expect(detail.locator('.summary-types span')).toHaveText(['바위','전기']);
 await expect.poll(()=>detail.locator('.summary-sprite img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 expect(await detail.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.goto('/pokedex');await page.getByRole('searchbox',{name:'검색',exact:true}).fill('켄타로스');
 await expect(page.locator('.dex-card')).toHaveCount(2);
 await page.getByRole('button',{name:'팔데아 켄타로스 상세 보기',exact:true}).click();
 await expect(page.getByTestId('dex-partner-display').locator('header')).toContainText('팔데아9세대');
 await page.getByRole('button',{name:'기본 정보',exact:true}).click();
 await page.getByRole('button',{name:'켄타로스 블레이즈종',exact:true}).click();
 await expect(page.getByTestId('dex-detail').locator('.summary-types span')).toHaveText(['격투','불꽃']);
 await page.getByRole('button',{name:'켄타로스 워터종',exact:true}).click();
 await expect(page.getByTestId('dex-detail').locator('.summary-types span')).toHaveText(['격투','물']);
});
