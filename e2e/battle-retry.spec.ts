import {test,expect} from '@playwright/test';
import {randomBytes,randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters} from '../src/data/teams';
import {Accounts,authCookie} from '../src/server/accounts';

for(const width of [1280,390])test(`retry purchase, preparation, reload and same opponent at ${width}`,async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token);
 const s=new TowerStore('.data/e2e.sqlite');s.ensurePlayer(owner);s.db.prepare('UPDATE players SET growth_points=10000 WHERE id=?').run(owner);
 const account=await new Accounts(s.db).register('retry_'+randomUUID().replaceAll('-','').slice(0,12),'retry-testing-password',owner,undefined);
 await context.addCookies([{name:authCookie,value:account.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
 await page.setViewportSize({width,height:900});await page.goto('/upgrades');
 const product=page.locator('.permanent-products section').filter({has:page.getByRole('heading',{name:'다시하기 확장'})});
 await expect(product).toContainText('도전당 0회');await product.getByRole('button',{name:'1회로 확장 · 500P'}).click();await expect(page.getByRole('dialog')).toContainText('다음 도전부터');await page.getByRole('button',{name:'확인 · Z'}).click();
 const id=s.start(owner,starters,'basic'),before=s.battle(id),run=before.run_id;
 const view={id,status:'complete',requestId:1,turn:5,team:[],opponent:null,actions:[],messages:[],winner:'Tower AI',error:null};
 s.db.prepare("UPDATE battles SET status='complete',view=? WHERE id=?").run(JSON.stringify(view),id);s.db.prepare("UPDATE runs SET state='lost' WHERE id=?").run(run);
 await page.goto('/battle');await expect(page.getByTestId('result-dialog')).toBeVisible();await page.getByRole('button',{name:'출전 설정부터 다시하기 · 남은 1회'}).click();
 await expect(page.getByTestId('retry-opponents')).toBeVisible();await expect(page.getByTestId('retry-opponents')).toContainText('남은 다시하기 0회');
 await page.reload();await expect(page.getByTestId('retry-opponents')).toBeVisible();
 await page.getByTestId('maintenance-adjust').click();await expect(page.getByTestId('run-adjustment')).toBeVisible();await page.keyboard.press('x');
 await page.getByRole('button',{name:'출전 팀 선택 →'}).click();await expect(page.getByTestId('team-selection')).toBeVisible();
 await page.screenshot({path:`test-results/retry-selection-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'1층 배틀 시작'}).click();
 await expect.poll(()=>s.currentBattle(owner)?.status).toBe('active');const after=s.currentBattle(owner)!;
 expect(after.id).not.toBe(id);expect(after.opponent_team).toBe(before.opponent_team);expect(after.seed).toBe(before.seed);expect(s.battle(id).status).toBe('complete');expect(s.view(owner).run!.retries!.used).toBe(1);
 s.close();
});
