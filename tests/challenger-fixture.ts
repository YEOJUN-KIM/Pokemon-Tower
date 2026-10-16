import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import type {BattleLog} from '../src/battle/run';
import type {BattleView} from '../src/shared/contracts';

// Internal completion fixture, never exposed by HTTP. No probabilistic reruns.
export function finishChallengerBattle(store:TowerStore,id:string,winner='Player'){
 const b=store.battle(id);
 const log:BattleLog={schemaVersion:1,engineVersion:b.engine_version,format:b.format,teams:{p1:b.player_team,p2:b.opponent_team},seed:JSON.parse(b.seed),rule:b.rule,upgrades:JSON.parse(b.upgrades),trainerEquipment:b.trainer_equipment==null?undefined:JSON.parse(b.trainer_equipment),teraTickets:JSON.parse(b.tera_tickets),decisions:[],publicProtocol:[],winner,turns:5};
 const view:BattleView={id,status:'complete',requestId:1,turn:5,team:[],opponent:null,actions:[],messages:[],winner,error:null};
 store.complete(id,log,view);return {log,view};
}
export function challengerFixture(path=':memory:',owner='owner',floor=2){
 const store=new TowerStore(path,max=>max===120?100:0);store.ensurePlayer(owner);
 const first=store.start(owner,starters,'basic',{events:true}),run=store.battle(first).run_id;
 if(floor!==2){store.db.prepare('UPDATE runs SET floor=? WHERE id=?').run(floor-1,run);store.db.prepare('UPDATE battles SET floor=? WHERE id=?').run(floor-1,first);}
 finishChallengerBattle(store,first);store.recruit(owner,run,first,null,null);
 const event=store.view(owner).run!.event!;
 if(event?.kind!=='challenger-selection')throw Error('Challenger fixture requires an eligible floor');
 return {store,run,event,owner};
}
