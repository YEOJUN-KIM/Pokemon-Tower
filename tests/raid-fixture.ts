import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {finishChallengerBattle} from './challenger-fixture';
import {createRaidSnapshot,RaidEvents} from '../src/server/raid-events';
import type {BattleView} from '../src/shared/contracts';
import type {BattleLog} from '../src/battle/run';

export function raidFixture(path=':memory:',owner='raid-owner',bossId='garchomp',routeId?:string){
 const store=new TowerStore(path,max=>max===100?0:max-1);store.ensurePlayer(owner);
 const first=store.start(owner,starters,'basic',{events:true}),run=store.battle(first).run_id;
 finishChallengerBattle(store,first);store.recruit(owner,run,first,null,null);
 const event=store.view(owner).run!.event!;
 if(event.kind!=='raid-encounter')throw Error('Raid fixture did not select raid');
 const snapshot=createRaidSnapshot(store.db,run,2,()=>.5,{bossId,routeId});
 store.db.prepare('UPDATE raid_encounters SET snapshot_json=? WHERE event_id=?').run(JSON.stringify(snapshot),event.id);
 return {store,owner,run,event:store.view(owner).run!.event!,snapshot};
}
export function finishRaidBattle(store:TowerStore,id:string,winner='Player'){
 const b=store.battle(id),raids=new RaidEvents(store.db),row=raids.forBattle(id)!;
 const log:BattleLog={schemaVersion:1,engineVersion:b.engine_version,format:b.format,teams:{p1:b.player_team,p2:b.opponent_team},seed:JSON.parse(b.seed),rule:b.rule,upgrades:JSON.parse(b.upgrades),trainerEquipment:JSON.parse(b.trainer_equipment!),teraTickets:JSON.parse(b.tera_tickets),decisions:[],publicProtocol:[],winner,turns:5,raid:raids.snapshot(row)};
 const view:BattleView={id,status:'complete',requestId:1,turn:5,team:[],opponent:null,actions:[],messages:[],winner,error:null};
 store.complete(id,log,view);return {log,view};
}
