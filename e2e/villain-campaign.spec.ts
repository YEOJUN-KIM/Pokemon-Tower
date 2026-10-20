import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {Accounts} from '../src/server/accounts';
import {rocketFixture,nextRocketEvent} from '../tests/rocket-fixture';
import {finishChallengerBattle} from '../tests/challenger-fixture';
import Showdown from 'pokemon-showdown';
import {TowerService} from '../src/server/tower-service';
import {arenaTheme} from '../src/web/encounter-presentation';
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
     if(reducedMotion==='reduce')expect(animation.name).toBe('none');else{expect(animation.name).toContain('rocketNotice');expect(parseFloat(animation.duration)).toBeGreaterThanOrEqual(.8);expect(parseFloat(animation.duration)).toBeLessThanOrEqual(1.2);}
    }
    await expect(page.locator('[data-event-confirm]')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.getByRole('group',{name:'이벤트 선택',exact:true})).toHaveCount(0);
    expect(await page.locator('[data-villain=true].battle-messages').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
    await page.screenshot({path:`${capture}/${index}-${stage}-${width}-${reducedMotion}.png`,fullPage:true,animations:'disabled'});
    if(stage==='rocket-ambush')await expect(page.locator('.arena')).toHaveAttribute('data-scenery',arenaTheme(event.afterFloor,100,'trainer'));
    if(stage==='rocket-officer'){await expect(page.locator('[data-villain=true] .latest')).toHaveCSS('white-space','pre-line');await expect(page.locator('[data-villain=true] .latest')).toHaveAttribute('data-full-text','폐쇄된 보안 구역.\n로켓단 간부를 발견했다.');}
    const snapshot=new VillainCampaigns(store.db).row(event.id)!.snapshot_json;
    await expect(page.getByRole('log',{name:'이벤트 안내'})).toHaveAttribute('data-typing','false');await page.locator('[data-event-confirm]').click();
    await expect.poll(()=>store.currentBattle(owner)?.id).toBeTruthy();
    const battle=store.currentBattle(owner)!;if(stage==='rocket-ambush')await expect(page.locator('.arena')).toHaveAttribute('data-scenery',arenaTheme(event.afterFloor,100,'trainer'));await page.reload();expect(store.currentBattle(owner)!.opponent_team).toBe(battle.opponent_team);
    expect(new VillainCampaigns(store.db).row(event.id)!.snapshot_json).toBe(snapshot);
    finishChallengerBattle(store,battle.id);await page.reload();
    await expect(page.getByRole('log',{name:'이벤트 결과'})).toHaveAttribute('data-typing','false');await expect(page.getByRole('log',{name:'이벤트 결과'})).toContainText(index===0?'로켓단의 아지트에서 물품을 발견했다.':index===1?'단서 1 / 2':index===2?'단서 2 / 2':index===3?'비주기의 위치':'캠페인 완료');await page.locator('[data-event-confirm]').click();await expect(page.getByTestId('reward-modal')).toBeVisible();
    await expect(page.locator('[data-event-player]')).toBeVisible();await expect(page.locator('[data-event-target] img')).toBeVisible();
    if(stage==='rocket-ambush')await expect(page.locator('.arena')).toHaveAttribute('data-scenery',arenaTheme(event.afterFloor,100,'trainer'));
    expect(store.view(owner).run!.state).toBe('select');expect(store.view(owner).run!.candidates).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   }
   expect(new VillainCampaigns(store.db).state(f.run).completed).toBe(1);
  }finally{store.close();}
 });
}

for(const stage of ['rocket-officer','rocket-boss'])test(`${stage}: final hit and faint finish before reward at 4x`,async({page,context})=>{
 const owner='last_'+randomBytes(8).toString('hex'),f=rocketFixture('.data/e2e.sqlite',owner),store=f.store;
 const service=new TowerService(store);
 try{
  let event=f.event;
  while(event.kind!==stage){store.chooseEvent(owner,f.run,event.id,'challenge');finishChallengerBattle(store,store.currentBattle(owner)!.id);event=nextRocketEvent(store,f.run,owner);}
  store.chooseEvent(owner,f.run,event.id,'challenge');const battle=store.currentBattle(owner)!;
  const player=Showdown.Teams.pack(Showdown.Teams.import('Charizard\nAbility: Blaze\nLevel: 50\nEVs: 1 HP\n- Flamethrower\n\nBlastoise\nAbility: Torrent\nLevel: 50\nEVs: 1 HP\n- Surf\n\nVenusaur\nAbility: Overgrow\nLevel: 50\nEVs: 1 HP\n- Vine Whip')!);
  const opponent=Showdown.Teams.pack(Showdown.Teams.import('Magikarp\nAbility: Swift Swim\nLevel: 1\nEVs: 1 HP\n- Splash\n\nCaterpie\nAbility: Shield Dust\nLevel: 1\nEVs: 1 HP\n- Tackle\n\nWeedle\nAbility: Shield Dust\nLevel: 1\nEVs: 1 HP\n- Poison Sting')!);
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=? WHERE id=?').run(player,opponent,battle.id);
  let state=await service.state(owner);for(let turn=0;turn<2;turn++)state=await service.action(owner,battle.id,state.battle!.requestId,'move 1');
  expect(state.battle!.status).toBe('waiting');await service.dispose();
  const auth=await new Accounts(store.db).register(owner,'rocket-test-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
  await page.goto('/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();
  await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
  await expect(page.getByTestId('reward-modal')).toHaveCount(0);
  await expect(page.locator('.enemy-position .motion-faint')).toBeAttached();
  await expect(page.getByTestId('reward-modal')).toHaveCount(0);
  await expect(page.getByRole('log',{name:'이벤트 결과'})).toHaveAttribute('data-typing','false');await page.locator('[data-event-confirm]').click();await expect(page.getByTestId('reward-modal')).toBeVisible();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
 }finally{await service.dispose();store.close();}
});
