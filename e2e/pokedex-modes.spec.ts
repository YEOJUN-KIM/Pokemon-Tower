import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {TRAINING_POINT_PRICE} from '../src/data/training';

async function display(page:Page,label:string){await page.locator('[data-dex-filter=display]').click();await page.locator('dialog[open]').getByRole('button',{name:label,exact:true}).click();}
async function card(page:Page,name:string){await page.getByRole('searchbox',{name:'이름 검색',exact:true}).fill(name);await page.getByRole('button',{name:`${name} 상세 보기`,exact:true}).click();}

async function favoriteLegend(page:Page){
 const guide=page.locator('[data-dex-favorite-guide]');await expect(guide).toBeVisible();
 expect(await guide.evaluate(el=>({tag:el.tagName,role:el.getAttribute('role'),tab:el.getAttribute('tabindex'),click:(el as HTMLElement).onclick}))).toEqual({tag:'SPAN',role:null,tab:null,click:null});
 const appearance=()=>guide.evaluate(el=>{const css=getComputedStyle(el);return [css.color,css.backgroundColor,css.boxShadow,css.transform,css.outline,css.cursor];});
 await page.mouse.move(0,0);const before=await appearance();await guide.hover();expect(await appearance()).toEqual(before);await expect(guide).toHaveCSS('cursor','default');
 const state=await page.request.get('/api/battle?view=collection').then(r=>r.json());await guide.click();
 expect((await page.request.get('/api/battle?view=collection').then(r=>r.json())).tower.favorites).toEqual(state.tower.favorites);
 await page.getByRole('searchbox',{name:'이름 검색',exact:true}).fill('리자몽');await page.getByRole('searchbox',{name:'이름 검색',exact:true}).focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('f');
 await expect(page.getByRole('button',{name:'리자몽 즐겨찾기 해제',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'리자몽 즐겨찾기 해제',exact:true}).click();await expect(page.locator('.dex-card-wrap .dex-favorite')).toHaveCount(0);
 await page.getByRole('searchbox',{name:'이름 검색',exact:true}).fill('');
}

for(const width of [1280,390])test(`collection management and party selection are separate at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.request.get('/api/battle?view=collection');
  const account=await page.request.post('/api/account',{headers:{Origin:'http://127.0.0.1:3001'},data:{action:'register',username:'modes_'+randomUUID().slice(0,8),password:'modes-password-123'}});expect(account.ok()).toBe(true);
  expect((await page.request.post('/api/tutorial',{headers:{Origin:'http://127.0.0.1:3001'},data:{event:'skip'}})).ok()).toBe(true);
  const before=await page.request.get('/api/battle?view=collection').then(r=>r.json());
  await page.goto('/');await page.getByRole('link',{name:'포켓몬 도감',exact:true}).click();
  await expect(page.getByRole('heading',{name:'포켓몬 도감',exact:true})).toBeVisible();
  await expect(page.locator('[data-dex-mode=collection]')).toBeVisible();await expect(page.locator('[data-dex-filter=display]')).toContainText('모두 보기');
  await favoriteLegend(page);
  await expect(page.locator('.dex-list .locked').first()).toBeVisible();
  await expect(page.locator('.dex-right-panel')).toHaveCount(0);await expect(page.getByTestId('team-selection')).toHaveCount(0);await expect(page.getByTestId('challenge-rule-choice')).toHaveCount(0);
  await display(page,'보유 중');await page.locator('[data-dex-reset]').click();await expect(page.locator('[data-dex-filter=display]')).toContainText('모두 보기');
  await page.screenshot({path:`test-results/pokedex-collection-${width}.png`,fullPage:true});
  const collectionWidth=(await page.locator('.dex-catalog').boundingBox())!.width;
  await card(page,'리자몽');await expect(page.getByRole('button',{name:'포켓몬 넣기',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'포켓몬 제외',exact:true})).toHaveCount(0);
  expect(await page.locator('.dex-action-options button').evaluateAll(nodes=>nodes.map(el=>el.getAttribute('aria-label')))).toEqual(['포켓몬 설정','포켓몬 정보','취소']);
  await page.getByRole('button',{name:'포켓몬 설정',exact:true}).click();await page.locator('[data-settings-row=hp]').click();
  await page.getByRole('slider',{name:'HP 투자 포인트'}).focus();await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'적용',exact:true}).click();await page.getByRole('button',{name:`${TRAINING_POINT_PRICE}P로 설정 저장`,exact:true}).click();
  const saved=await page.request.get('/api/battle?view=collection').then(r=>r.json());expect(saved.training.find((p:{species:string})=>p.species==='Charizard').profile.evs.hp).toBe(1);expect(saved.tower.growthPoints).toBe(before.tower.growthPoints-TRAINING_POINT_PRICE);
  await page.goto('/');await page.getByRole('link',{name:'게임 시작',exact:true}).click();
  await expect(page.getByRole('heading',{name:'출전 파티 편성',exact:true})).toBeVisible();await expect(page.locator('[data-dex-mode=selection]')).toBeVisible();
  await favoriteLegend(page);
  await expect(page.locator('[data-dex-filter=display]')).toContainText('보유 중');await expect(page.locator('.dex-list .locked')).toHaveCount(0);await expect(page.getByTestId('team-selection')).toBeVisible();
  await display(page,'모두 보기');await page.locator('[data-dex-reset]').click();await expect(page.locator('[data-dex-filter=display]')).toContainText('보유 중');
  await page.screenshot({path:`test-results/pokedex-selection-${width}.png`,fullPage:true});
  expect(collectionWidth).toBeGreaterThan((await page.locator('.dex-catalog').boundingBox())!.width);
  await card(page,'리자몽');
  expect(await page.locator('.dex-action-options button').evaluateAll(nodes=>nodes.map(el=>el.getAttribute('aria-label')))).toEqual(['포켓몬 넣기','포켓몬 설정','포켓몬 정보','취소']);
  await page.keyboard.press('2');await expect(page.getByRole('dialog',{name:'리자몽 포켓몬 설정',exact:true})).toBeVisible();
  for(const row of ['hp','move-0','nature','ability','tera'])await expect(page.locator(`[data-settings-row="${row}"]`)).toBeVisible();
  await page.locator('[data-settings-row=hp]').click();await page.getByRole('slider',{name:'HP 투자 포인트'}).focus();await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'적용',exact:true}).click();await page.getByRole('button',{name:`${TRAINING_POINT_PRICE}P로 설정 저장`,exact:true}).click();
  const starterSaved=await page.request.get('/api/battle?view=collection').then(r=>r.json());expect(starterSaved.training.find((p:{species:string})=>p.species==='Charizard').profile.evs.hp).toBe(2);
  await page.reload();await card(page,'리자몽');await page.getByRole('button',{name:'포켓몬 정보',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'리자몽 기본 정보',exact:true})).toBeVisible();await page.getByRole('button',{name:'리자몽 기본 정보 닫기',exact:true}).click();
  const same=await page.request.get('/api/battle?view=collection').then(r=>r.json());expect(same.training).toEqual(starterSaved.training);
  await card(page,'리자몽');await page.getByRole('button',{name:'포켓몬 넣기',exact:true}).click();await card(page,'리자몽');await expect(page.getByRole('button',{name:'포켓몬 제외',exact:true})).toBeEnabled();await page.getByRole('button',{name:'포켓몬 제외',exact:true}).click();
  for(const name of ['리자몽','거북왕','이상해꽃']){await card(page,name);await page.getByRole('button',{name:'포켓몬 넣기',exact:true}).click();}
  await expect(page.getByTestId('team-preview')).toContainText('리자몽');await expect(page.getByTestId('team-preview')).toContainText('거북왕');await expect(page.getByTestId('team-preview')).toContainText('이상해꽃');
  await page.getByRole('button',{name:'예',exact:true}).click();await page.getByRole('button',{name:'연출 건너뛰기',exact:true}).click();await expect(page).toHaveURL('http://127.0.0.1:3001/battle');
  expect((await page.request.get('/api/battle').then(r=>r.json())).tower.run.state).toBe('battle');
});
