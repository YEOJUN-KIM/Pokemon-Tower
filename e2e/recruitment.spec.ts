import {test,expect,type BrowserContext} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {classicCollection} from '../tests/classic-team-fixture';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam,starters} from '../src/data/teams';
import {floors} from '../src/data/floors';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {dexSearch} from './dex-filters';

test('an unowned archive-only choice appears as owned in the dex without joining this run',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try {
    store.ensurePlayer(owner);const id=store.start(owner,starters),run=store.battle(id).run_id;
    const view={id,status:'complete',requestId:1,turn:1,team:[],opponent:null,actions:[],messages:[],winner:'Player',error:null};
    store.db.prepare("UPDATE battles SET status='complete',opponent_team=?,view=? WHERE id=?").run(packTeam(['Piloswine']),JSON.stringify(view),id);
    store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run);
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
    await page.goto('/battle');await page.getByRole('button',{name:'영입으로 계속'}).click();
    await page.getByRole('button',{name:'메꾸리 영입 선택'}).click();await page.getByRole('button',{name:'기술만 저장하고 계속'}).click();
    await expect(page.getByTestId('recruit-confirmation')).toContainText('포켓몬과 기술·개체값을 도감에 저장');
    await page.getByRole('button',{name:'기술 저장하기',exact:true}).click();
    await expect(page.getByTestId('recruit-celebration')).toBeVisible();
    const saved=store.view(owner);expect(saved.unlocked).toContain('Piloswine');expect(saved.run!.roster).not.toContain('Piloswine');
    await page.goto('/pokedex');await dexSearch(page).fill('메꾸리');
    await page.getByRole('button',{name:'메꾸리 상세 보기',exact:true}).click();
    await expect(page.getByRole('button',{name:'능력치 조정',exact:true})).toBeEnabled();
    await expect(page.getByRole('button',{name:'기술배치',exact:true})).toBeEnabled();
  } finally {store.close();}
});

