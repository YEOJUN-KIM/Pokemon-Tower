import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
test('Mega Zygarde uses its own artwork instead of the base sprite',async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner='mega-'+suffix,store=new TowerStore('.data/e2e.sqlite');let token='';
 try{token=(await new Accounts(store.db).register('mega_'+suffix,'test-password',owner,undefined)).token;store.ensurePlayer(owner);store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,'Zygarde');}finally{store.close();}
 await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
 await page.goto('/pokedex');await page.getByRole('searchbox',{name:'검색',exact:true}).fill('지가르데');
 await page.getByRole('button',{name:'지가르데 상세 보기',exact:true}).click();await page.getByRole('button',{name:'기본 정보',exact:true}).click();
 const summary=page.getByTestId('dex-detail');
 await summary.getByRole('button',{name:'메가지가르데',exact:true}).click();
 await expect(summary).toHaveAttribute('data-preview-form','Zygarde-Mega');
 await expect(summary.locator('.summary-sprite img')).toHaveAttribute('src','/vendor/pokeapi/pokemon/other/official-artwork/10301.png');
 await expect.poll(()=>summary.locator('.summary-sprite img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 await summary.screenshot({path:'artifacts/qa/screenshots/mega-zygarde.png'});
 await summary.getByRole('button',{name:'기본 모습',exact:true}).click();
 await expect(summary.locator('.summary-sprite img')).not.toHaveAttribute('src',/10301/);
});
