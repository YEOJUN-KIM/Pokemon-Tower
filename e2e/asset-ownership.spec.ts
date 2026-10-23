import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
const audit=JSON.parse(readFileSync('docs/assets/manifests/runtime-ownership.json','utf8'));

test('Git-bundled original, CC0 and OFL assets serve audited bytes',async({request})=>{
 for(const f of audit.files.filter((f:any)=>!f.text)){
  const response=await request.get('/'+f.path.replace(/^public\//,''));expect(response.ok(),f.path).toBe(true);
  const bytes=await response.body();expect(bytes.length,f.path).toBe(f.bytes);expect(createHash('sha256').update(bytes).digest('hex'),f.path).toBe(f.sha256);
 }
});

test('authenticated settings play bundled BGM and decode the bundled font',async({page,context})=>{
 const store=new TowerStore('.data/e2e.sqlite'),owner='ownership-'+randomUUID();let token:string;
 try{
  store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register('own_'+randomUUID().slice(0,8),randomUUID(),owner,undefined);token=auth.token;
 }finally{store.close();}
 await context.addCookies([{name:'tower_auth',value:token!,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
 await page.addInitScript(()=>{
  const state=window as unknown as {ownershipAudio:HTMLMediaElement[]};state.ownershipAudio=[];
  const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.src.includes('/audio/bgm/'))state.ownershipAudio.push(this);return play.call(this);};
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/settings');await page.getByRole('button',{name:/알고 있어요.*건너뛰기/}).click();await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);await page.getByLabel('전체 음소거').uncheck();await page.getByRole('button',{name:'BGM 들어보기',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>{const p=(window as unknown as {ownershipAudio:HTMLMediaElement[]}).ownershipAudio.at(-1);return !!p&&!p.paused&&p.readyState>=2&&p.currentTime>0;})).toBe(true);
 expect(await page.evaluate(async()=>{await document.fonts.load('16px TowerPixel');return document.fonts.check('16px TowerPixel');})).toBe(true);expect(errors).toEqual([]);
});
