import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {playerKey} from '../src/server/tower-service';
import {packTeam} from '../src/data/teams';
import {classicCollection} from '../tests/classic-team-fixture';

test('field panel shows real entry hazards on the affected side and counts stacked Spikes',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);classicCollection(store,owner);
    store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,'Golem');
    const names=['Golem','Blastoise','Venusaur'],id=store.start(owner,names);
    const own=Showdown.Teams.unpack(packTeam(names))!,enemy=Showdown.Teams.unpack(packTeam(['Cloyster','Pikachu','Golem']))!;
    own[0].moves=['Stealth Rock'];enemy[0].moves=['Spikes'];
    store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');
    for(let turn=0;turn<3;turn++){
      await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
      await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
    }
    await page.keyboard.down('c');const field=page.getByRole('dialog',{name:'현재 필드 상태'});
    await expect(field.locator('.field-side.p1')).toContainText('압정뿌리기');await expect(field.locator('.field-side.p1')).toContainText('3중첩 · 해제될 때까지');
    await expect(field.locator('.field-side.p2')).toContainText('스텔스록');await expect(field.locator('.field-side.p2')).toContainText('해제될 때까지');await page.keyboard.up('c');
  }finally{store.close();}
});

for(const size of [{width:1280,height:720},{width:390,height:844}])test(`fight, party and animated combined field controls at ${size.width}px`,async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);classicCollection(store,owner);
    for(const name of ['Lucario','Garchomp','Metagross'])store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,name);
    const id=store.start(owner,['Lucario','Garchomp','Metagross']);
    const own=Showdown.Teams.unpack(packTeam(['Lucario','Garchomp','Metagross']))!,enemy=Showdown.Teams.unpack(packTeam(['Tyranitar','Pikachu','Golem']))!;
    own[0].moves=['Swords Dance','Aura Sphere','Meteor Mash','Close Combat'];enemy[0].moves=['Stone Edge'];
    store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
    await page.setViewportSize(size);await page.goto('/battle');
    await expect(page.getByRole('button',{name:'싸운다',exact:true})).toHaveAttribute('data-game-cursor','true');
    const before=await page.request.get('/api/battle').then(r=>r.json());
    await expect(page.locator('.battle-progress')).toContainText('1 / 100층');await expect(page.locator('.battle-coins')).toHaveCSS('color','rgb(255, 225, 108)');
    expect(await page.locator('.current-messages .latest').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(size.width<760 ? 20 : 25);
    await expect(page.locator('.panel-top button')).toHaveCount(1);await page.getByRole('button',{name:'배틀 메뉴 · 설정'}).click();const menu=page.getByRole('dialog',{name:'배틀 메뉴'});await expect(menu.locator('.dex-action-options button')).toHaveText(['설정','도전 포기','타이틀','계속하기']);await expect(menu.getByRole('button',{name:'필드 상태 · C',exact:true})).toHaveCount(0);await expect(menu.getByRole('button',{name:/소리 켜기|소리 끄기/})).toHaveCount(0);await expect(menu.getByRole('button',{name:'포켓몬 도감',exact:true})).toHaveCount(0);await page.keyboard.press('x');await expect(menu).not.toBeVisible();
    await page.keyboard.press('z');
    await expect(page.getByTestId('battle-move-menu')).toBeVisible();
    await expect(page.locator('[data-command="move 1"]')).toHaveAttribute('data-game-cursor','true');
    await expect(page.getByTestId('battle-move-details').locator('.move-category-badge')).toHaveAttribute('data-category','Status');
    for(const [slot,category] of [[1,'Status'],[2,'Special'],[3,'Physical']] as const){await expect(page.locator('[data-command="move '+slot+'"] .move-category-badge')).toHaveAttribute('data-category',category);await expect(page.locator('[data-command="move '+slot+'"] .move-category-badge svg')).toBeVisible();await expect(page.locator('[data-command="move '+slot+'"] .move-category-badge')).toHaveText('');}
    await page.keyboard.press('ArrowRight');await expect(page.getByTestId('battle-move-details').locator('.move-category-badge')).toHaveAttribute('data-category','Special');
    await expect(page.getByTestId('battle-move-details')).toContainText('필중');
    await expect(page.locator('[data-command="move 2"] .move-type-badge')).toHaveAttribute('data-type','Fighting');
    await expect(page.locator('[data-command="move 2"] .move-type-badge svg')).toBeVisible();
    await page.keyboard.press('ArrowDown');await expect(page.locator('[data-command="move 4"]')).toHaveAttribute('data-game-cursor','true');
    await expect(page.getByTestId('battle-move-details').locator('.move-category-badge')).toHaveAttribute('data-category','Physical');await expect(page.getByTestId('battle-move-details')).toContainText('120');
    expect((await page.request.get('/api/battle').then(r=>r.json())).battle.requestId).toBe(before.battle.requestId);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    await page.screenshot({path:`test-results/battle-moves-${size.width}.png`});
    await page.keyboard.press('x');await page.getByRole('button',{name:'교체',exact:true}).click();
    const party=page.getByTestId('battle-party');await expect(party).toContainText('현재 출전 중');await expect(party.locator('.battle-party-option')).toHaveCount(2);
    await expect(party).toContainText('한카리아스');await expect(party).toContainText('메타그로스');
    await page.screenshot({path:`test-results/battle-party-${size.width}.png`});await page.keyboard.press('x');
    await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
    await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
    await expect(page.locator('.command-area')).toHaveCount(0);await expect(page.getByRole('log',{name:'현재 배틀 상황'})).toBeVisible();
    const logBox=await page.locator('.battle-panel>.battle-messages').boundingBox(),panelBox=await page.locator('.battle-panel').boundingBox();expect(logBox!.width).toBeGreaterThan(panelBox!.width*.95);
    await page.screenshot({path:`test-results/battle-log-only-${size.width}.png`});
    await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
    await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeVisible();
    await page.keyboard.down('c');const field=page.getByRole('dialog',{name:'현재 필드 상태'});
    await expect(field).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
    await expect(field).toBeVisible();await expect(field).toContainText('모래바람');await expect(field).toContainText('4–7턴 남음');
    await expect(field.getByLabel('아군 랭크 변화')).toContainText('+2');await expect(field.getByLabel('상대 랭크 변화')).toBeVisible();
    await expect(field).toContainText('루카리오');await expect(field).toContainText('마기라스');
    await page.screenshot({path:`test-results/battle-field-${size.width}.png`});await page.keyboard.up('c');await expect(field).toHaveCount(0);
    await page.getByRole('button',{name:'교체',exact:true}).click();await page.locator('[data-command="switch 2"]').click();
    await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
    expect((await page.request.get('/api/battle').then(r=>r.json())).battle.team.find((p:{active:boolean})=>p.active).species).toBe('Garchomp');
    await page.keyboard.down('c');await expect(page.getByRole('dialog',{name:'현재 필드 상태'}).getByLabel('아군 랭크 변화')).not.toContainText('+2');await page.keyboard.up('c');
  }finally{store.close();}
});

