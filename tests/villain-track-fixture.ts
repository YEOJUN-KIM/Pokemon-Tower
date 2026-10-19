import {TowerStore} from '../src/server/tower-store';
import {RunEvents} from '../src/server/run-events';
import {eventDefinitions} from '../src/data/run-events';
import type {VillainOrganization} from '../src/data/villain-tracks';
import {starters} from '../src/data/teams';
import {finishChallengerBattle} from './challenger-fixture';
export const trackRegistry={'mystery-chest':eventDefinitions['mystery-chest'],'villain-campaign':eventDefinitions['villain-campaign']};
export function trackFixture(path=':memory:',organization:VillainOrganization='galactic',owner='track',roll:(max:number)=>number=()=>0){
 let armed=false;const store=new TowerStore(path,max=>armed?roll(max):0,trackRegistry);store.ensurePlayer(owner);
 const first=store.start(owner,starters,'basic',{events:true}),run=store.battle(first).run_id;
 store.db.prepare('INSERT INTO run_villain_tracks(run_id,organization) VALUES (?,?)').run(run,organization);
 store.db.prepare('UPDATE run_retries SET retry_limit=3 WHERE run_id=?').run(run);
 finishChallengerBattle(store,first);armed=true;store.recruit(owner,run,first,null,null);
 return {store,run,owner};
}
export function trackEncounter(store:TowerStore,run:string,floor:number,order:number,roll:(max:number)=>number=()=>0){
 store.db.prepare("UPDATE runs SET state='select',floor=? WHERE id=?").run(floor,run);
 store.db.prepare('UPDATE run_encounter_progress SET cleared_count=? WHERE run_id=?').run(order,run);
 new RunEvents(store.db,roll,{'villain-campaign':eventDefinitions['villain-campaign']}).encounter(run,floor-1);
}
