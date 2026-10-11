import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam} from '../src/data/teams';
import {pokemonBattleScale} from '../src/data/pokemon-size';

test('small, medium and giant Pokemon use species size on both arena orientations',async({page,context})=>{
  for(const name of ['Tatsugiri','Charizard','Wailord']) {
    const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
    try {
      store.ensurePlayer(owner);for(const species of ['Tatsugiri','Wailord'])store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,species);
      const team=[name,...['Tatsugiri','Charizard','Wailord'].filter(value=>value!==name)],id=store.start(owner,team);
      store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam(team),id);
    } finally {store.close();}
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
    await page.goto('/battle');await expect(page.getByTestId('action-grid')).toBeVisible();
    for(const side of ['player','enemy']) {
      const frame=page.locator(`.${side}-position .pokemon-image-frame`);
      await expect(frame).toHaveAttribute('data-size-scale',String(pokemonBattleScale(name)));
      await expect.poll(()=>frame.locator('img').evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth>0)).toBe(true);
    }
    await page.screenshot({path:`test-results/battle-size-${name}.png`});
    await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/battle-size-${name}-mobile.png`});await page.setViewportSize({width:1280,height:720});
  }
});
