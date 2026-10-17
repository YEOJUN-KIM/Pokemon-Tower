import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {raidFixture} from '../tests/raid-fixture';
import {Accounts} from '../src/server/accounts';
import {packPlayerTeam,packTeam,starters} from '../src/data/teams';
import {defaultProfile} from '../src/server/training';
import {TowerStore} from '../src/server/tower-store';
import {finishChallengerBattle} from '../tests/challenger-fixture';

type SeenFrame={kind:string;name:string;hp:string|null;time:number;fill:string;rates:number[]};
for(const width of [1280,390])for(const [bossId,route] of [['garchomp','mega'],['mewtwo','x'],['mewtwo','y']])test(`${bossId}/${route} real phase UX at 4x and ${width}`,async({page,context})=>{
 const owner='ux_'+randomBytes(6).toString('hex'),f=raidFixture('.data/e2e.sqlite',owner,bossId,route);
 try{
  f.store.db.prepare("UPDATE members SET species='Cloyster' WHERE run_id=? AND slot=0").run(f.run);
  f.store.chooseEvent(owner,f.run,f.event.id,'challenge');const id=f.store.currentBattle(owner)!.id;
  const p=defaultProfile('Cloyster');p.moves=['Icicle Spear','Rock Blast','Liquidation','Ice Shard'];p.ability='Skill Link';p.nature='Adamant';
  p.ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};p.evs={hp:2,atk:32,def:0,spa:0,spd:0,spe:32};p.runBonuses={hp:100,atk:100,def:100,spa:100,spd:100,spe:100};
  f.store.db.prepare('UPDATE battles SET player_team=?,seed=? WHERE id=?').run(packPlayerTeam(['Cloyster','Blastoise','Venusaur'],{Cloyster:p}),'[1,2,3,4]',id);
  const auth=await new Accounts(f.store.db).register(owner,'raid-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});
  await page.addInitScript(()=>localStorage.setItem('tower-playback-speed-v1','4'));
  await page.goto('/battle');await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeEnabled();
  await page.evaluate(()=>{
   const state=window as unknown as {raidFrames:SeenFrame[]};state.raidFrames=[];
   let last='';
   const sample=()=>{
    const arena=document.querySelector<HTMLElement>('.arena'),kind=arena?.dataset.raidMotion??'';
    if(kind!==last&&kind){
     const fill=document.querySelector('.enemy-health .hp-track i');
     state.raidFrames.push({kind,name:document.querySelector('.enemy-position img')?.getAttribute('alt')??'',hp:document.querySelector('.enemy-health [role=progressbar]')?.getAttribute('aria-valuenow')??null,time:performance.now(),fill:fill?getComputedStyle(fill).animationName:'',rates:[]});
    }
    last=kind;requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  });
  const directory=`artifacts/qa/screenshots/raid-ux/${bossId}-${route}-${width}`;mkdirSync(directory,{recursive:true});
  const shots=new Set<string>(),goal=bossId==='garchomp'?'mega-reveal':'raid-aura-reveal';
  for(let turn=0;turn<6;turn++){
   await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
   await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
   const start=Date.now();
   while(Date.now()-start<20000){
    const kind=await page.locator('.arena').getAttribute('data-raid-motion');
    if(kind&&!shots.has(kind)){
     shots.add(kind);await page.screenshot({path:`${directory}/${kind}.png`});
     expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
     const bounds=await page.locator('.enemy-health').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
    }
    if(await page.locator('.arena').getAttribute('data-playing')==='false')break;
    await page.waitForTimeout(40);
   }
   const frames=await page.evaluate(()=>(window as unknown as {raidFrames:SeenFrame[]}).raidFrames);
   if(frames.some(frame=>frame.kind===goal))break;
  }
  const frames=await page.evaluate(()=>(window as unknown as {raidFrames:SeenFrame[]}).raidFrames);
  writeFileSync(`${directory}/frames.json`,JSON.stringify(frames,null,2));
  const mega=['mega-charge','mega-shell','mega-burst','mega-flash','mega-reveal'];
  expect(frames.slice(0,5).map(f=>f.kind)).toEqual(mega);
  for(const frame of frames.filter(f=>f.kind.endsWith('charge')||f.kind==='mega-shell'||f.kind==='mega-burst'||f.kind==='mega-flash'))expect(frame.hp).toBe('0');
  for(const frame of frames.filter(f=>f.kind.endsWith('reveal'))){expect(frame.hp).toBe('100');expect(frame.fill).toContain('raid-health-fill');}
  expect(frames[0].name).toBe(bossId==='garchomp'?'한카리아스':'뮤츠');expect(frames[4].name).toContain(bossId==='garchomp'?'메가한카리아스':route==='x'?'메가뮤츠X':'메가뮤츠Y');
  expect(frames[4].time-frames[0].time).toBeGreaterThanOrEqual(1000);
  if(bossId==='mewtwo'){
   expect(frames.slice(5).map(f=>f.kind)).toEqual(['raid-aura-charge','raid-aura-burst','raid-aura-reveal']);
   expect(new Set(frames.slice(4).map(f=>f.name)).size).toBe(1);
  }
  await expect(page.getByTestId('raid-encounter')).toHaveCount(0);
  await page.keyboard.press('s');
  const history=page.getByRole('dialog',{name:'배틀 기록',exact:true}).getByRole('region',{name:'배틀 기록',exact:true});
  await expect(history).not.toContainText(/키스톤|한카리아스 쓰러졌다|뮤츠 쓰러졌다|Phase|페이즈|부활/);
  for(const phase of f.snapshot.phases.slice(1))for(const message of phase.messages!)await expect(history.getByText(message,{exact:true})).toHaveCount(1);
 }finally{f.store.close();}
});
for(const width of [1280,390])test(`normal victory and recruitment retain their existing flow at ${width}`,async({page,context})=>{
 const owner='normalux_'+randomBytes(6).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
 try{
  store.ensurePlayer(owner);const id=store.start(owner,starters,'basic'),run=store.battle(id).run_id;
  store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam(['Garchomp','Tyranitar','Metagross']),id);
  finishChallengerBattle(store,id);
  const auth=await new Accounts(store.db).register(owner,'normal-password',owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:width===390?844:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/battle');
  const result=page.getByTestId('result-dialog');await expect(result).toContainText('타워 코인 지급 완료');await expect(result).not.toContainText('특별한 보상');
  await page.getByRole('button',{name:'영입으로 계속'}).click();
  await page.getByRole('button',{name:'한카리아스 영입 선택',exact:true}).click();
  await page.getByRole('button',{name:/동료로 데려가기 ↗/}).click();await page.getByTestId('recruit-confirmation').getByRole('button',{name:'동료로 데려가기',exact:true}).click();
  await expect(page.getByTestId('recruit-celebration')).toBeVisible();await page.getByTestId('recruit-celebration').getByRole('button').last().click();
  await expect(page.getByRole('dialog',{name:'2층 출전 준비',exact:true})).toBeVisible();
  await expect(page.getByTestId('reward-modal')).toHaveCount(0);await expect(page.getByTestId('raid-encounter')).toHaveCount(0);await expect(page.getByTestId('raid-victory')).toHaveCount(0);
  expect(store.view(owner).run!.floor).toBe(2);expect(store.view(owner).run!.roster).toContain('Garchomp');
 }finally{store.close();}
});
