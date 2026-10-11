import type {TrainingProfile} from '../src/data/training';
import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam,starters} from '../src/data/teams';
import {floors} from '../src/data/floors';
import {runBattle,type BattleLog} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {classicCollection} from '../tests/classic-team-fixture';

function orders(roster:string[]) {
  return roster.flatMap(a=>roster.filter(b=>b!==a).flatMap(b=>roster.filter(c=>c!==a && c!==b).map(c=>[a,b,c])));
}

test('all ten real battles through the action API, final recruitment and saved Hall of Fame',async({page,context})=>{
  await page.setViewportSize({width:1440,height:1080});
  const token=randomBytes(32).toString('hex'),owner=playerKey(token);
  const store=new TowerStore('.data/e2e.sqlite');
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  const recruits=['Cloyster','Arcanine','Gyarados','Golem','Lucario','Lapras','Dragonite','Tyranitar','Metagross','Garchomp'];
  const replacements=[null,null,null,'Charizard','Arcanine','Blastoise','Venusaur','Golem','Cloyster','Gyarados'];
  try {
    store.ensurePlayer(owner);
    classicCollection(store,owner);
    let id=store.start(owner,starters);
    const runId=store.battle(id).run_id;
    store.db.prepare('UPDATE runs SET total_floors=10 WHERE id=?').run(runId);
    store.db.prepare('DELETE FROM run_themes WHERE run_id=?').run(runId);
    store.db.prepare('DELETE FROM run_progression WHERE run_id=?').run(runId);
    for(const [index,floor] of floors.slice(0,10).entries()) {
      const profiles=JSON.parse((store.db.prepare("SELECT profiles FROM runs WHERE id=?").get(runId) as {profiles:string}).profiles) as Record<string,TrainingProfile>;
      let plan:{team:string[];log:BattleLog}|undefined;
      // Repeatable seed for this separate test account. Never inject a winner or skip a floor.
      for(const team of index===0 ? [starters] : orders(store.roster(runId))) {
        const log=await runBattle({teams:{p1:packTeam(team,profiles),p2:packTeam([...floor.opponents])},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
        if(log.winner==='Player'){plan={team,log};break;}
      }
      expect(plan,`winning strategy for floor ${floor.number}`).toBeTruthy();
      if(index===9) {
        const boss=store.view(owner).run!.boss!;
        await page.goto('/battle');
        await expect(page.getByRole('button',{name:'10층 보스 도전'})).toBeVisible();
        expect(boss.role).toBe('champion');
        await expect(page.getByTestId('boss-introduction')).toHaveCount(0);
      }
      if(index>0) id=store.enter(owner,runId,floor.number,plan!.team);
      store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam([...floor.opponents]),id);
      store.db.prepare("UPDATE battles SET seed=?,ai_version='damage-policy-v1' WHERE id=?").run('[1,2,3,4]',id);
      let response=await page.request.get('/api/battle').then(r=>r.json());
      for(const decision of plan!.log.decisions.filter(d=>d.side==='p1' && !d.action.startsWith('team'))) {
        const action=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'action',battleId:id,requestId:response.battle.requestId,action:decision.action}});
        expect(action.ok(),await action.text()).toBe(true);
        response=await action.json();
      }
      expect(response.battle.status).toBe('complete');
      expect(response.battle.winner).toBe('Player');
      expect(response.tower.run.victories).toBe(index+1);
      expect(store.history(id).length).toBeGreaterThan(0);
      console.log(`${floor.number}층 승리 · ${response.battle.turn}턴 · 보상 ${floor.reward}원`);
      if(index<9) {
        const recruited=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'recruit',runId,battleId:id,chosen:recruits[index],replaced:replacements[index]}});
        expect(recruited.ok(),await recruited.text()).toBe(true);
      }
    }
    await page.reload();
    await expect(page.getByTestId('result-dialog')).toContainText(store.view(owner).run!.boss!.name);
    await expect(page.getByTestId('result-dialog')).not.toContainText('새로운 타워 챔피언으로 인정할게');
    await page.getByRole('button',{name:'영입으로 계속'}).click();
    await page.getByRole('button',{name:'한카리아스 영입 선택',exact:true}).click();
    await page.getByRole('button',{name:'교체하고 계속'}).click();
    await page.getByRole('button',{name:'갸라도스 교체 선택',exact:true}).click();
    await page.getByRole('button',{name:'교체하고 영입',exact:true}).click();
    await expect(page.getByTestId('recruit-celebration')).toHaveAttribute('data-phase','joined');
    await page.getByRole('button',{name:'클리어 확인'}).click();
    await expect(page.getByTestId('tower-clear')).toBeVisible();
    await expect(page.getByTestId('clear-earned')).toHaveText('3,400코인');
    await expect(page.locator('.clear-roster>div')).toHaveCount(6);
    await expect(page.locator('.clear-stats')).toContainText('10회');
    await page.reload();
    await expect(page.getByTestId('tower-clear')).toBeVisible();
    await expect(page.getByTestId('clear-earned')).toHaveText('3,400코인');
    await page.locator('.clear-roster img').evaluateAll(async images=>{await Promise.all(images.map(img=>new Promise<void>(resolve=>{const el=img as HTMLImageElement;if(el.complete)resolve();else{el.onload=()=>resolve();el.onerror=()=>resolve();setTimeout(resolve,10000);}})));});
    await page.getByTestId('tower-clear').evaluate(async()=>{await Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{})));});
    await page.screenshot({path:'test-results/tower-conquered.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await expect(page.getByTestId('tower-clear')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:'test-results/tower-conquered-mobile.png',fullPage:true});
    await page.getByRole('button',{name:'새로운 팀으로 다시 도전'}).click();
    await expect(page.getByTestId('team-selection')).toBeVisible();
    await expect(page.getByRole('button',{name:/^(배틀 시작|새 도전 시작)/})).toBeDisabled();
    expect(store.view(owner).run!.state).toBe('cleared');
    expect(store.view(owner).coins).toBe(0); expect(store.view(owner).growthPoints).toBe(400);
  } finally {store.close();}
});
