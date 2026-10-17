import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {RunEvents} from '../src/server/run-events';
import {transaction} from '../src/server/storage/transaction';
import {eventDefinitions} from '../src/data/run-events';
import {starters} from '../src/data/teams';

for(const [width,origin,destination] of [[1280,48,50],[390,53,53]])test(`teleport hidden snapshot, reveal and preparation at ${width}`,async({page,context})=>{
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
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:width===390?'reduce':'no-preference'});
  await page.goto('/battle');const event=page.getByTestId('run-event');await expect(event).toBeVisible();
  await expect(event).toContainText('수상한 순간이동 장치');await expect(event).not.toContainText(`${destination}층에 도착했다!`);
  await expect(event.getByRole('button',{name:'순간이동한다',exact:true})).toBeVisible();
  await expect(event.getByRole('button',{name:'이용하지 않는다',exact:true})).toBeVisible();
  const saved=store.db.prepare('SELECT destination_floor FROM teleport_events t JOIN run_events e ON e.id=t.event_id WHERE e.run_id=?').get(run);
  await page.reload();expect(store.db.prepare('SELECT destination_floor FROM teleport_events t JOIN run_events e ON e.id=t.event_id WHERE e.run_id=?').get(run)).toEqual(saved);
  await event.getByRole('button',{name:'순간이동한다',exact:true}).click();
  await expect(event).toContainText(`${destination}층에 도착했다!`);
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
