import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {defaultProfile} from '../src/server/training';
import {packTeam,starters} from '../src/data/teams';
test.use({hasTouch:true});

for(const width of [1280,390])test(`Z selection, real power, activation, one use and reload at ${width}px`,async({page,context})=>{
  const suffix=randomBytes(7).toString('hex'),owner='z-'+suffix,store=new TowerStore('.data/e2e.sqlite');let token='';
  try{
    token=(await new Accounts(store.db).register('z_'+suffix,'test-password',owner,undefined)).token;store.ensurePlayer(owner);
    const id=store.start(owner,starters,'z'),own={...defaultProfile('Charizard'),moves:['Flamethrower','Protect','Air Slash','Dragon Pulse']},enemy={...defaultProfile('Snorlax'),moves:['Protect']};
    store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=?,ai_version=? WHERE id=?').run(packTeam(starters,{Charizard:own},{Charizard:'Firium Z'}),packTeam(['Snorlax','Blastoise','Venusaur'],{Snorlax:enemy}),'[1,2,3,4]','damage-policy-v1',id);
  }finally{store.close();}
  await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:844});await page.goto('/battle');await expect(page.getByTestId('battle-rule')).toHaveText('Z기술 룰');
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  const toggle=page.getByTestId('zmove-toggle');await expect(toggle).toBeVisible();
  if(width===1280){await page.keyboard.press('a');}else await toggle.tap();
  await expect(toggle).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-command="move 1"]')).toContainText('다이내믹풀플레임');
  await expect(page.locator('[data-command="move 2"]')).toBeDisabled();
  await expect(page.getByTestId('battle-move-details')).toContainText('175');
  if(width===1280)await expect(page.getByTestId('battle-move-details').getByRole('img',{name:'특수',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`artifacts/qa/screenshots/z-moves/z-select-${width}.png`,fullPage:true});
  await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.motion-z-charge')).toBeVisible();
  await page.screenshot({path:`artifacts/qa/screenshots/z-moves/z-charge-${width}.png`,fullPage:true});
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:30000});
  const response=await page.request.get('/api/battle').then(r=>r.json());
  expect(response.battle.messages.some((line:string)=>line.startsWith('|-zpower|p1'))).toBe(true);
  expect(response.battle.messages.some((line:string)=>line.startsWith('|-zbroken|'))).toBe(true);
  await page.reload();await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(page.getByTestId('zmove-toggle')).toHaveCount(0);
});

test('crystal shop charges 3000 and keeps equipment after reload',async({page,context})=>{
  const suffix=randomBytes(7).toString('hex'),owner='zshop-'+suffix,store=new TowerStore('.data/e2e.sqlite');let token='';
  try{
    token=(await new Accounts(store.db).register('zshop_'+suffix,'test-password',owner,undefined)).token;store.ensurePlayer(owner);
    const row=store.battle(store.start(owner,starters,'z'));store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(row.run_id);store.db.prepare('UPDATE players SET coins=4000 WHERE id=?').run(owner);store.db.prepare('INSERT INTO item_shops VALUES (?,?,?)').run(row.run_id,11,'["Firium Z","Leftovers","Sitrus Berry","Charcoal"]');
  }finally{store.close();}
  await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/battle');await page.getByTestId('maintenance-shop').click();
  await page.getByRole('button',{name:'지닌 도구',exact:true}).click();
  await page.locator('[data-held-item="Firium Z"]').click();
  await page.locator('[data-partner="Charizard"]').click();
  await expect.poll(async()=>{const d=await page.request.get('/api/battle').then(r=>r.json());return {coins:d.tower.coins,item:d.tower.run.heldItems.Charizard};}).toEqual({coins:1000,item:'Firium Z'});
  await page.reload();await expect(page.getByTestId('run-maintenance')).toContainText('1,000코인');
});