async function victory(context:BrowserContext,full=false) {
  const token=randomBytes(32).toString('hex');
  const owner=playerKey(token);
  const store=new TowerStore('.data/e2e.sqlite');
  try {
    store.ensurePlayer(owner);classicCollection(store,owner);
    const id=store.start(owner,starters);
    const runId=store.battle(id).run_id;
    if(full)for(const [slot,name] of ['Arcanine','Gyarados','Snorlax'].entries()) {
      store.db.prepare('INSERT INTO members VALUES (?, ?, ?)').run(runId,slot+3,name);
      store.db.prepare('INSERT INTO unlocks VALUES (?, ?)').run(owner,name);
    }
    store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam([...floors[0].opponents]),id);
    const row=store.battle(id);
    const log=await runBattle({teams:{p1:row.player_team,p2:row.opponent_team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
    expect(log.winner).toBe('Player');
    store.db.prepare('UPDATE battles SET seed = ? WHERE id = ?').run('[1,2,3,4]',id);
    store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:'Player',error:null});
  } finally {store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
}

test('confirm, cancel, capture and join preserve one recruitment and show the saved roster',async({page,context})=>{
  await page.setViewportSize({width:1440,height:1100});
  await victory(context);
  let recruits=0;
  page.on('request',request=>{if(request.method()==='POST' && request.postDataJSON()?.type==='recruit')recruits++;});
  await page.goto('/battle');
  await page.getByRole('button',{name:'영입으로 계속'}).click();
  await expect(page.getByRole('dialog',{name:'승리 · 동료 영입'})).toBeVisible();
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await page.getByRole('button',{name:'피카츄 영입 선택'}).click();
  await expect(page.getByRole('button',{name:'영입하고 계속'})).toHaveAttribute('data-game-cursor','true');
  await page.getByRole('button',{name:'영입하고 계속'}).click();
  await expect(page.getByTestId('recruit-confirmation')).toContainText('피카츄를 영입할까요?');
  await expect(page.getByRole('button',{name:'영입하기',exact:true})).toHaveAttribute('data-game-cursor','true');
  await page.getByRole('button',{name:'취소',exact:true}).click();
  expect(recruits).toBe(0);
  await page.getByRole('button',{name:'영입하고 계속'}).click();
  await page.getByRole('button',{name:'영입하기',exact:true}).click();
  const celebration=page.getByTestId('recruit-celebration');
  await expect(celebration).toHaveAttribute('data-phase','capturing');
  const saved=await page.request.get('/api/battle').then(r=>r.json());
  expect(saved.tower.run.state).toBe('select');
  expect(saved.tower.run.roster).toContain('Pikachu');
  await page.screenshot({path:'test-results/recruit-capture-desktop.png',fullPage:true});
  await expect(celebration).toHaveAttribute('data-phase','joined');
  await expect(celebration).toContainText('피카츄가 동료가 되었다!');
  await expect(page.getByRole('group',{name:'영입 후 보유 멤버'}).locator('.new-partner')).toContainText('피카츄');
  expect(recruits).toBe(1);
  await page.screenshot({path:'test-results/recruit-joined-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'다음 층 준비',exact:true}).click();
  await expect(celebration).toHaveCount(0);
  await expect(page.getByRole('button',{name:'2층 배틀 시작'})).toBeVisible();
  await page.reload();
  await expect(celebration).toHaveCount(0);
  expect((await page.request.get('/api/battle').then(r=>r.json())).tower.run.roster).toContain('Pikachu');
});

test('six-member replacement confirms both partners and preserves the permanent collection',async({page,context})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await victory(context,true);
  await page.goto('/battle');
  await page.getByRole('button',{name:'영입으로 계속'}).click();
  await expect(page.getByRole('dialog',{name:'승리 · 동료 영입'})).toBeVisible();
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await page.getByRole('button',{name:'피카츄 영입 선택'}).click();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'교체하고 계속'})).toBeEnabled();
  await expect(page.getByRole('button',{name:'교체하고 계속'})).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('Enter');
  const picker=page.getByRole('dialog',{name:'교체할 포켓몬 선택'});
  await expect(picker).toBeVisible();await expect(picker.locator('[data-replace-species]')).toHaveCount(6);
  await page.keyboard.press('x');await expect(picker).toHaveCount(0);
  expect((await page.request.get('/api/battle').then(r=>r.json())).tower.run.roster).toContain('Charizard');
  await page.keyboard.press('Enter');await expect(picker).toBeVisible();
  await page.getByRole('button',{name:'리자몽 교체 선택',exact:true}).click();
  const confirmation=page.getByTestId('recruit-confirmation');
  await expect(confirmation).toContainText('이 포켓몬과 교체하겠습니까?');
  await page.keyboard.press('x');await expect(confirmation).toHaveCount(0);await expect(picker).toBeVisible();
  await expect(page.getByRole('button',{name:'리자몽 교체 선택',exact:true})).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('Enter');
  await expect(confirmation).toContainText('리자몽');
  await expect(confirmation).toContainText('피카츄');
  await page.screenshot({path:'test-results/recruit-replace-mobile.png',fullPage:true});
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('recruit-celebration')).toHaveAttribute('data-phase','joined');
  const roster=page.getByRole('group',{name:'영입 후 보유 멤버'});
  await expect(roster.locator(':scope > div')).toHaveCount(6);
  await expect(roster).not.toContainText('리자몽');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const saved=await page.request.get('/api/battle').then(r=>r.json());
  expect(saved.tower.run.roster).not.toContain('Charizard');
  expect(saved.tower.unlocked).toContain('Charizard');
  await page.screenshot({path:'test-results/recruit-joined-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'다음 층 준비',exact:true}).click();
});

test('failed recruitment shows no success, retry saves, and reload during capture restores the team',async({page,context})=>{
  await victory(context);
  await page.goto('/battle');
  await page.getByRole('button',{name:'영입으로 계속'}).click();
  await expect(page.getByRole('dialog',{name:'승리 · 동료 영입'})).toBeVisible();
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await page.getByRole('button',{name:'피카츄 영입 선택'}).click();
  await expect(page.getByRole('button',{name:'영입하고 계속'})).toHaveAttribute('data-game-cursor','true');
  await page.route('**/api/battle',async route=>{
    if(route.request().method()==='POST' && route.request().postDataJSON().type==='recruit')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'영입 저장을 다시 시도해 주세요.'})});
    return route.continue();
  });
  await page.getByRole('button',{name:'영입하고 계속'}).click();
  await page.getByRole('button',{name:'영입하기',exact:true}).click();
  await expect(page.locator('.error-banner')).toContainText('영입 저장을 다시 시도');
  await expect(page.getByTestId('recruit-celebration')).toHaveCount(0);
  expect((await page.request.get('/api/battle').then(r=>r.json())).tower.run.state).toBe('recruit');
  await page.unroute('**/api/battle');
  await page.getByRole('button',{name:'영입하고 계속'}).click();
  await page.getByRole('button',{name:'영입하기',exact:true}).click();
  await expect(page.getByTestId('recruit-celebration')).toHaveAttribute('data-phase','capturing');
  await page.reload();
  await expect(page.getByTestId('recruit-celebration')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'피카츄 선택',exact:true})).toBeVisible();
});
