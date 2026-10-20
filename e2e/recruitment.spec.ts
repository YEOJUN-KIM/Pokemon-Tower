import {test,expect,type BrowserContext,type Page} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {classicCollection} from '../tests/classic-team-fixture';
import {packTeam,starters} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

async function victory(context:BrowserContext,full=false){
 const owner='flow_'+randomBytes(8).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 store.ensurePlayer(owner);classicCollection(store,owner);
 store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,'Pikachu');
 const prior={...defaultProfile('Pikachu'),ivs:{hp:20,atk:31,def:30,spa:30,spd:30,spe:12}};
 store.db.prepare('UPDATE pokemon_training SET profile=? WHERE player_id=? AND species=?').run(JSON.stringify(prior),owner,'Pikachu');
 const id=store.start(owner,starters,'basic'),run=store.battle(id).run_id;
 if(full)for(const [slot,name] of ['Arcanine','Gyarados','Snorlax'].entries())store.db.prepare('INSERT INTO members VALUES (?,?,?)').run(run,slot+3,name);
 const candidate={...defaultProfile('Pikachu'),gender:'F' as const,ivs:{hp:28,atk:31,def:20,spa:20,spd:20,spe:27},moves:['Thunderbolt','Surf','Quick Attack','Thunder Wave']};
 store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam(['Pikachu','Golem','Cloyster'],{Pikachu:candidate}),id);
 const row=store.battle(id),log=await runBattle({teams:{p1:row.player_team,p2:row.opponent_team},seed:JSON.parse(row.seed),format:row.format,rule:row.rule,upgrades:JSON.parse(row.upgrades),trainerEquipment:row.trainer_equipment?JSON.parse(row.trainer_equipment):undefined,teraTickets:JSON.parse(row.tera_tickets),player:new DamagePolicy(),opponent:new DamagePolicy()});expect(log.winner).toBe('Player');
 store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:'Player',error:null});
 store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register(owner,'flow-testing-password',owner,undefined);
 await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);return {store,owner,run,id};
}
async function footer(page:Page,context:string){await expect(page.locator('.game-menu-footer')).toHaveCount(1);await expect(page.locator('dialog .game-menu-footer')).toHaveCount(0);await expect(page.locator('[data-menu-context]')).toHaveAttribute('data-menu-context',context);}
const candidate=(page:Page,name='Pikachu')=>page.locator(`[data-recruit-candidate="${name}"]`);

