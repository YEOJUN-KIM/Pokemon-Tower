import {test,expect,type Page,type BrowserContext} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {Accounts} from '../src/server/accounts';
import {TowerStore} from '../src/server/tower-store';
import {TutorialStep as S,TUTORIAL_GROWTH_POINTS} from '../src/data/tutorial';
import {TRAINING_POINT_PRICE} from '../src/data/training';
import {packTeam} from '../src/data/teams';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';
import type {BattleView} from '../src/shared/contracts';
test.use({actionTimeout:10000});

async function fixture(context:BrowserContext){
  const owner='tutorial-'+randomBytes(10).toString('hex'),store=new TowerStore(process.env.TOWER_E2E_DB_PATH??'.data/e2e.sqlite');
  store.ensurePlayer(owner);
  const auth=await new Accounts(store.db).register('tut_'+randomBytes(8).toString('hex'),randomBytes(16).toString('hex'),owner,undefined);
  await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001'}]);
  return {owner,store};
}
const step=(page:Page,value:string)=>expect(page.getByTestId('tutorial-overlay')).toHaveAttribute('data-tutorial-step',value,{timeout:15000});
const collection=async(page:Page)=>(await (await page.request.get('/api/battle?view=collection')).json());
async function choose(page:Page,name:string){await page.getByRole('button',{name:`${name} 상세 보기`,exact:true}).click();await page.getByRole('button',{name:'포켓몬 선택하기',exact:true}).click();}

