import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';

let authToken='';
test.beforeAll(async()=>{
  const id=randomBytes(8).toString('hex'),store=new TowerStore('.data/e2e.sqlite');
  try{
    const account=await new Accounts(store.db).register('ctrl_'+id,'controls-test-password','controls-'+id,undefined);
    authToken=account.token;
  }finally{store.close();}
});
test.beforeEach(async({context})=>{await context.addCookies([{name:'tower_auth',value:authToken,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);});

for(const width of [1280,390])for(const rule of ['basic','mega','dynamax','tera','chaos']){
  test(`${rule} A shortcut and six-slot team at ${width}px`,async({page})=>{
    const kinds=rule==='chaos'?['mega','dynamax','terastallize']:rule==='basic'?[]:[rule==='tera'?'terastallize':rule];
    const roster=['Charizard','Blastoise','Venusaur','Pikachu','Gengar','Garchomp'];
    const data={battle:{id:'controls',requestId:1,status:'waiting',turn:3,
      team:[{species:'Charizard',gender:'F',condition:'120/155',active:true,moves:['Flamethrower']},{species:'Blastoise',condition:'0 fnt',active:false},{species:'Venusaur',condition:'155/155',active:false}],
      opponent:{species:'Snorlax',gender:'M',condition:'100/100'},actions:['move 1','switch 3',...kinds.map(kind=>'move 1 '+kind)].map(command=>({command,label:command})),
      messages:['|turn|3'],winner:null,error:null,teraTickets:1,movePP:[{name:'Flamethrower',pp:14,maxpp:24}],maxMovePP:[{name:'Max Flare',pp:14,maxpp:24}],
      field:{turn:3,effects:[],opponentSize:3,faintedOpponents:[]}},
      tower:{coins:0,growthPoints:0,unlocked:roster,favorites:[],totalFloors:100,run:{id:'run',rule,floor:1,totalFloors:100,state:'battle',roster,suggestedTeam:[],battleId:'controls',upgrades:[],boss:null}}};
    await page.route('**/api/battle',route=>route.fulfill({json:data}));
    await page.setViewportSize({width,height:844});await page.goto('/battle');
    await expect(page.locator('.arena .right-column')).toHaveCount(1);await expect(page.locator('.team-panel')).not.toContainText('나의 팀');await expect(page.locator('.player-health .pokemon-gender')).toHaveText('♀');await expect(page.locator('.enemy-health .pokemon-gender')).toHaveText('♂');const team=page.locator('.team-list');await expect(team.locator('.team-member')).toHaveCount(6);
    await expect(page.getByRole('group',{name:'내 남은 포켓몬 2 / 3',exact:true}).locator('.pokeball')).toHaveCount(3);await expect(page.locator('.player-balls .ball-fainted')).toHaveCount(1);
    await expect(team.locator('.is-muted')).toHaveCount(4);await expect(team.locator('[data-team-state="기절"]')).toHaveCount(1);
    await expect(team.locator('[data-team-state="미출전"]')).toHaveCount(3);
    if(width===1280){await expect(page.locator('.battle-keyboard-hints')).not.toContainText('방향키');await expect(page.locator('.battle-keyboard-hints')).not.toContainText('교체');await expect(page.locator('.battle-keyboard-hints')).not.toContainText('누르기');await expect(page.locator('.battle-keyboard-hints kbd').filter({hasText:/^A$/})).toHaveCount(rule==='basic'?0:1);}
    await page.keyboard.press('a');await expect(page.getByTestId('battle-party')).toHaveCount(0);
    await page.getByRole('button',{name:'싸운다',exact:true}).click();
    const toggles=page.locator('.gimmick-icon-button');
    for(const button of await page.getByTestId('gimmick-dock').locator('button[data-gimmick]:not(:disabled)').all()){await page.keyboard.press('a');const selected=page.locator('.gimmick-icon-button[aria-pressed=true]');await expect(selected).toHaveCount(1);await expect(button).toHaveAttribute('aria-pressed','true');}
    await page.keyboard.press('a');await expect(page.locator('.gimmick-icon-button[aria-pressed=true]')).toHaveCount(0);
    if(kinds.length){await toggles.first().click();await expect(toggles.first()).toHaveAttribute('aria-pressed','true');expect(await toggles.first().evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('none');await toggles.first().click();await page.keyboard.press('ArrowUp');await expect(page.locator('body')).toHaveAttribute('data-game-input','cursor');}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const strip=await team.boundingBox(),health=await page.locator('.enemy-health').boundingBox();expect(strip!.y+strip!.height).toBeLessThanOrEqual(health!.y);
    if(rule==='chaos')await page.screenshot({path:`test-results/battle-controls-${width}.png`,fullPage:true});
    if(rule==='basic'){data.battle.team[0].condition='30/100';await page.reload();const hp=page.locator('.player-health');await expect(hp).toHaveAttribute('data-hp-state','critical');await expect(hp.locator('.hp-track i')).toHaveCSS('background-color','rgb(239, 102, 97)');await expect(hp.locator('.hp-warning')).toHaveCount(0);await page.emulateMedia({reducedMotion:'reduce'});await expect(hp).toHaveCSS('animation-name','none');await expect(page.locator('.player-position img')).toBeVisible();await page.screenshot({path:`test-results/battle-low-health-${width}.png`,fullPage:true});data.battle.team[0].condition='31/100';await page.reload();await expect(hp).toHaveAttribute('data-hp-state','caution');await expect(hp.locator('.hp-warning')).toHaveCount(0);}
    data.tower.run.roster=roster.slice(0,3);await page.reload();await expect(page.locator('.team-member.is-empty')).toHaveCount(3);
  });
}