for(const width of [1280,390])test(`victory candidates, context menus, comparisons and immediate archive at ${width}`,async({page,context})=>{
 const f=await victory(context);try{
  await page.setViewportSize({width,height:width===390?740:900});await page.goto('/battle');await expect(page.getByTestId('recruitment')).toBeVisible();await expect(page.getByTestId('result-dialog')).toHaveCount(0);await expect(page.locator('[data-recruit-candidate]')).toHaveCount(3);await footer(page,'recruit-candidates');
  await expect(page.getByRole('log',{name:'승리 보상'})).toContainText('배틀에서 승리했다!');await expect(page.getByRole('log',{name:'승리 보상'})).toContainText('코인을 얻었다.');const coins=f.store.view(f.owner).coins;expect(coins).toBeGreaterThan(0);
  await expect(page.getByTestId('recruitment').locator('.selection-actions')).toHaveCount(0);await expect(candidate(page).locator('[data-recruit-badge=iv-improved]')).toHaveText('개체치 상승!');await expect(candidate(page).locator('[data-recruit-badge=new-move]')).toHaveText('NEW 기술');await expect(candidate(page).locator('[data-recruit-badge=new-pokemon]')).toHaveCount(0);await expect(candidate(page,'Golem').locator('[data-recruit-badge=new-pokemon]')).toHaveText('NEW!');await expect(candidate(page)).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowRight');await expect(candidate(page,'Golem')).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowLeft');await page.keyboard.press('z');
  const menu=page.getByTestId('recruit-menu');await expect(menu).toBeVisible();await footer(page,'recruit-menu');for(const name of ['동료로 데려가기','도감에 넣기','포켓몬 정보','취소'])await expect(menu.getByRole('button',{name,exact:true})).toBeVisible();
  await menu.getByRole('button',{name:'포켓몬 정보',exact:true}).click();await footer(page,'recruit-info');const info=page.getByTestId('recruit-candidate-details');await expect(info.locator('[data-iv-stat=hp]')).toContainText('20 → 28 ↑');await expect(info.locator('[data-iv-stat=spe]')).toContainText('12 → 27 ↑');await expect(info.locator('[data-iv-stat=atk]')).not.toHaveAttribute('data-improved');await expect(info.locator('[data-new-move="Surf"]')).toHaveText('NEW!');await expect(info.locator('[data-pokemon-gender=F]')).toBeVisible();await expect(info.locator('[data-new-pokemon]')).toHaveCount(0);await expect(info.getByRole('img',{name:'종족값 육각형 그래프'})).toBeVisible();await expect(info.locator('[data-radar-iv]')).toHaveCount(0);await expect(info.locator('[data-new-move=Thunderbolt]')).toHaveCount(0);await expect(info.locator('[data-iv-stat=atk] strong')).toHaveText('31');await expect(info.locator('[data-iv-stat=def] strong')).toHaveText('20');await expect(info.locator('[data-iv-stat=hp] [data-improved-value]')).toHaveCSS('color','rgb(235, 146, 146)');await expect(info.locator('[data-iv-stat=hp] strong>span')).not.toHaveCSS('color','rgb(235, 146, 146)');
  if(width===1280){const radar=(await info.locator('.summary-stats').boundingBox())!,ivs=(await info.getByRole('region',{name:'후보 개체값 비교'}).boundingBox())!;expect(ivs.x).toBeGreaterThan(radar.x+radar.width);const body=page.getByRole('dialog',{name:'피카츄 · 영입 후보 정보'}).locator('.game-dialog-body');expect(await body.evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);}await page.screenshot({path:`test-results/recruit-info-${width}.png`});const body=page.getByRole('dialog',{name:'피카츄 · 영입 후보 정보'}).locator('.game-dialog-body'),beforeScroll=await body.evaluate(e=>e.scrollTop);await page.keyboard.press('ArrowDown');if(width===390)expect(await body.evaluate(e=>e.scrollTop)).toBeGreaterThan(beforeScroll);await info.locator('[data-new-move=Surf]').scrollIntoViewIfNeeded();await page.screenshot({path:`test-results/recruit-info-moves-${width}.png`});await info.locator('.summary-move-expanded').last().scrollIntoViewIfNeeded();await expect(info.locator('.summary-move-expanded').last()).toBeInViewport();expect(await info.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.keyboard.press('x');await expect(info).toHaveCount(0);await expect(candidate(page)).toHaveAttribute('data-game-cursor','true');await footer(page,'recruit-candidates');
  await page.keyboard.press('Enter');await menu.getByRole('button',{name:'취소',exact:true}).click();await expect(menu).toHaveCount(0);await page.screenshot({path:`test-results/recruit-candidates-${width}.png`});
  let requests=0;page.on('request',r=>{if(r.method()==='POST'&&r.postDataJSON()?.type==='recruit')requests++;});await candidate(page).click();await menu.getByRole('button',{name:'도감에 넣기',exact:true}).click();await expect(page.getByRole('log',{name:'영입 결과'}).locator('[data-dialogue-text]')).toContainText('피카츄를 도감에 등록했다.');await expect(page.getByTestId('recruit-celebration')).toHaveCount(0);await expect(page.getByTestId('recruit-confirmation')).toHaveCount(0);expect(requests).toBe(1);
  const saved=f.store.view(f.owner);expect(saved.run!.roster).not.toContain('Pikachu');expect(saved.coins).toBe(coins);const training=f.store.trainingCollection(f.owner).find(e=>e.species==='Pikachu')!;expect(training.profile.ivs).toMatchObject({hp:28,atk:31,def:30,spe:27});expect(training.unlockedMoves).toContain('Surf');
  await expect(page.getByRole('log',{name:'영입 결과'})).not.toContainText('새 기술');await expect(page.locator('.battle-messages').getByRole('log',{name:'영입 결과'})).toBeVisible();await expect(page.locator('[data-menu-context] [role=log]')).toHaveCount(0);await expect(page.getByTestId('team-selection')).toHaveCount(0);await expect(page.getByTestId('run-event')).toHaveCount(0);await expect(page.locator('.battle-messages')).not.toContainText('출전할 3마리');await footer(page,'recruit-result');if(width===1280)await page.keyboard.press('Enter');else await page.locator('[data-recruit-continue]').click();await expect(page.locator('.battle-messages')).toContainText('2층에 출전할 3마리를 선택하세요.');await footer(page,'floor-team');await expect(page.getByRole('dialog',{name:'출전 준비'}).getByRole('button',{name:'출전 준비 닫기'})).toHaveCount(0);await page.keyboard.press('x');await page.keyboard.press('Escape');await expect(page.getByTestId('team-selection')).toBeVisible();
  await expect(page.getByTestId('team-selection')).not.toContainText('첫 번째가 선봉');await expect(page.getByTestId('team-selection')).not.toContainText('이번 도전의 보유 멤버');await page.screenshot({path:`test-results/next-floor-${width}.png`});await page.reload();await expect(page.getByTestId('team-selection')).toBeVisible();await page.getByRole('button',{name:'2층 배틀 시작',exact:false}).click();await expect.poll(()=>f.store.currentBattle(f.owner)?.id).not.toBe(f.id);await expect(page.getByRole('log',{name:'영입 결과'})).toHaveCount(0);
 }finally{f.store.close();}
});

