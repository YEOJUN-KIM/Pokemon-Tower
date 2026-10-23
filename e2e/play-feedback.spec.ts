import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {raidFixture,finishRaidBattle} from '../tests/raid-fixture';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import {packTeam} from '../src/data/teams';

for(const width of [1280,1600]){
 test(`raid choices, concealed reward and opening at ${width}px`,async({page,context})=>{
  const owner='feedback_'+randomBytes(7).toString('hex'),f=raidFixture('.data/e2e.sqlite',owner);
  try{
   f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
   const auth=await new Accounts(f.store.db).register(owner,'feedback-password',owner,undefined);
   await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
   await page.setViewportSize({width,height:width<400?740:900});await page.goto('/battle');
   await expect(page.locator('[data-event-choice="challenge"]')).toBeVisible();
   await expect(page.locator('[data-event-choice="skip"]')).toBeVisible();
   for(const height of [900,720]){
    await page.setViewportSize({width,height});
    await expect(page.locator('[data-event-choice="challenge"]')).toBeInViewport({ratio:1});
    await expect(page.locator('[data-event-choice="skip"]')).toBeInViewport({ratio:1});
    const challengeBounds=await page.locator('[data-event-choice="challenge"]').boundingBox();
    const skipBounds=await page.locator('[data-event-choice="skip"]').boundingBox();
    expect(skipBounds!.y).toBeGreaterThanOrEqual(challengeBounds!.y+challengeBounds!.height);
    expect(skipBounds!.x).toBeCloseTo(challengeBounds!.x,0);
    const overflow=await page.locator('[aria-label="이벤트 상황"]').evaluate(el=>{
     const actions=el.querySelector('.event-choices')!;
     return {panel:el.scrollHeight>el.clientHeight+1,actions:actions.scrollHeight>actions.clientHeight+1};
    });
    expect(overflow).toEqual({panel:false,actions:false});
   }
   mkdirSync('artifacts/qa/play-feedback',{recursive:true});
   await page.screenshot({path:`artifacts/qa/play-feedback/raid-choices-${width}.png`});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
   await page.locator('[data-event-choice="skip"]').click();
   await expect(page.locator('[data-event-choice="skip"]')).toHaveCount(0);
   expect(f.store.db.prepare('SELECT battle_id FROM raid_encounters WHERE event_id=?').get(f.event.id)!.battle_id).toBeNull();
  }finally{f.store.close();}
  // A separate winning event verifies presentation without changing the reward table.
  const winner='win_'+randomBytes(7).toString('hex'),g=raidFixture('.data/e2e.sqlite',winner);
  try{
   g.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
   const auth=await new Accounts(g.store.db).register(winner,'feedback-password',winner,undefined);
   g.store.chooseEvent(winner,g.run,g.event.id,'challenge');
   const battle=g.store.currentBattle(winner)!;finishRaidBattle(g.store,battle.id);g.store.recruit(winner,g.run,battle.id,null,null);
   await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
   await page.goto('/battle');
   await expect(page.getByTestId('reward-panel')).toHaveCount(0);
   await expect(page.getByRole('log',{name:'이벤트 결과'})).toContainText('전투에서 승리했다');
   await page.locator('[data-event-confirm]').click();await page.locator('[data-event-confirm]').click();
   const reveal=page.getByTestId('reward-reveal');await expect(reveal).toContainText('무언가를 떨어뜨렸다');
   await expect(page.getByTestId('reward-panel')).toHaveCount(0);
   await page.getByRole('button',{name:'확인하기',exact:true}).click();
   await expect(reveal).toHaveAttribute('data-reveal-phase','opening');
   await expect(page.getByTestId('reward-panel')).toBeVisible();
   const dialog=await page.getByTestId('reward-modal').boundingBox();expect(dialog!.x).toBeGreaterThanOrEqual(0);expect(dialog!.x+dialog!.width).toBeLessThanOrEqual(width+1);
   mkdirSync('artifacts/qa/play-feedback',{recursive:true});await page.screenshot({path:`artifacts/qa/play-feedback/reward-${width}.png`});
  }finally{g.store.close();}
 });
 test(`battle typography and transparent system controls at ${width}px`,async({page,context})=>{
  const owner='font_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
  try{
   store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register(owner,'feedback-password',owner,undefined);
   store.ensurePlayer(owner);const id=store.start(owner,['Charizard','Blastoise','Venusaur']);const run=store.battle(id).run_id;
   for(const item of ['Dynamax Band','Tera Orb'])store.db.prepare('INSERT INTO run_trainer_equipment VALUES (?,?)').run(run,item);
   store.db.prepare('UPDATE battles SET trainer_equipment=?,player_team=?,opponent_team=? WHERE id=?').run(JSON.stringify(['Dynamax Band','Tera Orb']),packTeam(['Charizard','Blastoise','Venusaur'],{},{Charizard:'Charizardite X'}),packTeam(['Snorlax','Blastoise','Venusaur']),id);
   await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
   await page.setViewportSize({width,height:width<400?740:900});await page.goto('/battle');
   await page.getByRole('button',{name:'싸운다',exact:true}).click();
   const controls=page.locator('.gimmick-icon-button');expect(await controls.count()).toBeGreaterThanOrEqual(2);
   for(const control of await controls.all()){
    await expect(control).toBeVisible();
    const css=await control.evaluate(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopWidth,shadow:getComputedStyle(el).boxShadow}));
    expect(css).toEqual({background:'rgba(0, 0, 0, 0)',border:'0px',shadow:'none'});
   }
   const text=page.locator('.player-health .health-heading strong');expect(await text.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(width<400?14:18);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
   mkdirSync('artifacts/qa/play-feedback',{recursive:true});await page.screenshot({path:`artifacts/qa/play-feedback/battle-${width}.png`});
  }finally{store.close();}
 });
}
