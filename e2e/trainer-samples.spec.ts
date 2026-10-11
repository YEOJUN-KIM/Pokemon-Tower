import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {starters,packTeam} from '../src/data/teams';
import {trainerCatalog,trainerView} from '../src/data/trainer-catalog';
import {generateOpponentTeam} from '../src/server/opponent-team';
import {defaultProfile} from '../src/server/training';

for(const sampleId of ['normal-grass','elite-dark'])test(`${sampleId} has a matching portrait, saved identity, correct music and no hidden party leak`,async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  const sample=trainerCatalog.find(s=>s.id===sampleId)!,floor=sample.kind==='elite' ? 4 : 1;let id='';
  try{
    store.ensurePlayer(owner);id=store.start(owner,starters);const encounter=generateOpponentTeam(floor,[1,2,3,4],[],null,sample),profiles=Object.fromEntries(encounter.map(p=>[p.name,{...defaultProfile(p.name),moves:p.moves}]));
    store.db.prepare('UPDATE runs SET floor=? WHERE id=?').run(floor,store.battle(id).run_id);
    store.db.prepare('UPDATE battles SET floor=?,opponent_team=?,trainer=?,villain_event=NULL WHERE id=?').run(floor,packTeam(encounter.map(p=>p.name),profiles),JSON.stringify(trainerView(sample)),id);
  }finally{store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.addInitScript(id=>{if(!sessionStorage.getItem('trainer-sample-fixture')){sessionStorage.setItem('trainer-sample-fixture','ready');sessionStorage.setItem('tower-pending-intro',id);}},id);await page.setViewportSize({width:390,height:844});await page.goto('/battle');
  const intro=page.getByTestId('trainer-entrance');await expect(intro).toHaveAttribute('data-phase','enter');
  await expect(page.locator('.arena .player-position,.arena .enemy-position,.arena .health-card')).toHaveCount(0);
  const portrait=intro.locator('img.npc-portrait');await expect(portrait).toHaveAttribute('src',`/sprites/trainers/${sample.portrait}.png`);await expect.poll(()=>portrait.evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole('log')).toContainText(sample.name);await expect(page.locator('body')).toHaveAttribute('data-music-track',sample.kind==='elite' ? 'elite' : 'trainer');
  await expect(page.locator('.intro-enemy')).toHaveCSS('opacity','1');await expect(page.locator('.intro-player')).toHaveCSS('opacity','1');
  await page.screenshot({path:`test-results/${sample.id}-introduction.png`,fullPage:true});await page.keyboard.press('Enter');await page.keyboard.press('Shift');await expect(intro).toHaveCount(0);
  await expect(page.locator('.enemy-trainer')).toContainText(sample.name);await expect(page.locator('.enemy-trainer')).toContainText(sample.kind==='elite' ? 'ELITE' : 'TRAINER');
  const before=await (await page.request.get('/api/battle')).json();expect(before.tower.run.boss).toBeNull();expect(before.tower.run.candidates).toEqual([]);expect(before.tower.run.trainer).not.toHaveProperty('team');expect(before.tower.run.trainer).not.toHaveProperty('specialty');
  for(let reload=0;reload<3;reload++){
    let release!:()=>void;
    const responseGate=new Promise<void>(resolve=>{release=resolve;});
    await page.route('**/api/battle',async route=>{await responseGate;await route.continue();});
    await page.reload();
    await expect(page.getByRole('status')).toHaveText('저장된 도전을 불러오는 중…');
    await expect(page.getByTestId('team-preview')).toHaveCount(0);
    await expect(page.getByText('준비됐나요, 트레이너?')).toHaveCount(0);
    release();
    await expect(page.getByTestId('action-grid')).toBeVisible();
    await expect(intro).toHaveCount(0);
    await expect(page.locator('.arena .player-position,.arena .enemy-position')).toHaveCount(2);
    await page.unroute('**/api/battle');
  }
  const after=await (await page.request.get('/api/battle')).json();expect(after.tower.run.trainer).toEqual(before.tower.run.trainer);expect(after.battle.opponent.species).toBe(before.battle.opponent.species);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
