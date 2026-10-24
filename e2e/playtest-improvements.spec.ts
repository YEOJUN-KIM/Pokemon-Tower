import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {starters} from '../src/data/teams';
let token='';
const testDatabase=process.env.TOWER_E2E_DB_PATH??'.data/e2e.sqlite';
test.beforeAll(async()=>{const id=randomBytes(7).toString('hex'),store=new TowerStore(testDatabase);try{const owner='playtest-'+id;token=(await new Accounts(store.db).register('playtest_'+id,'playtest-password',owner,undefined)).token;store.ensurePlayer(owner);store.db.prepare("INSERT INTO player_tutorial(player_id,step) VALUES (?,'Completed')").run(owner);}finally{store.close();}});
test.beforeEach(async({context})=>{await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);});

for(const speed of [1,2,4])test(`${speed}x playback saves through settings and preserves the attack and final HP`,async({page})=>{
  await page.setViewportSize(speed===4?{width:390,height:844}:speed===2?{width:1920,height:1080}:{width:1280,height:844});
  await page.goto('/settings');await page.getByRole('tab',{name:'배틀 설정',exact:true}).click();await expect(page.getByRole('link',{name:'포켓몬 도감으로 이동 ↗'})).toHaveCount(0);await page.getByRole('group',{name:'배틀 배속',exact:true}).getByRole('button',{name:speed+'배',exact:true}).click();await page.reload();await page.getByRole('tab',{name:'배틀 설정',exact:true}).click();await expect(page.getByRole('group',{name:'배틀 배속',exact:true}).getByRole('button',{name:speed+'배',exact:true})).toHaveAttribute('aria-pressed','true');
  const data={battle:{id:'playback',requestId:1,status:'waiting',turn:3,team:[{species:'Charizard',condition:'155/155',active:true}],opponent:{species:'Snorlax',condition:'100/100'},actions:[{command:'move 1',label:'Flamethrower'}],messages:['|turn|3'],winner:null,error:null,movePP:[{name:'Flamethrower',pp:14,maxpp:24}]},tower:{coins:0,growthPoints:0,unlocked:starters,run:{id:'run',floor:1,totalFloors:100,state:'battle',rule:'basic',roster:starters,suggestedTeam:starters,upgrades:[],boss:null}}};
  const after={...data,battle:{...data.battle,requestId:2,turn:4,opponent:{species:'Snorlax',condition:'50/100'},messages:[...data.battle.messages,'|move|p1a: Charizard|Flamethrower|p2a: Snorlax','|-ability|p2a: Snorlax|Thick Fat','|-damage|p2a: Snorlax|50/100','|turn|4']}};
  await page.route('**/api/battle',route=>route.fulfill({json:route.request().method()==='POST'?after:data}));
  await page.goto('/battle');await page.getByRole('button',{name:'싸운다',exact:true}).click();
  await page.evaluate(()=>{const observer=new MutationObserver(()=>{if(document.querySelector('.motion-move'))(window as any).__sawAttack=true;const state=window as any;if(document.querySelector('.effect-notice'))state.__noticeStart??=performance.now();else if(state.__noticeStart&&!state.__noticeEnd)state.__noticeEnd=performance.now();});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});});
  const began=Date.now();await page.locator('[data-command="move 1"]').click();await expect(page.locator('.arena')).toHaveAttribute('data-playing','true');
  await expect.poll(()=>page.locator('.arena').evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.playbackRate===Number(localStorage.getItem('tower-playback-speed-v1'))))).toBe(true);
  const skip=page.getByRole('button',{name:'연출 건너뛰기',exact:true});await expect(skip).toBeVisible();await expect(page.locator('.arena .skip-motion')).toHaveCount(0);await expect(page.locator('.battle-messages .skip-motion')).toHaveCount(1);
  const notice=page.getByTestId('effect-notice');await expect(notice).toBeVisible();await page.waitForTimeout(400);await expect(notice).toBeVisible();await expect(notice).toHaveCSS('opacity','1');await page.screenshot({path:`test-results/battle-layout-speed-${speed}.png`,fullPage:true});
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:10000});
  expect(await page.evaluate(()=>(window as any).__sawAttack)).toBe(true);expect(await page.evaluate(()=>(window as any).__noticeEnd-(window as any).__noticeStart)).toBeGreaterThanOrEqual(1100);await expect(page.locator('.enemy-health')).toContainText('50%');
  if(speed===4)expect(Date.now()-began).toBeLessThan(3500);
});