for(const partner of [{species:'Blaziken',name:'번치코'},{species:'Venusaur',name:'이상해꽃'}])test(`new user completes onboarding with ${partner.species}, without selecting Skeledirge`,async({page,context})=>{
  test.setTimeout(120000);
  const {store,owner}=await fixture(context);
  try {
    await page.setViewportSize({width:1440,height:1000});
    await page.goto('/');await step(page,S.NotStarted);
    await page.getByRole('link',{name:'설정',exact:true}).click({force:true});await expect(page).toHaveURL('http://127.0.0.1:3001/');
    await page.getByRole('button',{name:'처음이에요',exact:true}).click();await step(page,S.Introduction);
    const duplicates=await Promise.all([0,1].map(()=>page.request.post('/api/tutorial',{headers:{origin:'http://127.0.0.1:3001'},data:{event:'begin',expected:S.NotStarted}})));
    for(const response of duplicates)expect(response.ok()).toBe(true);
    await page.reload();await step(page,S.Introduction);
    expect((await collection(page)).tower.growthPoints).toBe(TUTORIAL_GROWTH_POINTS);
    await page.getByRole('button',{name:'확인',exact:true}).click();await step(page,S.StartGame);
    await expect(page.locator('[data-tutorial="game-start"]')).toBeVisible();
    await page.screenshot({path:'test-results/tutorial-start.png'});
    await page.getByRole('link',{name:'게임 시작',exact:true}).click();await step(page,S.SelectPokemon);
    await choose(page,partner.name);await step(page,S.RemovePokemon);
    await page.reload();await step(page,S.RemovePokemon);await expect(page.locator('[data-party-slot="0"]')).toContainText(partner.name);
    await page.locator('[data-party-slot="0"]').click();await page.getByRole('button',{name:'파티에서 제외',exact:true}).click();await step(page,S.PokemonInfo);
    await page.reload();await step(page,S.PokemonInfo);
    expect((await (await page.request.get('/api/tutorial')).json()).selectedSpecies).toBe(partner.species);
    await expect(page.getByTestId('tutorial-overlay')).toHaveAttribute('data-tutorial-target-species',partner.species);
    await page.getByRole('button',{name:'라우드본 상세 보기',exact:true}).click({force:true});
    await expect(page.getByRole('dialog',{name:'라우드본 선택 메뉴'})).toHaveCount(0);
    await page.getByRole('button',{name:`${partner.name} 상세 보기`,exact:true}).click();await page.getByRole('button',{name:'기본 정보',exact:true}).click();await step(page,S.PokemonInfoViewed);
    await expect(page.locator('[data-tutorial="pokemon-info"]')).toBeVisible();
    await page.getByRole('button',{name:'확인했어요',exact:true}).click();await step(page,S.StatUpgrade);
    await page.reload();await step(page,S.StatUpgrade);
    await expect(page.getByTestId('tutorial-overlay')).toHaveAttribute('data-tutorial-target-species',partner.species);
    await page.getByRole('button',{name:`${partner.name} 상세 보기`,exact:true}).click();await page.getByRole('button',{name:'포켓몬 설정',exact:true}).click();
    await page.locator('[data-settings-row="hp"]').click();
    await page.getByRole('button',{name:'MAX',exact:true}).click();await expect(page.getByTestId('ev-amount')).toHaveText('32');
    await page.getByRole('button',{name:'적용',exact:true}).click();await page.getByRole('button',{name:`${TUTORIAL_GROWTH_POINTS}P로 설정 저장`,exact:true}).click();await step(page,S.CompleteTeam);
    expect((await collection(page)).training.find((p:{species:string})=>p.species===partner.species).profile.evs.hp).toBe(32);
    expect((await collection(page)).tower.growthPoints).toBe(0);
    await page.getByRole('button',{name:`${partner.name} 포켓몬 설정 닫기`,exact:true}).click();
    for(const name of [partner.name,'리자몽','거북왕'])await choose(page,name);
    await step(page,S.StartBattle);
    await page.reload();await step(page,S.StartBattle);
    await expect(page.getByTestId('team-preview')).toContainText(partner.name);
    await page.locator('[data-tutorial="start-battle"]').click();await page.getByRole('button',{name:'예',exact:true}).click();
    await expect(page.getByRole('button',{name:'연출 건너뛰기',exact:true})).toBeVisible({timeout:15000});await page.getByRole('button',{name:'연출 건너뛰기',exact:true}).click();
    await step(page,S.TypeGuide);await page.getByRole('button',{name:'싸운다',exact:true}).click();
    await expect(page.getByRole('region',{name:'튜토리얼 안내'})).toContainText('×0.5');
    await page.screenshot({path:'test-results/tutorial-type-guide.png'});
    await page.locator('[data-command="move 1"]').click();
    if(await page.getByRole('button',{name:'연출 건너뛰기',exact:true}).isVisible())await page.getByRole('button',{name:'연출 건너뛰기',exact:true}).click();
    await step(page,S.AwaitVictory);
    // Boundary fixture: finish a genuine engine victory against a small test team.
    // No gameplay rule, live content, or actual local account is altered by this test.
    const current=await (await page.request.get('/api/battle')).json(),row=store.battle(current.battle.id);
    const enemy=Showdown.Teams.unpack(packTeam(['Unown','Luvdisc','Delibird']))!;for(const p of enemy)p.level=1;
    const opponent=Showdown.Teams.pack(enemy);store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(opponent,row.id);
    const log=await runBattle({teams:{p1:row.player_team,p2:opponent},seed:JSON.parse(row.seed),rule:row.rule,trainerEquipment:JSON.parse(row.trainer_equipment!),teraTickets:JSON.parse(row.tera_tickets),upgrades:JSON.parse(row.upgrades),player:new DamagePolicy(),opponent:new DamagePolicy()});
    expect(log.winner).toBe('Player');
    store.complete(row.id,log,{...current.battle,status:'complete',winner:'Player',messages:log.publicProtocol,actions:[],error:null} as BattleView);
    await page.reload();await step(page,S.RecruitmentGuide);
    if(!await page.getByTestId('recruitment').isVisible())await page.locator('[data-tutorial="recruit-open"]').click();
    await page.locator('[data-recruit-candidate]').first().click({force:true});
    await expect(page.getByTestId('recruit-menu')).toHaveCount(0);
    await page.getByRole('button',{name:'획득 방법 보기',exact:true}).click();await step(page,S.RecruitmentChoice);
    await page.locator('[data-recruit-candidate]').first().click();
    await expect(page.getByRole('region',{name:'튜토리얼 안내'})).toContainText('동료로 데려가기');
    await page.getByRole('button',{name:'도감에 넣기',exact:true}).click();await step(page,S.Completion);
    expect(store.view(owner).unlocked).toContain('Unown');
    await page.getByRole('button',{name:'모험 계속하기',exact:true}).click();await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
    await page.reload();await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
    expect((await (await page.request.get('/api/tutorial')).json()).step).toBe(S.Completed);
  }finally{store.close();}
});

