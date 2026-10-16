import {test,expect} from '@playwright/test';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {playerKey} from '../src/server/tower-service';
import {starters} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';

for(const width of [1280,390])test(`upgrade shop purchases, 1/10 hatch and keyboard at ${width}`,async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),s=new TowerStore('.data/e2e.sqlite');
 let authToken='';
 try{s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();authToken=(await new Accounts(s.db).register('upgrade_'+token.slice(0,12),'upgrade-test-password',owner,undefined)).token;s.ensurePlayer(owner);s.db.prepare('UPDATE players SET growth_points=20000 WHERE id=?').run(owner);s.db.prepare('INSERT INTO permanent_upgrades VALUES (?,0,0,3)').run(owner);s.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1)').run(owner,'Charizard',JSON.stringify({...defaultProfile('Charizard'),shiny:true}));}finally{s.close();}
 await context.addCookies([{name:'tower_auth',value:authToken,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:width===390?844:900});await page.goto('/upgrades');await expect(page.getByTestId('permanent-wallet')).toHaveText('20,000P');
 await expect(page.getByRole('tab',{name:'영구 업그레이드',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.locator('.egg-station')).not.toBeVisible();
 const productBoxes=await page.locator('.permanent-products section').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y};}));expect(productBoxes).toHaveLength(2);if(width===1280)expect(new Set(productBoxes.map(r=>r.y)).size).toBe(1);else expect(new Set(productBoxes.map(r=>r.x)).size).toBe(1);
 await page.screenshot({path:`artifacts/qa/screenshots/permanent-upgrades-final/upgrades-tab-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'2회로 확장 · 500P'}).click();await expect(page.getByRole('dialog')).toContainText('종류별 2회');await page.keyboard.press('z');await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect(page.getByText('이로치 교환권',{exact:true})).toHaveCount(0);
 await page.getByRole('tab',{name:'알 뽑기',exact:true}).click();await expect(page.locator('.permanent-products')).not.toBeVisible();await page.getByRole('button',{name:'10회 뽑기 · 3장 + 1,400P'}).click();await expect(page.locator('.egg-station')).toHaveClass(/is-spinning/);await expect(page.getByTestId('sealed-egg')).toHaveCount(10);await page.getByTestId('sealed-egg').first().click();await expect(page.getByTestId('egg-result')).toHaveCount(1);await page.getByRole('button',{name:'한 번에 열기',exact:true}).click();await expect(page.getByTestId('egg-result')).toHaveCount(10);await expect(page.getByTestId('egg-result').first().locator('h3')).toHaveCSS('color','rgb(39, 60, 65)');await expect(page.getByRole('dialog')).not.toContainText('변화 없음');await page.screenshot({path:`artifacts/qa/screenshots/permanent-upgrades-final/results-${width}.png`});await page.keyboard.press('x');
 await page.getByRole('button',{name:'1회 뽑기 · 200P',exact:true}).click();await expect(page.getByTestId('sealed-egg')).toHaveCount(1);await page.getByTestId('sealed-egg').click();await expect(page.getByTestId('egg-result')).toHaveCount(1);await page.keyboard.press('x');
 await page.reload();await expect(page.getByTestId('permanent-wallet')).toHaveText('17,900P');await page.getByRole('tab',{name:'알 뽑기',exact:true}).click();await expect(page.getByRole('button',{name:'1회 뽑기 · 200P',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'교환권 사용 · 포켓몬 선택',includeHidden:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`artifacts/qa/screenshots/permanent-upgrades-final/shop-${width}.png`,fullPage:true});await page.goto('/pokedex');await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.keyboard.press('x');await expect(page.locator('.dex-partner-stage img')).toHaveAttribute('src',/shiny/);
});

test('shiny battle entry is visible for both sides and capture animation',async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),s=new TowerStore('.data/e2e.sqlite',()=>0);let shinyAuth='';
 try{s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();shinyAuth=(await new Accounts(s.db).register('shiny_'+token.slice(0,12),'shiny-test-password',owner,undefined)).token;s.ensurePlayer(owner);s.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?)').run(owner,'Charizard',JSON.stringify({...defaultProfile('Charizard'),shiny:true}),1);s.start(owner,starters);}finally{s.close();}
 await context.addCookies([{name:'tower_auth',value:shinyAuth,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width:1280,height:900});await page.goto('/battle');await expect(page.locator('.player-position img')).toHaveAttribute('src',/shiny/);await expect(page.locator('.enemy-position img')).toHaveAttribute('src',/shiny/);await expect(page.locator('.player-position img')).toBeVisible();
 await expect(page.locator('.arena .shiny-sparkles')).toHaveCount(0);
 const battleId=(await page.request.get('/api/battle').then(r=>r.json())).battle.id;
 await page.evaluate(id=>sessionStorage.setItem('tower-pending-intro',id),battleId);await page.reload();
 await expect(page.getByRole('button',{name:'포켓몬 내보내기',exact:true})).toBeVisible();
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+10000));
 await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();await page.clock.runFor(1950);
 await expect(page.locator('.player-position img')).toBeVisible();await expect(page.locator('.arena .shiny-sendout')).toHaveCount(2);
 const frames='artifacts/qa/previews/shiny-entry/frames-sendout';mkdirSync(frames,{recursive:true});
 await page.evaluate(()=>{for(const a of document.getAnimations())if((a.effect as KeyframeEffect).target instanceof HTMLElement&&((a.effect as KeyframeEffect).target as HTMLElement).closest('.shiny-sparkles'))a.pause();});
 for(let i=0;i<22;i++){await page.evaluate(time=>{for(const a of document.getAnimations())if((a.effect as KeyframeEffect).target instanceof HTMLElement&&((a.effect as KeyframeEffect).target as HTMLElement).closest('.shiny-sparkles'))a.currentTime=time;},i*60);await page.locator('.arena').screenshot({path:`${frames}/${String(i).padStart(2,'0')}.png`});}
 await page.clock.runFor(5000);await expect(page.locator('.arena .shiny-sparkles')).toHaveCount(0);await page.reload();await expect(page.locator('.arena .shiny-sparkles')).toHaveCount(0);
 await page.screenshot({path:'artifacts/qa/screenshots/permanent-upgrades-final/shiny-battle-idle.png'});
});
