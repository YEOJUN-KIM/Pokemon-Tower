import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';

test('eight restored techniques use existing VFX in both directions without loading the rejected pack',async({browser})=>{
 test.setTimeout(120_000);
 const origin='http://127.0.0.1:3001',directory='artifacts/qa/screenshots/existing-vfx-restored';
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 try{
  const account=await context.request.post(origin+'/api/account',{headers:{Origin:origin},data:{action:'register',username:'restored_'+randomUUID().slice(0,8),password:randomUUID()}});expect(account.ok()).toBe(true);
  const response=await context.request.post(origin+'/api/battle',{headers:{Origin:origin},data:{type:'start',selected:['Charizard','Blastoise','Venusaur']}});expect(response.ok()).toBe(true);
  const initial=await response.json();let move='Stored Power',enemy=false;
  await context.route('**/api/battle',async route=>{
   if(route.request().method()!=='POST'||route.request().postDataJSON().type!=='action')return route.continue();
   const actor=enemy?'p2a: Opponent':'p1a: Charizard',target=enemy?'p1a: Charizard':'p2a: Opponent';
   await route.fulfill({json:{...initial,battle:{...initial.battle,requestId:initial.battle.requestId+1,
    team:initial.battle.team.map((p:{active:boolean})=>enemy&&p.active?{...p,condition:'80/100'}:p),opponent:enemy?initial.battle.opponent:{...initial.battle.opponent,condition:'80/100'},
    messages:[...initial.battle.messages,`|move|${actor}|${move}|${target}`,`|-damage|${target}|80/100`]}}});
  });
  const page=await context.newPage(),errors:string[]=[],rejectedRequests:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().includes('/external-generated/devwizard-pixel-art-spells/'))rejectedRequests.push(request.url());});
  await page.goto(origin+'/battle');await page.clock.install();await page.clock.pauseAt(new Date());mkdirSync(directory,{recursive:true});
  for(const name of ['Stored Power','Shadow Ball','Ember','Rock Throw','Ice Shard','Water Gun','Water Pulse','Gust'])for(const direction of ['player','enemy']){
   move=name;enemy=direction==='enemy';await page.goto(origin+'/battle');
   await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
   const canvas=page.getByTestId('move-visuals');await expect(canvas).toHaveAttribute('data-move',move);await page.clock.runFor(450);
   expect(await canvas.evaluate(element=>{const c=element as HTMLCanvasElement;return c.getContext('2d')!.getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n>25);}),move).toBe(true);
   expect(await canvas.getAttribute('data-projectile-role')).toBe(null);
   await page.locator('.arena').screenshot({path:`${directory}/${move.replaceAll(' ','-')}-${direction}.png`,animations:'disabled'});
   await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
   expect(await canvas.evaluate(element=>{const c=element as HTMLCanvasElement;return c.getContext('2d')!.getImageData(0,0,c.width,c.height).data.every((n,i)=>i%4!==3||n===0);})).toBe(true);
  }
  expect(rejectedRequests).toEqual([]);expect(errors).toEqual([]);
 }finally{await context.close();}
});
