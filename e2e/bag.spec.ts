import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {defaultProfile} from '../src/server/training';
import {Accounts} from '../src/server/accounts';
import {hiddenShopFixture} from '../tests/hidden-shop-fixture';
import {grantRunItem,grantStoredReward,grantEquipment} from '../src/server/inventory-grants';
for(const width of [1280,390])test(`party target cards at ${width}: distinct TM eligibility and current held item`,async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner=`targets-${suffix}`,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register(`targets_${suffix}`,'bag-test-password',owner,undefined);
  grantStoredReward(f.store.db,f.run,{kind:'machine',move:'Earthquake',amount:1});grantRunItem(f.store.db,f.run,'Life Orb',1);grantRunItem(f.store.db,f.run,'Focus Sash',1);grantRunItem(f.store.db,f.run,'Charizardite X',1);
  const machine=f.store.view(owner).run!.bag!.entries.find(e=>e.move==='Earthquake')!;
  f.store.useBag(owner,f.run,randomBytes(16).toString('hex'),machine.id,'Blastoise',0);f.store.useBag(owner,f.run,randomBytes(16).toString('hex'),'held:Life Orb','Blastoise');
  f.store.db.prepare('INSERT INTO members VALUES (?,?,?)').run(f.run,3,'Urshifu');
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  await page.getByRole('button',{name:'배낭',exact:true}).click();const bag=page.getByTestId('bag');await bag.locator('[data-bag-entry="held:Focus Sash"]').click();
  const blastoise=bag.locator('[data-bag-target=Blastoise]'),charizard=bag.locator('[data-bag-target=Charizard]');
  await expect(blastoise.locator('[data-target-status]')).toContainText('생명의구슬');await expect(blastoise.locator('[data-target-status] img')).toBeVisible();await expect(charizard.locator('[data-target-status]')).toBeEmpty();await expect(charizard).toContainText('Lv.');await expect(charizard.locator('img')).toBeVisible();
  mkdirSync('artifacts/qa/screenshots/bag',{recursive:true});await page.screenshot({path:`artifacts/qa/screenshots/bag/targets-held-${width}.png`});
  await bag.getByRole('button',{name:'취소',exact:true}).click();await bag.getByRole('button',{name:'기술머신',exact:true}).click();await expect(bag.getByRole('button',{name:'사용',exact:true})).toHaveCount(0);await bag.locator('[data-bag-entry]').first().click();
  await expect(charizard).toBeEnabled();await expect(charizard.locator('[data-target-status]')).toHaveText('배울 수 있음');await expect(blastoise).toBeDisabled();await expect(blastoise.locator('[data-target-status]')).toHaveText('이미 배우고 있음');const urshifu=bag.locator('[data-bag-target=Urshifu]');await expect(urshifu).toBeDisabled();await expect(urshifu.locator('[data-target-status]')).toHaveText('배울 수 없음');await expect(bag).not.toContainText('배울 수 없음 / 이미 배치 중');
  await page.screenshot({path:`artifacts/qa/screenshots/bag/targets-machine-${width}.png`});expect(await bag.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await bag.getByRole('button',{name:'취소',exact:true}).click();await bag.getByRole('button',{name:'도구',exact:true}).click();await bag.locator('[data-bag-entry="held:Charizardite X"]').click();
  await expect(charizard).toBeEnabled();await expect(charizard.locator('[data-target-portrait]')).toHaveCSS('filter','none');await expect(blastoise).toBeDisabled();await expect(blastoise.locator('[data-target-status]')).toHaveText('장착 불가');await expect(blastoise).toHaveCSS('opacity','0.65');await expect(blastoise.locator('[data-target-portrait]')).toHaveCSS('filter','grayscale(1)');
  await expect(charizard).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowDown');await expect(blastoise).not.toHaveAttribute('data-game-cursor','true');await expect(urshifu).toBeDisabled();
  await page.screenshot({path:`artifacts/qa/screenshots/bag/targets-exclusive-${width}.png`});

 }finally{f.store.close();}
});
for(const width of [1280,390])test(`common Bag at ${width}: hidden shop snapshot, pockets, equip/move, vitamin, reusable TM and return`,async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner=`bag-${suffix}`,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register(`bag_${suffix}`,'bag-test-password',owner,undefined);
  f.pin(['vitamin-atk','item-Life Orb','machine-Calm Mind','egg-ticket-5','equipment-Tera Orb']);grantRunItem(f.store.db,f.run,'Focus Sash',1);grantRunItem(f.store.db,f.run,'Charizardite X',1);grantRunItem(f.store.db,f.run,'Firium Z',1);grantStoredReward(f.store.db,f.run,{kind:'vitamin',stat:'atk',amount:3});grantStoredReward(f.store.db,f.run,{kind:'machine',move:'Earthquake',amount:1});grantEquipment(f.store.db,f.run,'Dynamax Band');f.store.db.prepare('INSERT INTO run_battle_items VALUES (?,?,2)').run(f.run,'attack');
  const raw=f.store.db.prepare('SELECT snapshot_json FROM hidden_shop_events WHERE event_id=?').get(f.eventId)!.snapshot_json;
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  const shop=page.getByTestId('hidden-shop');await expect(shop).toBeVisible();await page.getByRole('button',{name:'배낭',exact:true}).click();const bag=page.getByTestId('bag');await expect(bag).toBeVisible();
  for(const label of ['도구','소모품','기술머신','배틀 소모품','중요한 도구','Z크리스탈'])await expect(bag.getByRole('button',{name:label,exact:true})).toBeVisible();
  const frame=page.getByRole('dialog',{name:'배낭 · 이번 도전',exact:true}),initialFrame=(await frame.boundingBox())!;
  const detail=bag.getByRole('complementary',{name:'배낭 아이템 상세'}),list=bag.locator('[data-keyboard-list]').first();
  if(width===1280)expect((await list.boundingBox())!.width).toBeLessThan((await detail.boundingBox())!.width);
  const description=detail.locator('p').first(),originalDescription=await description.textContent();
  await description.evaluate(el=>el.textContent='길이가 긴 아이템 설명과 배울 수 있는 포켓몬 안내입니다. '.repeat(100));
  const longFrame=(await frame.boundingBox())!;expect(longFrame).toEqual(initialFrame);
  expect(await detail.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  expect(await frame.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
  await description.evaluate((el,text)=>el.textContent=text,originalDescription);
  await bag.locator('[data-bag-entry="held:Focus Sash"]').click();await bag.locator('[data-bag-target=Charizard]').click();await expect(bag.locator('[data-bag-entry="held:Focus Sash"]')).toContainText('리자몽');
  await bag.locator('[data-bag-entry="held:Focus Sash"]').click();await bag.locator('[data-bag-target=Blastoise]').click();await expect(bag.locator('[data-bag-entry="held:Focus Sash"]')).toContainText('거북왕');expect(f.store.view(owner).run!.heldItems!.Charizard).toBeUndefined();
  await bag.getByRole('button',{name:'소모품',exact:true}).click();await expect(bag.locator('[data-bag-entry]')).toContainText('×3');await bag.getByRole('button',{name:'사용',exact:true}).click();await bag.locator('[data-bag-target=Charizard]').click();await expect(bag.locator('[data-bag-entry]')).toContainText('×2');
  await bag.getByRole('button',{name:'기술머신',exact:true}).click();await expect(bag.locator('[data-bag-entry]')).toHaveText('지진');expect(await frame.boundingBox()).toEqual(initialFrame);await expect(detail).toContainText('위력');await expect(detail).toContainText('100%');await expect(detail).toContainText('PP');await expect(detail.locator('[data-type=Ground]')).toBeVisible();await expect(detail.getByRole('img',{name:'물리',exact:true})).toBeVisible();await expect(detail.getByRole('button',{name:'사용',exact:true})).toHaveCount(0);await bag.locator('[data-bag-entry]').first().click();await bag.locator('[data-bag-target=Blastoise]').click();await bag.locator('[data-learning-slot="0"]').click();await expect(bag.locator('[data-bag-entry]')).toHaveText('지진');expect(f.store.view(owner).run!.bag!.currentMoves.Blastoise[0]).toBe('Earthquake');
  await bag.locator('[data-bag-entry]').first().click();await bag.locator('[data-bag-target=Venusaur]').click();await bag.locator('[data-learning-slot="0"]').click();await expect.poll(()=>f.store.view(owner).run!.bag!.currentMoves.Venusaur[0]).toBe('Earthquake');
  await bag.getByRole('button',{name:'배틀 소모품',exact:true}).click();await expect(bag).toContainText('플러스파워 ×2');await expect(bag).toContainText('전투 중 사용할 수 있습니다.');
  await bag.getByRole('button',{name:'중요한 도구',exact:true}).click();await expect(bag).toContainText('다이맥스밴드');await bag.getByRole('button',{name:'Z크리스탈',exact:true}).click();await expect(bag).toContainText('불꽃Z');
  await page.getByRole('button',{name:'배낭 · 이번 도전 닫기',exact:true}).click();await expect(bag).toHaveCount(0);expect(f.store.db.prepare('SELECT snapshot_json FROM hidden_shop_events WHERE event_id=?').get(f.eventId)!.snapshot_json).toBe(raw);await expect(shop).toContainText('구매 0 / 2');
  mkdirSync('artifacts/qa/screenshots/bag',{recursive:true});await page.screenshot({path:`artifacts/qa/screenshots/bag/hidden-shop-${width}.png`});
  await page.reload();await expect(shop).toBeVisible();await page.getByRole('button',{name:'배낭',exact:true}).click();await bag.getByRole('button',{name:'기술머신',exact:true}).click();await expect(bag.locator('[data-bag-entry]')).toHaveText('지진');await expect(detail.locator('[data-tm-type=Ground] img')).toBeVisible();await expect.poll(()=>detail.locator('[data-tm-type=Ground] img').evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(256);await page.screenshot({path:`artifacts/qa/screenshots/bag/bag-${width}.png`});
 }finally{f.store.close();}
});

test('Bag keyboard uses shared cursor: B, pockets including empty, Z target, X cancel and return',async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner='bag-keys-'+suffix,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register('bk_'+suffix,'bag-test-password',owner,undefined);grantRunItem(f.store.db,f.run,'Focus Sash',1);await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');await expect(page.getByTestId('hidden-shop')).toBeVisible();
  await page.keyboard.press('b');const bag=page.getByTestId('bag');await expect(bag).toBeVisible();await page.keyboard.press('ArrowRight');await expect(bag.getByRole('button',{name:'소모품',exact:true})).toHaveAttribute('aria-pressed','true');await expect(bag).toContainText('이 Pocket은 비어 있습니다.');await page.keyboard.press('ArrowLeft');await expect(bag.getByRole('button',{name:'도구',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('z');await expect(bag.locator('[data-bag-target=Charizard]')).toBeVisible();await page.keyboard.press('x');await expect(bag.locator('[data-bag-entry="held:Focus Sash"]')).toBeVisible();expect(f.store.view(owner).run!.heldItems!.Charizard).toBeUndefined();await page.keyboard.press('z');await expect(bag.locator('[data-bag-target=Charizard]')).toBeVisible();await page.keyboard.press('Enter');await expect(bag.locator('[data-bag-entry="held:Focus Sash"]')).toContainText('리자몽');
  await bag.getByRole('button',{name:'해제',exact:true}).click();await expect(bag.locator('[data-bag-entry="held:Focus Sash"]')).not.toContainText('리자몽');await bag.locator('[data-bag-entry="held:Focus Sash"]').click();await bag.locator('[data-bag-target=Charizard]').click();await expect(bag.locator('[data-bag-entry="held:Focus Sash"]')).toContainText('리자몽');await page.keyboard.press('x');await expect(bag).toHaveCount(0);await expect(page.getByTestId('hidden-shop')).toContainText('구매 0 / 2');
 }finally{f.store.close();}
});

test('maintenance menu Bag preserves shop rolls; preparation preserves selected team',async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner='bag-shop-'+suffix,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  f.store.chooseEvent(owner,f.run,f.eventId,'leave');f.store.db.prepare('UPDATE runs SET floor=11 WHERE id=?').run(f.run);grantRunItem(f.store.db,f.run,'Focus Sash',1);f.store.db.prepare('INSERT OR REPLACE INTO item_shops VALUES (?,?,?)').run(f.run,11,JSON.stringify(['Life Orb','Leftovers','Charizardite X','Dynamax Band']));f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register('bn_'+suffix,'bag-test-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');await page.getByTestId('maintenance-shop').click();const shop=page.getByTestId('tower-shop');await shop.locator('[data-held-item="Life Orb"]').click();let acquisition=page.getByTestId('item-acquisition');await acquisition.getByRole('button',{name:'취소',exact:true}).click();expect(f.store.view(owner).coins).toBe(50000);
  await shop.locator('[data-held-item="Life Orb"]').click();await acquisition.getByRole('button',{name:'바로 장착',exact:true}).click();await acquisition.locator('[data-partner=Blastoise]').click();await expect(acquisition).toHaveCount(0);expect(f.store.view(owner).run!.heldItems!.Blastoise).toBe('Life Orb');
  await shop.getByRole('button',{name:'기술머신',exact:true}).click();const machine=f.store.view(owner).run!.machineShop!.offers[0];await shop.locator('[data-machine="'+machine.move+'"]').click();await expect.poll(()=>f.store.view(owner).run!.bag!.entries.some(e=>e.move===machine.move)).toBe(true);await expect(page.getByTestId('machine-confirmation')).toHaveCount(0);
  await expect(shop.getByTestId('shop-reroll')).toHaveText('리롤');await expect(shop).not.toContainText('배낭에 등록 · 이번 Run 동안 반복 사용');await shop.getByTestId('shop-reroll').click();await expect.poll(()=>f.store.view(owner).run!.machineShop!.offers.every(o=>o.move!==machine.move)).toBe(true);const before=f.store.view(owner).run!;expect(before.machineShop!.offers.every(o=>o.move!==machine.move)).toBe(true);await expect(shop.locator('.shop-heading-actions [data-open-bag]')).toHaveCount(0);await page.getByRole('button',{name:'정비 상점 닫기',exact:true}).click();await page.getByTestId('run-maintenance').getByRole('button',{name:'배낭',exact:true}).click();const bag=page.getByTestId('bag');await bag.locator('[data-bag-entry="held:Focus Sash"]').click();await bag.locator('[data-bag-target=Blastoise]').click();await expect(bag.locator('[data-bag-entry="held:Focus Sash"]')).toContainText('거북왕');await page.getByRole('button',{name:'배낭 · 이번 도전 닫기',exact:true}).click();await expect(bag).toHaveCount(0);expect(f.store.view(owner).run!.itemBag!['Life Orb']).toBe(1);expect(f.store.view(owner).run!.shopRerolls).toEqual(before.shopRerolls);expect(f.store.view(owner).run!.machineShop!.offers).toEqual(before.machineShop!.offers);
  await page.getByTestId('maintenance-adjust').click();await page.locator('[data-adjust-partner=Charizard]').click();await expect(page.getByTestId('pokemon-settings')).toBeVisible();await expect(page.getByTestId('pokemon-settings').locator('[data-settings-row=form]')).toHaveCount(0);await page.keyboard.press('Escape');await expect(page.locator('[data-adjust-partner=Charizard]')).toHaveAttribute('data-game-cursor','true');await page.getByRole('button',{name:'포켓몬 조정 닫기',exact:true}).click();await page.getByRole('button',{name:'출전 팀 선택 →',exact:true}).click();const prep=page.getByTestId('team-selection');await prep.locator('.pokemon-choice').first().click();const picked=await prep.locator('.pokemon-choice[aria-pressed=true]').count();await prep.getByRole('button',{name:'배낭',exact:true}).click();await page.getByRole('button',{name:'배낭 · 이번 도전 닫기',exact:true}).click();expect(await prep.locator('.pokemon-choice[aria-pressed=true]').count()).toBe(picked);
 }finally{f.store.close();}
});

