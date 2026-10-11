import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam,starters} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {classicCollection} from '../tests/classic-team-fixture';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {selectStarters} from './select-starters';

test('free learned move editing and a consistent archive/battle theme on desktop and mobile',async({page})=>{
  await page.setViewportSize({width:1440,height:1080});await page.goto('/pokedex');
  const palette=await page.locator('.dex-console').evaluate(el=>getComputedStyle(el).backgroundColor);
  await page.getByRole('button',{name:'리자몽 상세 보기'}).click();
  await page.getByRole('button',{name:'기술배치',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'리자몽 기술배치'});await expect(dialog).toBeVisible();
  await dialog.locator('.move-library button').filter({has:page.getByText('회오리불꽃',{exact:true})}).click();
  await page.getByRole('button',{name:'기술배치 저장 · 무료'}).click();
  await expect(dialog.getByRole('status')).toContainText('설정 저장 완료');
  await page.getByRole('checkbox',{name:'해금한 기술만'}).uncheck();
  await page.getByRole('textbox',{name:'기술 이름 검색'}).fill('지진');
  await expect(dialog.locator('.move-library button').filter({hasText:'지진'})).toBeDisabled();
  await page.getByRole('textbox',{name:'기술 이름 검색'}).fill('');
  await page.screenshot({path:'test-results/move-editor-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:'test-results/move-editor-mobile.png'});
  await page.getByRole('button',{name:'리자몽 기술배치 닫기'}).click();
  await expect(page.getByRole('button',{name:'리자몽 상세 보기'})).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'리자몽 파티 메뉴'})).toBeVisible();
  await expect(page.getByRole('button',{name:'이상해꽃 파티 메뉴'})).toHaveCount(0);
  await page.keyboard.press('c');await page.getByRole('button',{name:'능력치 조정',exact:true}).click();await page.keyboard.press('x');
  await expect(page.getByRole('button',{name:'리자몽 상세 보기'})).toHaveAttribute('data-game-cursor','true');
  await page.goto('/battle?prepare=1');await selectStarters(page);
  await page.getByRole('button',{name:'새 도전 시작'}).click();await page.getByRole('button',{name:'이 룰로 도전 시작',exact:true}).click();await page.getByRole('button',{name:'포켓몬 내보내기 · Z',exact:true}).click();
  await expect(page.getByTestId('action-grid').getByRole('button').first()).toBeEnabled();
  expect(await page.locator('.app-shell').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(palette);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/unified-battle-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1080});await page.screenshot({path:'test-results/unified-battle-desktop.png',fullPage:true});
  const state=await page.request.get('/api/battle?view=collection').then(response=>response.json());
  expect(state.training.find((entry:{species:string})=>entry.species==='Charizard').profile.moves[0]).toBe('Fire Spin');expect(state.tower.growthPoints).toBe(0);
});