test('X opens skip confirmation, preserves candidate cursor on cancel and commits skip once',async({page,context})=>{
 const f=await victory(context);try{await page.goto('/battle');await expect(page.getByTestId('recruitment')).toBeVisible();await page.keyboard.press('ArrowRight');await page.keyboard.press('x');const skip=page.getByTestId('recruit-skip');await expect(skip).toBeVisible();await footer(page,'recruit-skip');await expect(skip.getByRole('button',{name:'취소',exact:true})).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('Enter');await expect(skip).toHaveCount(0);await expect(candidate(page,'Golem')).toHaveAttribute('data-game-cursor','true');expect(f.store.view(f.owner).run!.state).toBe('recruit');await page.keyboard.press('Escape');await skip.getByRole('button',{name:'넘어가기',exact:true}).click();await expect(page.getByTestId('team-selection')).toBeVisible();expect(f.store.db.prepare('SELECT species FROM recruitments WHERE battle_id=?').get(f.id)!.species).toBeNull();}finally{f.store.close();}
});

test('taking a teammate immediately joins; a full roster only asks which teammate to replace',async({page,context})=>{
 const f=await victory(context,true);try{await page.goto('/battle');await candidate(page).click();await page.getByTestId('recruit-menu').getByRole('button',{name:'동료로 데려가기',exact:true}).click();const replacement=page.getByTestId('recruit-replacement-picker');await expect(replacement).toBeVisible();await page.keyboard.press('x');await expect(replacement).toHaveCount(0);await expect(candidate(page)).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('z');await page.keyboard.press('Enter');await replacement.getByRole('button',{name:'리자몽 교체 선택',exact:true}).click();await expect(page.getByRole('log',{name:'영입 결과'}).locator('[data-dialogue-text]')).toContainText('피카츄가 동료로 합류했다!');await expect(page.getByTestId('recruit-celebration')).toHaveCount(0);await expect(page.getByTestId('recruit-confirmation')).toHaveCount(0);const roster=f.store.view(f.owner).run!.roster;expect(roster).toHaveLength(6);expect(roster).toContain('Pikachu');expect(roster).not.toContain('Charizard');expect(f.store.view(f.owner).unlocked).toContain('Charizard');await expect(page.getByTestId('team-selection')).toHaveCount(0);await page.keyboard.press('z');await expect(page.getByTestId('team-selection')).toBeVisible();}finally{f.store.close();}
});

