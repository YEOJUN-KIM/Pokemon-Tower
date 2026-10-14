import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam} from '../src/data/teams';

test('capture actual Garchomp mega transformation for a GIF',async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);store.db.prepare("INSERT OR IGNORE INTO unlocks VALUES (?,?)").run(owner,"Garchomp");const id=store.start(owner,['Garchomp','Blastoise','Venusaur']);
  const own=Showdown.Teams.unpack(packTeam(['Garchomp','Blastoise','Venusaur'],{},{Garchomp:'Garchompite'}))!;
  own[0].moves=['Dragon Claw','Earthquake','Rock Slide','Swords Dance'];
  const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Shuckle','Blissey']))!;enemy.forEach(p=>p.moves=['Rest']);
  store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width:1280,height:720});await page.goto('/battle');
  await expect(page.getByRole('button',{name:'싸운다',exact:true})).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('Enter');await page.keyboard.press('m');await expect(page.getByTestId('gimmick-toggle')).toHaveAttribute('aria-pressed','true');
  const visibleHeight=()=>page.locator('.player-position img').evaluate(element=>{const img=element as HTMLImageElement,canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let top=canvas.height,bottom=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>32){top=Math.min(top,y);bottom=Math.max(bottom,y);}return (bottom-top+1)/canvas.height*img.getBoundingClientRect().height;});
  await expect(page.locator('.player-position .pokemon-image-frame')).toHaveAttribute('data-animation-measured','true');const beforeHeight=await visibleHeight();
  const dir='artifacts/experiments/balance/garchomp-mega-frames';mkdirSync(dir,{recursive:true});const frames:{path:string;time:number}[]=[];
  const seen=new Set<string>();const capture=async()=>{for(const kind of await page.locator('[class*="motion-mega-"]').evaluateAll(els=>els.flatMap(el=>Array.from(el.classList).filter(c=>c.startsWith('motion-mega-')))))seen.add(kind);const path=dir+'/'+String(frames.length).padStart(3,'0')+'.png';await page.screenshot({path});frames.push({path,time:Date.now()});};
  await capture();await page.keyboard.press('Enter');await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
  const start=Date.now();while(Date.now()-start<12000){await capture();if(await page.locator('.arena').getAttribute('data-playing')==='false')break;await page.waitForTimeout(80);}
  await expect(page.locator('.player-position img')).toHaveAttribute('alt','메가한카리아스');
  await expect(page.locator('.player-position .pokemon-image-frame')).toHaveAttribute('data-framing-ready','true');const afterHeight=await visibleHeight();expect(afterHeight/beforeHeight).toBeGreaterThan(.86);expect(afterHeight/beforeHeight).toBeLessThan(1.14);writeFileSync(dir+'/height-check.json',JSON.stringify({beforeHeight,afterHeight,ratio:afterHeight/beforeHeight},null,2));
  for(const phase of ['charge','shell','burst','flash','reveal'])expect(seen.has('motion-mega-'+phase)).toBe(true);await capture();writeFileSync(dir+'/timing.json',JSON.stringify(frames,null,2));
 }finally{store.close();}
});
