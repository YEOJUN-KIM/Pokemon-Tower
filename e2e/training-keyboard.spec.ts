import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {classicCollection} from '../tests/classic-team-fixture';

for(const width of [1280,390])test(`training rows, ability description and tera popup work with keyboard at ${width}`,async({page,context})=>{
 const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
 try{store.ensurePlayer(owner);classicCollection(store,owner);store.db.prepare('UPDATE players SET growth_points=1000 WHERE id=?').run(owner);}finally{store.close();}
 await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width,height:900});await page.goto('/pokedex');await expect(page.getByTestId('dex-progress')).toHaveText('27 / 612');
 await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.keyboard.press('2');
 const editor=page.getByTestId('training-editor'),tab=editor.getByRole('tab',{name:'능력치',exact:true});await expect(tab).toHaveAttribute('data-game-cursor','true');
 await page.keyboard.press('z');await expect(editor.getByRole('button',{name:'HP 노력치 조정',exact:true})).toHaveAttribute('data-game-cursor','true');
 await page.keyboard.press('ArrowRight');await expect(editor.getByLabel('HP 능력 포인트',{exact:true})).toHaveValue('1');
 await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');await expect(editor.getByLabel('공격 능력 포인트',{exact:true})).toHaveValue('1');
 await page.keyboard.press('ArrowUp');await expect(editor.getByRole('button',{name:'HP 노력치 조정',exact:true})).toHaveAttribute('data-game-cursor','true');
 await page.keyboard.press('x');await expect(tab).toHaveAttribute('data-game-cursor','true');
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('z');
 const ability=editor.getByRole('button',{name:'특성 선택',exact:true});await expect(ability).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('z');
 const popup=page.getByRole('dialog',{name:'특성 선택',exact:true});await expect(popup).toBeVisible();await expect(popup.getByRole('button',{name:'맹화',exact:true}).locator('small')).not.toBeEmpty();
 await page.screenshot({path:`test-results/ability-picker-${width}.png`,fullPage:true});
 await page.keyboard.press('x');await expect(popup).toHaveCount(0);await expect(ability).toHaveAttribute('data-game-cursor','true');
 await page.keyboard.press('z');await page.keyboard.press('ArrowDown');await page.keyboard.press('z');await expect(ability).toContainText('선파워');
 await page.keyboard.press('ArrowDown');const tera=editor.getByRole('button',{name:'테라스탈 선택',exact:true});await expect(tera).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('z');
 const types=page.getByRole('dialog',{name:'테라스탈 선택',exact:true});await expect(types.locator('.training-tera-options button')).toHaveCount(19);
 await page.screenshot({path:`test-results/tera-picker-${width}.png`,fullPage:true});
 await page.keyboard.press('ArrowRight');await page.keyboard.press('z');await expect(tera).toContainText('물');
 await page.keyboard.press('x');await expect(editor.getByRole('tab',{name:'특성·테라스탈',exact:true})).toHaveAttribute('data-game-cursor','true');
 await page.keyboard.press('z');await expect(ability).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
 await expect(editor.getByRole('button',{name:'52P로 설정 저장',exact:true})).toHaveAttribute('data-game-cursor','true');
 await page.keyboard.press('z');await expect(page.getByRole('status')).toHaveText('설정 저장 완료');
 const data=await (await page.request.get('/api/battle?view=collection')).json(),saved=data.training.find((entry:{species:string})=>entry.species==='Charizard');expect(saved.profile.ability).toBe('Solar Power');expect(saved.profile.teraType).toBe('Water');expect(saved.profile.evs.hp).toBe(1);expect(saved.profile.evs.atk).toBe(1);
});
