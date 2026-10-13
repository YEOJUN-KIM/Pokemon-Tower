import {TowerStore} from '../../src/server/tower-store';
import {villainEncounter,type VillainRank} from '../../src/data/villain-organizations';
import {starters,packTeam} from '../../src/data/teams';
import {runBattle,type Seed} from '../../src/battle/run';
import {DamagePolicy} from '../../src/battle/policy';

// Seek a real event drawn from a new run. Only skip floors to keep fixtures short.
export function findVillainBattle(store:TowerStore,owner:string,rank:VillainRank){
 store.ensurePlayer(owner);
 for(let attempt=0;attempt<200;attempt++){
  const first=store.battle(store.start(owner,starters)),run=first.run_id;
  const previous=!!first.trainer && JSON.parse(first.trainer).role==='villain';
  const organization=store.db.prepare('SELECT organization FROM run_villains WHERE run_id=?').get(run)!.organization as string;
  for(let floor=rank==='boss'?75:rank==='executive'?16:2;floor<100;floor++){
   const drawn=villainEncounter(run,floor,organization,previous);if(drawn?.event.rank!==rank)continue;
   store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
   const row=store.battle(store.enter(owner,run,floor,starters));
   if(row.villain_event && JSON.parse(row.villain_event).rank===rank)return row;
  }
  store.abandon(owner,run);
 }
 throw Error(`No natural ${rank} event found`);
}
export async function villainResult(store:TowerStore,id:string,win=true){
 const before=store.battle(id),weak=packTeam(['Unown','Luvdisc','Delibird']);
 const own=win?before.player_team:weak,enemy=win?weak:before.player_team,seed:Seed=[1,2,3,4];
 store.db.prepare('UPDATE battles SET player_team=?,opponent_team=?,seed=? WHERE id=?').run(own,enemy,JSON.stringify(seed),id);
 const row=store.battle(id);
 const log=await runBattle({teams:{p1:own,p2:enemy},seed,player:new DamagePolicy(),opponent:new DamagePolicy(),format:row.format,upgrades:JSON.parse(row.upgrades),teraTickets:{p1:0,p2:0}});
 // This fixture uses the saved environment; disable tickets in both row and engine.
 store.db.prepare('UPDATE battles SET tera_tickets=? WHERE id=?').run('{"p1":0,"p2":0}',id);
 const view={id,status:'complete' as const,requestId:1,turn:log.turns,team:[],opponent:null,actions:[],messages:log.publicProtocol,winner:log.winner,error:null};
 return {log,view};
}
