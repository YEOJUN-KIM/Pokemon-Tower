import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {pokemonSets} from '../src/data/teams';

test('dense archive shares first-party selection, enforces three slots and starts the chosen team',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try {
    store.ensurePlayer(owner);for(const name of Object.keys(pokemonSets))store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,name);
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
    await page.setViewportSize({width:1600,height:1000});await page.goto('/battle?prepare=1');
    await expect(page.getByTestId('team-preview').locator('.preview-empty')).toHaveCount(3);
    expect(await page.getByTestId('dex-list').evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(10);
    await page.getByRole('button',{name:'피카츄 상세 보기',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'피카츄 선택 메뉴'})).toBeVisible();
    await page.getByRole('button',{name:'취소',exact:true}).click();await expect(page.getByTestId('team-preview').locator('.preview-empty')).toHaveCount(3);
    for(const name of ['리자몽','거북왕','이상해꽃']){await page.getByRole('button',{name:`${name} 상세 보기`,exact:true}).click();await page.getByRole('button',{name:'포켓몬 선택하기',exact:true}).click();}
    await page.getByRole('button',{name:'피카츄 상세 보기',exact:true}).click();await expect(page.getByRole('button',{name:'포켓몬 선택하기',exact:true})).toBeDisabled();await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'거북왕 파티 메뉴',exact:true}).click();await page.getByRole('button',{name:'파티에서 제외',exact:true}).click();await expect(page.getByRole('button',{name:'새 도전 시작'})).toBeDisabled();
    await page.getByRole('button',{name:'거북왕 상세 보기',exact:true}).click();await page.getByRole('button',{name:'포켓몬 선택하기',exact:true}).click();
    await page.screenshot({path:'test-results/party-archive-desktop.png',fullPage:true});
    await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.getByRole('button',{name:'능력치 조정',exact:true}).click();
    await expect(page.getByRole('button',{name:'성실 · 능력치 보정 없음',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('slider',{name:'특수공격 포인트 슬라이더',exact:true}).fill('32');await page.getByRole('slider',{name:'스피드 포인트 슬라이더',exact:true}).fill('32');await page.getByRole('slider',{name:'HP 포인트 슬라이더',exact:true}).fill('32');
    await expect(page.getByTestId('stat-point-total')).toHaveText('66 / 66');
    await page.getByRole('button',{name:'조심 · 특수공격 ↑ / 공격 ↓',exact:true}).click();
    await expect(page.getByTestId('training-editor').locator('[data-stat=spa]')).toHaveText('160');await expect(page.getByTestId('training-editor').locator('[data-stat=atk]')).toHaveClass(/stat-down/);
    await expect(page.getByRole('img',{name:'6가지 실제 능력치 그래프'})).toBeVisible();
    await page.screenshot({path:'test-results/stat-adjustment-desktop.png'});
    await page.getByRole('button',{name:'리자몽 능력치 조정 닫기',exact:true}).click();
    // Closing without saving does not spend points or change the saved nature.
    expect(store.trainingCollection(owner).find(entry=>entry.species==='Charizard')!.profile.nature).toBe('Serious');
    await page.getByRole('button',{name:'새 도전 시작'}).click();await page.getByRole('button',{name:'이 룰로 도전 시작',exact:true}).click();await page.getByRole('button',{name:'포켓몬 내보내기',exact:true}).click();await expect(page.getByTestId('action-grid')).toBeVisible();
    expect(store.view(owner).run!.roster).toEqual(['Charizard','Venusaur','Blastoise']);
  }finally{store.close();}
});
