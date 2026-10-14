import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters} from '../src/data/teams';

for(const width of [1280,390])test(`next-floor ready focus and direct down/up route at ${width}px`,async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;
  for(const [slot,name] of ['Arcanine','Gyarados','Snorlax'].entries())store.db.prepare('INSERT INTO members VALUES (?,?,?)').run(run,slot+3,name);
  store.db.prepare("UPDATE runs SET floor=2,state='select' WHERE id=?").run(run);
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:720});await page.goto('/battle');
  const dialog=page.getByRole('dialog',{name:'2층 출전 준비'}),next=dialog.getByRole('button',{name:'2층 배틀 시작'});
  await expect(next).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('ArrowUp');const card=dialog.locator('.pokemon-choice[data-game-cursor=true]');await expect(card).toHaveCount(1);
  await page.keyboard.press('ArrowDown');await expect(next).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('ArrowUp');await page.keyboard.press('z');await expect(next).toBeDisabled();await expect(dialog.locator('.selection-count')).toHaveText('2 / 3');
  await page.keyboard.press('z');await expect(next).toHaveAttribute('data-game-cursor','true');await expect(next).toBeEnabled();
  expect(store.view(owner).run!.state).toBe('select');
  await dialog.screenshot({path:`artifacts/qa/screenshots/battle-focus/next-floor-${width}.png`});
  await page.keyboard.press('z');await expect.poll(()=>store.view(owner).run!.state).toBe('battle');expect(store.view(owner).run!.floor).toBe(2);
 }finally{store.close();}
});
