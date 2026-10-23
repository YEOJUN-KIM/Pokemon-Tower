import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';

test('production routes serve the preserved Showdown snapshot bytes for animation, back and shiny variants',async({request})=>{
  const manifest=JSON.parse(readFileSync('docs/assets/manifests/showdown-pokemon-runtime-assets.json','utf8'));
  for(const file of ['gen5ani/miraidon.gif','gen5ani-back/zygarde.gif','gen5-back-shiny/arceus-fire.png','gen5/kingambit.png']){
    const entry=manifest.files.find((f:{path:string})=>f.path===file);
    expect(entry).toBeTruthy();
    const response=await request.get('/vendor/showdown/pokemon/'+file);
    expect(response.ok()).toBe(true);
    const bytes=await response.body();expect(bytes.length).toBe(entry.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
  }
});

test('a failed Showdown animation falls back to its restored static PNG',async({page,context})=>{
  test.setTimeout(30_000);
  const store=new TowerStore('.data/e2e.sqlite'),owner='showdown-'+randomUUID();
  let token:string;
  try{
    store.ensurePlayer(owner);
    token=(await new Accounts(store.db).register('sprite_'+randomUUID().slice(0,8),randomUUID(),owner,undefined)).token;
  }finally{store.close();}
  await context.addCookies([{name:'tower_auth',value:token!,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  let animationRequested=false;
  await page.route('**/vendor/showdown/pokemon/**/*.gif',route=>{animationRequested=true;return route.fulfill({status:404,body:'Animation unavailable'});});
  await page.goto('/pokedex');
  await page.getByRole('button',{name:/알고 있어요.*건너뛰기/}).click();
  await page.getByRole('searchbox',{name:'이름 검색',exact:true}).fill('미라이돈');
  await page.keyboard.press('Enter');
  await page.getByRole('button',{name:'미라이돈 상세 보기',exact:true}).click();
  const image=page.getByRole('dialog',{name:'미라이돈 선택 메뉴'}).locator('img');
  await expect(image).toHaveAttribute('src',/gen5\/miraidon\.png$/);
  await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  expect(animationRequested).toBe(true);
});
