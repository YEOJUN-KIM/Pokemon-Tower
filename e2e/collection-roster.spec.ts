import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
test('the dex removes unevolved entries except Porygon2 and Scyther',async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner='dex-'+suffix,store=new TowerStore('.data/e2e.sqlite');let token='';
 try{token=(await new Accounts(store.db).register('dex_'+suffix,'test-password',owner,undefined)).token;store.ensurePlayer(owner);}finally{store.close();}
 await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/pokedex');
 for(const name of ['삐삐','우츠동','골뱃','파이리','피카츄']){await page.getByRole('searchbox',{name:'검색',exact:true}).fill(name);await expect(page.getByRole('button',{name:name+' 상세 보기',exact:true})).toHaveCount(0);}
 for(const name of ['폴리곤2','스라크']){await page.getByRole('searchbox',{name:'검색',exact:true}).fill(name);await expect(page.getByRole('button',{name:name+' 상세 보기',exact:true})).toBeVisible();}
});
