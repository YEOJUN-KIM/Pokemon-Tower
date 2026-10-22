import {test,expect} from '@playwright/test';
import {starterBonusMoves} from '../src/data/starter-moves';
import {initialPartners} from '../src/data/teams';
import {moveLearnsets} from '../src/server/move-learnsets';
import {selectStarters} from './select-starters';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';

test('new player can select starter bonus moves, save, reload and use them in battle',async({page,context})=>{
  const store=new TowerStore('.data/e2e.sqlite');
  try {
    const owner='starter-'+randomBytes(12).toString('hex');
    store.ensurePlayer(owner);
    const account=await new Accounts(store.db).register('starter_'+randomBytes(6).toString('hex'),randomBytes(16).toString('hex'),owner,undefined);
    await context.addCookies([{name:'tower_auth',value:account.token,url:'http://127.0.0.1:3001'}]);
  } finally {store.close();}
  await page.goto('/pokedex');
  await page.getByRole('button',{name:'알고 있어요 / 건너뛰기',exact:true}).click();
  await expect(page.getByTestId('dex-progress')).toContainText('27 /');
  const initial=await (await page.request.get('/api/battle?view=collection')).json();
  expect(initial.tower.run).toBeNull();
  expect(initial.tower.coins).toBe(0);
  expect(initial.tower.growthPoints).toBe(0);
  expect(initial.training.map((p:{species:string})=>p.species).sort()).toEqual([...initialPartners].sort());
  for(const entry of initial.training) {
    expect(entry.profile.moves).toEqual(starterBonusMoves[entry.species]);
    expect(new Set(entry.unlockedMoves).size).toBe(entry.unlockedMoves.length);
    expect(entry.unlockedMoves).toEqual(expect.arrayContaining([...moveLearnsets[entry.species].selfMoves,...starterBonusMoves[entry.species]]));
  }
  await page.getByRole('searchbox',{name:'이름 검색'}).fill('이상해꽃');
  await page.getByRole('button',{name:'이상해꽃 상세 보기',exact:true}).click();
  await page.getByRole('button',{name:'포켓몬 설정',exact:true}).click();
  await page.locator('[data-settings-row="move-0"]').click();
  await expect(page.locator('[data-move="Earth Power"]')).toBeEnabled();
  await expect(page.locator('[data-move="Giga Drain"]')).toBeEnabled();
  await expect(page.locator('[data-move="Tackle"]')).toBeEnabled();
  await page.locator('[data-move="Earth Power"]').click();
  await page.locator('[data-settings-save]').click();
  await expect(page.getByTestId('pokemon-settings').getByRole('status')).toHaveText('설정 저장 완료');
  await page.reload();
  const saved=await (await page.request.get('/api/battle?view=collection')).json();
  expect(saved.training.find((p:{species:string})=>p.species==='Venusaur').profile.moves[0]).toBe('Earth Power');
  expect(saved.tower.growthPoints).toBe(0);
  await page.getByRole('searchbox',{name:'이름 검색'}).fill('');
  await selectStarters(page);
  await page.goto('/battle');
  // Lead with Venusaur so the bonus is visible in the first real battle request.
  const response=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'start',selected:['Venusaur','Charizard','Blastoise'],rule:'basic'}});
  expect(response.ok()).toBe(true);
  await page.reload();
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  await expect(page.getByRole('button',{name:/대지의힘/}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:/대지의힘/}).first()).toBeEnabled();
  const battle=await (await page.request.get('/api/battle')).json();
  expect(battle.battle.actions.some((a:{command:string})=>a.command==='move 1')).toBe(true);
  await page.screenshot({path:'test-results/starter-bonus-battle.png'});
});

test('starter enters its first battle with recommended moves without opening settings',async({page,context})=>{
  const store=new TowerStore('.data/e2e.sqlite');
  const owner='default-starter-'+randomBytes(10).toString('hex');
  try {
    store.ensurePlayer(owner);
    const account=await new Accounts(store.db).register('ready_'+randomBytes(6).toString('hex'),randomBytes(16).toString('hex'),owner,undefined);
    await context.addCookies([{name:'tower_auth',value:account.token,url:'http://127.0.0.1:3001'}]);
    await page.goto('/');await page.getByRole('button',{name:'알고 있어요 / 건너뛰기',exact:true}).click();
    const response=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'start',selected:['Venusaur','Charizard','Blastoise'],rule:'basic'}});
    expect(response.ok()).toBe(true);
    await page.goto('/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();
    for(const name of ['기가드레인','오물폭탄','대지의힘','수면가루'])await expect(page.getByRole('button',{name:new RegExp(name)})).toBeEnabled();
    expect((store.db.prepare('SELECT COUNT(*) n FROM pokemon_training WHERE player_id=?').get(owner) as {n:number}).n).toBe(0);
    await page.screenshot({path:'test-results/starter-default-loadout.png'});
  }finally{store.close();}
});
