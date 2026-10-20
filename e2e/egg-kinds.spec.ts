import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {eggKinds,eggKindInfo,machinePokemonWeights,MACHINE_SHINY_WEIGHT,highestEggKind} from '../src/data/egg-kinds';

for(const width of [1280,390])test(`egg machine: odds popup, independent draws, individual and all-open at ${width}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='egg-kinds-'+suffix,store=new TowerStore('.data/e2e.sqlite');
 try{
  const auth=await new Accounts(store.db).register('egg_'+suffix,'egg-test-password',owner,undefined);
  store.ensurePlayer(owner);store.db.prepare('UPDATE players SET growth_points=2000 WHERE id=?').run(owner);
  store.db.prepare('INSERT INTO permanent_upgrades VALUES (?,0,0,2)').run(owner);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:900});await page.goto('/eggs');
  await expect(page.locator('.egg-machine')).toBeVisible();await expect(page.getByTestId('egg-kind-picker')).toHaveCount(0);
  await expect(page.locator('.egg-machine-art')).toHaveAttribute('src','/sprites/eggs/machine.png');
  await page.getByRole('button',{name:'알 확률',exact:true}).click();const odds=page.getByRole('dialog',{name:'알 확률',exact:true});
  for(const kind of eggKinds){const visual=odds.locator(`.egg-visual-${kind}`),card=visual.locator('..');await expect(visual.locator('img')).toHaveAttribute('src',eggKindInfo[kind].image);await expect.poll(()=>visual.locator('img').evaluate(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0)).toBe(true);await expect(card).toContainText(`${(kind==='shiny'?MACHINE_SHINY_WEIGHT:machinePokemonWeights[kind])/100}%`);}
  await expect(odds.locator('.egg-rare-odds')).toHaveCount(0);await expect(odds).not.toContainText('희귀 알 안의 분류 확률');
  await expect(odds).not.toContainText('포켓몬 분류 확률');
  if(width===1280){const cards=await odds.locator('.egg-odds-list article').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {y:r.y,bottom:r.bottom};}));expect(new Set(cards.slice(0,3).map(card=>card.y)).size).toBe(1);expect(cards[3].y).toBeGreaterThanOrEqual(Math.max(...cards.slice(0,3).map(card=>card.bottom)));}
  const rare=odds.locator('.egg-visual-rare'),shiny=odds.locator('.egg-visual-shiny'),superRare=odds.locator('.egg-visual-superRare');
  expect(await superRare.evaluate(el=>getComputedStyle(el,'::before').animationName)).toContain('egg-celestial-breathe');await expect(superRare.locator('.egg-celestial-stars i').first()).toHaveCSS('animation-name',/egg-celestial-star/);
  expect(await rare.evaluate(el=>getComputedStyle(el,'::before').animationName)).toContain('egg-aura-pulse');await expect(shiny.locator('.egg-gold-sparkles i').first()).toHaveCSS('animation-name',/egg-gold-twinkle/);
  await page.emulateMedia({reducedMotion:'reduce'});expect(await superRare.evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('none');await expect(superRare.locator('.egg-celestial-halo i').first()).toHaveCSS('animation-name','none');await expect(superRare.locator('.egg-celestial-stars i').first()).toHaveCSS('animation-name','none');expect(await rare.evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('none');await expect(shiny.locator('.egg-gold-sparkles i').first()).toHaveCSS('animation-name','none');await page.emulateMedia({reducedMotion:'no-preference'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await odds.screenshot({path:`test-results/egg-odds-${width}.png`});
  await odds.getByRole('button',{name:'확인',exact:true}).click();await page.screenshot({path:`test-results/egg-machine-${width}.png`,fullPage:true});
  let posts=0;page.on('request',request=>{if(request.url().includes('/api/battle')&&request.method()==='POST')posts++;});
  const response=page.waitForResponse(response=>response.url().includes('/api/battle')&&response.request().method()==='POST');
  await page.getByRole('button',{name:'10회 뽑기 · 2장 + 1,600P',exact:true}).click();const paid=await response,data=await paid.json(),request=paid.request().postDataJSON();
  expect(request.eggKind).toBeUndefined();expect(data.permanentResult.eggs).toHaveLength(10);
  const representative=highestEggKind(data.permanentResult.eggs.map((egg:{eggKind:typeof eggKinds[number]})=>egg.eggKind));
  const output=page.getByTestId('dispensed-egg');await expect(output).toHaveCount(1);await expect(output).toHaveAttribute('data-egg-kind',representative);await expect(output.locator('img')).toHaveAttribute('src',eggKindInfo[representative].image);await expect(page.locator('.egg-machine-art')).toHaveCSS('animation-name',/egg-machine-wobble/);
  await page.waitForTimeout(700);await page.locator('.egg-station').screenshot({path:`test-results/egg-machine-dispensing-${width}.png`});
  const receipt=store.db.prepare('SELECT payload FROM permanent_receipts WHERE player_id=? AND request_id=?').get(owner,request.requestId) as {payload:string};expect(JSON.parse(receipt.payload).eggKind).toBe('machine');
  for(const egg of data.permanentResult.eggs){expect(eggKinds).toContain(egg.eggKind);if(egg.eggKind==='rare')expect(['sublegendary','paradox','ultrabeast']).toContain(egg.rareCategory);else if(egg.eggKind==='superRare')expect(['legendary','mythical']).toContain(egg.rareCategory);else if(egg.eggKind==='shiny')expect(egg.shiny).toBe(true);else{expect(egg.rareCategory).toBeUndefined();expect(egg.shiny).toBe(false);}}
  const dialog=page.getByRole('dialog',{name:'알 부화 결과',exact:true});await expect(dialog.getByTestId('sealed-egg')).toHaveCount(10);await expect(dialog.getByTestId('egg-result')).toHaveCount(0);
  expect(store.view(owner).growthPoints).toBe(400);expect(store.permanentView(owner).eggTickets).toBe(0);
  const gridBox=await dialog.locator('.egg-results').boundingBox(),allBox=await dialog.getByRole('button',{name:'한 번에 열기',exact:true}).boundingBox();expect(allBox!.y).toBeGreaterThanOrEqual(gridBox!.y+gridBox!.height);
  await dialog.screenshot({path:`test-results/eggs-machine-${width}-sealed.png`});await dialog.getByTestId('sealed-egg').first().click();await expect(dialog.getByTestId('egg-result')).toHaveCount(1);await expect(dialog.getByTestId('sealed-egg')).toHaveCount(9);
  await dialog.getByRole('button',{name:'한 번에 열기',exact:true}).click();await expect(dialog.getByTestId('egg-result')).toHaveCount(10);await expect(dialog.getByTestId('sealed-egg')).toHaveCount(0);expect(posts).toBe(1);
  const retry=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{...request,eggKind:'shiny'}});expect(retry.ok()).toBe(true);expect((await retry.json()).permanentResult).toEqual(data.permanentResult);expect(store.view(owner).growthPoints).toBe(400);
  await dialog.getByRole('button',{name:'확인',exact:true}).click();await page.reload();await expect(page.getByTestId('permanent-wallet')).toHaveText('400P');
 }finally{store.close();}
});
