import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {starters} from '../src/data/teams';

test('Johto theme previews and saves Lance and Red with the right portraits',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);let run='',lanceFloor=0;
    for(let attempt=0;attempt<20;attempt++){run=store.battle(store.start(owner,starters)).run_id;lanceFloor=[10,20,30,40].find(f=>towerTrainerEncounter(f,run,'johto')!.boss.name==='목호') ?? 0;if(lanceFloor)break;store.abandon(owner,run);}
    expect(lanceFloor).toBeGreaterThan(0);
    store.db.prepare('UPDATE run_themes SET theme=? WHERE run_id=?').run('johto',run);
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
    for(const [floor,name,portrait,title] of [[lanceFloor,'목호','lance','사천왕급 트레이너'],[50,'레드','red','챔피언']] as const){
      store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
      await page.goto('/battle');await expect(page.getByTestId('team-selection')).toContainText('성도 · 2세대 테마');
      await expect(page.getByTestId('team-selection')).toContainText(title+' '+name);
      await page.getByRole('button',{name:floor+'층 보스 도전'}).click();
      await expect(page.getByRole('button',{name:'포켓몬 내보내기',exact:true})).toBeVisible();
      const image=page.locator(`img[src="/sprites/trainers/${portrait}.png"]`);await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await page.keyboard.press('Shift');await expect(page.getByTestId('action-grid')).toBeVisible();
      await page.reload();expect(store.view(owner).run!.boss!.name).toBe(name);
    }
    const frames=page.locator('.player-position .pokemon-image-frame, .enemy-position .pokemon-image-frame');await expect(frames).toHaveCount(2);
    for(let i=0;i<2;i++)await expect(frames.nth(i)).toHaveAttribute('data-framing-ready','true',{timeout:15000});
    await page.screenshot({path:'test-results/johto-red-battle.png',fullPage:true});
  }finally{store.close();}
});
