import {dexSearch,dexFilter} from './dex-filters';
import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {defaultProfile} from '../src/server/training';
import {packTeam,starters} from '../src/data/teams';
import {runBattle} from '../src/battle/run';
import {TowerPolicy} from '../src/battle/tower-policy';

test('generation-nine partners have images, self moves, native abilities and keyboard battle actions',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  const selected=['Meowscarada','Skeledirge','Quaquaval'];
  try{store.ensurePlayer(owner);for(const name of selected)store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,name);}finally{store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/pokedex');
  for(const name of ['마스카나','라우드본','웨이니발']) {
    await dexSearch(page).fill(name);await page.getByRole('button',{name:`${name} 상세 보기`,exact:true}).click();
    await page.getByRole('button',{name:'포켓몬 넣기',exact:true}).click();
  }
  await page.getByRole('button',{name:/배틀 시작/}).click();await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();
  await expect(page.getByTestId('action-grid')).toBeVisible();await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:30000});
  const sprite=page.locator('.player-position img');await expect(sprite).toHaveAttribute('src',/gen5-back\/meowscarada\.png$/);
  await expect.poll(()=>sprite.evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth>0)).toBe(true);
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await expect(page.getByTestId('action-grid')).toContainText('트릭플라워');
  await expect(page.locator('[data-command="move 1"]')).toHaveAttribute('data-game-cursor','true');
  const reply=page.waitForResponse(response=>response.url().endsWith('/api/battle') && response.request().method()==='POST');
  await page.keyboard.press('Enter');expect((await reply).status()).toBe(200);
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:30000});await page.screenshot({path:'test-results/expanded-gen9-battle.png'});
});

test('a newly supported specialist can be recruited, saved and configured without four invented moves',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);const id=store.start(owner,starters),row=store.battle(id),team=packTeam(['Butterfree','Ditto','Unown']);
    store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(team,id);
    const log=await runBattle({teams:{p1:row.player_team,p2:team},seed:JSON.parse(row.seed),player:new TowerPolicy(),opponent:new TowerPolicy()});expect(log.winner).toBe('Player');
    store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
  }finally{store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/battle');await page.getByRole('button',{name:'영입으로 계속'}).click();
  await page.getByRole('button',{name:'메타몽 영입 선택',exact:true}).click();await page.keyboard.press('Enter');await expect(page.getByTestId('recruit-confirmation')).toBeVisible();await page.keyboard.press('Enter');
  await expect(page.getByTestId('recruit-celebration')).toHaveAttribute('data-phase','joined');
  await page.goto('/pokedex');await dexSearch(page).fill('메타몽');await page.getByRole('button',{name:'메타몽 상세 보기',exact:true}).click();await page.getByRole('button',{name:'기술배치',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'메타몽 기술배치'})).toContainText('변신');
  await expect(page.locator('.move-slots button')).toHaveCount(4);await expect(page.locator('.move-slots button').filter({hasText:'빈 기술 칸'})).toHaveCount(3);
  await expect(page.locator('.move-library button')).toHaveCount(1);await page.screenshot({path:'test-results/expanded-ditto-moves.png'});
  const response=await page.request.get('/api/battle?view=collection').then(r=>r.json());
  const saved=response.training.find((entry:{species:string})=>entry.species==='Ditto');expect(saved.profile.moves).toEqual(['Transform']);expect(saved.abilities).toContain('Imposter');
});

test('Smeargle can fill an empty move slot with a collected move and persist its compact loadout',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{store.ensurePlayer(owner);store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,'Smeargle');store.db.prepare('INSERT INTO move_unlocks VALUES (?,?,?)').run(owner,'Smeargle','Flamethrower');}finally{store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.goto('/pokedex');await dexSearch(page).fill('루브도');await page.getByRole('button',{name:'루브도 상세 보기',exact:true}).click();await page.getByRole('button',{name:'기술배치',exact:true}).click();
  await page.locator('.move-slots button').nth(1).click();await page.locator('.move-library button').filter({has:page.getByText('화염방사',{exact:true})}).click();await expect(page.locator('.move-editor')).toHaveAttribute('aria-busy','false');
  await expect(page.getByRole('status')).toContainText('설정을 저장');await page.reload();
  const saved=await page.request.get('/api/battle?view=collection').then(r=>r.json());expect(saved.training.find((entry:{species:string})=>entry.species==='Smeargle').profile.moves).toEqual(['Sketch','Flamethrower']);
});

