import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {classicCollection} from '../tests/classic-team-fixture';
import {packTeam,starters} from '../src/data/teams';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

test('missing PokeAPI images preserve dex, party, details, victory rewards and recruitment',async({page,context},info)=>{
  const owner='pokeapi-'+randomUUID(),store=new TowerStore('.data/e2e.sqlite');
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  try{
    store.ensurePlayer(owner);classicCollection(store,owner);
    const id=store.start(owner,starters,'basic');
    store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(packTeam(['Pikachu','Golem','Cloyster']),id);
    store.db.prepare("UPDATE player_tutorial SET step='Completed' WHERE player_id=?").run(owner);
    const token=(await new Accounts(store.db).register('poke_'+randomUUID().slice(0,8),randomUUID(),owner,undefined)).token;
    await context.addCookies([{name:'tower_auth',value:token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
    const requested:string[]=[];
    await page.route('**/vendor/pokeapi/**',route=>{requested.push(route.request().url());return route.fulfill({status:404,body:'PokeAPI pack not installed'});});
    await page.goto('/pokedex');
    await page.getByRole('searchbox',{name:'이름 검색',exact:true}).fill('리자몽');await page.keyboard.press('Enter');
    await expect(page.getByTestId('dex-partner-display').locator('.dex-image-fallback')).toBeVisible();
    await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();
    await page.getByRole('button',{name:'포켓몬 넣기',exact:true}).click();
    await expect(page.locator('.dex-party-picture').first()).toContainText('◇');
    await page.screenshot({path:info.outputPath('missing-pokeapi-dex-party.png')});
    await page.getByRole('button',{name:'리자몽 상세 보기',exact:true}).click();
    await page.getByRole('button',{name:'포켓몬 정보',exact:true}).click();
    const detail=page.getByRole('dialog',{name:'리자몽 기본 정보'});
    await expect(detail.locator('.summary-sprite')).toContainText('◇');
    await expect(detail.getByRole('img',{name:'종족값 육각형 그래프'})).toBeVisible();
    await page.screenshot({path:info.outputPath('missing-pokeapi-details.png')});
    const row=store.battle(id);
    const log=await runBattle({teams:{p1:row.player_team,p2:row.opponent_team},seed:JSON.parse(row.seed),format:row.format,rule:row.rule,upgrades:JSON.parse(row.upgrades),trainerEquipment:row.trainer_equipment?JSON.parse(row.trainer_equipment):undefined,teraTickets:JSON.parse(row.tera_tickets),player:new DamagePolicy(),opponent:new DamagePolicy()});
    expect(log.winner).toBe('Player');
    store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:'Player',error:null});
    await page.goto('/battle');
    await expect(page.getByTestId('recruitment')).toBeVisible();
    await expect(page.getByRole('log',{name:'승리 보상'})).toContainText('배틀에서 승리했다!');
    const candidate=page.locator('[data-recruit-candidate="Pikachu"]');
    await expect(candidate).toContainText('◇');await candidate.click();
    await page.getByTestId('recruit-menu').getByRole('button',{name:'포켓몬 정보',exact:true}).click();
    await expect(page.getByTestId('recruit-candidate-details').locator('.summary-sprite')).toContainText('◇');
    await page.screenshot({path:info.outputPath('missing-pokeapi-recruit-details.png')});
    expect(requested.length).toBeGreaterThan(0);expect(errors).toEqual([]);
  }finally{store.close();}
});
