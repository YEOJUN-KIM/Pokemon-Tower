import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from '@playwright/test';

const origin=(await readFile('.data/preview.env','utf8')).match(/^TOWER_ORIGIN=(.*)$/m)?.[1].trim();
assert.match(origin,/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/);
const request=(path,options={})=>fetch(origin+path,{...options,signal:AbortSignal.timeout(20000)});
const username='release_'+randomUUID().slice(0,8),password=randomUUID();
const headers={Origin:origin,'Content-Type':'application/json'};
const registration=await request('/api/account',{method:'POST',headers,body:JSON.stringify({action:'register',username,password})});
assert.equal(registration.status,200);
const cookie=registration.headers.getSetCookie().find(cookie=>cookie.startsWith('tower_auth='));
assert.match(cookie,/; Secure/i);
const session=cookie.split(';')[0];
const post=body=>request('/api/battle',{method:'POST',headers:{...headers,Cookie:session},body:JSON.stringify(body)});
assert.equal((await post({type:'favorite',species:'Charizard',enabled:true})).status,200);
const start=await post({type:'start',selected:['Charizard','Blastoise','Venusaur']});assert.equal(start.status,200);
const started=await start.json();
const action=await post({type:'action',battleId:started.battle.id,requestId:started.battle.requestId,action:'move 1'});assert.equal(action.status,200);
const state=()=>request('/api/battle',{headers:{Cookie:session}}).then(response=>response.json());
const before=await state();
const browser=await chromium.launch({channel:'chrome'});
try{
 await mkdir('test-results',{recursive:true});
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900}});
  try{
   const page=await context.newPage();await page.goto(origin);
   await page.getByRole('heading',{name:'트레이너 로그인'}).waitFor();
   const login=await context.request.post(origin+'/api/account',{headers:{Origin:origin},data:{action:'login',username,password}});
   assert.equal(login.status(),200);
   assert.ok((await context.cookies()).some(cookie=>cookie.name==='tower_auth'&&cookie.httpOnly&&cookie.secure));
   await page.goto(origin+'/pokedex');
   await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();
   await page.getByRole('button',{name:'기본 정보',exact:true}).click();
   const summary=page.getByTestId('dex-detail');await summary.waitFor();
   assert.equal(await summary.locator('.stat-details').count(),0);
   assert.equal(await summary.locator('.summary-traits>div').last().locator('dd').textContent(),'성실');
   await page.keyboard.press('ArrowRight');
   await page.getByRole('heading',{name:'메가리자몽X',exact:true}).waitFor();
   await page.waitForFunction(()=>{const image=document.querySelector('.summary-sprite img');return image?.complete&&image.naturalWidth>0;},{},{timeout:20000});
   await page.evaluate(()=>document.fonts.ready);
   await page.locator('dialog[open]').last().screenshot({path:`test-results/public-release-${width}.png`});
   await page.reload();assert.ok(!page.url().includes('/account'));
   assert.equal(await page.locator('.dex-control-hints').isVisible(),width>760);
   await page.addInitScript(id=>sessionStorage.setItem('tower-pending-intro',id),started.battle.id);
   await page.goto(origin+'/battle');
   const sendOut=page.locator('.trainer-intro-confirm');await page.locator('[data-testid="trainer-entrance"][data-phase="enter"]').waitFor();
   assert.equal(await sendOut.isVisible(),width>760);
   if(width>760)assert.equal((await sendOut.innerText()).trim(),'포켓몬 내보내기 · Enter');
   assert.equal(await page.locator('.battle-keyboard-hints').isVisible(),width>760);
   assert.equal(await page.locator('.skip-motion').isVisible(),width>760);
   if(width>760)await sendOut.click();else await page.mouse.click(20,20);
   await page.locator('[data-testid="trainer-entrance"]').waitFor({state:'detached'});
   await page.screenshot({path:`test-results/public-mobile-controls-${width}.png`,fullPage:true});
   await page.goto(origin);
   await page.getByRole('button',{name:'새로하기',exact:true}).click();
   const restart=page.getByRole('dialog',{name:'새로하기',exact:true});await restart.waitFor();
   assert.equal(await restart.locator(':scope>p').count(),2);
   assert.match(await restart.innerText(),/현재 도전을 종료하고 새로 시작할까요\?/);
   assert.match(await restart.innerText(),/받을 성장 포인트\s+\+0P/);
   const heading=await restart.locator('.dex-dialog-heading h2').boundingBox();
   const close=await restart.locator('.dex-dialog-heading>button').boundingBox();
   assert.ok(close.x>heading.x+heading.width,'Close button must be to the right of the title');
   assert.ok(Math.abs(close.y+close.height/2-heading.y-heading.height/2)<2,'Title and close button must share a row');
   const alignment=await restart.locator('.restart-actions button').evaluateAll(buttons=>buttons.map(button=>{const css=getComputedStyle(button);return [css.display,css.alignItems,css.justifyContent,css.textAlign];}));
   for(const styles of alignment)assert.deepEqual(styles,['flex','center','center','center']);
   await restart.screenshot({path:`test-results/public-restart-popup-${width}.png`});
   await restart.getByRole('button',{name:'취소',exact:true}).click();
   await restart.waitFor({state:'detached'});
  }finally{await context.close();}
 }
}finally{await browser.close();}
const child=spawn('docker',['compose','-p','tower-preview','--env-file','.data/preview.env','-f','compose.yaml','-f','compose.preview.yaml','restart','game'],{windowsHide:true,stdio:'pipe'});
let logs='';child.stderr.on('data',chunk=>logs+=chunk);child.stdout.on('data',chunk=>logs+=chunk);
assert.equal((await once(child,'exit'))[0],0,logs);
let healthy=false;
for(let attempt=0;attempt<30;attempt++){
 try{if((await request('/api/health')).ok){healthy=true;break;}}catch{}
 await new Promise(resolve=>setTimeout(resolve,500));
}
assert.ok(healthy,'Public server did not recover after restart');
const after=await state();
assert.equal(after.battle.id,before.battle.id);
assert.equal(after.battle.requestId,before.battle.requestId);
assert.deepEqual(after.battle.team,before.battle.team);
assert.deepEqual(after.tower,before.tower);
assert.equal((await request('/api/account/local')).status,404);
console.log('PASS: public HTTPS login gate, secure remembered login, desktop/mobile viewport UI, second-device login, battle/account save after server restart; local auto-login disabled.');