test('initial skip grants usable starting points once; mid-tutorial skip preserves points and party',async({page,context})=>{
  const {store,owner}=await fixture(context);try{
    await page.goto('/');await page.getByRole('button',{name:'알고 있어요 / 건너뛰기',exact:true}).click();
    await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);expect(store.view(owner).growthPoints).toBe(TUTORIAL_GROWTH_POINTS);
    await page.reload();await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
    await page.goto('/battle?prepare=1');await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.getByRole('button',{name:'포켓몬 설정',exact:true}).click();
    await page.locator('[data-settings-row="hp"]').click();await page.getByRole('button',{name:'MAX',exact:true}).click();await page.getByRole('button',{name:'적용',exact:true}).click();
    await page.getByRole('button',{name:`${TUTORIAL_GROWTH_POINTS}P로 설정 저장`,exact:true}).click();expect(store.view(owner).growthPoints).toBe(0);
    await page.request.post('/api/tutorial',{headers:{Origin:'http://127.0.0.1:3001'},data:{event:'skip'}});expect(store.view(owner).growthPoints).toBe(0);
    // A separate fresh player exercises skip during actual selection.
    const second=await fixture(context);try{
      await page.goto('/');await page.getByRole('button',{name:'처음이에요',exact:true}).click();await page.getByRole('button',{name:'확인',exact:true}).click();await page.getByRole('link',{name:'게임 시작',exact:true}).click();await step(page,S.SelectPokemon);
      await choose(page,'리자몽');await step(page,S.RemovePokemon);
      await page.getByRole('button',{name:'튜토리얼 건너뛰기',exact:true}).click();await page.getByRole('button',{name:'건너뛰기 확정',exact:true}).click();
      await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);await expect(page.locator('[data-party-slot="0"]')).toContainText('리자몽');
      expect(second.store.view(second.owner).growthPoints).toBe(TUTORIAL_GROWTH_POINTS);
      await page.reload();await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);
    }finally{second.store.close();}
  }finally{store.close();}
});

test('existing progressed account has no tutorial interruption',async({page,context})=>{
  const {store,owner}=await fixture(context);try{store.db.prepare('UPDATE players SET growth_points=20 WHERE id=?').run(owner);await page.goto('/');await expect(page.getByRole('link',{name:'게임 시작',exact:true})).toBeVisible();expect((await (await page.request.get('/api/tutorial')).json()).step).toBe(S.Completed);await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0);}finally{store.close();}
});

test('mobile spotlight and native modal guidance remain usable after resizing',async({page,context})=>{
  const {store,owner}=await fixture(context);try{
    await page.setViewportSize({width:390,height:844});await page.goto('/');await step(page,S.NotStarted);
    await expect(page.getByRole('button',{name:'처음이에요',exact:true})).toBeFocused();await page.keyboard.press('Enter');await step(page,S.Introduction);
    await expect(page.getByRole('button',{name:'확인',exact:true})).toBeFocused();await page.keyboard.press('Enter');await step(page,S.StartGame);
    await page.screenshot({path:'test-results/tutorial-mobile-start.png'});
    await page.getByRole('link',{name:'게임 시작',exact:true}).click();await step(page,S.SelectPokemon);
    await choose(page,'리자몽');await step(page,S.RemovePokemon);
    await page.locator('[data-party-slot="0"]').click();await page.getByRole('button',{name:'파티에서 제외',exact:true}).click();await step(page,S.PokemonInfo);
    await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.getByRole('button',{name:'기본 정보',exact:true}).click();await step(page,S.PokemonInfoViewed);
    await page.getByRole('button',{name:'확인했어요',exact:true}).click();await page.getByRole('button',{name:'리자몽 기본 정보 닫기',exact:true}).click();
    await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();await page.getByRole('button',{name:'포켓몬 설정',exact:true}).click();
    await page.locator('[data-settings-row="hp"]').click();await page.getByRole('slider',{name:'HP 투자 포인트'}).focus();await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'적용',exact:true}).click();
    await page.setViewportSize({width:430,height:932});
    await page.screenshot({path:'test-results/tutorial-mobile-upgrade.png'});
    await page.getByRole('button',{name:'8P로 설정 저장',exact:true}).click();await step(page,S.CompleteTeam);
    expect(store.view(owner).growthPoints).toBe(TUTORIAL_GROWTH_POINTS-TRAINING_POINT_PRICE);
    const bounds=await page.getByRole('region',{name:'튜토리얼 안내'}).boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(430);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(932);
  }finally{store.close();}
});
