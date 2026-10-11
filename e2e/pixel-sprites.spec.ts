import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam} from '../src/data/teams';
import {dexSearch} from './dex-filters';

test('modern battle front and back are loaded pixel sprites, also after refresh and on mobile',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try {
    store.ensurePlayer(owner);const selected=['Meowscarada','Skeledirge','Quaquaval'];
    for(const name of selected)store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,name);
    const id=store.start(owner,selected);store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam(['Miraidon','Tinkaton','Ceruledge']),id);
  } finally {store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/battle');await expect(page.getByTestId('action-grid')).toBeVisible();
  const player=page.locator('.player-position img'),enemy=page.locator('.enemy-position img');
  await expect(player).toHaveAttribute('src',/gen5-back\/meowscarada\.png$/);await expect(enemy).toHaveAttribute('src',/gen5ani\/miraidon\.gif$/);
  for(const sprite of [player,enemy])await expect.poll(()=>sprite.evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth>0)).toBe(true);
  await page.screenshot({path:'test-results/pixel-gen9-battle.png'});
  await page.reload();await expect(player).toHaveAttribute('src',/gen5-back\/meowscarada\.png$/);await expect(enemy).toHaveAttribute('src',/gen5ani\/miraidon\.gif$/);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/pixel-gen9-mobile.png'});
  await page.route('**/vendor/showdown/pokemon/**/*.gif',route=>route.abort());
  await page.reload();await expect(enemy).toHaveAttribute('src',/gen5\/miraidon\.png$/);
  await expect.poll(()=>enemy.evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth>0)).toBe(true);
});

test('a failed modern pixel animation falls back to a loaded pixel PNG',async({page})=>{
  await page.route('**/vendor/showdown/pokemon/**/*.gif',route=>route.abort());
  await page.goto('/pokedex');await dexSearch(page).fill('아머까오');
  await page.getByRole('button',{name:'아머까오 상세 보기',exact:true}).click();
  const image=page.getByRole('dialog',{name:'아머까오 선택 메뉴'}).locator('img');
  await expect(image).toHaveAttribute('src',/gen5\/corviknight\.png$/);
  await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth>0)).toBe(true);
});
