import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {raidFixture,finishRaidBattle} from '../tests/raid-fixture';
import {Accounts} from '../src/server/accounts';
import {pokemonName} from '../src/web/catalog';
import {collectionSpecies} from '../src/data/selectable-forms';
import {statKeys} from '../src/data/training';
import {raidRecruitmentTeam} from '../src/server/raid-recruitment';

const branches=[['volcarona','slither-wing','Slither Wing'],['volcarona','iron-moth','Iron Moth'],['kyurem','black','Kyurem-Black'],['kyurem','white','Kyurem-White']] as const;
for(const [boss,route,target] of branches)test(`saved ${target} reward appears in selection, details, confirmation and collection`,async({page,context})=>{
 const owner='raid_form_'+randomBytes(6).toString('hex'),f=raidFixture('.data/e2e.sqlite',owner,boss,route),base=collectionSpecies(target),label=pokemonName(target);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();
  const auth=await new Accounts(f.store.db).register(owner,'raid-password',owner,undefined);
  f.store.chooseEvent(owner,f.run,f.event.id,'challenge');finishRaidBattle(f.store,f.store.currentBattle(owner)!.id);
  const saved=f.store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json;
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:boss==='kyurem'?390:1280,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/battle');
  const recruitment=page.getByRole('dialog',{name:'동료 영입',exact:true});
  await recruitment.getByRole('button',{name:`${label} 영입 선택`,exact:true}).click();
  await page.getByTestId('recruit-menu').getByRole('button',{name:'포켓몬 정보',exact:true}).click();
  const details=page.getByTestId('recruit-candidate-details');await expect(details).toBeVisible();
  await expect(page.getByRole('dialog',{name:`${label} · 영입 후보 정보`,exact:true})).toBeVisible();
  const premium=raidRecruitmentTeam(f.snapshot)[0];
  for(const stat of statKeys){
   const iv=details.locator(`[data-iv-stat="${stat}"] b`);
   await iv.scrollIntoViewIfNeeded();
   await expect(iv).toHaveText('31');await expect(iv).toBeInViewport();
  }
  const points=details.getByRole('region',{name:'후보 육성 포인트'});
  await expect(points).toBeVisible();
  await expect(points.locator('strong')).toHaveText(statKeys.map(stat=>String(premium.evs![stat])));
  if(route==='slither-wing')await page.screenshot({path:'.data/raid-reward-premium-preview.png'});
  await page.keyboard.press('x');
  await page.reload();
  expect(f.store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json).toBe(saved);
  await recruitment.getByRole('button',{name:`${label} 영입 선택`,exact:true}).click();
  await page.getByTestId('recruit-menu').getByRole('button',{name:'동료로 데려가기',exact:true}).click();
  await expect(page.getByTestId('recruit-confirmation')).toHaveCount(0);
  await expect(page.getByRole('log',{name:'영입 결과'})).toContainText(label);await expect(page.getByTestId('reward-modal')).toHaveCount(0);await page.keyboard.press('z');await expect(page.getByTestId('recruit-celebration')).toHaveCount(0);
  await expect.poll(()=>f.store.view(owner).run!.roster).toContain(base);
  expect(f.store.view(owner).run!.partnerForms?.[base]).toBe(target===base?undefined:target);
  expect(f.store.trainingCollection(owner).find(p=>p.species===base)!.profile.forme).toBe(target===base?undefined:target);
  const profile=f.store.trainingCollection(owner).find(p=>p.species===base)!.profile;
  expect(profile.ivs).toEqual(Object.fromEntries(statKeys.map(stat=>[stat,31])));
  expect(profile.evs).toEqual(premium.evs);expect(profile.nature).toBe(premium.nature);
  await page.reload();
  expect(f.store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json).toBe(saved);
  expect(f.store.view(owner).run!.partnerForms?.[base]).toBe(target===base?undefined:target);
 }finally{f.store.close();}
});