test('forced replacement cannot be cancelled or send the fainted Pokemon back in',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);const names=['Charizard','Blastoise','Venusaur'];const id=store.start(owner,names);
    const own=Showdown.Teams.unpack(packTeam(names))!,enemy=Showdown.Teams.unpack(packTeam(['Golem','Tyranitar','Garchomp']))!;
    own[0].moves=['Scratch'];enemy[0].moves=['Rock Blast'];
    store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.goto('/battle');
    await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator('[data-command="move 1"]').click();
    await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
    const dialog=page.getByRole('dialog',{name:'다음 포켓몬 선택'});await expect(dialog).toBeVisible();await expect(dialog).toContainText('기절');
    await page.keyboard.press('x');await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'돌아가기',exact:true})).toBeDisabled();
    await expect(page.locator('[data-command="switch 2"]')).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('z');
    await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
    await expect(dialog).toHaveCount(0);expect((await page.request.get('/api/battle').then(r=>r.json())).battle.team.find((p:{active:boolean})=>p.active).species).toBe('Blastoise');
  }finally{store.close();}
});

test('combined panel separates both sides screens from shared Trick Room and keeps their timers',async({page,context})=>{
  const token=randomBytes(32).toString('hex'),owner=playerKey(token),store=new TowerStore('.data/e2e.sqlite');
  try{
    store.ensurePlayer(owner);for(const name of ['Bronzong','Blastoise','Venusaur'])store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,name);
    const id=store.start(owner,['Bronzong','Blastoise','Venusaur']);
    const own=Showdown.Teams.unpack(packTeam(['Bronzong','Blastoise','Venusaur']))!,enemy=Showdown.Teams.unpack(packTeam(['Espeon','Pikachu','Golem']))!;
    own[0].moves=['Reflect','Trick Room','Flash Cannon','Psychic'];enemy[0].moves=['Light Screen'];
    store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(Showdown.Teams.pack(own),Showdown.Teams.pack(enemy),'[1,2,3,4]',id);
    await context.addCookies([{name:'tower_session',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);await page.setViewportSize({width:1280,height:720});await page.goto('/battle');
    for(const command of ['move 1','move 2']){
      await page.getByRole('button',{name:'싸운다',exact:true}).click();await page.locator(`[data-command="${command}"]`).click();
      await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');await page.keyboard.press('Shift');await expect(page.locator('.arena')).toHaveAttribute('data-playing','false');
    }
    await page.keyboard.down('c');const field=page.getByRole('dialog',{name:'현재 필드 상태'});await expect(field).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
    await expect(field.locator('.field-side.p1')).toContainText('리플렉터');await expect(field.locator('.field-side.p2')).toContainText('빛의장막');
    await expect(field.locator('.field-side.p1')).toContainText('3–6턴 남음');await expect(field.locator('.field-shared-effects')).toContainText('트릭룸');await expect(field.locator('.field-shared-effects')).toContainText('4턴 남음');
    await page.screenshot({path:'test-results/battle-field-screens-room.png'});await page.keyboard.up('c');
  }finally{store.close();}
});
