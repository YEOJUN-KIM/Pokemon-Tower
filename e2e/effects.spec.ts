import {prepareBattleCommand} from './battle-input';
import {test,expect,type BrowserContext} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam,pokemonSets,starters} from '../src/data/teams';

async function fixture(context:BrowserContext,player:string[],opponent:string[],sash=false) {
  const token=randomBytes(32).toString('hex');
  const store=new TowerStore('.data/e2e.sqlite');
  try {
    const owner=playerKey(token);store.ensurePlayer(owner);
    const id=store.start(owner,starters);
    const enemy=opponent.map(name=>structuredClone(pokemonSets[name as keyof typeof pokemonSets]));
    if(sash){enemy[0].ability='Rock Head';enemy[0].item='Focus Sash';}
    store.db.prepare('UPDATE battles SET player_team = ?, opponent_team = ?, seed = ? WHERE id = ?').run(packTeam(player),Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
  } finally {store.close();}
  await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
}

for(const sash of [false,true])test(`${sash ? 'Focus Sash' : 'Sturdy'} popup and survival log from the real engine`,async({page,context})=>{
  await page.setViewportSize({width:1440,height:1100});
  await fixture(context,['Blastoise','Charizard','Venusaur'],['Golem','Pikachu','Cloyster'],sash);
  await page.goto('/battle');
  await prepareBattleCommand(page,'move 1');await page.locator('[data-command="move 1"]').click();
  const popup=page.getByTestId('effect-notice');
  await expect(popup).toContainText(sash ? '기합의띠' : '옹골참');
  await expect(popup).toHaveClass(/notice-enemy/);
  await expect(page.getByRole('log',{name:'현재 배틀 상황'})).toContainText('버텼다!');
  await page.screenshot({path:`test-results/${sash ? 'sash' : 'sturdy'}-popup.png`,fullPage:true});
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await expect(popup).toHaveCount(0);
  const state=await page.request.get('/api/battle').then(r=>r.json());
  expect(state.battle.opponent.condition).toBe('1/100');
  await page.reload();
  await expect(popup).toHaveCount(0);
  await page.keyboard.press('s');
  await expect(page.getByRole('dialog',{name:'배틀 기록',exact:true})).toContainText('버텼다!');
});

test('Intimidate popup is on its owner and blue drop feedback is on the opponent',async({page,context})=>{
  await page.setViewportSize({width:390,height:844});
  await fixture(context,['Charizard','Gyarados','Blastoise'],['Golem','Pikachu','Cloyster']);
  await page.goto('/battle');
  await page.getByRole('button',{name:'교체',exact:true}).click();
  await page.locator('[data-command="switch 2"]').click();
  await expect(page.getByTestId('effect-notice')).toContainText('갸라도스의위협');
  await expect(page.getByTestId('effect-notice')).toHaveClass(/notice-player/);
  await expect(page.locator('.enemy-position .feedback-stat-down')).toContainText('공격 하락');
  await expect(page.locator('.player-position .feedback-stat-down')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/intimidate-feedback-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'연출 건너뛰기'}).click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await expect(page.getByTestId('effect-notice')).toHaveCount(0);
});

test('Water Absorb blocks Surf at full HP and shows healing when damaged',async({page,context})=>{
  await page.setViewportSize({width:1440,height:1100});
  await fixture(context,['Blastoise','Charizard','Venusaur'],['Lapras','Pikachu','Cloyster']);
  await page.goto('/battle');
  await prepareBattleCommand(page,'move 1');await page.locator('[data-command="move 1"]').click();
  await expect(page.getByTestId('effect-notice')).toContainText('상대 라프라스의저수');
  await expect(page.getByRole('log',{name:'현재 배틀 상황'})).toContainText('효과가 없다');
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  await prepareBattleCommand(page,'move 4');await page.locator('[data-command="move 4"]').click();
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  const damaged=await page.request.get('/api/battle').then(r=>r.json());
  expect(damaged.battle.opponent.condition).not.toBe('100/100');
  await prepareBattleCommand(page,'move 1');await page.locator('[data-command="move 1"]').click();
  await expect(page.getByTestId('effect-notice')).toContainText('상대 라프라스의저수');
  await expect(page.getByTestId('effect-notice')).toHaveClass(/notice-enemy/);
  await expect(page.getByRole('log',{name:'현재 배틀 상황'})).toContainText('물 기술은 효과가 없다');
  await expect(page.locator('.enemy-position .feedback-heal')).toContainText('HP 회복');
  await page.screenshot({path:'test-results/water-absorb-heal.png',fullPage:true});
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  // Lapras can KO Blastoise on this turn; finish the mandatory replacement first.
  if(await page.getByRole('dialog',{name:'다음 포켓몬 선택'}).isVisible()) {
    await page.locator('[data-command="switch 2"]').click();
    await expect(page.getByRole('dialog',{name:'다음 포켓몬 선택'})).toHaveCount(0);
    await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
  }
  await page.keyboard.press('s');
  await expect(page.getByRole('dialog',{name:'배틀 기록',exact:true})).toContainText('HP가 회복되었다');
});

