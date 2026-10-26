import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
for(const width of [1280,390])test('battle form previews show transformed stats and conditions at '+width,async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner='battleforms-'+suffix,store=new TowerStore('.data/e2e.sqlite');let token='';
 try{token=(await new Accounts(store.db).register('bforms_'+suffix,'test-password',owner,undefined)).token;store.ensurePlayer(owner);for(const name of ['Palafin','Terapagos','Wishiwashi'])store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,name);}finally{store.close();}
 await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:900});
 for(const [name,formName,species,total,atk,condition] of [
  ['돌핀맨','돌핀맨 마이티폼','Palafin-Hero',650,160,'교체'],
  ['약어리','약어리 군집폼','Wishiwashi-School',620,140,'25%'],
  ['테라파고스','테라파고스 스텔라폼','Terapagos-Stellar',700,105,'테라스탈'],
 ] as const){
  await page.goto('/pokedex');await page.getByRole('searchbox',{name:'검색',exact:true}).fill(name);await page.getByRole('button',{name:name+' 상세 보기',exact:true}).click();await page.getByRole('button',{name:'포켓몬 정보',exact:true}).click();
  const summary=page.getByTestId('dex-detail');await summary.getByRole('button',{name:formName,exact:true}).click();
  await expect(summary).toHaveAttribute('data-preview-form',species);await expect(summary.locator('h2')).toHaveText(formName);
  await expect(summary.locator('.summary-section-heading strong')).toHaveText(String(total));
  await expect(summary.locator('.summary-stat-list div').filter({has:page.getByText('공격',{exact:true})}).locator('dd')).toHaveText(String(atk));
  await expect(summary.getByTestId('form-condition')).toHaveCount(0);
  await expect.poll(()=>summary.locator('.summary-sprite img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  if(species!=='Palafin-Hero')await expect(summary.locator('.summary-sprite img')).toHaveAttribute('src',/gen5ani\/.+\.gif$/);
  expect(await summary.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await summary.screenshot({path:`artifacts/qa/screenshots/battle-forms/${species}-${width}.png`});
  await summary.getByRole('button',{name:'기본 모습',exact:true}).click();await expect(summary).not.toHaveAttribute('data-preview-form',species);
  await page.getByRole('button',{name:name+' 기본 정보 닫기',exact:true}).click();
  await page.getByRole('button',{name:name+' 상세 보기',exact:true}).click();await page.keyboard.press('2');
  await expect(page.getByRole('dialog',{name:name+' 능력치 조정',exact:true}).getByRole('tab',{name:'모습 설정',exact:true})).toHaveCount(0);
 }
});
