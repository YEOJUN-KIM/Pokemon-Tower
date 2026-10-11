import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {defaultProfile} from '../src/server/training';
import {packTeam,starters} from '../src/data/teams';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {classicCollection} from '../tests/classic-team-fixture';
import {selectStarters} from './select-starters';

test('Shift skips send-out and a move immediately, and the stronger cursor stays on the next action',async({page})=>{
  await page.goto('/battle');await page.keyboard.press('ArrowRight');
  await expect(page.locator('.dex-card[data-game-cursor=true]')).toHaveCSS('outline-width','4px');
  await expect(page.locator('.dex-card[data-game-cursor=true]')).toHaveCSS('outline-color','rgb(255, 227, 108)');
  await selectStarters(page);await page.getByRole('button',{name:'새 도전 시작'}).click();await page.getByRole('button',{name:'이 룰로 도전 시작',exact:true}).click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
  await page.keyboard.press('ShiftLeft');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:1500});
  const before=await page.request.get('/api/battle').then(r=>r.json());await page.keyboard.press('ShiftRight');
  expect((await page.request.get('/api/battle').then(r=>r.json())).battle.requestId).toBe(before.battle.requestId);
  const reply=page.waitForResponse(r=>r.url().endsWith('/api/battle') && r.request().method()==='POST');await page.keyboard.press('Enter');const response=await (await reply).json();
  await expect(page.getByRole('button',{name:'연출 건너뛰기 · Shift',exact:true})).toBeVisible();await page.keyboard.press('ShiftRight');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:1500});
  const active=response.battle.team.find((pokemon:{active:boolean})=>pokemon.active);await expect(page.locator('.player-health .hp-number')).toHaveText(active.condition.includes('fnt') ? '기절' : active.condition.split(' ')[0]);
  await expect(page.locator('.action-grid [data-game-cursor=true]')).toHaveCSS('outline-width','4px');await page.screenshot({path:'test-results/strong-battle-cursor.png'});
});

test('recruitment marks only an owned species with a strictly improved individual stat',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try {
    store.ensurePlayer(owner);classicCollection(store,owner);
    for(const name of ['Pikachu','Golem'])store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,name);
    const old=defaultProfile('Pikachu');old.ivs={hp:10,atk:20,def:20,spa:20,spd:20,spe:20};store.db.prepare('UPDATE pokemon_training SET profile=? WHERE player_id=? AND species=?').run(JSON.stringify(old),owner,'Pikachu');
    const id=store.start(owner,starters),row=store.battle(id),incoming=defaultProfile('Pikachu');incoming.ivs={...old.ivs,hp:20,atk:10};
    const opponent=packTeam(['Pikachu','Golem','Cloyster'],{Pikachu:incoming});store.db.prepare('UPDATE battles SET opponent_team=?,seed=? WHERE id=?').run(opponent,'[1,2,3,4]',id);
    const log=await runBattle({teams:{p1:row.player_team,p2:opponent},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});expect(log.winner).toBe('Player');
    store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
  }finally{store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');await page.getByRole('button',{name:'영입으로 계속'}).click();
  const pikachu=page.getByRole('button',{name:'피카츄 영입 선택',exact:true});await expect(pikachu.locator('.recruit-iv-up')).toHaveText('↑ 개체값 상승 · 1개');await expect(pikachu.locator('.recruit-iv-up')).toHaveAttribute('title','HP 10 → 20');
  await expect(page.getByRole('button',{name:'딱구리 영입 선택',exact:true}).locator('.recruit-iv-up')).toHaveCount(0);await expect(page.getByRole('button',{name:'파르셀 영입 선택',exact:true}).locator('.recruit-iv-up')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/recruit-iv-badges-mobile.png'});
});
