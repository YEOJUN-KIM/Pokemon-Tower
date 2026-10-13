import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
for(const width of [1280,390])test('Rotom forms and the training form tab save Calyrex and Kyurem at '+width,async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner='forms-'+suffix,store=new TowerStore('.data/e2e.sqlite');let token='';
 try{token=(await new Accounts(store.db).register('forms_'+suffix,'test-password',owner,undefined)).token;store.ensurePlayer(owner);store.db.prepare('UPDATE players SET growth_points=10 WHERE id=?').run(owner);for(const name of ['Calyrex','Kyurem','Rotom-Wash'])store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,name);}finally{store.close();}
 await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:900});
 await page.goto('/pokedex');await page.getByRole('searchbox',{name:'검색',exact:true}).fill('로토무');await expect(page.locator('.dex-card')).toHaveCount(6);
 await page.getByRole('button',{name:'워시로토무 상세 보기',exact:true}).click();await page.getByRole('button',{name:'기본 정보',exact:true}).click();
 const summary=page.getByTestId('dex-detail');await expect(summary.locator('.summary-types span')).toHaveText(['전기','물']);await expect(summary.locator('.summary-number')).toContainText('479');
 await expect.poll(()=>summary.locator('.summary-sprite img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 for(const [name,formName,formSpecies] of [['버드렉스','버드렉스 흑마 탄 모습','Calyrex-Shadow'],['큐레무','화이트큐레무','Kyurem-White']] as const){
  await page.goto('/pokedex');await page.getByRole('searchbox',{name:'검색',exact:true}).fill(name);await page.getByRole('button',{name:name+' 상세 보기',exact:true}).click();
  await expect(page.getByRole('button',{name:'모습 설정',exact:true})).toHaveCount(0);await page.keyboard.press('2');
  const dialog=page.getByRole('dialog',{name:name+' 능력치 조정',exact:true});await expect(dialog).toBeVisible();
  if(formSpecies==='Calyrex-Shadow')await dialog.getByRole('spinbutton',{name:'HP 능력 포인트',exact:true}).fill('1');
  await dialog.getByRole('tab',{name:'모습 설정',exact:true}).click();
  await dialog.getByRole('button',{name:new RegExp(formName)}).click();await dialog.getByRole('button',{name:formSpecies==='Calyrex-Shadow'?'1P로 설정 저장':'0P로 설정 저장',exact:true}).click();await expect(dialog).toContainText('설정 저장 완료');
  await expect(dialog.getByRole('tab',{name:'모습 설정',exact:true})).toHaveAttribute('aria-selected','true');
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await dialog.screenshot({path:`artifacts/screenshots/selectable-forms/${formSpecies}-${width}.png`});
  if(formSpecies==='Calyrex-Shadow'){await dialog.getByRole('tab',{name:'능력치',exact:true}).click();await expect(dialog.getByRole('spinbutton',{name:'HP 능력 포인트',exact:true})).toHaveValue('1');}
  await page.reload();await page.getByRole('searchbox',{name:'검색',exact:true}).fill(name);await page.getByRole('button',{name:name+' 상세 보기',exact:true}).click();await page.getByRole('button',{name:'기본 정보',exact:true}).click();
  await expect(page.getByTestId('dex-detail')).toHaveAttribute('data-preview-form',formSpecies);await expect(page.getByTestId('dex-detail').locator('h2')).toHaveText(formName);
  await expect(page.getByTestId('dex-detail').getByText('테라스탈 타입',{exact:true})).toBeVisible();
  await expect(page.getByTestId('dex-detail').getByText('성실',{exact:true})).toBeVisible();
  await expect(page.getByText('능력치 보정 없음',{exact:false})).toHaveCount(0);
  await expect.poll(()=>page.getByTestId('dex-detail').locator('.summary-sprite img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  if(formSpecies==='Kyurem-White')await expect(page.getByTestId('dex-detail').locator('.summary-sprite img')).toHaveAttribute('src',/gen5ani\/kyurem-white\.gif$/);
 }
});
