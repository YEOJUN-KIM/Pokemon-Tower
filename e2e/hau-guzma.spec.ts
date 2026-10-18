import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters,packTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {alolaTrainers,alolaSample} from '../src/data/alola-trainers';
import {snapshotTrainerEventBattle} from '../src/server/trainer-event-battle';
import {CURRENT_PROGRESSION} from '../src/data/tower-progression';

for(const id of ['named-hau','named-guzma'])for(const width of [390,1280])test(`${id}: v13 roster, actual lead, accepted command and reload at ${width}px`,async({page,context})=>{
 const owner='hau_guzma_'+randomBytes(6).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();store.ensurePlayer(owner);
  const auth=await new Accounts(store.db).register(owner,'pilot-test-password',owner,undefined),first=store.battle(store.start(owner,starters,'basic'));
  const snapshot=snapshotTrainerEventBattle(owner,alolaSample(alolaTrainers.find(t=>t.id===id)!),95,'basic',CURRENT_PROGRESSION),expected=snapshot.team.map(p=>p.name);
  store.db.prepare('UPDATE battles SET opponent_team=?,trainer=?,boss=NULL,ai_version=? WHERE id=?').run(snapshot.opponentTeam,JSON.stringify(snapshot.trainer),snapshot.aiVersion!,first.id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:900});await page.goto('/battle');
  const skip=page.getByRole('button',{name:'연출 건너뛰기',exact:true});if(await skip.isVisible())await skip.click();await expect(page.getByTestId('action-grid')).toBeVisible();
  expect(store.battle(first.id).ai_version).toBe('tower-policy-v13');expect(Showdown.Teams.unpack(store.battle(first.id).opponent_team)!.map(p=>p.species)).toEqual(expected);
  if(id==='named-hau')expect(expected).toEqual(['Noivern','Primarina','Raichu-Alola']);else expect(expected).toContain('Golisopod');
  const before=await(await page.request.get('/api/battle')).json();expect(before.battle.messages.find((l:string)=>l.startsWith('|switch|p2'))).toContain('|'+expected[0]+',');
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  const played=await(await page.request.get('/api/battle')).json();await page.reload();await expect(page.locator('.arena')).toBeVisible();const after=await(await page.request.get('/api/battle')).json();
  expect(after.battle.id).toBe(played.battle.id);expect(after.battle.messages).toEqual(played.battle.messages);expect(store.battle(first.id).opponent_team).toBe(snapshot.opponentTeam);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});

for(const width of [390,1280])test(`Guzma actual Mega animation, form sprite and replay at ${width}px`,async({page,context})=>{
 const owner='mega_guzma_'+randomBytes(6).toString('hex'),store=new TowerStore('.data/e2e.sqlite');let id='',token='';
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();store.ensurePlayer(owner);token=(await new Accounts(store.db).register(owner,'pilot-test-password',owner,undefined)).token;id=store.start(owner,starters,'basic');
  const snapshot=snapshotTrainerEventBattle(owner,alolaSample(alolaTrainers.find(t=>t.id==='named-guzma')!),95,'basic',CURRENT_PROGRESSION),sets=Showdown.Teams.unpack(snapshot.opponentTeam)!;
  // Controlled lead fixture exercises the transformation on the first command.
  sets.sort((a,b)=>Number(b.species==='Golisopod')-Number(a.species==='Golisopod'));
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,trainer=?,boss=NULL,ai_version=? WHERE id=?').run(packTeam(['Blastoise','Snorlax','Venusaur'],{Blastoise:{...defaultProfile('Blastoise'),moves:['Protect']}}),Showdown.Teams.pack(sets),JSON.stringify(snapshot.trainer),snapshot.aiVersion!,id);
 }finally{store.close();}
 await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:900});await page.goto('/battle');
 const skip=page.getByRole('button',{name:'연출 건너뛰기',exact:true});if(await skip.isVisible())await skip.click();await expect(page.getByTestId('action-grid')).toBeVisible();
 await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
 const played=await(await page.request.get('/api/battle')).json();expect(played.battle.messages.some((l:string)=>l.startsWith('|-mega|p2')&&l.includes('|Golisopod|'))).toBe(true);expect(played.battle.opponent.displaySpecies).toBe('Golisopod-Mega');
 const sprite=page.locator('.enemy-position img[alt="메가갑주무사"]');await expect(sprite).toBeVisible();await expect(sprite).toHaveAttribute('src',/10316/);expect(await sprite.evaluate(img=>(img as HTMLImageElement).naturalWidth>0)).toBe(true);
 await page.reload();await expect(page.locator('.arena')).toBeVisible();const restored=await(await page.request.get('/api/battle')).json();expect(restored.battle.messages).toEqual(played.battle.messages);expect(restored.battle.opponent.displaySpecies).toBe('Golisopod-Mega');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
