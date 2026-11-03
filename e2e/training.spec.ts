import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {TowerStore} from '../src/server/tower-store';
import {Accounts} from '../src/server/accounts';
import {defaultProfile} from '../src/server/training';
import {packTeam,starters} from '../src/data/teams';
import {runBattle} from '../src/battle/run';
import {DamagePolicy} from '../src/battle/policy';

test('capture saves only IV improvements and the server rejects raising IVs through training',async({page,context})=>{
  const suffix=randomBytes(8).toString('hex'),owner=`training-${suffix}`;const store=new TowerStore('.data/e2e.sqlite');
  try {
    store.ensurePlayer(owner);store.db.prepare('UPDATE players SET growth_points=1000 WHERE id=?').run(owner);
    const old=defaultProfile('Pikachu');old.ivs={hp:31,atk:12,def:2,spa:20,spd:0,spe:25};
    store.db.prepare('INSERT INTO unlocks VALUES (?,?)').run(owner,'Pikachu');
    store.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,1)').run(owner,'Pikachu',JSON.stringify(old));
    const id=store.start(owner,starters),row=store.battle(id);
    expect(Object.values(Showdown.Teams.unpack(row.player_team)![0].ivs!)).toEqual([0,0,0,0,0,0]);
    const rival=defaultProfile('Pikachu');rival.ivs={hp:3,atk:20,def:31,spa:2,spd:11,spe:28};
    const opponentTeam=packTeam(['Pikachu','Golem','Cloyster'],{Pikachu:rival});
    store.db.prepare('UPDATE battles SET opponent_team=?,seed=? WHERE id=?').run(opponentTeam,'[1,2,3,4]',id);
    const log=await runBattle({teams:{p1:row.player_team,p2:opponentTeam},seed:[1,2,3,4],rule:row.rule as 'basic',player:new DamagePolicy(),opponent:new DamagePolicy(),...(row.trainer_equipment==null?{}:{trainerEquipment:JSON.parse(row.trainer_equipment)})});
    expect(log.winner).toBe('Player');
    store.complete(id,log,{id,status:'complete',requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null});
    store.db.prepare("DELETE FROM auth_limits WHERE key='signup'").run();const auth=await new Accounts(store.db).register(`tr_${suffix}`,'training-test-password',owner,undefined);await context.addCookies([{name:'tower_auth',value:auth.token,url:'http://127.0.0.1:3001',httpOnly:true,sameSite:'Strict'}]);
    await page.request.post('/api/tutorial',{headers:{Origin:'http://127.0.0.1:3001'},data:{event:'skip'}});await page.goto('/battle');
    await page.getByRole('button',{name:'피카츄 영입 선택',exact:true}).click();await page.getByRole('button',{name:'도감에 넣기',exact:true}).click();
    // Recruit flow now registers the Pokemon directly; the saved IVs keep the best of old and incoming.
    await expect(page.getByText('피카츄를 도감에 등록했다.')).toBeVisible();
    const charizard=store.trainingCollection(owner).find(entry=>entry.species==='Charizard')!;
        const pika=store.trainingCollection(owner).find(entry=>entry.species==='Pikachu')!;expect(pika.profile.ivs.hp).toBe(31);expect(pika.profile.ivs.atk).toBe(20);
    const cheating=structuredClone(charizard.profile);cheating.ivs.atk=31;
    const walletBefore=store.view(owner).growthPoints;const rejected=await page.request.post('/api/battle',{headers:{origin:'http://127.0.0.1:3001'},data:{type:'train',species:'Charizard',revision:charizard.revision,profile:cheating}});expect(rejected.status()).toBe(400);expect(store.view(owner).growthPoints).toBe(walletBefore);
  } finally {store.close();}
});
