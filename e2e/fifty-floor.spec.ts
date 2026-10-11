import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters,packTeam} from '../src/data/teams';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import {villainGrunt} from '../src/data/villain-organizations';
import {machineRarity} from '../src/data/machine-rarities';
import {rarityColors} from '../src/data/held-item-shop';

test('later checkpoints renew upgrades, save machine purchases and enter the next floor with keyboard',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;
    store.db.prepare('UPDATE players SET coins=5000 WHERE id=?').run(owner);
    store.db.prepare('INSERT INTO run_upgrades VALUES (?,?,?,?)').run(run,'attack',6,10);
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
    for(const floor of [31,36,41,46]){
      store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
      store.db.prepare('INSERT OR REPLACE INTO consumable_shops VALUES (?,?,?)').run(run,floor,JSON.stringify(['attack','speed','guard']));
      await page.goto('/battle');await expect(page.getByTestId('tower-shop')).toBeVisible();
      await expect(page.getByTestId('tower-shop')).toContainText(`${floor-1}층 클리어`);
      await page.locator('.shop-product').filter({hasText:'플러스파워'}).getByRole('button').click();
      await expect(page.locator('.upgrade-status')).toContainText('플러스파워 · 5개 층 남음');
      const offer=store.view(owner).run!.machineShop!.offers[0];
      if(offer){
        await page.getByRole('button',{name:'기술머신',exact:true}).click();
        const color=rarityColors[offer.rarity ?? machineRarity(offer.move)],rgb=`rgb(${[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)).join(', ')})`;
        await expect(page.locator(`[data-machine-offer="${offer.move}"] strong`)).toHaveCSS('color',rgb);
        await page.locator(`button[data-machine="${offer.move}"]`).click();
        await expect(page.getByTestId('machine-confirmation').locator('..').locator('h2')).toHaveCSS('color',rgb);
        await page.keyboard.press('x');
        const result=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'purchase-machine',runId:run,floor,move:offer.move,species:offer.targets[0],slot:null}});
        // Purchase command uses the same endpoint as the visible machine dialog.
        expect(result.ok(),await result.text()).toBe(true);
      }
      await page.reload();await expect(page.getByRole('button',{name:'구매 완료'})).toHaveCount(1);
      await page.getByRole('button',{name:'기술머신',exact:true}).click();if(offer)await expect(page.getByTestId('machine-products')).toContainText('구매 완료');
      await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.getByRole('button',{name:'출전 팀 선택'}).click();
      const start=page.getByRole('button',{name:`${floor}층 배틀 시작`});await page.keyboard.press('Tab');await start.focus();await page.keyboard.press('Enter');
      await expect(page.getByRole('button',{name:'포켓몬 내보내기 · Z',exact:true})).toBeVisible();await page.keyboard.press('Shift');
      await expect(page.getByTestId('action-grid')).toBeVisible();expect(JSON.parse(store.currentBattle(owner)!.upgrades)).toContain('attack');
      await page.setViewportSize({width:1280,height:800});
    }
  }finally{store.close();}
});

test('a real fiftieth-floor win opens the fifty-floor Hall of Fame and survives reload',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);const run=store.battle(store.start(owner,starters)).run_id;
    store.db.prepare("UPDATE runs SET total_floors=50,floor=50,state='select' WHERE id=?").run(run);
    const id=store.enter(owner,run,50,starters),row=store.battle(id),enemy=packTeam(['Unown','Luvdisc','Delibird']);
    store.db.prepare('UPDATE battles SET opponent_team=?,seed=? WHERE id=?').run(enemy,'[1,2,3,4]',id);
    const log=await runBattle({teams:{p1:row.player_team,p2:enemy},seed:[1,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});expect(log.winner).toBe('Player');
    store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
  }finally{store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/battle');await expect(page.getByTestId('result-dialog')).toContainText('50층 배틀');
  await page.getByRole('button',{name:'영입으로 계속'}).click();await page.getByRole('button',{name:'영입 없이 계속'}).click();
  await expect(page.getByRole('heading',{name:'50층 타워를 정복했어요!'})).toBeVisible();await page.reload();await expect(page.getByTestId('tower-clear')).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/fifty-floor-clear-mobile.png',fullPage:true});
});
