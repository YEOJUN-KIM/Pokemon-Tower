import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {packTeam} from '../src/data/teams';

for(const lead of ['Meowscarada','Miraidon'])test(`missing external images, VFX, audio and font do not block a real battle turn (${lead})`,async({page,context},info)=>{
  const store=new TowerStore('.data/e2e.sqlite'),owner='asset-'+randomUUID();
  let token:string,battleId:string;
  try{
    store.ensurePlayer(owner);
    const auth=await new Accounts(store.db).register('asset_'+randomUUID().slice(0,8),randomUUID(),owner,undefined);token=auth.token;
    store.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,lead);
    const id=store.start(owner,[lead,'Blastoise','Venusaur'],'chaos');battleId=id;
    const team=Showdown.Teams.unpack(store.battle(id).player_team)!;team[0].item='Leftovers';
    store.db.prepare('UPDATE battles SET player_team=? WHERE id=?').run(Showdown.Teams.pack(team),id);
    // Keep this asset test independent of a random opponent knocking out the lead.
    const enemy=Showdown.Teams.unpack(packTeam(['Blastoise','Venusaur','Charizard']))!;
    for(const pokemon of enemy)pokemon.moves=['Protect'];
    store.db.prepare('UPDATE battles SET opponent_team=? WHERE id=?').run(Showdown.Teams.pack(enemy),id);
    store.db.prepare("UPDATE player_tutorial SET step='Completed' WHERE player_id=?").run(owner);
  }finally{store.close();}
  await context.addCookies([{name:'tower_auth',value:token!,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
  await page.addInitScript(id=>{
    localStorage.setItem('tower-audio-v1',JSON.stringify({muted:false,musicVolume:30,effectsVolume:40}));
    localStorage.setItem('tower-playback-speed-v1','4');
    sessionStorage.setItem('tower-pending-intro',id);
  },battleId!);
  const errors:string[]=[],requested:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(/\/(vendor|sprites|audio|fonts)\//,route=>{requested.push(new URL(route.request().url()).pathname);return route.fulfill({status:404,body:'Optional asset missing'});});
  await page.goto('/battle');
  await expect(page.locator('.sprite-fallback').first()).toBeVisible();
  await expect(page.locator('[data-trainer-fallback]').first()).toBeVisible();
  await expect(page.locator('img[src="/assets/original/trainer-placeholder.svg"]').first()).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift');
  await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'싸운다',exact:true}).click();
  const moved=page.waitForResponse(response=>response.url().endsWith('/api/battle')&&response.request().method()==='POST');
  await page.locator('[data-command="move 1"]').click();
  expect((await moved).ok()).toBe(true);
  await expect(page.locator('.arena')).toHaveAttribute('data-playing','false',{timeout:20_000});
  await expect(page.getByRole('button',{name:'싸운다',exact:true})).toBeEnabled();
  expect(requested.some(url=>url.startsWith('/vendor/'))).toBe(true);
  expect(requested.some(url=>url.startsWith(lead==='Miraidon'?'/vendor/showdown/pokemon/':'/vendor/pokerogue/'))).toBe(true);
  expect(requested.some(url=>url.startsWith('/audio/bgm/'))).toBe(true);
  expect(requested.some(url=>url.startsWith('/audio/cries/'))).toBe(false);
  expect(errors).toEqual([]);
  await page.screenshot({path:info.outputPath('missing-assets-battle.png')});
  await page.goto('/pokedex');
  await expect(page.locator('img[src="/assets/original/gimmick-placeholder.svg"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="dex-progress"]')).toContainText(lead==='Miraidon'?'28 /':'27 /');
  expect(errors).toEqual([]);
});
