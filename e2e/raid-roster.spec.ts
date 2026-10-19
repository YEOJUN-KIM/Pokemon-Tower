import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {raidFixture} from '../tests/raid-fixture';
import {Accounts} from '../src/server/accounts';
import {packPlayerTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {pokemonName} from '../src/data/pokemon-catalog';

for(const width of [1280,390])for(const bossId of ['snorlax','terapagos','ogerpon','arceus'])test(`${bossId} registered phases render and reload at ${width}`,async({page,context})=>{
 const owner='roster_'+randomBytes(7).toString('hex'),fixture=raidFixture('.data/e2e.sqlite',owner,bossId);
 try{
  fixture.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
  const auth=await new Accounts(fixture.store.db).register(owner,'raid-roster-password',owner,undefined);
  fixture.store.db.prepare("UPDATE members SET species='Cloyster' WHERE run_id=? AND slot=0").run(fixture.run);
  fixture.store.chooseEvent(owner,fixture.run,fixture.event.id,'challenge');const id=fixture.store.currentBattle(owner)!.id;
  // Existing QA build: accelerate technical phase coverage, never production tuning.
  const profile=defaultProfile('Cloyster');profile.moves=['Icicle Spear','Rock Blast','Liquidation','Ice Shard'];profile.ability='Skill Link';profile.nature='Adamant';profile.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};profile.evs={hp:2,atk:32,def:0,spa:0,spd:0,spe:32};profile.runBonuses={hp:100,atk:100,def:100,spa:100,spd:100,spe:100};
  fixture.store.db.prepare('UPDATE battles SET player_team=?,seed=? WHERE id=?').run(packPlayerTeam(['Cloyster','Blastoise','Venusaur'],{Cloyster:profile}),'[1,2,3,4]',id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
  await page.goto('/battle');const final=fixture.snapshot.phases.at(-1)!,name=pokemonName(final.species);
  for(let turn=0;turn<12;turn++){
   await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
   if(await page.locator('.enemy-position img').getAttribute('alt')===name)break;
   await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
   await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:30000});
  }
  await expect(page.locator('.enemy-position img')).toHaveAttribute('alt',name);
  await expect.poll(()=>page.locator('.enemy-position img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  if(bossId==='snorlax')await expect(page.locator('.enemy-position [data-dynamax="true"]')).toHaveCount(1);
  if(bossId==='terapagos')await expect(page.locator('.enemy-position [data-tera="Stellar"]')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const raw=fixture.store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(fixture.event.id)!.snapshot_json;
  mkdirSync('artifacts/qa/screenshots/raid-roster',{recursive:true});await page.screenshot({path:`artifacts/qa/screenshots/raid-roster/${bossId}-${width}.png`});
  await page.reload();await expect(page.locator('.enemy-position img')).toHaveAttribute('alt',name);
  if(bossId==='snorlax')await expect(page.locator('.enemy-position [data-dynamax="true"]')).toHaveCount(1);
  if(bossId==='terapagos')await expect(page.locator('.enemy-position [data-tera="Stellar"]')).toHaveCount(1);
  expect(fixture.store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(fixture.event.id)!.snapshot_json).toBe(raw);
 }finally{fixture.store.close();}
});
