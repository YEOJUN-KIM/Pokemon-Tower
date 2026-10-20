import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {Accounts} from '../src/server/accounts';
import {trackFixture,trackEncounter} from '../tests/villain-track-fixture';
import {finishChallengerBattle} from '../tests/challenger-fixture';
import {VillainCampaigns} from '../src/server/villain-campaigns';
import {grantStoredReward} from '../src/server/inventory-grants';
import {ToolVouchers} from '../src/server/tool-vouchers';
import {mkdirSync} from 'node:fs';
const capture='artifacts/qa/screenshots/villain-tracks';mkdirSync(capture,{recursive:true});
for(const organization of ['rocket','skull'] as const)for(const width of [1280,390])for(const reducedMotion of ['no-preference','reduce'] as const)test(`${organization} completed chain and shared voucher ${width}px ${reducedMotion}`,async({page,context})=>{
 const owner='track_'+randomBytes(8).toString('hex'),f=trackFixture('.data/e2e.sqlite',organization,owner),s=f.store;
 try{
  const auth=await new Accounts(s.db).register(owner,'villain-test-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});await page.emulateMedia({reducedMotion});
  await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
  await page.goto('/battle');
  // General reward finishes before a villain snapshot is created.
  expect(s.db.prepare('SELECT COUNT(*) AS n FROM villain_event_encounters v JOIN run_events e ON e.id=v.event_id WHERE e.run_id=?').get(f.run)!.n).toBe(0);
  s.chooseEvent(owner,f.run,s.view(owner).run!.event!.id,'skip');
  for(const [i,stage] of ['grunt-1','grunt-2','officer','executive','boss'].entries()){
   if(i)trackEncounter(s,f.run,stage==='boss'?75:stage==='executive'?45:stage==='officer'?25:12,i*20+1);
   const event=s.view(owner).run!.event!,snapshot=new VillainCampaigns(s.db).row(event.id)!.snapshot_json;expect(event.villain!.stage).toBe(stage);
   expect(JSON.parse(snapshot).sample.id).toBe((organization==='rocket'?['rocket-grunt','rocket-grunt','named-ariana','named-archer','named-giovanni']:['skull-grunt','skull-grunt','named-guzma','named-faba','named-lusamine'])[i]);
   await page.goto('/battle');
   await expect(page.locator('[data-event-choice]')).toHaveCount(0);
   if(i<2)await expect(page.getByTestId('rocket-ambush-notice')).toBeAttached();
   await expect(page.getByRole('log',{name:'이벤트 안내'})).toHaveAttribute('data-typing','false');await page.locator('[data-event-confirm]').click();
   await expect.poll(()=>s.currentBattle(owner)?.id).toBeTruthy();
   const b=s.currentBattle(owner)!;await page.reload();expect(s.currentBattle(owner)!.opponent_team).toBe(b.opponent_team);expect(new VillainCampaigns(s.db).row(event.id)!.snapshot_json).toBe(snapshot);
   finishChallengerBattle(s,b.id);await page.reload();await expect(page.getByRole('log',{name:'이벤트 결과'})).toHaveAttribute('data-typing','false');await page.locator('[data-event-confirm]').click();await expect(page.getByTestId('reward-modal')).toBeVisible();
   expect(s.view(owner).run!.floor).toBe(b.floor);expect(s.view(owner).run!.candidates).toEqual([]);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`${capture}/${organization}-${stage}-${width}-${reducedMotion}.png`,animations:'disabled'});
   await page.getByRole('button',{name:'받기',exact:true}).click();await expect(page.getByTestId('reward-modal')).toHaveCount(0);
  }
  expect(new VillainCampaigns(s.db).track(f.run)!.completed).toBe(1);
  grantStoredReward(s.db,f.run,{kind:'tool-voucher',rarity:'epic',choices:4,amount:1});
  const id=String(s.db.prepare("SELECT id FROM run_reward_inventory WHERE run_id=? AND json_extract(effect_json,'$.kind')='tool-voucher' ORDER BY rowid DESC LIMIT 1").get(f.run)!.id);
  await page.reload();await page.getByRole('button',{name:'배낭',exact:true}).click();
  const voucher=page.locator(`[data-bag-entry="${id}"]`);await voucher.click();
  const candidates=page.getByTestId('tool-voucher-candidates');await expect(candidates.getByRole('button')).toHaveCount(4);await expect(candidates.locator('img')).toHaveCount(4);await expect.poll(()=>candidates.locator('img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).naturalWidth>0))).toBe(true);const first=new ToolVouchers(s.db,f.run).pending(id)!;
  await page.screenshot({path:`${capture}/${organization}-voucher-${width}-${reducedMotion}.png`,animations:'disabled'});
  await page.reload();await page.getByRole('button',{name:'배낭',exact:true}).click();await page.locator(`[data-bag-entry="${id}"]`).click();
  expect(new ToolVouchers(s.db,f.run).pending(id)).toEqual(first);await candidates.getByRole('button').first().click();
  await page.getByTestId('purchase-item-bag').click();await expect.poll(()=>s.db.prepare('SELECT quantity FROM run_reward_inventory WHERE id=?').get(id)!.quantity).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{s.close();}
});
