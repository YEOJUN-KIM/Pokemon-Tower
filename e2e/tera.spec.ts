import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam,starters} from '../src/data/teams';
import {mkdirSync} from 'node:fs';
const capture='artifacts/qa/screenshots/tera-ai-v6';
mkdirSync(capture,{recursive:true});
for(const width of [1280,390])for(const kind of ['mega','dynamax','tera'] as const){
 test(`${kind} UI placement, keyboard, no overlap and refresh at ${width}px`,async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
   store.ensurePlayer(owner);const id=store.start(owner,starters);
   const own=Showdown.Teams.unpack(packTeam(starters,{},{Charizard:kind==='mega'?'Charizardite X':kind==='dynamax'?'Dynamax Band':''}))!;
   own[0].moves=['Flamethrower','Growl','Air Slash','Dragon Claw'];
   const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
   store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,tera_tickets=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'{"p1":1,"p2":0}','[1,2,3,4]',id);
   await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
   await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
   await page.getByRole('button',{name:'싸운다',exact:true}).click();
   const tera=page.getByTestId('tera-toggle');await expect(tera).toBeEnabled();await expect(tera).toHaveAttribute('data-type','Fire');
   await page.keyboard.press('a');if(kind!=='tera')await page.keyboard.press('a');await expect(tera).toHaveAttribute('aria-pressed','true');
   await page.keyboard.press('x');await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(tera).toHaveAttribute('aria-pressed','false');expect(store.view(owner).run!.teraTickets).toBe(1);
   await page.keyboard.press('a');
   if(kind!=='tera'){await expect(page.getByTestId('gimmick-toggle')).toHaveAttribute('aria-pressed','true');await expect(tera).toHaveAttribute('aria-pressed','false');}
   await expect(page.locator('.player-position img')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const menu=await page.getByTestId('battle-move-menu').boundingBox(),icon=await tera.boundingBox(),moves=await page.getByTestId('action-grid').boundingBox();
   expect(icon!.x).toBeGreaterThanOrEqual(moves!.x+moves!.width);expect(icon!.x).toBeGreaterThanOrEqual(menu!.x);
   const dock=page.getByTestId('gimmick-dock');await expect(dock.getByRole('button')).toHaveCount(2);
   for(const button of await dock.getByRole('button').all()){const box=await button.boundingBox();expect(box!.y+box!.height).toBeLessThan(menu!.y);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(await button.evaluate(el=>getComputedStyle(el).borderTopWidth)).toBe('0px');}
   await page.screenshot({path:`${capture}/${kind}-${width}.png`,fullPage:true});
   await page.locator('[data-command="move 2"]').click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
   if(kind==='tera'&&width===1280){await expect(page.locator('.motion-tera-shell')).toBeVisible();await page.screenshot({path:`${capture}/tera-transform.png`,fullPage:true});}
   await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
   await page.reload();
   if(kind==='tera'){await expect(page.locator('.player-position .sprite')).toHaveAttribute('data-tera','Fire');expect(store.view(owner).run!.teraTickets).toBe(0);}
   else if(kind==='mega')await expect(page.locator('.player-position img')).toHaveAttribute('alt','메가리자몽X');
   else await expect(page.locator('.player-position .sprite')).toHaveAttribute('data-dynamax','true');
   await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(tera).toBeDisabled();
   if(width===1280)await page.screenshot({path:`${capture}/${kind}-disabled.png`,fullPage:true});
  }finally{store.close();}
 });
}
test('dex tera type is saved free and its Water/Grass colors reach the battle UI',async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
 store.ensurePlayer(owner);await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
 await page.goto('/pokedex');await page.getByRole('button',{name:'리자몽 상세 보기'}).click();await page.getByRole('button',{name:'능력치 조정',exact:true}).click();
 const editor=page.getByTestId('training-editor');await editor.getByRole('tab',{name:'특성·테라스탈',exact:true}).click();await expect(editor.getByRole('button',{name:'테라스탈 선택',exact:true})).toContainText('불꽃');await editor.getByRole('button',{name:'테라스탈 선택',exact:true}).click();await page.getByRole('dialog',{name:'테라스탈 선택',exact:true}).getByRole('button',{name:'물',exact:true}).click();await editor.getByRole('button',{name:'0P로 설정 저장'}).click();
 await page.reload();await page.getByRole('button',{name:'리자몽 상세 보기'}).click();await page.getByRole('button',{name:'능력치 조정',exact:true}).click();await editor.getByRole('tab',{name:'특성·테라스탈',exact:true}).click();await expect(editor.getByRole('button',{name:'테라스탈 선택',exact:true})).toContainText('물');
 await page.screenshot({path:`${capture}/dex-tera-type.png`,fullPage:true});
 const id=store.start(owner,starters),row=store.battle(id);expect(Showdown.Teams.unpack(row.player_team)![0].teraType).toBe('Water');
 store.db.prepare('UPDATE battles SET tera_tickets=? WHERE id=?').run('{"p1":1,"p2":0}',id);
 await page.goto('/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(page.getByTestId('tera-toggle')).toHaveAttribute('data-type','Water');await page.screenshot({path:`${capture}/tera-water.png`,fullPage:true});
 await page.getByRole('button',{name:'돌아가기 · X',exact:true}).click();await page.getByRole('button',{name:'교체',exact:true}).click();await page.locator('[data-command="switch 3"]').click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
 await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(page.getByTestId('tera-toggle')).toHaveAttribute('data-type','Grass');await page.screenshot({path:`${capture}/tera-grass.png`,fullPage:true});
 }finally{store.close();}
});
test('shared tera ticket shop saves quantity and rejects repeated purchases',async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);const row=store.battle(store.start(owner,starters));
  store.db.prepare("UPDATE runs SET state='select',floor=6 WHERE id=?").run(row.run_id);store.db.prepare('UPDATE players SET coins=2000 WHERE id=?').run(owner);
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/battle');await expect(page.getByTestId('tera-ticket-product')).toContainText('보유 1장');
  await page.getByTestId('purchase-tera').click();await expect(page.getByTestId('tera-ticket-product')).toContainText('보유 2장');await expect(page.getByTestId('purchase-tera')).toBeDisabled();
  await page.reload();await expect(page.getByTestId('tera-ticket-product')).toContainText('보유 2장');expect(store.view(owner).coins).toBe(1100);
  const duplicate=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'purchase-tera',runId:row.run_id,floor:6}});expect(duplicate.status()).toBe(409);expect(store.view(owner).coins).toBe(1100);
  await page.screenshot({path:`${capture}/tera-ticket-shop.png`,fullPage:true});
 }finally{store.close();}
});
test('opponent uses the same tera activation and its colored crystal persists after refresh',async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);const id=store.start(owner,starters);
  const own=Showdown.Teams.unpack(packTeam(starters))!;own[0].moves=['Growl'];
  const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy[0].teraType='Water';enemy[0].moves=['Body Slam'];
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,tera_tickets=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'{"p1":1,"p2":1}','[1,2,3,4]',id);
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.motion-tera-shell')).toBeVisible();await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await expect(page.locator('.enemy-position .sprite')).toHaveAttribute('data-tera','Water');expect(store.view(owner).run!.teraTickets).toBe(1);
  await page.reload();await expect(page.locator('.enemy-position .sprite')).toHaveAttribute('data-tera','Water');
  await page.screenshot({path:`${capture}/opponent-tera-water.png`,fullPage:true});
 }finally{store.close();}
});
