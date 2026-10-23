import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {defaultProfile} from '../src/server/training';
import {packTeam} from '../src/data/teams';

for(const [species,ability,label,originalType] of [['Meowscarada','Protean','변환자재','풀악'],['Cinderace','Libero','리베로','불꽃']] as const)
test(`${ability} popup precedes type change and attack, then the type survives next turn/reload`,async({page,context})=>{
  const suffix=randomBytes(7).toString('hex'),owner='timing-'+suffix,store=new TowerStore('.data/e2e.sqlite');let token='';
  try{
    store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
    token=(await new Accounts(store.db).register('timing_'+suffix,'test-password',owner,undefined)).token;
    store.ensurePlayer(owner);
    const profile={...defaultProfile(species),ability,moves:species==='Cinderace'?['Quick Attack','Protect','Pyro Ball','Iron Head']:['Quick Attack','Protect','Flower Trick','Knock Off']};
    const id=store.start(owner,[species,'Blastoise','Venusaur'],'basic');
    const enemy={...defaultProfile('Snorlax'),moves:['Tackle']};
    store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=?,ai_version=? WHERE id=?').run(packTeam([species,'Blastoise','Venusaur'],{[species]:profile}),packTeam(['Snorlax','Blastoise','Venusaur'],{Snorlax:enemy}),'[1,2,3,4]','damage-policy-v1',id);
  }finally{store.close();}
  await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','1'));
  await page.goto('/battle');
  await expect(page.locator('.player-health .health-types')).toHaveText(originalType);
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  await page.evaluate(()=>{(window as any).__ownMoveSeen=false;new MutationObserver(()=>{if(document.querySelector('.player-position .motion-move'))(window as any).__ownMoveSeen=true;}).observe(document.body,{childList:true,subtree:true,attributes:true});});
  await page.locator('[data-command="move 1"]').click();
  await expect(page.getByTestId('effect-notice')).toContainText(label);
  await expect(page.locator('.player-health .health-types')).toHaveText(originalType);
  await expect(page.getByRole('log',{name:'현재 배틀 상황'})).toContainText(label);
  await page.screenshot({path:`test-results/${ability}-before-type.png`,fullPage:true});
  await expect(page.locator('.player-health .health-types')).toHaveText('노말');
  await expect.poll(()=>page.evaluate(()=>(window as any).__ownMoveSeen)).toBe(true);
  await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 2"]').click();
  await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeEnabled();
  await expect(page.locator('.player-health .health-types')).toHaveText('노말');
  await page.reload();await expect(page.locator('.player-health .health-types')).toHaveText('노말');
});