for(const width of [1280,390])test(`new species and new moves are separate labels at ${width}px`,async({page})=>{
  const data={battle:null,tower:{coins:100,growthPoints:0,unlocked:starters,run:{id:'run',floor:2,totalFloors:100,state:'recruit',rule:'basic',roster:starters,suggestedTeam:starters,upgrades:[],boss:null,reward:100,battleId:'recruit',candidates:['Gengar','Charizard','Blastoise','Venusaur'],candidateIVs:{},collectionIVs:{},candidateMoves:{Gengar:['Shadow Ball'],Charizard:['Flamethrower','Air Slash']},collectionMoves:{Gengar:[],Charizard:['Flamethrower']},currentMoves:{},victories:1}}};
  await page.route('**/api/battle',route=>route.fulfill({json:data}));await page.setViewportSize({width,height:844});await page.goto('/battle');
  const newCard=page.getByRole('button',{name:'팬텀 영입 선택',exact:true}),knownCard=page.getByRole('button',{name:'리자몽 영입 선택',exact:true});
  await expect(newCard).toContainText('새 포켓몬 · 도감 미등록');await expect(newCard).toContainText('새 기술 1개');await expect(knownCard).toContainText('도감 등록됨');await expect(knownCard).toContainText('새 기술 1개');
  const grid=page.locator('.pokemon-selection');await grid.evaluate(el=>{(el as HTMLElement).style.gridTemplateColumns='repeat(2,minmax(0,1fr))';const buttons=el.querySelectorAll('button');buttons[1].disabled=true;buttons[2].disabled=true;});await page.mouse.move(0,0);await newCard.hover();await page.keyboard.press('ArrowDown');if(width===1280)await expect(page.getByRole('button',{name:'이상해꽃 영입 선택',exact:true})).toHaveAttribute('data-game-cursor','true');await page.keyboard.press('ArrowUp');if(width===1280)await expect(newCard).toHaveAttribute('data-game-cursor','true');
  await newCard.click();await page.getByRole('button',{name:'도감에 등록',exact:true}).click();const confirmation=page.getByTestId('recruit-confirmation');
  await expect(confirmation).toContainText('새 포켓몬 · 첫 도감 등록');await expect(confirmation).toContainText('포켓몬: 새 도감 등록');await expect(confirmation).toContainText('기술: 새 기술 1개 수집');
  expect(await confirmation.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:`test-results/recruit-labels-${width}.png`,fullPage:true});
});