for(const archiveOnly of [false,true])test(archiveOnly ? 'archive-only collection stores new moves without recruiting and survives reload' : 'capture shows new moves and immediately replaces one run move while retaining the archive loadout',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);classicCollection(store,owner);const id=store.start(owner,starters),row=store.battle(id);
    const rival=defaultProfile('Charizard');rival.moves=['Flamethrower','Air Slash','Earthquake','Dragon Pulse'];
    const team=packTeam(['Charizard','Pikachu','Golem'],{Charizard:rival,Pikachu:defaultProfile('Pikachu'),Golem:defaultProfile('Golem')});
    store.db.prepare('UPDATE battles SET opponent_team=?,seed=? WHERE id=?').run(team,'[1,2,3,4]',id);
    const log=await runBattle({teams:{p1:row.player_team,p2:team},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});expect(log.winner).toBe('Player');
    store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
    await page.goto('/battle');await page.getByRole('button',{name:'영입으로 계속'}).click();
    const candidate=page.getByRole('button',{name:'리자몽 영입 선택',exact:true});await expect(candidate).toContainText('NEW · 새 기술 1개');
    const before=store.view(owner),training=store.trainingCollection(owner);
    await candidate.click();await page.getByRole('button',{name:archiveOnly ? '기술만 저장하고 계속' : '개체값 갱신하고 계속'}).click();
    const dialog=page.getByTestId('recruit-confirmation');await expect(dialog.locator('.collected-moves')).toContainText('지진NEW');
    if(archiveOnly){
      await expect(dialog).toContainText('이번 파티에는 영입하지 않고');await expect(dialog.getByRole('button',{name:'바로 장착',exact:true})).toHaveCount(0);
      await expect(dialog.getByRole('button',{name:'기술 저장하기',exact:true})).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('Enter');
      await expect(page.getByTestId('recruit-celebration')).toContainText('리자몽의 기술을 저장했다!');
      const after=store.view(owner);expect(after.run!.roster).toEqual(before.run!.roster);expect(after.run!.lastIVGain!.species).toBe('Charizard');expect(after.unlocked).toEqual(before.unlocked);
      expect(store.trainingCollection(owner).find(entry=>entry.species==='Charizard')!.profile).toEqual(training.find(entry=>entry.species==='Charizard')!.profile);
      await page.reload();const collection=await page.request.get('/api/battle?view=collection').then(r=>r.json());
      expect(collection.training.find((entry:{species:string})=>entry.species==='Charizard').unlockedMoves).toContain('Earthquake');return;
    }
    await expect(dialog.getByRole('button',{name:'도감에만 저장',exact:true})).toHaveAttribute('aria-pressed','true');
    await dialog.getByRole('button',{name:'바로 장착',exact:true}).click();
    await expect(dialog.getByRole('button',{name:'영입하기',exact:true})).toBeDisabled();
    const newMove=dialog.getByRole('group',{name:'가져올 기술',exact:true}).getByRole('button',{name:/지진/});
    await expect(newMove).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('Enter');
    await expect(dialog.getByRole('group',{name:'가져올 기술',exact:true}).getByRole('button',{name:/화염방사/})).toBeDisabled();
    await dialog.getByRole('group',{name:'교체할 기술',exact:true}).getByRole('button',{name:'4. 베어가르기',exact:true}).click();
    await expect(dialog.getByLabel('기술 교체 비교')).toContainText('베어가르기');await expect(dialog.getByLabel('기술 교체 비교')).toContainText('지진');
    await expect(dialog.getByLabel('기술 교체 비교')).toContainText('위력');
    await expect(dialog.getByRole('button',{name:'영입하기',exact:true})).toHaveAttribute('data-game-cursor','true');
    await page.setViewportSize({width:390,height:844});expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await dialog.getByLabel('기술 교체 비교').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/collect-move.png'});await page.getByRole('button',{name:'영입하기',exact:true}).click();
    await expect(page.getByTestId('recruit-celebration')).toHaveAttribute('data-phase','joined');await expect(page.getByTestId('recruit-celebration')).toContainText('베어가르기 → 지진');
    await page.getByRole('button',{name:'다음 층 준비',exact:true}).click();let previews=0;await page.exposeFunction('reportPreview',()=>previews++);await page.evaluate(()=>{new MutationObserver(()=>{if(document.querySelector('.arena-preview'))(window as unknown as {reportPreview:()=>void}).reportPreview();}).observe(document.body,{subtree:true,childList:true});});await page.getByRole('button',{name:'2층 배틀 시작'}).click();await page.getByRole('button',{name:'포켓몬 내보내기 · Z',exact:true}).click();await expect(page.getByTestId('action-grid')).toBeVisible();await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');expect(previews).toBe(0);
    const active=store.currentBattle(owner)!;expect(Showdown.Teams.unpack(active.player_team)![0].moves[3]).toBe('Earthquake');
    expect(store.trainingCollection(owner).find(entry=>entry.species==='Charizard')!.profile.moves[3]).toBe('Slash');
  }finally{store.close();}
});
