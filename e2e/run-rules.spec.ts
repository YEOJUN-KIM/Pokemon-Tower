import {test,expect} from '@playwright/test';
import {selectStarters} from './select-starters';
for(const width of [1280,390])test('select and persist battle rules at '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/battle');
 await expect(page.getByTestId('rule-picker')).toHaveCount(0);await selectStarters(page);await page.getByRole('button',{name:'새 도전 시작'}).click();
 const picker=page.getByTestId('rule-picker');await expect(picker.locator('[data-rule=basic]')).toHaveAttribute('aria-pressed','true');
 await picker.locator('[data-rule=mega]').click();await picker.locator('[data-rule=dynamax]').click();await expect(picker.locator('[data-rule=dynamax]')).toHaveAttribute('aria-pressed','true');
 await picker.locator('[data-rule=mega]').click();await expect(picker.locator('[data-rule=mega]')).toHaveAttribute('aria-pressed','true');
 const chosen=width===390?'mega':'basic',label=width===390?'메가진화 룰':'기본 룰';await picker.locator(`[data-rule=${chosen}]`).click();await expect(picker.locator(`[data-rule=${chosen}]`)).toHaveAttribute('aria-pressed','true');await page.screenshot({path:'test-results/rule-selection-'+width+'.png',fullPage:true});
 await page.getByRole('button',{name:'이 룰로 도전 시작',exact:true}).click();await expect(page.getByRole('button',{name:'포켓몬 내보내기 · Enter',exact:true})).toBeVisible();await page.keyboard.press('z');
 await expect(page.getByTestId('battle-rule')).toHaveText(label);await page.getByRole('button',{name:'싸운다',exact:true}).click();
 await expect(page.getByTestId('tera-toggle')).toHaveCount(0);await expect(page.locator('.gimmick-toggle')).toHaveCount(0);
 const state=await page.request.get('/api/battle').then(r=>r.json());expect(state.tower.run.rule).toBe(chosen);expect(state.tower.run.teraTickets).toBe(0);
 await page.reload();await expect(page.getByTestId('battle-rule')).toHaveText(label);
});
test('API starts a chosen tera rule and rejects unsupported rules',async({request})=>{
 await request.get('/api/battle');let response=await request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'start',selected:['Charizard','Blastoise','Venusaur'],rule:'z'}});expect(response.ok()).toBe(false);
 response=await request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'start',selected:['Charizard','Blastoise','Venusaur'],rule:'tera'}});expect(response.ok(),await response.text()).toBe(true);const state=await response.json();expect(state.tower.run.rule).toBe('tera');expect(state.tower.run.teraTickets).toBe(1);
});
