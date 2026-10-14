import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam} from '../src/data/teams';

test('capture 2D Garchomp dynamax growth, max move and three-turn expiry',async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,'Garchomp');
  const id=store.start(owner,['Garchomp','Blastoise','Venusaur']);
  const own=Showdown.Teams.unpack(packTeam(['Garchomp','Blastoise','Venusaur'],{},{Garchomp:'Dynamax Band'}))!;
  own[0].moves=['Dragon Claw','Swords Dance','Earthquake','Rock Slide'];
  const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:1280,height:720});await page.goto('/battle');
  const fight=page.getByRole('button',{name:'싸운다',exact:true});await expect(fight).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('Enter');await page.keyboard.press('m');await expect(page.getByTestId('gimmick-toggle')).toHaveAttribute('aria-pressed','true');
  const dir='artifacts/experiments/balance/dynamax-frames';mkdirSync(dir,{recursive:true});const frames:{path:string;time:number}[]=[];
  const phases=new Set<string>();const capture=async()=>{for(const c of await page.locator('[class*="motion-dynamax-"]').evaluateAll(elements=>elements.map(e=>e.className)))phases.add(c);const path=dir+'/'+String(frames.length).padStart(3,'0')+'.png';await page.screenshot({path});frames.push({path,time:Date.now()});};
  const recordTurn=async()=>{const start=Date.now();while(Date.now()-start<20000){await capture();if(await page.locator('.arena').getAttribute('data-playing')==='false')break;await page.waitForTimeout(80);}await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');};
  await capture();await page.keyboard.press('Enter');await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await recordTurn();
  await expect(page.locator('.player-position .sprite')).toHaveAttribute('data-dynamax','true');
  await fight.click();await page.locator('[data-command="move 2"]').click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await expect(page.locator('.player-position .sprite')).toHaveAttribute('data-dynamax','true');
  // Skip the uneventful second turn in the demo; show the complete expiry turn.
  const boundary=frames.length;await capture();await fight.click();await page.locator('[data-command="move 2"]').click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await recordTurn();
  await expect(page.locator('.player-position .sprite')).not.toHaveAttribute('data-dynamax','true');
  for(const kind of ['recall','ball','release','grow'])expect([...phases].some(c=>c.includes('motion-dynamax-'+kind))).toBe(true);expect(await page.getByRole('log',{name:'현재 배틀 상황'}).innerText()).not.toContain('HP가 회복');
  await capture();writeFileSync(dir+'/timing.json',JSON.stringify({frames,boundary},null,2));
 }finally{store.close();}
});
