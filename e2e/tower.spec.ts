import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam} from '../src/data/teams';
import {floors} from '../src/data/floors';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {classicCollection} from '../tests/classic-team-fixture';

test('a real tenth-floor result recruits/skips into ten-floor clear and saves after reload',async ({page,context}) => {
  const token = randomBytes(32).toString('hex');
  const owner = playerKey(token);
  const store = new TowerStore('.data/e2e.sqlite');
  const team = ['Garchomp','Metagross','Dragonite'];
  try {
    store.ensurePlayer(owner);
    classicCollection(store,owner);
    team.forEach(name => store.db.prepare('INSERT INTO unlocks VALUES (?, ?)').run(owner,name));
    const first = store.start(owner,team);
    const runId = store.battle(first).run_id;
    store.db.prepare('UPDATE runs SET total_floors=10 WHERE id=?').run(runId);
    // Boundary fixture: skip the already separately tested middle-floor progression.
    store.db.prepare("UPDATE runs SET floor = 10, state = 'select' WHERE id = ?").run(runId);
    const id = store.enter(owner,runId,10,team);
    let won = false;
    for (let seed = 1; seed <= 20; seed++) {
      const row=store.battle(id);
      const log = await runBattle({teams:{p1:row.player_team,p2:row.opponent_team},seed:[seed,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
      if (log.winner !== 'Player') continue;
      store.db.prepare('UPDATE battles SET seed = ? WHERE id = ?').run(JSON.stringify(log.seed),id);
      store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
      won = true; break;
    }
    expect(won).toBe(true);
  } finally {store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/battle');
  await expect(page.getByTestId('result-dialog')).toContainText('10층 배틀');
  await expect(page.getByTestId('result-dialog')).toContainText('+550코인');
  await page.getByRole('button',{name:'영입으로 계속'}).click();
  await page.getByRole('button',{name:'영입 없이 계속'}).click();
  await expect(page.getByRole('heading',{name:'10층 타워를 정복했어요!'})).toBeVisible();
  await expect(page.getByTestId('clear-earned')).toHaveText('550코인');
  await page.reload();
  await expect(page.getByRole('heading',{name:'10층 타워를 정복했어요!'})).toBeVisible();
  const response = await page.request.get('/api/battle').then(r => r.json());
  expect(response.tower.run.state).toBe('cleared');
  expect(response.tower.run.totalFloors).toBe(10);
  await page.screenshot({path:'test-results/tower-ten-clear.png',fullPage:true});
});
