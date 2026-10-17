import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {raidFixture} from '../tests/raid-fixture';
import {Accounts} from '../src/server/accounts';
import {packPlayerTeam} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';

test('record actual Garchomp raid phase transition for GIF',async({page,context})=>{
 const owner='raidgif_'+randomBytes(6).toString('hex'),f=raidFixture('.data/e2e.sqlite',owner);
 try{
  f.store.db.prepare("UPDATE members SET species='Cloyster' WHERE run_id=? AND slot=0").run(f.run);
  f.store.chooseEvent(owner,f.run,f.event.id,'challenge');const battle=f.store.currentBattle(owner)!;
  const p=defaultProfile('Cloyster');p.moves=['Icicle Spear','Rock Blast','Liquidation','Ice Shard'];p.ability='Skill Link';p.nature='Adamant';
  p.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};p.evs={hp:2,atk:32,def:0,spa:0,spd:0,spe:32};p.runBonuses={hp:100,atk:100,def:100,spa:100,spd:100,spe:100};
  f.store.db.prepare('UPDATE battles SET player_team=?,seed=? WHERE id=?').run(packPlayerTeam(['Cloyster','Blastoise','Venusaur'],{Cloyster:p}),'[1,2,3,4]',battle.id);
  const auth=await new Accounts(f.store.db).register(owner,'raid-gif-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:1280,height:900});await page.goto('/battle');
  await expect(page.locator('.enemy-health')).toContainText('한카리아스');
  await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  await expect(page.locator('.enemy-position img')).toHaveAttribute('alt','한카리아스');
  await page.waitForTimeout(700);
  const directory='artifacts/qa/raids/garchomp-phase-frames';mkdirSync(directory,{recursive:true});
  const frames:{path:string;time:number}[]=[],seen=new Set<string>();
  const capture=async()=>{
   const path=directory+'/'+String(frames.length).padStart(4,'0')+'.png';
   for(const cls of await page.locator('[class*="motion-mega-"]').evaluateAll(els=>els.flatMap(el=>Array.from(el.classList).filter(c=>c.startsWith('motion-mega-')))))seen.add(cls);
   await page.screenshot({path});frames.push({path,time:Date.now()});
  };
  await capture();await page.locator('[data-command="move 1"]').click();
  const started=Date.now();
  while(Date.now()-started<18000){
   await capture();
   if(Date.now()-started>1000&&await page.locator('.arena').getAttribute('data-playing')==='false')break;
   await page.waitForTimeout(65);
  }
  await expect(page.locator('.enemy-health')).toContainText('메가한카리아스');
  await expect(page.locator('.enemy-position img')).toHaveAttribute('alt','메가한카리아스');
  expect(seen.has('motion-mega-charge')).toBe(true);expect(seen.has('motion-mega-reveal')).toBe(true);
  await capture();writeFileSync(directory+'/timing.json',JSON.stringify(frames,null,2));
 }finally{f.store.close();}
});
