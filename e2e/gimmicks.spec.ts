import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam} from '../src/data/teams';
for(const [item,kind]of [['Charizardite X','mega'],['Dynamax Band','dynamax']] as const)for(const width of [1280,390]){
 test(kind+' toggle, animation, keyboard and persistent form at '+width+'px',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
   store.ensurePlayer(owner);const id=store.start(owner,['Charizard','Blastoise','Venusaur']);
   const own=Showdown.Teams.unpack(packTeam(['Charizard','Blastoise','Venusaur'],{},{Charizard:item}))!;
   own[0].moves=['Flamethrower','Growl','Air Slash','Dragon Claw'];
   const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
   store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
   await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
   await page.setViewportSize({width,height:width===390?844:720});await page.goto('/battle');
   await expect(page.getByRole('button',{name:'싸운다',exact:true})).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('Enter');
   const toggle=page.getByTestId('gimmick-toggle');await expect(toggle).toHaveAttribute('aria-pressed','false');
   await page.keyboard.press('a');await expect(toggle).toHaveAttribute('aria-pressed','true');
   if(kind==='dynamax'){await expect(page.locator('[data-command="move 1"]')).toContainText('다이번');await expect(page.getByTestId('battle-move-details')).toContainText('130');await expect(page.getByTestId('battle-move-details').getByRole('img',{name:'특수',exact:true})).toBeVisible();}
   await page.keyboard.press('a');await expect(toggle).toHaveAttribute('aria-pressed','false');await page.keyboard.press('a');
   await page.keyboard.press('ArrowDown');await expect(page.locator('[data-command="move 3"]')).toHaveAttribute('data-game-cursor','true');
   await page.keyboard.press('ArrowRight');await expect(page.locator('[data-command="move 4"]')).toHaveAttribute('data-game-cursor','true');
   await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowUp');
   await page.evaluate(()=>{const observer=new MutationObserver(()=>{if(document.querySelector('.mega-arena-flash')){(window as any).__megaFlashSeen=true;observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});});await page.keyboard.press('Enter');
   if(kind==='mega'){
    await expect(page.getByRole('log',{name:'현재 배틀 상황'})).toContainText('키스톤에 반응');
    await expect(page.locator('.motion-mega-charge')).toBeVisible();if(width===1280)await page.screenshot({path:'test-results/mega-charge.png'});
    await expect.poll(()=>page.evaluate(()=>(window as any).__megaFlashSeen===true)).toBe(true);
   }else{
    await expect(page.locator('.motion-dynamax-grow')).toBeVisible();
    if(width===1280)await page.screenshot({path:'test-results/dynamax-grow.png'});
   }
   await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:30000});
   if(kind==='mega')await expect(page.locator('.player-position img')).toHaveAttribute('alt','메가리자몽X');
   else await expect(page.locator('.player-position .sprite')).toHaveAttribute('data-dynamax','true');
   await page.screenshot({path:'test-results/'+kind+'-'+width+'.png',fullPage:true});
   const arena=await page.locator('.arena').boundingBox();
   const visible=await page.locator('.player-position img').evaluate((element)=>{const img=element as HTMLImageElement,canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let top=canvas.height,bottom=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>32){top=Math.min(top,y);bottom=Math.max(bottom,y);}const rect=img.getBoundingClientRect();return {top:rect.y+top/canvas.height*rect.height,bottom:rect.y+(bottom+1)/canvas.height*rect.height};});
   expect(visible.top).toBeGreaterThanOrEqual(arena!.y-3);expect(visible.bottom).toBeLessThanOrEqual(arena!.y+arena!.height+3);
   await page.reload();
   if(kind==='mega')await expect(page.locator('.player-position img')).toHaveAttribute('alt','메가리자몽X');
   else await expect(page.locator('.player-position .sprite')).toHaveAttribute('data-dynamax','true');
   await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(page.getByTestId('gimmick-toggle')).toHaveCount(0);
   await page.locator('[data-command="move 2"]').click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
   if(kind==='dynamax'){
    await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 2"]').click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');await expect(page.locator('.player-position .sprite')).not.toHaveAttribute('data-dynamax','true');
   }
  }finally{store.close();}
 });
}

