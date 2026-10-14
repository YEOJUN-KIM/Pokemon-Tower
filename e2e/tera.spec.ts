import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {Accounts} from '../src/server/accounts';
import {packTeam,starters} from '../src/data/teams';
import {mkdirSync} from 'node:fs';
const capture='artifacts/qa/screenshots/tera-ai-v6';
mkdirSync(capture,{recursive:true});
for(const width of [1280,390])for(const kind of ['mega','dynamax','tera','zmove'] as const){
 test(`${kind} UI placement, keyboard, no overlap and refresh at ${width}px`,async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
   const auth=await new Accounts(store.db).register('tera_'+token.slice(0,12),'tera-test-password',owner,undefined);
   store.ensurePlayer(owner);const id=store.start(owner,starters);
   const equipment=kind==='dynamax'?['Tera Orb','Dynamax Band']:['Tera Orb'];
   for(const item of equipment)store.db.prepare('INSERT INTO run_trainer_equipment(run_id,item) VALUES (?,?)').run(store.battle(id).run_id,item);
   store.db.prepare('UPDATE battles SET trainer_equipment=? WHERE id=?').run(JSON.stringify(equipment),id);
   const own=Showdown.Teams.unpack(packTeam(starters,{},{Charizard:kind==='mega'?'Charizardite X':kind==='dynamax'?'Leftovers':kind==='zmove'?'Rockium Z':''}))!;
   own[0].moves=['Flamethrower','Growl','Air Slash','Dragon Claw'];
   if(kind==='zmove')own[0].moves[2]='Ancient Power';
   const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
   store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,tera_tickets=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'{"p1":0,"p2":0}','[1,2,3,4]',id);
   await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
   await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
   await page.getByRole('button',{name:'싸운다',exact:true}).click();
   const tera=page.getByTestId('tera-toggle');await expect(tera).toBeEnabled();await expect(tera).toHaveAttribute('data-type','Fire');
   await expect(page.locator('.gimmick-cycle-hint')).toHaveCount(0);
   const enabled=page.getByTestId('gimmick-dock').locator('button[data-gimmick]:not(:disabled)');
   for(const button of await enabled.all()){
    await page.keyboard.press('a');await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.gimmick-icon-button[aria-pressed=true]')).toHaveCount(1);
   }
   await page.keyboard.press('a');await expect(page.locator('.gimmick-icon-button[aria-pressed=true]')).toHaveCount(0);
   await page.keyboard.press('a');await expect(enabled.first()).toHaveAttribute('aria-pressed','true');
   await page.keyboard.press('x');await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(tera).toHaveAttribute('aria-pressed','false');expect(store.view(owner).run!.teraTickets).toBe(0);
   await page.keyboard.press('a');
   if(kind!=='tera')await page.keyboard.press('a');
   if(kind!=='tera'){await expect(page.getByTestId(kind==='zmove'?'zmove-toggle':'gimmick-toggle')).toHaveAttribute('aria-pressed','true');await expect(tera).toHaveAttribute('aria-pressed','false');}
   if(kind==='mega'||kind==='zmove'){
    const button=page.getByTestId(kind==='zmove'?'zmove-toggle':'gimmick-toggle'),image=button.locator('.gimmick-item-icon');
    await expect(image).toHaveAttribute('src',`/sprites/items/${kind==='mega'?'charizardite-x':'rockium-z'}.png`);
    await expect(image).toHaveCSS('animation-name',/gimmick-item-radiance/);
    expect(await button.locator('.gimmick-item-visual').evaluate(el=>getComputedStyle(el,':before').animationName)).toContain('gimmick-item-wave');
    await button.click();await expect(button).toHaveAttribute('aria-pressed','false');await expect(image).toHaveCSS('animation-name','none');
    await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
    await page.emulateMedia({reducedMotion:'reduce'});await expect(image).toHaveCSS('animation-name','none');
    await expect(button).toHaveAttribute('aria-pressed','true');await page.emulateMedia({reducedMotion:'no-preference'});
   }
   await expect(page.locator('.player-position img')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const menu=await page.getByTestId('battle-move-menu').boundingBox(),icon=await tera.boundingBox(),moves=await page.getByTestId('action-grid').boundingBox();
   expect(icon!.y+icon!.height).toBeLessThan(menu!.y);expect(icon!.x).toBeGreaterThanOrEqual(menu!.x);
   const dock=page.getByTestId('gimmick-dock');await expect(dock.getByTestId('tera-toggle')).toBeVisible();await expect(dock.getByRole('button')).toHaveCount(kind==='tera'?1:2);
   for(const button of await dock.getByRole('button').all()){const box=await button.boundingBox();expect(box!.y+box!.height).toBeLessThan(menu!.y);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(await button.evaluate(el=>getComputedStyle(el).borderTopWidth)).toBe('0px');}
   await page.screenshot({path:`${capture}/${kind}-${width}.png`,fullPage:true});
   await page.locator(`[data-command="move ${kind==='zmove'?3:2}"]`).click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
   if(kind==='tera'&&width===1280){await expect(page.locator('.motion-tera-shell')).toBeVisible();await page.screenshot({path:`${capture}/tera-transform.png`,fullPage:true});}
   await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
   await page.reload();
   if(kind==='tera'){await expect(page.locator('.player-position .sprite')).toHaveAttribute('data-tera','Fire');expect(store.view(owner).run!.teraTickets).toBe(0);}
   else if(kind==='mega')await expect(page.locator('.player-position img')).toHaveAttribute('alt','메가리자몽X');
   else if(kind==='dynamax')await expect(page.locator('.player-position .sprite')).toHaveAttribute('data-dynamax','true');
   await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(tera).toBeDisabled();
   const remaining=page.getByTestId('gimmick-dock').locator('button[data-gimmick]:not(:disabled)');
   for(const button of await remaining.all()){await page.keyboard.press('a');await expect(button).toHaveAttribute('aria-pressed','true');}
   await page.keyboard.press('a');await expect(page.locator('.gimmick-icon-button[aria-pressed=true]')).toHaveCount(0);
   if(width===1280)await page.screenshot({path:`${capture}/${kind}-disabled.png`,fullPage:true});
  }finally{store.close();}
 });
}
test('dex tera type is saved free and its Water/Grass colors reach the battle UI',async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
 const auth=await new Accounts(store.db).register('tera_'+token.slice(0,12),'tera-test-password',owner,undefined);
 store.ensurePlayer(owner);await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
 await page.goto('/pokedex');await page.getByRole('button',{name:'리자몽 상세 보기'}).click();await page.getByRole('button',{name:'능력치 조정',exact:true}).click();
 const editor=page.getByTestId('training-editor');await editor.getByRole('tab',{name:'성격·특성·테라스탈',exact:true}).click();await expect(editor.getByRole('button',{name:'테라스탈 선택',exact:true})).toContainText('불꽃');await editor.getByRole('button',{name:'테라스탈 선택',exact:true}).click();const picker=page.getByRole('dialog',{name:'테라스탈 선택',exact:true});await expect(picker.locator('.tera-type-icon')).toHaveCount(19);await expect(picker.getByRole('button',{name:'풀',exact:true}).locator('img')).toHaveAttribute('src','/sprites/gimmicks/tera/TeraGrass.png');await expect.poll(()=>picker.locator('img').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);await picker.screenshot({path:'test-results/tera-type-picker-1280.png'});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await picker.screenshot({path:'test-results/tera-type-picker-390.png'});await page.setViewportSize({width:1280,height:900});await picker.getByRole('button',{name:'물',exact:true}).click();await editor.getByRole('button',{name:'0P로 설정 저장'}).click();
 await page.reload();await page.getByRole('button',{name:'리자몽 상세 보기'}).click();await expect(page.locator('.dex-partner-tera img')).toHaveAttribute('src','/sprites/gimmicks/tera/TeraWater.png');await page.getByRole('button',{name:'능력치 조정',exact:true}).click();await editor.getByRole('tab',{name:'성격·특성·테라스탈',exact:true}).click();await expect(editor.getByRole('button',{name:'테라스탈 선택',exact:true})).toContainText('물');
 await page.screenshot({path:`${capture}/dex-tera-type.png`,fullPage:true});
 const id=store.start(owner,starters),row=store.battle(id);expect(Showdown.Teams.unpack(row.player_team)![0].teraType).toBe('Water');
 store.db.prepare('INSERT INTO run_trainer_equipment(run_id,item) VALUES (?,?)').run(row.run_id,'Tera Orb');
 store.db.prepare('UPDATE battles SET trainer_equipment=? WHERE id=?').run('["Tera Orb"]',id);
 await page.goto('/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(page.getByTestId('tera-toggle')).toHaveAttribute('data-type','Water');await page.screenshot({path:`${capture}/tera-water.png`,fullPage:true});
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();await page.getByRole('button',{name:'교체',exact:true}).click();await page.locator('[data-command="switch 3"]').click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
 await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(page.getByTestId('tera-toggle')).toHaveAttribute('data-type','Grass');await page.screenshot({path:`${capture}/tera-grass.png`,fullPage:true});
 }finally{store.close();}
});
test('opponent uses the same tera activation and its colored crystal persists after refresh',async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
  const auth=await new Accounts(store.db).register('tera_'+token.slice(0,12),'tera-test-password',owner,undefined);
  store.ensurePlayer(owner);const id=store.start(owner,starters);
  const own=Showdown.Teams.unpack(packTeam(starters))!;own[0].moves=['Growl'];
  const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy[0].teraType='Water';enemy[0].moves=['Body Slam'];
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,tera_tickets=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'{"p1":1,"p2":1}','[1,2,3,4]',id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.motion-tera-shell')).toBeVisible();await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await expect(page.locator('.enemy-position .sprite')).toHaveAttribute('data-tera','Water');expect(store.view(owner).run!.teraTickets).toBe(0);
  await page.reload();await expect(page.locator('.enemy-position .sprite')).toHaveAttribute('data-tera','Water');
  await page.screenshot({path:`${capture}/opponent-tera-water.png`,fullPage:true});
 }finally{store.close();}
});
