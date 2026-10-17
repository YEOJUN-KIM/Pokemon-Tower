import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {RunEvents} from '../src/server/run-events';
import {transaction} from '../src/server/storage/transaction';
import {eventDefinitions} from '../src/data/run-events';
import {starters} from '../src/data/teams';
import {portalActivationDuration} from '../src/web/portal-effects';

for(const [width,origin,destination,speed,reduced,decline] of [[1280,48,50,1,false,false],[390,53,53,1,false,false],[390,53,53,4,false,false],[1280,48,50,1,true,false],[390,53,53,1,false,true]] as const)test(`teleport portal ${width}px ${speed}x reduced=${reduced} decline=${decline}`,async({page,context})=>{
 const owner='teleport_'+randomBytes(7).toString('hex'),registry={'random-teleport':eventDefinitions['random-teleport']};
 const store=new TowerStore('.data/e2e.sqlite',max=>max===50?(destination-1)%50:0,registry);
 try{
  const auth=await new Accounts(store.db).register(owner,'teleport-password',owner,undefined);store.ensurePlayer(owner);
  const first=store.start(owner,starters,'basic',{events:true}),run=store.battle(first).run_id;
  store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(first);
  store.db.prepare("UPDATE runs SET state='select',floor=? WHERE id=?").run(origin+1,run);
  store.db.prepare('INSERT INTO run_encounter_progress VALUES (?,?)').run(run,origin);
  transaction(store.db,()=>new RunEvents(store.db,max=>max===50?(destination-1)%50:0,registry).encounter(run,origin));
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  await page.addInitScript(value=>localStorage.setItem('tower-playback-speed-v1',String(value)),speed);
  await page.goto('/battle');const event=page.getByTestId('run-event');await expect(event).toBeVisible();
  await expect(event).toContainText('수상한 순간이동 장치');await expect(event).not.toContainText(`${destination}층에 도착했다!`);
  await expect(event.getByRole('button',{name:'순간이동한다',exact:true})).toBeVisible();
  await expect(event.getByRole('button',{name:'이용하지 않는다',exact:true})).toBeVisible();
  expect(await event.getByRole('button',{name:'이용하지 않는다',exact:true}).evaluate(el=>el.getBoundingClientRect().bottom<=el.closest('.battle-messages')!.getBoundingClientRect().bottom)).toBe(true);
  const saved=store.db.prepare('SELECT destination_floor FROM teleport_events t JOIN run_events e ON e.id=t.event_id WHERE e.run_id=?').get(run);
  await page.reload();expect(store.db.prepare('SELECT destination_floor FROM teleport_events t JOIN run_events e ON e.id=t.event_id WHERE e.run_id=?').get(run)).toEqual(saved);
  const portal=page.getByTestId('teleport-portal');await expect(portal).toHaveAttribute('data-phase','idle');
  const sprite=portal.locator('img');await expect(sprite).toHaveAttribute('src','/images/events/teleport-portal.png');
  expect(await sprite.evaluate(img=>getComputedStyle(img).transform)).toBe('none');
  expect(await portal.evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(reduced?0:6);
  expect(await sprite.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth===512)).toBe(true);
  await page.clock.install();await page.clock.pauseAt(Date.now()+100);
  let choices=0;page.on('request',req=>{if(req.method()==='POST'&&req.url().endsWith('/api/battle')&&req.postDataJSON()?.type==='event-choice')choices++;});
  mkdirSync('artifacts/qa/screenshots/teleport',{recursive:true});
  await page.screenshot({path:`artifacts/qa/screenshots/teleport/idle-${width}-${speed}-${reduced}.png`,animations:'allow'});
  if(decline){
   let activation=false;await page.exposeFunction('recordPortalActivation',()=>{activation=true;});
   await portal.evaluate(el=>new MutationObserver(()=>{if(el.getAttribute('data-phase')==='activate')void (window as unknown as {recordPortalActivation:()=>void}).recordPortalActivation();}).observe(el,{attributes:true,attributeFilter:['data-phase']}));
   await event.getByRole('button',{name:'이용하지 않는다',exact:true}).click();await expect(event).toHaveCount(0);expect(activation).toBe(false);expect(choices).toBe(1);return;
  }
  await event.getByRole('button',{name:'순간이동한다',exact:true}).click();
  await expect(portal).toHaveAttribute('data-phase','activate');expect(choices).toBe(0);
  await expect(event.getByRole('button',{name:'잠시만요…',exact:true}).first()).toBeDisabled();
  await page.clock.runFor(portalActivationDuration(speed,reduced)-1);expect(choices).toBe(0);
  await page.screenshot({path:`artifacts/qa/screenshots/teleport/activate-${width}-${speed}-${reduced}.png`,animations:'allow'});
  await page.clock.runFor(1);
  await expect(portal).toHaveAttribute('data-phase','arrived');await page.clock.runFor(50);
  await expect(event).toContainText(`${destination}층에 도착했다!`);
  expect(choices).toBe(1);await page.clock.resume();
  expect(store.view(owner).run!.state).toBe('select');expect(store.currentBattle(owner)).toBeNull();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  mkdirSync('artifacts/qa/screenshots/teleport',{recursive:true});await page.screenshot({path:`artifacts/qa/screenshots/teleport/arrival-${width}.png`});
  await page.reload();await expect(event).toContainText(`${destination}층에 도착했다!`);
  await event.getByRole('button',{name:'계속하기',exact:true}).click();await expect(event).toHaveCount(0);
  expect(store.view(owner).run!.floor).toBe(destination);expect(store.view(owner).run!.state).toBe('select');
  expect(store.db.prepare('SELECT COUNT(*) AS n FROM run_events WHERE run_id=?').get(run)!.n).toBe(1);
  await page.screenshot({path:`artifacts/qa/screenshots/teleport/preparation-${width}.png`});
 }finally{store.close();}
});
