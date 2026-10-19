import {test,expect,type Page,type BrowserContext} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import {classicCollection} from '../tests/classic-team-fixture';
import type {TrainingView} from '../src/data/training';

async function fixture(context:BrowserContext){
 const owner='settings-'+randomBytes(12).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 store.ensurePlayer(owner);classicCollection(store,owner);store.db.prepare('UPDATE players SET growth_points=1000 WHERE id=?').run(owner);
 store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
 const auth=await new Accounts(store.db).register('set_'+randomBytes(8).toString('hex'),randomBytes(16).toString('hex'),owner,undefined);
 await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);return {store,owner};
}
async function open(page:Page,name='리자몽'){
 await page.getByRole('searchbox',{name:'이름 검색'}).fill(name);await page.getByRole('button',{name:`${name} 상세 보기`,exact:true}).click();await page.getByRole('button',{name:'포켓몬 설정',exact:true}).click();await expect(page.getByTestId('pokemon-settings')).toBeVisible();
}
async function help(page:Page,context:string){
 await expect(page.locator('.game-menu-footer')).toHaveCount(1);await expect(page.locator('dialog .game-menu-footer')).toHaveCount(0);await expect(page.locator('[data-menu-context]')).toHaveAttribute('data-menu-context',context);
 await expect(page.locator('.dex-bottom')).toBeInViewport();
 if(context!=='dex'){await expect(page.locator('.dex-bottom')).not.toContainText('즐겨찾기');await expect(page.locator('dialog[open]').last()).toHaveJSProperty('open',true);}
}
const row=(page:Page,id:string)=>page.locator(`[data-settings-row="${id}"]`);
async function cursor(page:Page,id:string){await expect(row(page,id)).toHaveAttribute('data-game-cursor','true');}
async function applyMax(page:Page,id:string,amount:string){
 await row(page,id).click();await help(page,'ev-editor');await page.keyboard.press('e');await expect(page.getByTestId('ev-amount')).toHaveText(amount);await page.keyboard.press('Enter');await cursor(page,id);
}
for(const width of [1280,390])test(`integrated settings, nested edits, limits, persistence and footer at ${width}`,async({page,context})=>{
 const {store,owner}=await fixture(context);try{
  await page.setViewportSize({width,height:width===1280?900:740});await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toContainText('27 /');
  const before=(await (await page.request.get('/api/battle?view=collection')).json()).training.find((entry:TrainingView)=>entry.species==='Charizard') as TrainingView;
  await help(page,'dex');const footerBox=(await page.locator('.dex-bottom').boundingBox())!;
  await open(page);await help(page,'pokemon-settings');await cursor(page,'hp');
  expect((await page.locator('.dex-bottom').boundingBox())!.y).toBe(footerBox.y);
  await expect(page.locator('[data-settings-column=left]')).toHaveCount(8);await expect(page.locator('[data-settings-column=right]')).toHaveCount(6);
  for(const id of ['atk','def','spa','spd','spe','nature','gender']){await page.keyboard.press('ArrowDown');await cursor(page,id);}
  const genderBefore=await row(page,'gender').innerText();await page.keyboard.press('Enter');expect(await row(page,'gender').innerText()).not.toBe(genderBefore);await expect(page.locator('dialog[open]')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');await cursor(page,'tera');await page.keyboard.press('ArrowUp');await cursor(page,'ability');await page.keyboard.press('ArrowLeft');await cursor(page,'spd');
  await row(page,'hp').click();await help(page,'ev-editor');await expect(page.getByTestId('ev-amount')).toHaveText('0');await page.getByRole('slider').fill('12');await expect(page.getByTestId('ev-amount')).toHaveText('12');await page.getByRole('button',{name:'MIN',exact:true}).click();await page.keyboard.press('ArrowRight');await expect(page.getByTestId('ev-amount')).toHaveText('1');await page.keyboard.press('e');await expect(page.getByTestId('ev-amount')).toHaveText('32');await page.keyboard.press('q');await expect(page.getByTestId('ev-amount')).toHaveText('0');await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');await cursor(page,'hp');await expect(row(page,'hp')).toContainText('+0');await help(page,'pokemon-settings');
  await applyMax(page,'hp','32');await applyMax(page,'atk','32');await applyMax(page,'def','2');await row(page,'spa').click();await page.keyboard.press('e');await expect(page.getByTestId('ev-amount')).toHaveText('0');await expect(page.getByTestId('ev-total')).toHaveText('66 / 66');await page.keyboard.press('Escape');await cursor(page,'spa');
  await row(page,'nature').click();await help(page,'nature-picker');await expect(page.getByRole('table',{name:'성격 선택표'})).toBeVisible();await page.getByRole('button',{name:'성실 · 능력치 보정 없음',exact:true}).hover();await expect(page.locator('.nature-matrix-heading')).toContainText('보정 없음');await page.keyboard.press('ArrowLeft');await expect(page.locator('.nature-matrix-heading')).toContainText('↑');await expect(page.locator('.nature-axis-active')).toHaveCount(2);await page.getByRole('button',{name:'고집 · 공격 ↑ / 특수공격 ↓',exact:true}).click();await cursor(page,'nature');await expect(row(page,'nature')).toContainText('공격 ↑ / 특수공격 ↓');
  for(let slot=0;slot<4;slot++){
   await row(page,`move-${slot}`).click();await help(page,'move-picker');const candidates=await page.locator('[data-move]').evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).dataset.move!));expect(candidates.sort()).toEqual([...new Set(before.unlockedMoves)].filter(move=>before.learnableMoves.includes(move)).sort());
   await expect(page.locator('[data-move]:disabled')).toHaveCount(3);await expect(page.locator('[data-move]:disabled').first()).toContainText('이미 장착됨');await expect(page.locator('[data-move]').first()).toContainText('PP');await page.keyboard.press('Escape');await cursor(page,`move-${slot}`);
  }
  await row(page,'move-1').click();const replacement=page.locator('[data-move]:not(:disabled):not([aria-pressed=true])').first();let replacementName:string|null=null;if(await replacement.count()){replacementName=await replacement.getAttribute('data-move');await replacement.click();}else await page.keyboard.press('Escape');await cursor(page,'move-1');
  await row(page,'ability').click();await help(page,'ability-picker');await expect(page.getByTestId('ability-picker').locator('.game-choice')).toHaveCount(before.abilities.length);await page.getByRole('button',{name:/선파워/}).click();await cursor(page,'ability');
  await row(page,'tera').click();await help(page,'tera-picker');await page.keyboard.press('ArrowLeft');await page.getByRole('button',{name:'물',exact:true}).click();await cursor(page,'tera');await expect(row(page,'tera')).toContainText('물');
  // Child apply is a draft transaction until the existing save endpoint succeeds.
  const notSaved=(await (await page.request.get('/api/battle?view=collection')).json()).training.find((entry:TrainingView)=>entry.species==='Charizard');expect(notSaved.profile.evs.hp).toBe(0);
  await page.locator('[data-settings-save]').click();await expect(page.getByTestId('pokemon-settings').getByRole('status')).toHaveText('설정 저장 완료');
  const saved=(await (await page.request.get('/api/battle?view=collection')).json()).training.find((entry:TrainingView)=>entry.species==='Charizard');expect(saved.profile.evs).toMatchObject({hp:32,atk:32,def:2,spa:0});expect(saved.profile.nature).toBe('Adamant');expect(saved.profile.ability).toBe('Solar Power');expect(saved.profile.teraType).toBe('Water');if(replacementName)expect(saved.profile.moves[1]).toBe(replacementName);expect(store.view(owner).growthPoints).toBe(834);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const dialogBox=(await page.getByTestId('pokemon-settings').boundingBox())!;expect(dialogBox.y).toBeGreaterThanOrEqual(0);expect(dialogBox.y+dialogBox.height).toBeLessThan(footerBox.y);for(const button of await page.locator('[data-settings-column],[data-settings-save]').all()){const box=(await button.boundingBox())!;expect(box.y).toBeGreaterThan(dialogBox.y);expect(box.y+box.height).toBeLessThan(dialogBox.y+dialogBox.height);}
  await page.screenshot({path:`test-results/pokemon-settings-${width}.png`});
  await row(page,'hp').click();await page.screenshot({path:`test-results/pokemon-settings-ev-${width}.png`});await page.keyboard.press('Escape');await page.keyboard.press('Escape');await help(page,'dex');await expect(page.locator('.dex-card.selected')).toHaveAttribute('data-game-cursor','true');
  await open(page);await expect(row(page,'hp')).toContainText('+32');await page.keyboard.press('Escape');await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.keyboard.press('1');await page.locator('[data-party-slot="0"]').click();await page.getByRole('button',{name:'포켓몬 설정',exact:true}).click();await expect(page.getByTestId('pokemon-settings')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('[data-party-slot="0"]')).toHaveAttribute('data-game-cursor','true');
 }finally{store.close();}
});

