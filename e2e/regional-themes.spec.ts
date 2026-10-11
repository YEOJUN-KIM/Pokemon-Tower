import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters} from '../src/data/teams';
import {towerThemes,themeLabel,type TowerTheme} from '../src/data/tower-themes';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {runOrganization} from '../src/data/villain-organizations';

for(const width of [1280,390])for(const theme of Object.keys(towerThemes) as TowerTheme[])test(`${theme} random theme, champion, final and restore at ${width}px`,async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);let run='';
  // Exercise the actual random-start path; never inject a chosen theme.
  for(let i=0;i<160;i++){const id=store.start(owner,starters);run=store.battle(id).run_id;if(store.view(owner).run!.theme===theme)break;store.abandon(owner,run);run='';}
  expect(run).not.toBe('');expect(store.view(owner).run!.theme).toBe(theme);
  expect(store.db.prepare('SELECT organization FROM run_villains WHERE run_id=?').get(run)!.organization).toBe(runOrganization(run,theme));
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});
  for(const floor of [40,50]){
   const expected=towerTrainerEncounter(floor,run,theme)!;
   store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
   await page.goto('/battle');await expect(page.getByTestId('team-selection')).toContainText(themeLabel(theme));
   await expect(page.getByTestId('team-selection')).toContainText(expected.boss.name);
   await page.getByRole('button',{name:`${floor}층 보스 도전`}).click();
   await expect(page.getByRole('button',{name:'포켓몬 내보내기 · Z',exact:true})).toBeVisible();
   const portrait=page.locator(`img[src="/sprites/trainers/${expected.boss.portrait}.png"]`);await expect(portrait).toBeVisible();
   await expect.poll(()=>portrait.evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
   await page.keyboard.press('Shift');await expect(page.getByTestId('action-grid')).toBeVisible();
   const saved=store.view(owner);await page.reload();await expect(page.getByTestId('action-grid')).toBeVisible();expect(store.view(owner)).toEqual(saved);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  const frames=page.locator('.player-position .pokemon-image-frame, .enemy-position .pokemon-image-frame');
  await expect(frames).toHaveCount(2);for(let i=0;i<2;i++){await expect(frames.nth(i)).toHaveAttribute('data-framing-ready','true',{timeout:15000});await expect.poll(()=>frames.nth(i).locator('img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);}
  mkdirSync('artifacts/screenshots/regional-themes-ready',{recursive:true});
  await page.screenshot({path:`artifacts/screenshots/regional-themes-ready/${theme}-${width}.png`,fullPage:true,animations:'disabled'});
 }finally{store.close();}
});