test('a saved three-item tool shop is filled to four real products',async({page})=>{
  const initial=await page.request.get('/api/battle').then(r=>r.json());
  const store=new TowerStore(testDatabase);let state;
  try{const owner=new Accounts(store.db).session(token)!.player_id;store.ensurePlayer(owner);const battle=store.start(owner,starters);const run=store.battle(battle).run_id;store.db.prepare("UPDATE runs SET floor=11,state='select' WHERE id=?").run(run);store.db.prepare('INSERT INTO item_shops VALUES (?,?,?)').run(run,11,JSON.stringify(['Leftovers','Sitrus Berry','Focus Sash']));store.db.prepare('UPDATE players SET coins=100000 WHERE id=?').run(owner);state={...initial,battle:null,tower:store.view(owner)};}finally{store.close();}
  await page.route('**/api/battle',route=>route.fulfill({json:state}));await page.goto('/battle');await page.getByTestId('maintenance-shop').click();await page.getByRole('button',{name:'지닌 도구',exact:true}).click();
  const products=page.getByTestId('held-item-products');await expect(products.locator('.shop-product')).toHaveCount(4);await expect(products.getByLabel('품절 슬롯')).toHaveCount(0);await expect(products.locator('button[data-held-item]')).toHaveCount(4);
  const choices=products.locator('button[data-held-item]');await choices.evaluateAll(buttons=>{(buttons[1] as HTMLButtonElement).disabled=true;(buttons[2] as HTMLButtonElement).disabled=true;(buttons[0] as HTMLButtonElement).disabled=false;(buttons[3] as HTMLButtonElement).disabled=false;});
  await page.mouse.move(0,0);await choices.nth(0).hover();await page.keyboard.press('ArrowDown');await expect(choices.nth(3)).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('ArrowUp');await expect(choices.nth(0)).toHaveAttribute('data-game-cursor','true');
  await page.keyboard.press('ArrowRight');await expect(choices.nth(3)).toHaveAttribute('data-game-cursor','true');
  const fourthName=await products.locator('.shop-product').nth(3).locator('strong').first().innerText();
  await page.keyboard.press('z');await expect(page.getByRole('dialog').last()).toContainText(fourthName);await expect(page.getByTestId('purchase-item-bag')).toBeVisible();
});

test('egg moves are badges and shiny names retain their star',async({page})=>{
  const state=await page.request.get('/api/battle?view=collection').then(r=>r.json());
  const egg={species:'Gengar',isNew:true,shiny:true,newShiny:true,ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},newMoves:['Shadow Ball'],ivGain:{species:'Gengar',changes:[]}};
  await page.route('**/api/battle*',route=>route.fulfill({json:{...state,tower:{...state.tower,growthPoints:20000},...(route.request().method()==='POST'?{permanentResult:{message:'알이 부화했어요!',eggs:[egg]}}:{})}}));
  await page.goto('/eggs');await page.getByRole('button',{name:'10회 뽑기 · 2,000P',exact:true}).click();
  const card=page.getByTestId('egg-result');await expect(card).toBeVisible();await expect(card.locator('h3')).toContainText('팬텀 ✦');await expect(card.locator('.egg-new-moves b')).toHaveText('새 기술');await expect(card.locator('.egg-new-moves span')).toHaveCSS('border-top-width','1px');
  await page.screenshot({path:'test-results/egg-move-badge.png',fullPage:true});
});

for(const width of [1280,390])test('settings tabs and keyboard return at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:844});await page.goto('/pokedex');await page.goto('/settings');
  const sound=page.getByRole('tab',{name:'소리',exact:true}),battle=page.getByRole('tab',{name:'배틀 설정',exact:true});
  await expect(sound).toHaveAttribute('aria-selected','true');await expect(page.getByRole('tabpanel')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await expect(page.getByRole('checkbox',{name:/전체 음소거/})).toBeEnabled();await page.keyboard.press('z');await expect(page.getByRole('checkbox',{name:/전체 음소거/})).toBeFocused();
  await page.keyboard.press('ArrowDown');await expect(page.getByRole('slider',{name:'BGM 크기',exact:true})).toBeFocused();
  const volumeBefore=Number(await page.getByRole('slider',{name:'BGM 크기',exact:true}).inputValue());await page.keyboard.press('ArrowRight');await expect(page.getByRole('slider',{name:'BGM 크기',exact:true})).toHaveValue(String(volumeBefore+1));
  await page.keyboard.press('x');await expect(sound).toBeFocused();await page.keyboard.press('ArrowRight');await expect(battle).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('z');const speeds=page.getByRole('group',{name:'배틀 배속',exact:true});await expect(speeds.getByRole('button',{name:'1배',exact:true})).toBeFocused();await page.keyboard.press('ArrowRight');await expect(speeds.getByRole('button',{name:'2배',exact:true})).toBeFocused();await expect(speeds.getByRole('button',{name:'2배',exact:true})).toHaveAttribute('aria-pressed','false');await page.keyboard.press('z');await expect(speeds.getByRole('button',{name:'2배',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('x');await expect(battle).toBeFocused();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'계정',exact:true})).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('z');await expect(page.getByRole('button',{name:'로그아웃',exact:true})).toBeFocused();
  await expect(page.getByRole('link',{name:'계정 관리 ↗',exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'내 게임으로 돌아가기 ↗',exact:true})).toHaveCount(0);
  await expect(page.getByRole('tabpanel')).toContainText('로그인 계정');await expect(page.getByRole('tabpanel')).not.toContainText('게스트');
  await page.getByRole('tab',{name:'소리',exact:true}).click();await page.screenshot({path:'test-results/settings-tabs-'+width+'.png',fullPage:true});
  await page.keyboard.press('x');await expect(page).toHaveURL('http://127.0.0.1:3001/pokedex');
});