for(const width of [1280,390])test(`Bag TM artwork, party chips and explicit list activation at ${width}`,async({page,context})=>{
 const suffix=randomBytes(7).toString('hex'),owner=`bag-art-${suffix}`,f=hiddenShopFixture('.data/e2e.sqlite',owner);
 try{
  grantRunItem(f.store.db,f.run,'Focus Sash',1);
  for(const move of ['Earthquake','Flamethrower','Ice Beam'])grantStoredReward(f.store.db,f.run,{kind:'machine',move,amount:1});
  for(const [i,name] of ['Garchomp','Tyranitar','Kyurem'].entries())f.store.db.prepare('INSERT INTO members VALUES (?,?,?)').run(f.run,i+3,name);
  const profiles=JSON.parse(f.store.db.prepare('SELECT profiles FROM runs WHERE id=?').get(f.run)!.profiles as string);
  profiles.Kyurem=defaultProfile('Kyurem','Kyurem-Black');
  f.store.db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),f.run);
  f.store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(f.store.db).register(`art_${suffix}`,'bag-test-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);
  // Exercise the missing-art fallback while Fire uses the supplied PNG.
  await page.route('**/assets/items/tm/ground.png',route=>route.fulfill({status:404,body:''}));
  await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');await page.getByRole('button',{name:'배낭',exact:true}).click();
  const bag=page.getByTestId('bag'),detail=bag.getByRole('complementary',{name:'배낭 아이템 상세'}),frame=page.getByRole('dialog',{name:'배낭 · 이번 도전',exact:true}),initial=(await frame.boundingBox())!;
  const equip=bag.locator('[data-bag-entry="held:Focus Sash"]');await equip.focus();await equip.hover();await expect(detail).toContainText('기합의띠');await expect(bag.getByRole('button',{name:'지니게 하기',exact:true})).toHaveCount(0);await expect(bag.locator('[data-bag-target]')).toHaveCount(0);
  await equip.click();await bag.locator('[data-bag-target=Charizard]').click();await expect(detail.getByRole('button',{name:'해제',exact:true})).toBeVisible();await detail.getByRole('button',{name:'해제',exact:true}).click();await expect(detail.getByRole('button',{name:'해제',exact:true})).toHaveCount(0);
  await bag.getByRole('button',{name:'기술머신',exact:true}).click();const ground=bag.locator('[data-bag-entry]').filter({hasText:'지진'}),fire=bag.locator('[data-bag-entry]').filter({hasText:'화염방사'});
  await ground.focus();await ground.hover();await expect(bag.locator('[data-bag-target]')).toHaveCount(0);
  await expect(ground.locator('img')).toHaveAttribute('src','/assets/items/tm/ground.png');await expect(ground.locator('[data-tm-type]')).toHaveCSS('width','28px');expect((await ground.boundingBox())!.height).toBeLessThanOrEqual(48);
  await expect(detail.locator('[data-tm-type=Ground] img')).toHaveAttribute('src','/assets/items/tm/ground.png');await expect(detail.locator('[data-tm-type=Ground]')).toHaveAttribute('data-missing','true');await expect(detail.locator('[data-tm-type=Ground] svg')).toBeVisible();
  await expect(detail.locator('.move-type-badge')).toContainText('땅');await expect(detail.getByRole('img',{name:'물리',exact:true})).toBeVisible();for(const text of ['위력','100','명중률','100%','PP','10'])await expect(detail).toContainText(text);
  const chips=detail.getByRole('region',{name:'배울 수 있는 포켓몬'});await expect(chips.getByRole('listitem')).toHaveCount(f.store.view(owner).run!.bag!.entries.find(e=>e.move==='Earthquake')!.targets.length);await expect(chips.locator('li img')).toHaveCount(f.store.view(owner).run!.bag!.entries.find(e=>e.move==='Earthquake')!.targets.length);
  await expect.poll(()=>chips.locator('li').evaluateAll(nodes=>nodes.every(el=>el.scrollWidth<=el.clientWidth))).toBe(true);
  if(width===390)expect(new Set(await chips.locator('li').evaluateAll(nodes=>nodes.map(el=>Math.round(el.getBoundingClientRect().top)))).size).toBeGreaterThan(1);
  expect(await frame.boundingBox()).toEqual(initial);expect(await bag.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);expect(await detail.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await chips.scrollIntoViewIfNeeded();mkdirSync('artifacts/qa/screenshots/bag',{recursive:true});await page.screenshot({path:`artifacts/qa/screenshots/bag/chips-${width}.png`});
  const ice=bag.locator('[data-bag-entry]').filter({hasText:'냉동빔'});await ice.focus();await ice.hover();await expect(chips).toContainText('블랙큐레무');await expect(chips.getByRole('img',{name:'블랙큐레무',exact:true})).toBeVisible();
  await fire.focus();await fire.hover();await expect(detail.locator('[data-tm-type=Fire] img')).toBeVisible();await expect(detail.locator('[data-tm-type=Fire] img')).toHaveAttribute('src','/assets/items/tm/fire.png');await expect.poll(()=>detail.locator('[data-tm-type=Fire] img').evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(256);await expect(detail.locator('.move-type-badge')).toContainText('불꽃');await expect(detail.getByRole('img',{name:'특수',exact:true})).toBeVisible();
  await page.keyboard.press('Enter');await expect(bag.locator('[data-bag-target=Charizard]')).toBeVisible();await page.keyboard.press('x');await ground.click();await expect(bag.locator('[data-bag-target=Charizard]')).toBeVisible();
 }finally{f.store.close();}
});
