import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {defaultProfile} from '../src/server/training';
import {packTeam} from '../src/data/teams';

test('Protean popup precedes type change and attack, then the type survives next turn/reload',async({page,context})=>{
  const suffix=randomBytes(7).toString('hex'),owner='timing-'+suffix,store=new TowerStore('.data/e2e.sqlite');let token='';
  try{
    token=(await new Accounts(store.db).register('timing_'+suffix,'test-password',owner,undefined)).token;
    store.ensurePlayer(owner);
    const profile={...defaultProfile('Meowscarada'),ability:'Protean',moves:['Quick Attack','Protect','Flower Trick','Knock Off']};
    const id=store.start(owner,['Meowscarada','Blastoise','Venusaur'],'basic');
    const enemy={...defaultProfile('Snorlax'),moves:['Tackle']};
    store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=?,ai_version=? WHERE id=?').run(packTeam(['Meowscarada','Blastoise','Venusaur'],{Meowscarada:profile}),packTeam(['Snorlax','Blastoise','Venusaur'],{Snorlax:enemy}),'[1,2,3,4]','damage-policy-v1',id);
  }finally{store.close();}
  await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
  await page.goto('/battle');
  await expect(page.locator('.player-health .health-types')).toHaveText('풀악');
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  await page.locator('[data-command="move 1"]').click();
  await expect(page.getByTestId('effect-notice')).toContainText('변환자재');
  await expect(page.locator('.player-health .health-types')).toHaveText('풀악');
  await page.screenshot({path:'test-results/ability-before-type.png',fullPage:true});
  await expect(page.locator('.player-health .health-types')).toHaveText('노말');
  await expect(page.locator('.player-position .motion-move')).toBeVisible();
  await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 2"]').click();
  await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeEnabled();
  await expect(page.locator('.player-health .health-types')).toHaveText('노말');
  await page.reload();await expect(page.locator('.player-health .health-types')).toHaveText('노말');
});
