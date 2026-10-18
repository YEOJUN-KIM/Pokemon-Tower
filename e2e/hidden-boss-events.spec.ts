import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {hiddenBossFixture} from '../tests/hidden-boss-fixture';
import {TowerService} from '../src/server/tower-service';
import {Accounts} from '../src/server/accounts';

for(const [theme,floor,width] of [['johto',50,1280],['johto',100,390],['kanto',50,1280],['kanto',100,390]] as const)test(`${theme} champion ${floor} → surprise event → automatic hidden battle at ${width}px`,async({page,context})=>{
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
  expect(s.view(owner).run!.floor).toBe(floor);expect(JSON.parse(s.currentBattle(owner)!.trainer!).name).toBe('레드');
  await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as unknown as {hiddenUnexpectedDialog:boolean}).hiddenUnexpectedDialog)).toBe(false);
  const data=await page.request.get('/api/battle').then(r=>r.json());expect(data.battle.team.every((p:{condition:string})=>p.condition.split('/')[0]===p.condition.split('/')[1])).toBe(true);
 }finally{await service.dispose();s.close();}
});
