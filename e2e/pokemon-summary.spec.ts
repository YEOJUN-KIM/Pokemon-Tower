import {test,expect} from '@playwright/test';
for(const width of [1280,390])test('readable base stats, badges and saved information at '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/pokedex');await page.getByRole('button',{name:'이상해꽃 상세 보기',exact:true}).click();await page.getByRole('button',{name:'기본 정보',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'이상해꽃 기본 정보'}),detail=page.getByTestId('dex-detail');
 await expect(detail.getByLabel('종족값', {exact:true})).toContainText('합계 525');await expect(detail.getByRole('img',{name:'종족값 육각형 그래프'})).toBeVisible();
 const stats=detail.locator('.summary-stat-list');for(const [name,value] of [['HP','80'],['공격','82'],['방어','83'],['특수공격','100'],['특수방어','100'],['스피드','80']])await expect(stats.locator('div').filter({has:page.locator('dt',{hasText:new RegExp('^'+name+'$')})}).locator('dd')).toHaveText(value);
 await expect(detail.getByTestId('summary-tera-type')).toContainText('풀');await expect(detail.locator('.summary-badges')).toContainText('메가진화 가능');await expect(detail.locator('.summary-badges')).toContainText('거다이맥스 가능');await expect(detail.locator('.summary-traits')).toContainText('심록');await expect(detail.locator('.summary-moves li')).toHaveCount(4);
 await expect(detail).not.toContainText('다음 도전에서 선택 가능');await expect(detail).not.toContainText('진행 중인 도전 없음');
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await dialog.screenshot({path:'test-results/pokemon-summary-'+width+'.png'});await page.keyboard.press('x');await expect(dialog).toHaveCount(0);
});

test('summary uses a saved tera choice instead of the primary type',async({page})=>{
 await page.goto('/pokedex');const collection=await page.request.get('/api/battle?view=collection').then(r=>r.json());const entry=collection.training.find((e:{species:string})=>e.species==='Venusaur');
 const response=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'train',species:entry.species,revision:entry.revision,profile:{...entry.profile,teraType:'Water'}}});expect(response.ok()).toBe(true);
 await page.reload();await page.getByRole('button',{name:'이상해꽃 상세 보기',exact:true}).click();await page.getByRole('button',{name:'기본 정보',exact:true}).click();await expect(page.getByTestId('summary-tera-type')).toContainText('물');
});
