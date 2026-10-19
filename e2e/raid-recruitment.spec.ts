import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {raidFixture,finishRaidBattle} from '../tests/raid-fixture';
import {Accounts} from '../src/server/accounts';
import {pokemonName} from '../src/web/catalog';
import {collectionSpecies} from '../src/data/selectable-forms';

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
  await page.getByRole('button',{name:'영입으로 계속'}).click();
  const recruitment=page.getByRole('dialog',{name:'승리 · 동료 영입',exact:true});
  await recruitment.getByRole('button',{name:`${label} 영입 선택`,exact:true}).click();
  await recruitment.locator('[data-recruit-details]').click();
  const details=page.getByTestId('recruit-candidate-details');await expect(details).toBeVisible();
  await expect(page.getByRole('dialog',{name:`${label} · 영입 후보 정보`,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'돌아가기',exact:true}).click();
  await recruitment.getByRole('button',{name:/동료로 데려가기/}).click();
  const confirmation=page.getByTestId('recruit-confirmation');await expect(confirmation).toContainText(label);
  await confirmation.getByRole('button',{name:'동료로 데려가기',exact:true}).click();
  await expect(page.getByTestId('recruit-celebration')).toContainText(label);
  await expect.poll(()=>f.store.view(owner).run!.roster).toContain(base);
  expect(f.store.view(owner).run!.partnerForms?.[base]).toBe(target===base?undefined:target);
  expect(f.store.trainingCollection(owner).find(p=>p.species===base)!.profile.forme).toBe(target===base?undefined:target);
  await page.reload();
  expect(f.store.db.prepare('SELECT snapshot_json FROM raid_encounters WHERE event_id=?').get(f.event.id)!.snapshot_json).toBe(saved);
  expect(f.store.view(owner).run!.partnerForms?.[base]).toBe(target===base?undefined:target);
 }finally{f.store.close();}
});
