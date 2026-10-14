import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
for(const width of [1280,390])test('both Primal forms appear in the owned Pokedex with images and correct abilities at '+width,async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner='primal-'+suffix,store=new TowerStore('.data/e2e.sqlite');let token='';
 try{token=(await new Accounts(store.db).register('primal_'+suffix,'test-password',owner,undefined)).token;store.ensurePlayer(owner);
  for(const name of ['Groudon','Kyogre'])store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,name);
 }finally{store.close();}
 await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
 await page.setViewportSize({width,height:900});
 for(const [name,form,ability,types] of [['그란돈','원시그란돈','끝의대지',['땅','불꽃']],['가이오가','원시가이오가','시작의바다',['물']]] as const){
  await page.goto('/pokedex');await page.getByRole('searchbox',{name:'검색',exact:true}).fill(name);await page.getByRole('button',{name:name+' 상세 보기',exact:true}).click();await page.getByRole('button',{name:'기본 정보',exact:true}).click();
  const summary=page.getByTestId('dex-detail');await expect(summary).toContainText('원시회귀 가능');
  await summary.getByRole('button',{name:form,exact:true}).click();await expect(summary.locator('h2')).toHaveText(form);await expect(summary.locator('.summary-types span')).toHaveText([...types]);await expect(summary.locator('.summary-traits')).toContainText(ability);
  await expect.poll(()=>summary.locator('.summary-sprite img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await summary.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await summary.screenshot({path:`artifacts/qa/screenshots/primal/${form.includes('그란돈')?'groudon':'kyogre'}-${width}.png`});
 }
});
