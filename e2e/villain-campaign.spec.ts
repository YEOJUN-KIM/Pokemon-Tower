import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {Accounts} from '../src/server/accounts';
import {rocketFixture,nextRocketEvent} from '../tests/rocket-fixture';
import {finishChallengerBattle} from '../tests/challenger-fixture';
import {VillainCampaigns} from '../src/server/villain-campaigns';

const capture='artifacts/qa/screenshots/rocket-campaign';mkdirSync(capture,{recursive:true});
for(const width of [1280,390])for(const reducedMotion of ['no-preference','reduce'] as const){
 test(`Rocket chain, snapshots and layout ${width}px ${reducedMotion}`,async({page,context})=>{
  const owner='rocket_'+randomBytes(8).toString('hex'),f=rocketFixture('.data/e2e.sqlite',owner),store=f.store;
  try{
   const auth=await new Accounts(store.db).register(owner,'rocket-test-password',owner,undefined);
   await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
   await page.setViewportSize({width,height:width===390?844:900});await page.emulateMedia({reducedMotion});
   await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
   for(const [index,stage] of ['rocket-intro','rocket-ambush','rocket-ambush','rocket-officer','rocket-boss'].entries()){
    const event=index?nextRocketEvent(store,f.run,owner):f.event;expect(event.kind).toBe(stage);
    await page.goto('/battle');
    if(stage==='rocket-ambush'){
     const notice=page.getByTestId('rocket-ambush-notice');await expect(notice).toBeAttached();
     const animation=await notice.evaluate(el=>({name:getComputedStyle(el).animationName,duration:getComputedStyle(el).animationDuration}));
     if(reducedMotion==='reduce')expect(animation.name).toBe('none');else{expect(animation.name).toContain('rocketNotice');expect(parseFloat(animation.duration)).toBeLessThanOrEqual(.12);}
    }
    await expect(page.getByRole('button',{name:stage==='rocket-intro'?'들어가 본다':'승부한다',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`${capture}/${index}-${stage}-${width}-${reducedMotion}.png`,fullPage:true,animations:'disabled'});
    const snapshot=new VillainCampaigns(store.db).row(event.id)!.snapshot_json;
    await page.getByRole('button',{name:stage==='rocket-intro'?'들어가 본다':'승부한다',exact:true}).click();
    await expect.poll(()=>store.currentBattle(owner)?.id).toBeTruthy();
    const battle=store.currentBattle(owner)!;await page.reload();expect(store.currentBattle(owner)!.opponent_team).toBe(battle.opponent_team);
    expect(new VillainCampaigns(store.db).row(event.id)!.snapshot_json).toBe(snapshot);
    finishChallengerBattle(store,battle.id);await page.reload();
    await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).toContainText(index===0?'로켓단의 표적':index===1?'단서 1 / 2':index===2?'단서 2 / 2':index===3?'비주기의 위치':'캠페인 완료');
    expect(store.view(owner).run!.state).toBe('select');expect(store.view(owner).run!.candidates).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   }
   expect(new VillainCampaigns(store.db).state(f.run).completed).toBe(1);
  }finally{store.close();}
 });
}
