import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {villainLeaders} from '../src/data/villain-organizations';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {hiddenBossFixture} from '../tests/hidden-boss-fixture';
import {TowerService} from '../src/server/tower-service';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';

test.beforeEach(()=>{const s=new TowerStore('.data/e2e.sqlite');try{s.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();}finally{s.close();}});
for(const [id,name,ace,width] of [["cilan","덴트","Simisage",1280],["chili","팟","Simisear",390],["cress","콘","Simipour",1280],["lenora","알로에","Watchog",390],["burgh","아티","Leavanny",1280],["elesa","카밀레","Zebstrika",390],["clay","야콘","Excadrill",1280],["skyla","풍란","Swanna",390],["brycen","담죽","Beartic",1280],["drayden","사간","Haxorus",390],["cheren","체렌","Stoutland",1280],["roxie","보미카","Scolipede",390],["marlon","시즈","Jellicent",1280],["shauntal","망초","Chandelure",390],["marshal","연무","Conkeldurr",1280],["grimsley","블래리","Krookodile",390],["caitlin","카틀레야","Gothitelle",1280],["alder","노간주","Volcarona",390],["iris","아이리스","Haxorus",1280]] as const)test(`${id} canonical named entry and reload ${width}px`,async({page,context})=>{
 const owner='unova_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);
  const auth=await new Accounts(store.db).register(owner,'pilot-test-password',owner,undefined);
  let run='',floor=0;
  for(let n=0;n<40&&!floor;n++){
   run=store.battle(store.start(owner,starters,'basic')).run_id;
   floor=[5,10,15,20,25,30,35,40,45,50].find(f=>towerTrainerEncounter(f,run,'unova',true)!.boss.id==='named-'+id)??0;
   if(!floor)store.abandon(owner,run);
  }
  expect(floor).toBeGreaterThan(0);
  store.db.prepare("UPDATE run_themes SET theme='unova' WHERE run_id=?").run(run);
  store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/battle');await expect(page.getByTestId('team-selection')).toContainText(name);
  await page.getByRole('button',{name:floor+'층 보스 도전'}).click();
  await page.getByRole('button',{name:'연출 건너뛰기',exact:true}).click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const before=store.currentBattle(owner)!;
  expect(Showdown.Teams.unpack(before.opponent_team)!.map(p=>p.species)).toContain(ace);
  expect(JSON.parse(before.boss!).npcAi).toMatchObject({tier:id==='iris'?'expert':'tactical'});
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
  await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  const state=await (await page.request.get('/api/battle')).json();
  await page.reload();await expect(page.locator('.arena')).toBeVisible();
  const restored=await (await page.request.get('/api/battle')).json();
  expect(restored.battle.id).toBe(state.battle.id);expect(restored.battle.messages).toEqual(state.battle.messages);
  const after=store.battle(before.id);
  expect(after.opponent_team).toBe(before.opponent_team);expect(after.seed).toBe(before.seed);expect(after.boss).toBe(before.boss);expect(after.ai_version).toBe('tower-policy-v12');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});
for(const portrait of ['zinzolin','colress','ghetsis'])test(`Plasma ${portrait}: reviewed snapshot and browser reconnect`,async({page,context})=>{
 const owner='plasma_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);const auth=await new Accounts(store.db).register(owner,'pilot-test-password',owner,undefined);
  const first=store.battle(store.start(owner,starters,'basic'));
  const group=villainLeaders.plasma,base=portrait==='ghetsis'?group.boss:[group.executive,...group.executives!].find(s=>s.portrait===portrait)!;
  const sample={...base,id:`plasma-${portrait==='ghetsis'?'boss':'executive'}-${portrait}`};
  const snap=snapshotTrainerEventBattle(`unova-e2e:${owner}`,sample,95,'basic',CURRENT_PROGRESSION);
  store.db.prepare('UPDATE battles SET opponent_team=?,trainer=?,boss=NULL,ai_version=? WHERE id=?').run(snap.opponentTeam,JSON.stringify(snap.trainer),snap.aiVersion!,first.id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:390,height:844});await page.goto('/battle');
  const skip=page.getByRole('button',{name:'연출 건너뛰기',exact:true});if(await skip.isVisible())await skip.click();
  await expect(page.getByTestId('action-grid')).toBeVisible();
  const before=await(await page.request.get('/api/battle')).json();await page.reload();await expect(page.getByTestId('action-grid')).toBeVisible();
  const after=await(await page.request.get('/api/battle')).json();expect(after.battle.id).toBe(before.battle.id);expect(after.battle.messages).toEqual(before.battle.messages);
  expect(store.battle(first.id).opponent_team).toBe(snap.opponentTeam);expect(snap.trainer.gimmick).toBeUndefined();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});