test('fixed and genderless Pokémon stay disabled without another popup',async({page,context})=>{
 const {store,owner}=await fixture(context);try{for(const species of ['Cresselia','Rotom'])store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,species);await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toContainText('29 /');for(const [name,label] of [['크레세리아','고정'],['로토무','변경 불가']]){await open(page,name);await expect(row(page,'gender')).toBeDisabled();await expect(row(page,'gender')).toContainText(label);await expect(page.locator('dialog[open]')).toHaveCount(1);await page.keyboard.press('Escape');}}finally{store.close();}
});

test('form settings retain their legal owned moves, ability and existing free form cost',async({page,context})=>{
 const {store,owner}=await fixture(context);try{
  store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,'Shaymin');await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toContainText('28 /');await open(page,'쉐이미');
  await row(page,'form').click();await help(page,'form-picker');await page.getByTestId('form-picker').getByRole('button',{name:/쉐이미 스카이폼/}).click();await page.getByRole('button',{name:'모습 적용',exact:true}).click();await cursor(page,'form');await expect(row(page,'ability')).toContainText('하늘의은총');await expect(page.locator('[data-settings-save]')).toHaveText('0P로 설정 저장');
  const before=(await (await page.request.get('/api/battle?view=collection')).json()).training.find((entry:TrainingView)=>entry.species==='Shaymin') as TrainingView,target=before.formOptions!.find(form=>form.species==='Shaymin-Sky')!;
  await row(page,'move-0').click();const candidates=await page.locator('[data-move]').evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).dataset.move!));expect(candidates.sort()).toEqual([...new Set([...before.unlockedMoves,...target.selfMoves!])].filter(move=>target.learnableMoves!.includes(move)).sort());await page.keyboard.press('Escape');
  await page.locator('[data-settings-save]').click();await expect(page.getByTestId('pokemon-settings').getByRole('status')).toHaveText('설정 저장 완료');expect(store.view(owner).growthPoints).toBe(1000);
  const saved=(await (await page.request.get('/api/battle?view=collection')).json()).training.find((entry:TrainingView)=>entry.species==='Shaymin');expect(saved.profile.forme).toBe('Shaymin-Sky');expect(saved.profile.ability).toBe('Serene Grace');
 }finally{store.close();}
});

