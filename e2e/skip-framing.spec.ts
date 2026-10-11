import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters,packTeam} from '../src/data/teams';

test('Shift-skipped send-out and switches never show different fitted sizes for the same sprite',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try {store.ensurePlayer(owner);const id=store.start(owner,starters);store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam(['Unown','Wobbuffet','Ditto']),id);}finally{store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.addInitScript(()=>{
    const state=window as unknown as {visibleSizes:Record<string,string[]>};state.visibleSizes={};
    function sample(){
      document.querySelectorAll<HTMLImageElement>('.player-position img,.enemy-position img').forEach(img=>{
        if(!img.complete || !img.naturalWidth || getComputedStyle(img).visibility==='hidden')return;
        const key=img.src,value=[img.style.width,img.style.height,img.style.left,img.style.top].join('|');
        const values=state.visibleSizes[key] ??= [];if(!values.includes(value))values.push(value);
      });requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.goto('/battle');await expect(page.getByTestId('action-grid')).toBeVisible();
  for(const slot of [2,3,2]){
    await page.getByRole('button',{name:'교체',exact:true}).click();await page.locator(`[data-command="switch ${slot}"]`).click();
    await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');
    await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
    await expect(page.locator('.player-position .pokemon-image-frame')).toHaveAttribute('data-framing-ready','true');
    await page.waitForTimeout(150);
  }
  const samples=await page.evaluate(()=>(window as unknown as {visibleSizes:Record<string,string[]>}).visibleSizes);
  expect(Object.keys(samples).length).toBeGreaterThanOrEqual(3);
  for(const [src,sizes] of Object.entries(samples))expect(sizes,src).toHaveLength(1);
});

