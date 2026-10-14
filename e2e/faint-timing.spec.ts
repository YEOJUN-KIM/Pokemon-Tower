import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

for(const side of ['enemy','player'] as const)test(`lethal hit keeps ${side} colored until its faint event`,async({browser})=>{
  const origin='http://127.0.0.1:3001',context=await browser.newContext();
  try{
    await context.request.post(origin+'/api/account',{headers:{Origin:origin},data:{action:'register',username:'faint_'+randomUUID().slice(0,8),password:randomUUID()}});
    const initial=await context.request.post(origin+'/api/battle',{headers:{Origin:origin},data:{type:'start',selected:['Charizard','Blastoise','Venusaur']}}).then(r=>r.json());
    const actor=side==='enemy'?'p1a: Charizard':'p2a: Opponent',target=side==='enemy'?'p2a: Opponent':'p1a: Charizard';
    await context.route('**/api/battle',async route=>{
      if(route.request().method()!=='POST'||route.request().postDataJSON().type!=='action')return route.continue();
      await route.fulfill({json:{...initial,battle:{...initial.battle,
        team:initial.battle.team.map((p:{active:boolean;condition:string})=>side==='player'&&p.active?{...p,condition:'0 fnt'}:p),
        opponent:side==='enemy'?{...initial.battle.opponent,condition:'0 fnt'}:initial.battle.opponent,
        messages:[...initial.battle.messages,`|move|${actor}|Flamethrower|${target}`,`|-damage|${target}|0 fnt`,`|faint|${target}`]}}});
    });
    const page=await context.newPage();await page.goto(origin+'/battle');
    await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
    await page.clock.install();await page.clock.pauseAt(new Date());
    for(const skip of [false,true]){
      if(skip){await page.goto(origin+'/battle');await page.clock.runFor(200);}
      await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
      await expect(page.getByTestId('move-visuals')).toHaveAttribute('data-move','Flamethrower');
      await page.clock.runFor(960);
      const sprite=page.locator(`.${side}-position .sprite`),card=page.locator(`.${side}-health`);
      await expect(page.locator(`.${side}-position .motion-hit`)).toHaveCount(1);
      await expect(card.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow','0');
      await expect(sprite).not.toHaveClass(/fainted/);await expect(sprite).toHaveCSS('filter','none');
      await expect(sprite).toHaveCSS('opacity','1');await expect(card).not.toHaveAttribute('data-hp-state','fainted');
      if(skip)await page.keyboard.press('Shift');
      else{
        await page.clock.runFor(750);
        await expect(page.locator(`.${side}-position .motion-faint`)).toHaveCount(1);
        await expect(sprite).toHaveClass(/fainted/);await expect(sprite).toHaveCSS('filter','grayscale(1)');
        await page.clock.runFor(1000);
      }
      await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
      await expect(sprite).toHaveClass(/fainted/);await expect(card).toHaveAttribute('data-hp-state','fainted');
    }
  }finally{await context.close();}
});