test('a Pokémon with only one owned move cannot create sparse or duplicate slots',async({page,context})=>{
 const {store,owner}=await fixture(context);try{
  store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,'Ditto');await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toContainText('28 /');await open(page,'메타몽');
  await expect(row(page,'move-0')).toBeEnabled();for(const slot of [1,2,3])await expect(row(page,`move-${slot}`)).toBeDisabled();await row(page,'move-0').click();await expect(page.locator('[data-move]')).toHaveCount(1);await page.keyboard.press('Escape');await cursor(page,'move-0');
 }finally{store.close();}
});

test('settings and save action fit short desktop and mobile viewports',async({page,context})=>{
 const {store}=await fixture(context);try{
  await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toContainText('27 /');
  for(const viewport of [{width:1280,height:720},{width:390,height:667}]){
   await page.setViewportSize(viewport);await open(page);const dialog=(await page.getByTestId('pokemon-settings').boundingBox())!,footer=(await page.locator('.dex-bottom').boundingBox())!;
   expect(dialog.y).toBeGreaterThanOrEqual(0);expect(dialog.y+dialog.height).toBeLessThan(footer.y);
   const body=(await page.getByTestId('pokemon-settings').locator('.game-dialog-body').boundingBox())!;
   for(const button of await page.locator('[data-settings-column],[data-settings-save]').all()){const box=(await button.boundingBox())!;expect(box.y).toBeGreaterThanOrEqual(body.y);expect(box.y+box.height).toBeLessThanOrEqual(body.y+body.height);}
   await row(page,'move-0').click();const picker=page.getByTestId('move-picker'),box=(await picker.boundingBox())!;expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThan(footer.y);await expect(picker.locator('[data-move]').first()).toBeInViewport();await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  }
 }finally{store.close();}
});
