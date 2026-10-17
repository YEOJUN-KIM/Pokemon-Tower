import {TowerStore} from '../src/server/tower-store';
import {RunEvents} from '../src/server/run-events';
import {eventDefinitions} from '../src/data/run-events';
import {isRocketStage} from '../src/data/villain-campaigns';
import {starters} from '../src/data/teams';
import {finishChallengerBattle} from './challenger-fixture';
import {transaction} from '../src/server/storage/transaction';

export const rocketRegistry=Object.fromEntries(Object.entries(eventDefinitions).filter(([kind])=>isRocketStage(kind)));
export function rocketFixture(path=':memory:',owner='rocket'){
 const store=new TowerStore(path,()=>0,rocketRegistry);store.ensurePlayer(owner);
 const first=store.start(owner,starters,'basic',{events:true}),run=store.battle(first).run_id;
 store.db.prepare('UPDATE run_retries SET retry_limit=3 WHERE run_id=?').run(run);
 finishChallengerBattle(store,first);store.recruit(owner,run,first,null,null);
 return {store,run,owner,event:store.view(owner).run!.event!};
}
export function nextRocketEvent(store:TowerStore,run:string,owner='rocket'){
 const pending=store.view(owner).run!.event;if(pending)store.continueEvent(owner,run,pending.id);
 let floor=store.view(owner).run!.floor+3;if((floor-1)%5===0)floor++;
 store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,run);
 store.db.prepare('UPDATE run_encounter_progress SET cleared_count=cleared_count+3 WHERE run_id=?').run(run);
 transaction(store.db,()=>new RunEvents(store.db,()=>0,rocketRegistry).encounter(run,floor-1));
 return store.view(owner).run!.event!;
}
