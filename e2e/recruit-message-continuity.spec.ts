import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters,packTeam} from '../src/data/teams';
import {finishChallengerBattle} from '../tests/challenger-fixture';

for(const width of [1280,390])test(`recruit and preparation messages never restart after completing at ${width}`,async({page,context})=>{
 const owner='cont_'+randomBytes(7).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);const id=store.start(owner,starters,'basic'),run=store.battle(id).run_id;
  store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam(['Pikachu','Golem','Snorlax']),id);finishChallengerBattle(store,id);
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const {token}=await new Accounts(store.db).register(owner,'continuity-test-password',owner,undefined);await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001'}]);await page.setViewportSize({width,height:900});
  await page.addInitScript(shiftClock=>{
   if(shiftClock){const native=requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>native(timestamp=>callback(timestamp-100));}
   const rows:any[]=[],ids=new WeakMap<Element,number>();let counter=0;(window as any).__messageTrace=rows;
   const capture=()=>{const state=Array.from(document.querySelectorAll('[data-message-key]')).map(node=>{if(!ids.has(node))ids.set(node,++counter);return {id:ids.get(node),key:node.getAttribute('data-message-key'),text:node.querySelector('[data-dialogue-text]')?.textContent,typing:node.getAttribute('data-typing')};});const signature=JSON.stringify(state);if(rows.at(-1)?.signature!==signature)rows.push({at:performance.now(),signature,state});};
   new MutationObserver(capture).observe(document,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-typing','data-message-key']});
  },width===390);
  await page.goto('/battle');await page.locator('[data-recruit-candidate=Pikachu]').click();await page.getByRole('button',{name:'도감에 넣기',exact:true}).click();
  const result=page.getByRole('log',{name:'영입 결과'});await expect(result).toHaveAttribute('data-typing','false');await expect(result).toContainText('피카츄를 도감에 등록했다.');await page.locator('[data-recruit-continue]').click();
  const preparation=page.locator('.battle-messages [role=log]');await expect(preparation).toHaveAttribute('data-typing','false');await expect(preparation).toContainText('2층에 출전할 3마리를 선택하세요.');
  await page.getByTestId('team-selection').getByRole('button',{name:'배낭',exact:true}).click();await page.getByRole('button',{name:'배낭 · 이번 도전 닫기',exact:true}).click();
  const records=await page.evaluate(()=>(window as any).__messageTrace as {at:number;state:{id:number;key:string;text:string;typing:string}[]}[]);
  mkdirSync('artifacts/qa/message-continuity',{recursive:true});writeFileSync(`artifacts/qa/message-continuity/${width}.json`,JSON.stringify(records,null,2));
  const previous=new Map<string,{id:number;length:number}>();
  for(const row of records)for(const message of row.state){const prior=previous.get(message.key);if(prior)expect(message.text.length,`message ${message.key}, node ${prior.id} → ${message.id}`).toBeGreaterThanOrEqual(prior.length);previous.set(message.key,{id:message.id,length:message.text.length});}
  expect(store.view(owner).run!.state).toBe('select');
 }finally{store.close();}
});

