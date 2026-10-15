import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {packTeam} from '../src/data/teams';
import {pokemonBattleScale} from '../src/data/pokemon-size';

test('small, medium and giant Pokemon use species size on both arena orientations',async({page,context,baseURL})=>{
  for(const name of ['Dachsbun','Dudunsparce','Tatsugiri','Pikachu','Charizard','Steelix','Wailord']) {
    const suffix=randomBytes(8).toString('hex'),owner='size-'+suffix,store=new TowerStore('.data/e2e.sqlite');
    try {
      const auth=await new Accounts(store.db).register('size_'+suffix,'size-test-password',owner,undefined);
      await context.addCookies([{name:'tower_auth',value:auth.token,url:baseURL!,httpOnly:true,sameSite:'Strict'}]);
      store.ensurePlayer(owner);for(const species of [name,'Tatsugiri','Wailord'])store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,species);
      const team=[name,...['Tatsugiri','Charizard','Wailord'].filter(value=>value!==name)].slice(0,3),id=store.start(owner,team);
      store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam(team),id);
    } finally {store.close();}
    await page.goto('/battle');await expect(page.getByTestId('action-grid')).toBeVisible();
    for(const side of ['player','enemy']) {
      const frame=page.locator(`.${side}-position .pokemon-image-frame`);
      await expect(frame).toHaveAttribute('data-size-scale',String(pokemonBattleScale(name)));
      await expect.poll(()=>frame.locator('img').evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth>0)).toBe(true);
      await expect(frame).toHaveAttribute('data-framing-ready','true');
    }
    await page.screenshot({path:`test-results/battle-size-${name}.png`});
    await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/battle-size-${name}-mobile.png`});await page.setViewportSize({width:1280,height:720});
  }
});