test('sound choices open on Z and volume can be cancelled or saved',async({page})=>{
  await page.goto('/settings');const trigger=page.getByRole('button',{name:'미리듣기 효과음',exact:true});await trigger.focus();await trigger.hover();await page.keyboard.press('z');
  const picker=page.getByRole('dialog',{name:'미리듣기 효과음',exact:true});await expect(picker).toBeVisible();await page.keyboard.press('ArrowDown');const next=await picker.locator('[data-game-cursor=true]').innerText();await page.keyboard.press('z');await expect(picker).toHaveCount(0);await expect(trigger).toContainText(next.trim());
  const music=page.getByRole('button',{name:'미리듣기 곡',exact:true});await music.hover();await page.keyboard.press('z');await expect(page.getByRole('dialog',{name:'미리듣기 곡',exact:true})).toBeVisible();await page.keyboard.press('x');await expect(page.getByRole('dialog')).toHaveCount(0);
  const slider=page.getByRole('slider',{name:'BGM 크기',exact:true}),before=Number(await slider.inputValue());await slider.focus();await page.keyboard.press('z');
  const volume=page.getByRole('dialog',{name:'BGM 음량',exact:true});await expect(volume).toBeVisible();await volume.getByRole('button',{name:'음량 10 높이기',exact:true}).click();await page.keyboard.press('x');await expect(slider).toHaveValue(String(before));
  await slider.focus();await page.keyboard.press('z');await volume.getByRole('button',{name:'음량 10 높이기',exact:true}).click();await volume.getByRole('button',{name:'결정',exact:true}).click();await expect(slider).toHaveValue(String(Math.min(100,before+10)));
  await slider.focus();await page.keyboard.press('z');await expect(volume.getByRole('button',{name:'BGM 음량 닫기',exact:true})).toBeVisible();expect((await volume.getByRole('button',{name:'결정',exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);await page.screenshot({path:'test-results/settings-volume-popup.png',fullPage:true});await page.keyboard.press('x');
  await expect(page.getByRole('button',{name:/음량 선택/})).toHaveCount(0);
  await page.getByRole('checkbox',{name:/전체 음소거/}).uncheck();await expect(page.getByRole('button',{name:'효과음 들어보기',exact:true})).toBeEnabled();await trigger.hover();await page.keyboard.press('ArrowRight');await expect(page.getByRole('button',{name:'효과음 들어보기',exact:true})).toBeFocused();await page.keyboard.press('ArrowDown');await expect(music).toBeFocused();await page.keyboard.press('ArrowUp');await expect(trigger).toBeFocused();await expect(trigger).toHaveCSS('outline-color','rgb(144, 170, 183)');
  await page.screenshot({path:'test-results/settings-preview-layout.png',fullPage:true});
});
