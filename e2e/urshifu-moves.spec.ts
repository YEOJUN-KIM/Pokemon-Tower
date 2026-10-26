import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {defaultProfile} from '../src/server/training';
const custom=['Surging Strikes','Close Combat','Iron Head','Swords Dance'];
const single=['Wicked Blow','Sucker Punch','Iron Head','Swords Dance'];
for(const width of [1280,390])test(`Urshifu form roundtrip restores independent saved moves at ${width}px`,async({page,context,baseURL})=>{
 const suffix=randomBytes(7).toString('hex'),owner='urshifu-'+suffix,store=new TowerStore('.data/e2e.sqlite');
 try{
  const auth=await new Accounts(store.db).register('urshifu_'+suffix,'form-test-password',owner,undefined);
  store.ensurePlayer(owner);store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,'Urshifu');store.db.prepare('UPDATE players SET growth_points=10 WHERE id=?').run(owner);
  for(const move of new Set([...custom,...single]))store.db.prepare('INSERT OR IGNORE INTO move_unlocks VALUES (?,?,?)').run(owner,'Urshifu',move);
  store.train(owner,'Urshifu',0,{...defaultProfile('Urshifu'),moves:single});
  store.train(owner,'Urshifu',1,{...defaultProfile('Urshifu','Urshifu-Rapid-Strike'),moves:custom});
  await context.addCookies([{name:'tower_auth',value:auth.token,url:baseURL!,httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:900});await page.goto('/pokedex');
  await page.getByRole('searchbox',{name:'검색',exact:true}).fill('우라오스');await page.locator('.dex-card').first().click();await page.keyboard.press('2');
  const editor=page.getByTestId('training-editor');await expect(editor).toBeVisible();await editor.getByRole('spinbutton',{name:'HP 능력 포인트',exact:true}).fill('1');await editor.getByRole('tab',{name:'모습 설정',exact:true}).click();
  for(const [form,first] of [['일격의 태세','암흑강타'],['연격의 태세','수류연타']]){
   await editor.getByRole('button',{name:new RegExp(form)}).click();
   await expect(editor.locator('.form-editor')).toContainText(`기술배치: ${first} / ${form==='일격의 태세'?'기습':'인파이트'} / 아이언헤드 / 칼춤`);
   await editor.getByRole('button',{name:form==='일격의 태세'?'1P로 설정 저장':'0P로 설정 저장',exact:true}).click();
   await expect.poll(()=>store.trainingCollection(owner).find(p=>p.species==='Urshifu')!.profile.moves).toEqual(form==='일격의 태세'?single:custom);
  }
  await editor.getByRole('tab',{name:'능력치',exact:true}).click();await expect(editor.getByRole('spinbutton',{name:'HP 능력 포인트',exact:true})).toHaveValue('1');
  await page.reload();expect(store.trainingCollection(owner).find(p=>p.species==='Urshifu')!.profile.moves).toEqual(custom);
  await page.getByRole('searchbox',{name:'검색',exact:true}).fill('우라오스');await page.locator('.dex-card').first().click();await page.getByRole('button',{name:'포켓몬 정보',exact:true}).click();
  const summary=page.getByTestId('dex-detail');await expect(summary).toHaveAttribute('data-preview-form','Urshifu-Rapid-Strike');await expect(summary.locator('.summary-moves')).toContainText('인파이트');
  await summary.locator('.summary-form-preview').getByRole('button',{name:'우라오스 일격의 태세',exact:true}).click();await expect(summary.locator('.summary-moves')).toContainText('기습');await expect(summary.locator('.summary-moves')).not.toContainText('인파이트');
  await summary.locator('.summary-form-preview').getByRole('button',{name:'우라오스 연격의 태세',exact:true}).click();await expect(summary.locator('.summary-moves')).toContainText('인파이트');

 }finally{store.close();}
});