test('taking a teammate with room joins without a second confirmation',async({page,context})=>{
 const f=await victory(context);try{await page.route('**/api/battle',async route=>{if(route.request().method()==='POST'&&route.request().postDataJSON()?.type==='recruit')await new Promise(resolve=>setTimeout(resolve,350));await route.continue();});await page.goto('/battle');await candidate(page).click();await page.keyboard.press('z');await expect(page.getByTestId('recruitment')).toBeVisible();await expect(page.getByRole('log',{name:'영입 결과'}).locator('[data-dialogue-text]')).toContainText('피카츄가 동료로 합류했다!');await expect(page.getByTestId('recruit-celebration')).toHaveCount(0);expect(f.store.view(f.owner).run!.roster).toContain('Pikachu');expect(f.store.db.prepare('SELECT COUNT(*) AS n FROM recruitments WHERE battle_id=?').get(f.id)!.n).toBe(1);await page.locator('[data-recruit-continue]').click();await expect(page.getByTestId('team-selection')).toBeVisible();await page.reload();await expect(page.getByTestId('team-selection')).toBeVisible();expect(f.store.view(f.owner).run!.roster).toContain('Pikachu');}finally{f.store.close();}
});

test('only an unregistered species has a NEW badge beside its name; compact desktop details fit',async({page,context})=>{
 const f=await victory(context);try{await page.setViewportSize({width:1280,height:720});await page.goto('/battle');await candidate(page,'Golem').click();await page.getByTestId('recruit-menu').getByRole('button',{name:'포켓몬 정보',exact:true}).click();const info=page.getByTestId('recruit-candidate-details');await expect(info.locator('[data-new-pokemon]')).toHaveText('NEW!');await expect(info.locator('.summary-hero h2>[data-new-pokemon]')).toHaveText('NEW!');const body=page.getByRole('dialog',{name:'딱구리 · 영입 후보 정보'}).locator('.game-dialog-body');expect(await body.evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);await expect(info.locator('.move-type-badge')).not.toHaveCount(0);await page.screenshot({path:'test-results/recruit-new-desktop.png'});}finally{f.store.close();}
});

test('failed recruitment keeps the existing error UI and has no success result',async({page,context})=>{
 const f=await victory(context);try{await page.route('**/api/battle',async route=>{if(route.request().method()==='POST'&&route.request().postDataJSON()?.type==='recruit')return route.fulfill({status:500,json:{error:'저장 실패 테스트'}});await route.continue();});await page.goto('/battle');await candidate(page).click();await page.getByTestId('recruit-menu').getByRole('button',{name:'도감에 넣기',exact:true}).click();await expect(page.getByTestId('recruitment').getByRole('alert')).toContainText('저장 실패 테스트');await expect(page.getByTestId('recruitment')).toBeVisible();await expect(page.getByRole('log',{name:'영입 결과'})).toHaveCount(0);expect(f.store.view(f.owner).run!.state).toBe('recruit');}finally{f.store.close();}
});

test('final-floor recruitment proceeds to tower clear with the existing result dialogue',async({page,context})=>{
 const f=await victory(context);try{f.store.db.prepare('UPDATE runs SET total_floors=1 WHERE id=?').run(f.run);await page.goto('/battle');await candidate(page).click();await page.getByTestId('recruit-menu').getByRole('button',{name:'동료로 데려가기',exact:true}).click();await expect(page.getByTestId('tower-clear')).toHaveCount(0);await expect(page.getByTestId('recruit-celebration')).toHaveCount(0);await expect(page.getByRole('log',{name:'영입 결과'}).locator('[data-dialogue-text]')).toContainText('피카츄가 동료로 합류했다!');expect(f.store.view(f.owner).run!.state).toBe('cleared');await page.keyboard.press('Enter');await expect(page.getByTestId('tower-clear')).toBeVisible();}finally{f.store.close();}
});

