import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters,packTeam} from '../src/data/teams';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

for(const width of [1280,390])test(`fifty is a saved midpoint, fifty-one keeps resources and one hundred clears at ${width}px`,async({page,context})=>{
 await page.setViewportSize({width,height:width===390?844:900});
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;
  store.db.prepare('UPDATE players SET coins=5000 WHERE id=?').run(owner);
  store.db.prepare('INSERT INTO run_stat_boosts VALUES (?,?,?,?)').run(run,'Charizard','spa',5);
  store.db.prepare('INSERT INTO run_held_items VALUES (?,?,?)').run(run,'Charizard','Charcoal');
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  for(const floor of [50,100]){
   store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
   const id=store.enter(owner,run,floor,starters),row=store.battle(id),enemy=packTeam(['Unown','Luvdisc','Delibird']);
   store.db.prepare('UPDATE battles SET opponent_team=?,seed=? WHERE id=?').run(enemy,'[1,2,3,4]',id);
   const log=await runBattle({teams:{p1:row.player_team,p2:enemy},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
   expect(log.winner).toBe('Player');
   store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
   await page.goto('/battle');await expect(page.getByTestId('result-dialog')).toContainText(`${floor}층 배틀`);
   if(floor===50)await expect(page.getByTestId('result-dialog')).toContainText('50층 관문을 넘었습니다');
   await page.getByRole('button',{name:'영입으로 계속'}).click();await page.getByRole('button',{name:'영입 없이 계속'}).click();
   if(floor===50){
    await expect(page.getByTestId('tower-shop')).toContainText('50층 클리어');await expect(page.getByTestId('tower-clear')).toHaveCount(0);
    await page.reload();await expect(page.getByTestId('tower-shop')).toBeVisible();
    expect(store.view(owner).run!.floor).toBe(51);expect(store.view(owner).coins).toBe(5000+row.reward);
    expect(store.view(owner).run!.heldItems!.Charizard).toBe('Charcoal');expect(store.db.prepare('SELECT points FROM run_stat_boosts WHERE run_id=? AND species=? AND stat=?').get(run,'Charizard','spa')!.points).toBe(5);
    await page.getByRole('button',{name:'출전 팀 선택'}).click();await expect(page.getByRole('button',{name:'51층 배틀 시작'})).toBeVisible();
   }else{
    await expect(page.getByRole('heading',{name:'100층 타워를 정복했어요!'})).toBeVisible();await page.reload();await expect(page.getByTestId('tower-clear')).toBeVisible();
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
 }finally{store.close();}
});
