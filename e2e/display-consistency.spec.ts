import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import {packPlayerTeam,packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {hiddenShopFixture} from '../tests/hidden-shop-fixture';
import {grantStoredReward} from '../src/server/inventory-grants';
import {trackFixture,trackEncounter} from '../tests/villain-track-fixture';
import {finishChallengerBattle} from '../tests/challenger-fixture';

const capture='artifacts/qa/screenshots/display-consistency';mkdirSync(capture,{recursive:true});
for(const width of [1280,390]){
 test(`native dynamic types reach move buttons and details at ${width}`,async({page,context})=>{
  const owner='types_'+randomBytes(8).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
  try{
   store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register(owner,'display-test-password',owner,undefined);
   store.ensurePlayer(owner);const id=store.start(owner,['Charizard','Blastoise','Venusaur'],'chaos');
   await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:width===390?844:900});await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
   const cases=[
    ['Ogerpon','','','Ivy Cudgel','Grass'],['Ogerpon','Ogerpon-Wellspring','Wellspring Mask','Ivy Cudgel','Water'],['Ogerpon','Ogerpon-Hearthflame','Hearthflame Mask','Ivy Cudgel','Fire'],['Ogerpon','Ogerpon-Cornerstone','Cornerstone Mask','Ivy Cudgel','Rock'],
    ['Arceus','','Flame Plate','Judgment','Fire'],['Silvally','','Water Memory','Multi-Attack','Water'],['Genesect','','Chill Drive','Techno Blast','Ice'],
    ['Oricorio','','','Revelation Dance','Fire'],['Morpeko','','','Aura Wheel','Electric'],
   ];
   // Each row uses a new session id so the production session cache cannot hide a stale preview.
   for(const [index,[name,forme,item,move,type]] of cases.entries()){
    const profile=defaultProfile(name,forme||undefined);profile.moves=[move,'Protect'];
    const own=packPlayerTeam([name,'Blastoise','Venusaur'],{[name]:profile},{[name]:item});
    const enemy=Showdown.Teams.unpack(packTeam(['Blissey','Shuckle','Snorlax']))!;enemy.forEach(p=>p.moves=['Rest']);
    const battleId=index?store.enter(owner,store.battle(id).run_id,index+1,['Charizard','Blastoise','Venusaur']):id;
    store.db.prepare('UPDATE battles SET player_team=?,opponent_team=? WHERE id=?').run(own,Showdown.Teams.pack(enemy),battleId);
    await page.goto('/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();
    const button=page.locator('[data-command="move 1"]');await button.focus();await expect(button).toHaveAttribute('data-move-type',type);await expect(button.locator(`[data-type="${type}"]`)).toBeVisible();await expect(page.getByTestId('battle-move-details').locator(`[data-type="${type}"]`)).toBeAttached();
    if(name==='Ogerpon'&&item==='Hearthflame Mask')await page.screenshot({path:`${capture}/ivy-cudgel-${width}.png`});
    if(name==='Morpeko'){
     await page.locator('[data-command="move 2"]').click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(button).toHaveAttribute('data-move-type','Dark');await page.keyboard.press('ArrowLeft');await expect(button).toHaveAttribute('data-game-cursor','true');await expect(page.getByTestId('battle-move-details').locator('[data-type=Dark]')).toBeAttached();await page.reload();await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(button).toHaveAttribute('data-move-type','Dark');
    }
    if(index<cases.length-1){finishChallengerBattle(store,battleId);store.db.prepare("UPDATE runs SET state='select',floor=? WHERE id=?").run(index+2,store.battle(id).run_id);}
   }
  }finally{store.close();}
 });

 test(`vitamin targets show individual persisted usage at ${width}`,async({page,context})=>{
  const owner='vitui_'+randomBytes(8).toString('hex'),f=hiddenShopFixture('.data/e2e.sqlite',owner),s=f.store;
  try{
   s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(s.db).register(owner,'display-test-password',owner,undefined);
   grantStoredReward(s.db,f.run,{kind:'vitamin',stat:'hp',amount:2});s.db.prepare('INSERT INTO vitamin_purchases VALUES (?,?,?,?,0)').run(f.run,1,'atk','Charizard');for(const [i,stat] of ['def','spa','spd'].entries())s.db.prepare('INSERT INTO vitamin_purchases VALUES (?,?,?,?,0)').run(f.run,3+i,stat,'Blastoise');
   await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');await page.getByRole('button',{name:'배낭',exact:true}).click();const bag=page.getByTestId('bag');await bag.getByRole('button',{name:'소모품',exact:true}).click();await expect(bag.getByRole('complementary',{name:'배낭 아이템 상세'})).toContainText('HP 능력 포인트를 5 올린다.');await bag.getByRole('button',{name:'사용',exact:true}).click();
   const charizard=bag.locator('[data-bag-target=Charizard]'),blastoise=bag.locator('[data-bag-target=Blastoise]');await expect(charizard.locator('[data-vitamin-usage]')).toHaveText('영양제 사용 1 / 3');await expect(blastoise.locator('[data-vitamin-usage]')).toHaveText('영양제 사용 3 / 3');await expect(blastoise).toBeDisabled();await expect(blastoise).toContainText('영양제 한도 도달');await expect(bag.locator('[data-bag-target=Venusaur] [data-vitamin-usage]')).toHaveText('영양제 사용 0 / 3');await page.screenshot({path:`${capture}/vitamin-targets-${width}.png`});await charizard.click();
   await page.reload();await page.getByRole('button',{name:'배낭',exact:true}).click();await bag.getByRole('button',{name:'소모품',exact:true}).click();await bag.getByRole('button',{name:'사용',exact:true}).click();await expect(charizard.locator('[data-vitamin-usage]')).toHaveText('영양제 사용 2 / 3');expect(s.db.prepare("SELECT points FROM run_stat_boosts WHERE run_id=? AND species=? AND stat='hp'").get(f.run,'Charizard')!.points).toBe(5);
  }finally{s.close();}
 });

 test(`Flare result retains the player and current executive at ${width}`,async({page,context})=>{
  const owner='flscene_'+randomBytes(8).toString('hex'),f=trackFixture('.data/e2e.sqlite','flare',owner),s=f.store;
  try{
   s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(s.db).register(owner,'display-test-password',owner,undefined);s.chooseEvent(owner,f.run,s.view(owner).run!.event!.id,'skip');
   for(const [i,floor] of [2,12,25,45].entries()){
    if(i)trackEncounter(s,f.run,floor,i*20+1);const event=s.view(owner).run!.event!;
    if(i===2){await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');await expect(page.locator('[data-event-target] [data-trainer-asset=pixel-silhouette]')).toBeVisible();await expect(page.locator('img[src$="/aliana.png"]')).toHaveCount(0);}
    s.chooseEvent(owner,f.run,event.id,'challenge');finishChallengerBattle(s,s.currentBattle(owner)!.id);
    if(i===3){await page.reload();await expect(page.getByRole('log',{name:'이벤트 결과'})).toContainText('플레어단 보스의 위치를 확인했다.');const player=page.locator('[data-event-player]'),target=page.locator('[data-event-target]');await expect(player).toBeVisible();await expect(target.locator('img')).toBeVisible();await expect(target.locator('[data-event-reward-effect]')).toHaveCount(0);const p=(await player.boundingBox())!,t=(await target.boundingBox())!;expect(p.x).toBeLessThan(t.x);expect(p.y+p.height).toBeGreaterThan(t.y+t.height);await expect(page.getByRole('log',{name:'이벤트 결과'})).toHaveAttribute('data-typing','false');await page.screenshot({path:`${capture}/flare-result-${width}.png`});await page.reload();await expect(player).toBeVisible();await expect(target.locator('img')).toBeVisible();}
    else s.continueEvent(owner,f.run,event.id);
   }
  }finally{s.close();}
 });
}
