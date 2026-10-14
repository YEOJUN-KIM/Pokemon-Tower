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
    mkdirSync('artifacts/qa/screenshots/move-effects',{recursive:true});
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
      await page.locator('.arena').screenshot({path:`artifacts/qa/screenshots/move-effects/${move.replaceAll(' ','-')}-${width}.png`});
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

for(const move of ['Thunderbolt','Flamethrower'])test(`reduced motion keeps a static cue and does not lunge: ${move}`,async({browser})=>{
  const context=await browser.newContext({reducedMotion:'reduce'});
  try {
    const origin='http://127.0.0.1:3001';
    await context.request.post(origin+'/api/account',{headers:{Origin:origin},data:{action:'register',username:'reduced_'+randomUUID().slice(0,8),password:randomUUID()}});
    const initial=await context.request.post(origin+'/api/battle',{headers:{Origin:origin},data:{type:'start',selected:['Charizard','Blastoise','Venusaur']}}).then(r=>r.json());
    await context.route('**/api/battle',async route=>route.request().method()==='POST'?route.fulfill({json:{...initial,battle:{...initial.battle,messages:[...initial.battle.messages,`|move|p1a: Charizard|${move}|p2a: Opponent`]}}}):route.continue());
    const page=await context.newPage();await page.goto(origin+'/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
    await expect(page.getByTestId('move-visuals')).toHaveAttribute('data-move',move);
    await expect.poll(()=>page.getByTestId('move-visuals').evaluate(element=>{const c=element as HTMLCanvasElement;return c.getContext('2d')!.getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n>25);})).toBe(true);
    expect(await page.locator('.motion-wrap').evaluateAll(elements=>elements.flatMap(element=>element.getAnimations()).length)).toBe(0);
    await page.keyboard.press('Shift');await expect(page.getByTestId('move-visuals')).toHaveAttribute('data-active','false');
  } finally {await context.close();}
});

test('Flamethrower beam grows from Charizard, keeps HP ordering and clears on completion',async({browser})=>{
  const origin='http://127.0.0.1:3001';
  const context=await browser.newContext({viewport:{width:1000,height:800}});
  try {
    await context.request.post(origin+'/api/account',{headers:{Origin:origin},data:{action:'register',username:'beam_'+randomUUID().slice(0,8),password:randomUUID()}});
    const initial=await context.request.post(origin+'/api/battle',{headers:{Origin:origin},data:{type:'start',selected:['Charizard','Blastoise','Venusaur']}}).then(r=>r.json());
    let outcome='hit',enemy=false;
    await context.route('**/api/battle',async route=>{
      if(route.request().method()!=='POST'||route.request().postDataJSON().type!=='action')return route.continue();
      const actor=enemy?'p2a: Opponent':'p1a: Charizard',target=enemy?'p1a: Charizard':'p2a: Opponent';
      const result=outcome==='hit'?`|-damage|${target}|80/100`:outcome==='miss'?`|-miss|${actor}|${target}`:`|-immune|${target}`;
      await route.fulfill({json:{...initial,battle:{...initial.battle,requestId:initial.battle.requestId+1,messages:[...initial.battle.messages,`|move|${actor}|Flamethrower|${target}`,result]}}});
    });
    const page=await context.newPage();
    // The clock controls JS/RAF but CSS animation time can advance during
    // screenshots. Record the defender animation when it is created instead.
    await page.addInitScript(()=>{
      const animate=Element.prototype.animate;
      Element.prototype.animate=function(keyframes,options){
        if(typeof options==='object'&&options.delay===600&&options.duration===240)this.setAttribute('data-test-shakes','1');
        return animate.call(this,keyframes,options);
      };
    });
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/battle');
    await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
    await page.clock.install();await page.clock.pauseAt(new Date());
    const directory='artifacts/qa/screenshots/flamethrower-prototype';mkdirSync(directory,{recursive:true});
    const canvas=page.getByTestId('move-visuals');
    const pixels=()=>canvas.evaluate(element=>{
      const c=element as HTMLCanvasElement,data=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;
      let visible=0;for(let i=3;i<data.length;i+=4)if(data[i]>25)visible++;return visible;
    });
    for(const variant of ['hit','enemy','miss','immune']){
      outcome=variant==='enemy'?'hit':variant;enemy=variant==='enemy';
      if(variant!=='hit'){
        await page.goto(origin+'/battle');await page.clock.runFor(200);
      }
      await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
      await expect(canvas).toHaveAttribute('data-move','Flamethrower');
      const hp=page.locator(enemy?'.player-health [role="progressbar"]':'.enemy-health [role="progressbar"]');
      const originalHP=await hp.getAttribute('aria-valuenow');
      let small=0,full=0;
      for(let i=0;i<20;i++){
        await page.clock.runFor(50);
        if(i===2)small=await pixels();
        if(i===10){full=await pixels();expect(full).toBeGreaterThan(small*2);expect(await hp.getAttribute('aria-valuenow')).toBe(originalHP);}
        if(i===13){
          const shake=await page.locator(enemy?'.player-position .motion-wrap':'.enemy-position .motion-wrap').getAttribute('data-test-shakes');
          expect(shake).toBe(outcome==='hit'?'1':null);
        }
        if(variant==='hit')await page.locator('.arena').screenshot({path:`${directory}/frame-${String(i).padStart(2,'0')}.png`});
      }
      await page.clock.runFor(2500);
      await expect(canvas).toHaveAttribute('data-active','false');expect(await pixels()).toBe(0);
      await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
    }
    expect(errors).toEqual([]);
  } finally {await context.close();}
});
