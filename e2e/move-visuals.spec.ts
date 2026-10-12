import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';

const moves=['Flamethrower','Surf','Thunderbolt','Ice Beam','Shadow Ball','Leaf Storm','Dragon Claw','Crunch','Close Combat','Earthquake'];
for(const width of [1280,390])test(`licensed move effects, both directions and immediate skip at ${width}`,async({browser})=>{
  const origin='http://127.0.0.1:3001';
  const context=await browser.newContext({viewport:{width,height:width===390?844:800},hasTouch:width===390});
  try {
    const account=await context.request.post(origin+'/api/account',{headers:{Origin:origin},data:{action:'register',username:'visual_'+randomUUID().slice(0,8),password:randomUUID()}});
    expect(account.ok()).toBe(true);
    const started=await context.request.post(origin+'/api/battle',{headers:{Origin:origin},data:{type:'start',selected:['Charizard','Blastoise','Venusaur']}});
    expect(started.ok()).toBe(true);const initial=await started.json();
    let selected=moves[0],enemy=false;
    // Deterministic public protocol fixtures exercise the real playback/UI,
    // without asking the battle AI to select a particular technique.
    await context.route('**/api/battle',async route=>{
      if(route.request().method()!=='POST')return route.continue();
      const body=route.request().postDataJSON();if(body.type!=='action')return route.continue();
      const actor=enemy?'p2a: Opponent':'p1a: Charizard',target=enemy?'p1a: Charizard':'p2a: Opponent';
      await route.fulfill({json:{...initial,battle:{...initial.battle,requestId:initial.battle.requestId+1,messages:[...initial.battle.messages,`|move|${actor}|${selected}|${target}`,`|-damage|${target}|80/100`]}}});
    });
    const page=await context.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    mkdirSync('artifacts/screenshots/move-effects',{recursive:true});
    for(const move of moves) {
      selected=move;enemy=move==='Surf'||move==='Crunch';
      await page.goto(origin+'/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();
      await page.locator('[data-command="move 1"]').click();
      const canvas=page.getByTestId('move-visuals');await expect(canvas).toHaveAttribute('data-move',move);
      await expect.poll(()=>canvas.evaluate(element=>{
        const c=element as HTMLCanvasElement,pixels=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;
        let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>25)visible++;return visible;
      })).toBeGreaterThan(10);
      await page.waitForTimeout(180);
      await page.locator('.arena').screenshot({path:`artifacts/screenshots/move-effects/${move.replaceAll(' ','-')}-${width}.png`});
      if(width===390){const box=(await page.locator('.arena').boundingBox())!;await page.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.5);await page.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.5);}
      else await page.keyboard.press('Shift');
      await expect(canvas).toHaveAttribute('data-active','false');
      await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
      expect(await canvas.evaluate(element=>{const c=element as HTMLCanvasElement;return c.getContext('2d')!.getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n>0);})).toBe(false);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    expect(errors).toEqual([]);
  } finally {await context.close();}
});

test('reduced motion keeps a static cue and does not lunge',async({browser})=>{
  const context=await browser.newContext({reducedMotion:'reduce'});
  try {
    const origin='http://127.0.0.1:3001';
    await context.request.post(origin+'/api/account',{headers:{Origin:origin},data:{action:'register',username:'reduced_'+randomUUID().slice(0,8),password:randomUUID()}});
    const initial=await context.request.post(origin+'/api/battle',{headers:{Origin:origin},data:{type:'start',selected:['Charizard','Blastoise','Venusaur']}}).then(r=>r.json());
    await context.route('**/api/battle',async route=>route.request().method()==='POST'?route.fulfill({json:{...initial,battle:{...initial.battle,messages:[...initial.battle.messages,'|move|p1a: Charizard|Thunderbolt|p2a: Opponent']}}}):route.continue());
    const page=await context.newPage();await page.goto(origin+'/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
    await expect(page.getByTestId('move-visuals')).toHaveAttribute('data-move','Thunderbolt');
    expect(await page.locator('.motion-wrap').evaluateAll(elements=>elements.flatMap(element=>element.getAnimations()).length)).toBe(0);
    await page.keyboard.press('Shift');await expect(page.getByTestId('move-visuals')).toHaveAttribute('data-active','false');
  } finally {await context.close();}
});
