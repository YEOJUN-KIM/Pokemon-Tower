import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {statKeys,type StatBlock} from '../src/data/training';
import type {EggResult} from '../src/data/permanent-upgrades';
test.beforeEach(async({context})=>{
 const suffix=randomBytes(8).toString('hex'),store=new TowerStore('.data/e2e.sqlite'),owner=`egg-layout-${suffix}`;
 try{store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const account=await new Accounts(store.db).register(`el_${suffix}`,'egg-layout-password',owner,undefined);store.ensurePlayer(owner);await context.addCookies([{name:'tower_auth',value:account.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);}finally{store.close();}
});
const samples:[string,number[],boolean,string[]][]=[
 ['Yveltal',[18,13,1,25,12,28],true,[]],['Tyranitar',[2,31,29,22,0,22],false,[]],['Flygon',[31,19,4,19,6,20],true,[]],['Ambipom',[11,31,20,21,29,23],true,['Baton Pass']],['Swoobat',[2,13,30,3,19,0],false,['Flash']],
 ['Meganium',[21,6,27,16,18,6],true,['Facade']],['Medicham',[3,29,25,26,19,13],false,[]],['Ho-Oh',[0,11,20,25,21,31],true,[]],['Unown',[19,13,25,30,22,5],true,[]],['Excadrill',[26,28,4,18,6,0],true,['Metal Claw']],
];
for(const width of [1100,390])test(`egg result requested sample shows NEW, exact IV gains and rarity at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:1200});await page.goto('/eggs');await expect(page.getByTestId('permanent-wallet')).toBeVisible();
 const state=await page.request.get('/api/battle?view=collection').then(r=>r.json());
 const eggs:EggResult[]=samples.map(([species,values,isNew,newMoves])=>{const ivs=Object.fromEntries(statKeys.map((s,i)=>[s,values[i]])) as StatBlock;return {species,ivs,isNew,newMoves,shiny:false,newShiny:false,ivGain:{species,changes:isNew?[]:[{stat:'atk',from:values[1]-8,to:values[1]}]}};});
 await page.route('**/api/battle*',async route=>{if(route.request().method()==='GET')return route.fulfill({json:{...state,tower:{...state.tower,growthPoints:20000}}});return route.fulfill({json:{...state,tower:{...state.tower,growthPoints:20000},permanentResult:{message:'10개의 알이 부화했어요!',eggs}}});});
 await page.reload();await page.getByRole('button',{name:'10회 뽑기 · 2,000P',exact:true}).click();await page.getByRole('button',{name:'한 번에 열기',exact:true}).click();await expect(page.getByTestId('egg-result')).toHaveCount(10);
 const cards=page.getByTestId('egg-result');await expect(cards.nth(0).locator('.egg-new-badge')).toHaveText('NEW!');await expect(cards.nth(1).locator('.egg-new-badge')).toHaveCount(0);await expect(cards.nth(1).locator('.egg-stat-improved dd')).toHaveText('31↑8');await expect(cards.nth(1).locator('.egg-stat-improved dd')).toHaveCSS('color','rgb(195, 67, 67)');await expect(cards.nth(1).locator('.egg-stat-delta')).toHaveCSS('color','rgb(123, 133, 139)');await expect(cards.nth(0)).toHaveAttribute('data-rarity','legendary');await expect(cards.nth(3).locator('.egg-new-moves')).toContainText('새 기술');await expect(page.getByRole('dialog')).not.toContainText('개체값 상승!');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('dialog').screenshot({path:`artifacts/qa/screenshots/egg-results-revised/revised-${width}.png`});
 // Other rarity palettes are checked with the same presentation-only fixture.
 eggs[0].species='Articuno';eggs[1].species='Mew';await page.keyboard.press('x');await page.getByRole('button',{name:'10회 뽑기 · 2,000P',exact:true}).click();await page.getByRole('button',{name:'한 번에 열기',exact:true}).click();await expect(cards.nth(0)).toHaveAttribute('data-rarity','sublegendary');await expect(cards.nth(1)).toHaveAttribute('data-rarity','mythical');
});
