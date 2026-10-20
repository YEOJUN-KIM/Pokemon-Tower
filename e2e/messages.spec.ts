import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {packTeam,starters} from '../src/data/teams';
import {mkdirSync} from 'node:fs';
import Showdown from 'pokemon-showdown';

for(const width of [1280,390])test(`Pokemon dialogue preserves playback, full HP history, reload and reduced motion at ${width}`,async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='dialogue-'+suffix,store=new TowerStore('.data/e2e.sqlite');
 try{
  const auth=await new Accounts(store.db).register('msg_'+suffix,'dialogue-test-password',owner,undefined);
  store.ensurePlayer(owner);const id=store.start(owner,starters);
  const enemy=Showdown.Teams.unpack(packTeam(['Snorlax','Blissey','Golem']))!;enemy.forEach(pokemon=>{pokemon.moves=['Rest'];pokemon.item='';});
  store.db.prepare('UPDATE battles SET opponent_team=?,seed=? WHERE id=?').run(Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});await page.goto('/battle');
  const current=page.getByRole('log',{name:'현재 배틀 상황'}),visual=current.locator('[data-dialogue-text]');
  await expect(current).toHaveAttribute('data-typing','false');await expect(visual).toContainText('무엇을 할까요?');
  expect(await current.locator('.latest').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(width===390?20:25);
  await expect(current).toHaveCSS('border-top-width','0px');await expect(current).toHaveCSS('box-shadow','none');
  const seen:string[]=[];await page.exposeFunction('recordDialogue',(text:string)=>seen.push(text));
  await page.evaluate(()=>{const node=document.querySelector('.battle-messages');new MutationObserver(()=>{(window as unknown as {recordDialogue:(text:string)=>void}).recordDialogue(node?.textContent??'');}).observe(node!,{subtree:true,childList:true,characterData:true});});
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await expect(current).toHaveAttribute('data-typing','true');
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:25000});await expect(current).toHaveAttribute('data-typing','false');
  expect(seen.join('\n')).not.toContain('HP가 줄었다');expect(seen.join('\n')).not.toContain('남은 HP');
  await page.keyboard.press('s');const history=page.getByRole('region',{name:'배틀 기록',exact:true});
  await expect(history).toContainText('HP가 줄었다');await expect(history).toContainText('남은 HP');await expect(history.locator('.message-turn-group h3')).toContainText(['배틀 시작','1턴']);
  await page.getByRole('button',{name:'배틀 기록 닫기'}).click();
  const last=await visual.textContent();await page.reload();await expect(current).toHaveAttribute('data-typing','false');await expect(visual).toHaveText(last!);
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();await page.getByRole('button',{name:'연출 건너뛰기'}).click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:25000});await expect(current).toHaveAttribute('data-typing','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const box=(await current.boundingBox())!,command=(await page.locator('.command-area').boundingBox())!;
  if(width===1280)expect(box.x+box.width).toBeLessThanOrEqual(command.x+1);
  else expect(box.y+box.height).toBeLessThanOrEqual(command.y+1);
  mkdirSync('artifacts/qa/screenshots/dialogue',{recursive:true});await page.screenshot({path:`artifacts/qa/screenshots/dialogue/battle-dialogue-${width}.png`,fullPage:true});
  // Presentation-only critical fixture: saved battle mechanics and account data are untouched.
  const state=await page.request.get('/api/battle').then(response=>response.json()),base=state.battle;
  const target=`p2a: ${base.opponent.species}`,actor=`p1a: ${base.team.find((pokemon:{active:boolean})=>pokemon.active).species}`;
  const presented={...base,requestId:base.requestId+1,messages:[...base.messages,`|move|${actor}|Flamethrower|${target}`,`|-supereffective|${target}`,`|-crit|${target}`,`|-damage|${target}|50/100`],opponent:{...base.opponent,condition:'50/100'}};
  await page.route('**/api/battle',route=>route.request().method()==='POST'?route.fulfill({json:{...state,battle:presented}}):route.continue());
  await page.evaluate(()=>{localStorage.setItem('tower-playback-speed-v1','4');const timings:{text:string;at:number}[]=[];(window as unknown as {dialogueTimings:typeof timings}).dialogueTimings=timings;const node=document.querySelector('.battle-messages')!;new MutationObserver(()=>{const text=node.querySelector('[data-dialogue-text]')?.textContent??'';if(timings.at(-1)?.text!==text)timings.push({text,at:performance.now()});}).observe(node,{childList:true,subtree:true,characterData:true});});
  await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
  await expect(current).toHaveAttribute('data-tone','critical');await expect(visual).toHaveText('급소에 맞았다!');await expect(current.locator('.latest')).toHaveCSS('color','rgb(239, 210, 122)');
  await current.screenshot({path:`test-results/dialogue-critical-${width}.png`});
  await expect(visual).toHaveText('효과가 굉장했다!');await expect(current).toHaveAttribute('data-tone','normal');
  const timings=await page.evaluate(()=>(window as unknown as {dialogueTimings:{text:string;at:number}[]}).dialogueTimings);expect(timings.find(entry=>entry.text==='효과가 굉장했다!')!.at-timings.find(entry=>entry.text==='급소에 맞았다!')!.at).toBeGreaterThanOrEqual(700);
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:25000});
 }finally{store.close();}
});

test('shiny entry stays centered and sparkles animate outside sprite layout',async({page,context})=>{
 const suffix=randomBytes(8).toString('hex'),owner='sparkle-'+suffix,store=new TowerStore('.data/e2e.sqlite');
 try{
  const auth=await new Accounts(store.db).register('fx_'+suffix,'dialogue-test-password',owner,undefined);
  store.ensurePlayer(owner);const id=store.start(owner,starters);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.route('**/api/battle',async route=>{const response=await route.fetch(),state=await response.json();if(state.battle){state.battle.team=state.battle.team.map((pokemon:object)=>({...pokemon,shiny:true}));state.battle.opponent={...state.battle.opponent,shiny:true};state.battle.messages=state.battle.messages.map((line:string)=>{if(!line.startsWith('|switch|'))return line;const fields=line.split('|');fields[3]+=', shiny';return fields.join('|');});}await route.fulfill({response,json:state});});
  await page.goto('/battle');await expect(page.locator('.player-position img')).toBeVisible();
  await page.evaluate(id=>sessionStorage.setItem('tower-pending-intro',id),id);await page.reload();
  await expect(page.getByRole('button',{name:'포켓몬 내보내기',exact:true})).toBeVisible();
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+10000));
  await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();await page.clock.runFor(1950);
  const sparkles=page.locator('.player-position>.shiny-sendout');await expect(sparkles).toHaveCount(1);await expect(sparkles).toHaveCSS('position','absolute');
  const stars=sparkles.locator('i');await expect(stars).toHaveCount(9);await expect(stars.first()).toHaveCSS('position','absolute');await expect(stars.first()).toHaveCSS('animation-name',/shiny-arrival-star/);
  const before=await page.locator('.player-position .motion-wrap').boundingBox();await sparkles.evaluate(el=>el.remove());const after=await page.locator('.player-position .motion-wrap').boundingBox();expect(after).toEqual(before);
  await page.clock.runFor(5000);await expect(page.locator('.shiny-sendout')).toHaveCount(0);
 }finally{store.close();}
});