for(const width of [1280,390])test(`preparation reserves six slots in one row without covering messages at ${width}`,async({page,context})=>{
 const f=await victory(context,true);try{
  f.store.recruit(f.owner,f.run,f.id,null,null);
  await page.setViewportSize({width,height:width===390?844:720});await page.goto('/battle');
  const prep=page.getByTestId('team-selection'),dialog=page.getByRole('dialog',{name:'출전 준비',exact:true});await expect(prep).toBeVisible();
  expect(await dialog.evaluate(el=>getComputedStyle(el,'::backdrop').backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  const initial=(await dialog.boundingBox())!,message=(await page.locator('.battle-messages').boundingBox())!;
  expect(initial.y+initial.height).toBeLessThanOrEqual(message.y);
  await expect(prep.locator('h2')).toHaveCount(0);await expect(page.locator('.command-area')).toHaveCount(0);
  await expect(page.locator('.battle-messages [data-dialogue-text]')).toHaveText('2층에 출전할 3마리를 선택하세요.');
  const arena=(await page.locator('.arena').boundingBox())!;expect(Math.abs(message.x-arena.x)).toBeLessThan(2);expect(Math.abs(message.width-arena.width)).toBeLessThan(2);expect(initial.height).toBeLessThanOrEqual(420);
  const action=(await prep.locator('[data-keyboard-next]').boundingBox())!;expect(action.y+action.height).toBeLessThanOrEqual(initial.y+initial.height);
  const grid=prep.locator('.pokemon-selection');
  const verifyRow=async()=>expect(await grid.locator(':scope > *').evaluateAll(nodes=>new Set(nodes.map(node=>Math.round(node.getBoundingClientRect().top))).size)).toBe(1);
  await verifyRow();await expect(grid.locator(':scope > *')).toHaveCount(6);
  for(const count of [5,4,3]){
   f.store.db.prepare('DELETE FROM members WHERE run_id=? AND slot>=?').run(f.run,count);
   await page.reload();await expect(prep.locator('[data-party-species]')).toHaveCount(count);await expect(prep.locator('[data-party-empty]')).toHaveCount(6-count);
   const box=(await dialog.boundingBox())!;expect(box.width).toBe(initial.width);expect(box.height).toBe(initial.height);await verifyRow();
  }
  await page.screenshot({path:`test-results/preparation-six-slots-${width}.png`});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{f.store.close();}
});

for(const width of [1280,390])test(`recruit result is acknowledged before the merchant event at ${width}`,async({page,context})=>{
 const f=await victory(context);try{
  await page.setViewportSize({width,height:width===390?844:900});
  await page.route('**/api/battle',async route=>{
   if(route.request().method()!=='POST'||route.request().postDataJSON()?.type!=='recruit')return route.continue();
   const response=await route.fetch(),data=await response.json();
   f.store.db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status) VALUES (?,?,1,'traveling-merchant','choice')").run(randomBytes(16).toString('hex'),f.run);
   data.tower=f.store.view(f.owner);await route.fulfill({response,json:data});
  });
  await page.goto('/battle');await candidate(page).click();await page.getByTestId('recruit-menu').getByRole('button',{name:'도감에 넣기',exact:true}).click();
  await expect(page.getByRole('log',{name:'영입 결과'}).locator('[data-dialogue-text]')).toHaveText('피카츄를 도감에 등록했다.');
  await expect(page.getByTestId('run-event')).toHaveCount(0);await expect(page.getByTestId('team-selection')).toHaveCount(0);await expect(page.locator('[data-event-target]')).toHaveCount(0);
  await expect(page.locator('.battle-messages')).not.toContainText('알 뽑기권');expect(f.store.view(f.owner).run!.event!.kind).toBe('traveling-merchant');await footer(page,'recruit-result');
  await page.screenshot({path:`test-results/recruit-result-before-event-${width}.png`});
  if(width===1280)await page.keyboard.press('z');else await page.locator('[data-recruit-continue]').click();
  await expect(page.getByTestId('run-event')).toBeVisible();await expect(page.getByRole('log',{name:'영입 결과'})).toHaveCount(0);await expect(page.getByRole('log',{name:'이벤트 안내'})).toContainText('상인');await expect(page.locator('.battle-messages')).not.toContainText('도감에 등록했다');
  await page.screenshot({path:`test-results/event-after-recruit-result-${width}.png`});
 }finally{f.store.close();}
});
