import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {defaultProfile} from '../src/server/training';
import {packTeam,starters} from '../src/data/teams';

for(const version of ['tower-policy-v11','tower-policy-v12','tower-policy-v13'])for(const width of [1280,390])test(`${version} NPC Z in basic rule activates and survives reload ${width}px`,async({page,context})=>{
 const owner='znpc_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');let token='',id='';
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();store.ensurePlayer(owner);token=(await new Accounts(store.db).register(owner,'test-password',owner,undefined)).token;
  id=store.start(owner,starters,'basic');
  const own={...defaultProfile('Blastoise'),moves:['Protect']},enemy={...defaultProfile('Raichu'),moves:['Thunderbolt']};
  const trainer={...JSON.parse(store.battle(id).trainer!),npcAi:{tier:'expert',tactic:'balanced'}};
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=?,ai_version=?,trainer=? WHERE id=?').run(packTeam(['Blastoise','Snorlax','Venusaur'],{Blastoise:own}),packTeam(['Raichu','Snorlax','Blastoise'],{Raichu:enemy},{Raichu:'Electrium Z'}),'[1,2,3,4]',version,JSON.stringify(trainer),id);
 }finally{store.close();}
 await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
 await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/battle');
 await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();await page.keyboard.press('Shift');
 const before=await page.request.get('/api/battle').then(r=>r.json());expect(before.battle.messages.some((l:string)=>l.startsWith('|-zpower|p2'))).toBe(true);
 await page.reload();await expect(page.locator('.arena')).toBeVisible();const after=await page.request.get('/api/battle').then(r=>r.json());
 expect(after.battle.messages).toEqual(before.battle.messages);expect(after.battle.id).toBe(id);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const check=new TowerStore('.data/e2e.sqlite');try{expect(check.battle(id).ai_version).toBe(version);}finally{check.close();}
});
