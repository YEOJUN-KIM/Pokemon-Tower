import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {packTeam,starters} from '../src/data/teams';

for(const width of [1280,390])for(const speed of [1,2,4])test(`effect popup and readable results: ${speed}x at ${width}px`,async({page,context,baseURL})=>{
 const suffix=randomBytes(8).toString('hex'),owner='effect-ui-'+suffix,store=new TowerStore('.data/e2e.sqlite');
 try{
  const auth=await new Accounts(store.db).register('effect_'+suffix,'effect-ui-password',owner,undefined);
  store.ensurePlayer(owner);const id=store.start(owner,starters);
  store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam(['Solrock','Snorlax','Blissey']),id);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:baseURL!,httpOnly:true,sameSite:'Strict'}]);
  await page.addInitScript(value=>localStorage.setItem('tower-playback-speed-v1',String(value)),speed);
  await page.setViewportSize({width,height:900});await page.goto('/battle');
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  const state=await page.request.get('/api/battle').then(r=>r.json()),base=state.battle,own=base.team.find((p:{active:boolean})=>p.active),actor=`p1a: ${own.species}`;
  const longName='매우 긴 이름의 특성 아이템';
  // Presentation fixture only; real effect mechanics are covered in tests/effects.test.ts.
  const lines=[`|move|${actor}|Earthquake|p2a: Solrock`,'|-immune|p2a: Solrock|[from] ability: Levitate',`|move|p2a: Solrock|Psychic|${actor}`,`|-crit|${actor}`,`|-resisted|${actor}`,`|-damage|${actor}|70/100`,`|-heal|${actor}|80/100|[from] item: ${longName}`,`|-status|${actor}|par`];
  const presented={...base,requestId:base.requestId+1,messages:[...base.messages,...lines],team:base.team.map((p:{active:boolean})=>p.active?{...p,condition:'80/100 par'}:p)};
  await page.route('**/api/battle',route=>route.request().method()==='POST'?route.fulfill({json:{...state,battle:presented}}):route.continue());
  await page.evaluate(()=>{const timings:{text:string;at:number}[]=[];(window as unknown as {effectDialogueTimes:typeof timings}).effectDialogueTimes=timings;const node=document.querySelector('[role=log]')!;new MutationObserver(()=>{const text=node.querySelector('.latest')?.getAttribute('data-full-text')??'';if(timings.at(-1)?.text!==text)timings.push({text,at:performance.now()});}).observe(node,{subtree:true,childList:true,attributes:true});});
  await page.locator('[data-command="move 1"]').click();
  const popup=page.getByTestId('effect-notice'),current=page.getByRole('log',{name:'현재 배틀 상황'});
  await expect(popup.locator('strong')).toHaveText('부유');
  await expect(current).not.toContainText('부유');await expect(current).not.toContainText('효과가 없다');
  await expect(popup.locator('strong')).toHaveCSS('font-size',width===390?'20px':'24px');
  await expect(current.locator('.latest')).toHaveAttribute('data-full-text','급소에 맞았다!');
  await expect(current.locator('.latest')).toHaveAttribute('data-full-text','효과가 별로인 듯하다…');
  const times=await page.evaluate(()=>(window as unknown as {effectDialogueTimes:{text:string;at:number}[]}).effectDialogueTimes);
  expect(times.find(t=>t.text==='효과가 별로인 듯하다…')!.at-times.find(t=>t.text==='급소에 맞았다!')!.at).toBeGreaterThanOrEqual(700);
  await expect(popup.locator('strong')).toHaveText(longName);
  const box=(await popup.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
  expect(await popup.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:`test-results/effect-popup-${width}-${speed}x.png`,fullPage:true});
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:25000});
  const recorded=await page.evaluate(()=>(window as unknown as {effectDialogueTimes:{text:string;at:number}[]}).effectDialogueTimes);
  expect(recorded.every(t=>!t.text.includes('부유')&&!t.text.includes(longName))).toBe(true);
  expect(recorded.some(t=>t.text.includes('마비되었다'))).toBe(true);
  await page.keyboard.press('s');const history=page.getByRole('region',{name:'배틀 기록',exact:true});
  await expect(history).toContainText('부유');await expect(history).toContainText(longName);await expect(history).toContainText('남은 HP');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{store.close();}
});
