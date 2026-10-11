import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters} from '../src/data/teams';
test('hall of fame fills and centers in widescreen and mobile viewports',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try {
    store.ensurePlayer(owner);const id=store.start(owner,starters),run=store.battle(id).run_id;
    store.db.prepare("UPDATE runs SET state='cleared',floor=10 WHERE id=?").run(run);
  }finally{store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/battle');const clear=page.getByTestId('tower-clear');await expect(clear).toBeVisible();
  for(const viewport of [{width:1920,height:960},{width:1280,height:720},{width:390,height:844}]){
    await page.setViewportSize(viewport);const box=await clear.boundingBox();expect(box!.x).toBe(0);expect(box!.width).toBe(viewport.width);
    const team=await page.locator('.clear-team').boundingBox();expect(Math.abs(team!.x+team!.width/2-viewport.width/2)).toBeLessThan(2);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/clear-width-${viewport.width}.png`,fullPage:true});
  }
  await expect(clear.getByRole('button',{name:'새로운 팀으로 다시 도전'})).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('ArrowLeft');await expect(clear.getByRole('link',{name:'타이틀로 돌아가기'})).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(page.getByTestId('dex-list')).toBeVisible();
});
