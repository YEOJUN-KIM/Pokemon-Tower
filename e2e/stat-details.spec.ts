import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {defaultProfile} from '../src/server/training';
import {classicCollection} from '../tests/classic-team-fixture';

for(const width of [1280,390])test(`separate base, IV, training points and nature-adjusted stats at ${width}`,async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);classicCollection(store,owner);
    const profile=defaultProfile('Charizard');profile.ivs={hp:31,atk:0,def:10,spa:31,spd:20,spe:0};profile.evs.hp=16;profile.evs.atk=8;profile.evs.spa=32;profile.nature='Modest';
    store.db.prepare('INSERT OR REPLACE INTO pokemon_training VALUES (?,?,?,1)').run(owner,'Charizard',JSON.stringify(profile));
  }finally{store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.setViewportSize({width,height:900});await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');
  await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.keyboard.press('4');
  const details=page.getByLabel('내 포켓몬 능력치 구성');await expect(details).toContainText('개체값 2V · 2Z');
  await expect(details.locator('[data-stat-detail=hp] td')).toHaveText(['78','31 / 31 · V','16 / 32','169']);
  await expect(details.locator('[data-stat-detail=atk] td')).toHaveText(['84','0 / 31 · Z','8 / 32','87 ↓']);
  expect(await details.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await details.scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/stat-details-${width}.png`,fullPage:true});
  await page.keyboard.press('x');await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.keyboard.press('2');
  const editor=page.getByTestId('training-editor'),hp=editor.locator('.training-stat').first();
  await expect(hp.locator('.training-base-value')).toHaveText('78');await expect(hp.locator('.training-iv-value')).toHaveText('31 / 31');await expect(hp.locator('[data-stat=hp]')).toHaveText('169');
  await editor.getByLabel('HP 능력 포인트',{exact:true}).fill('17');await expect(hp.locator('[data-stat=hp]')).toHaveText('170');
  await expect(hp.locator('.training-iv-value')).toHaveText('31 / 31');
  const maxed=editor.locator('[data-training-stat=spa]');await expect(maxed).toHaveAttribute('data-maxed','true');
  await expect(editor.locator('.stat-radar [data-maxed=true]')).toHaveCount(1);
  await editor.getByRole('button',{name:'특수공격 포인트 줄이기',exact:true}).click();
  await expect(maxed).not.toHaveAttribute('data-maxed','true');await expect(editor.locator('.radar-max-star')).toHaveCount(0);
  await editor.getByRole('button',{name:'특수공격 포인트 늘리기',exact:true}).click();
  await expect(maxed).toHaveAttribute('data-maxed','true');
  expect(await editor.getByLabel('레벨 50 실제 능력치').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:`test-results/stat-editor-${width}.png`,fullPage:true});
});