for(const [theme,floor,width] of [['unova',50,1280],['unova',100,390]] as const)test(`${theme} champion ${floor} → surprise event → automatic hidden battle at ${width}px`,async({page,context})=>{
 const owner='hidden_'+randomBytes(7).toString('hex'),f=hiddenBossFixture(theme,floor,'.data/e2e.sqlite',owner),s=f.store,service=new TowerService(s);
 try{
  const player=Showdown.Teams.pack(Showdown.Teams.import('Charizard\nAbility: Blaze\nLevel: 50\nEVs: 1 HP\n- Flamethrower\n\nBlastoise\nAbility: Torrent\nLevel: 50\nEVs: 1 HP\n- Surf\n\nVenusaur\nAbility: Overgrow\nLevel: 50\nEVs: 1 HP\n- Vine Whip')!);
  const opponent=Showdown.Teams.pack(Showdown.Teams.import('Magikarp\nAbility: Swift Swim\nLevel: 1\nEVs: 1 HP\n- Splash\n\nCaterpie\nAbility: Shield Dust\nLevel: 1\nEVs: 1 HP\n- Tackle\n\nWeedle\nAbility: Shield Dust\nLevel: 1\nEVs: 1 HP\n- Poison Sting')!);
  s.db.prepare('UPDATE battles SET player_team=?,opponent_team=? WHERE id=?').run(player,opponent,f.champion);
  let state=await service.state(owner);for(let turn=0;turn<2;turn++)state=await service.action(owner,f.champion,state.battle!.requestId,'move 1');await service.dispose();
  const auth=await new Accounts(s.db).register(owner,'hidden-test-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
  await page.goto('/battle');
  await page.evaluate(()=>{
   (window as unknown as {hiddenUnexpectedDialog:boolean}).hiddenUnexpectedDialog=false;
   new MutationObserver(()=>{if(document.querySelector('[data-testid=result-dialog],dialog[aria-label*="출전 준비"],dialog[aria-label*="동료 영입"]'))(window as unknown as {hiddenUnexpectedDialog:boolean}).hiddenUnexpectedDialog=true;}).observe(document.body,{childList:true,subtree:true});
  });
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.enemy-position .motion-faint')).toBeAttached();
  await expect(page.getByTestId('rocket-ambush-notice')).toBeVisible();
  await expect(page.getByLabel('이벤트 상황')).toContainText('HP와 PP가 회복');
  await expect.poll(()=>s.currentBattle(owner)?.id).not.toBe(f.champion);
  await expect.poll(()=>s.view(owner).run!.state).toBe('battle');
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  expect(s.view(owner).run!.floor).toBe(floor);expect(Showdown.Teams.unpack(s.currentBattle(owner)!.opponent_team)!.some(p=>p.species==='Zekrom')).toBe(floor===100);expect(JSON.parse(s.currentBattle(owner)!.trainer!).name).toBe('N');
  await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as unknown as {hiddenUnexpectedDialog:boolean}).hiddenUnexpectedDialog)).toBe(false);
  const data=await page.request.get('/api/battle').then(r=>r.json());expect(data.battle.team.every((p:{condition:string})=>p.condition.split('/')[0]===p.condition.split('/')[1])).toBe(true);
 }finally{await service.dispose();s.close();}
});
