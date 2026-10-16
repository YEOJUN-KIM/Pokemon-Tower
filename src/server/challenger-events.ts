import type {DatabaseSync} from 'node:sqlite';
import {drawChallengers,challengerCandidate,type SavedChallengerDefinition} from '../data/challengers';
import {createHash} from 'node:crypto';
import {encounterRandom} from './opponent-team';
import type {Seed} from '../battle/run';
import {applyRewardOption} from './rewards';
import {BattleRequestError} from './request-error';
import {generateNpcEncounter} from './npc-encounters';
import type {BattleRule} from '../data/run-rules';
import {CURRENT_PROGRESSION,type TowerProgression} from '../data/tower-progression';
import {drawChallengers as drawLegacyChallengers} from '../data/legacy-challengers';

type Encounter={event_id:string;candidates_json:string;selected_id:string|null;battle_id:string|null;phase:'choice'|'battle'|'reward'};
// The owning TowerStore transaction covers battle creation, grants and receipts.
export class ChallengerEvents{
 constructor(private readonly db:DatabaseSync){}
 create(eventId:string,floor:number,rule:BattleRule='basic',progression:TowerProgression=CURRENT_PROGRESSION,common=true){
  const digest=createHash('sha256').update(eventId).digest();
  const seed=[0,4,8,12].map(offset=>digest.readUInt32LE(offset)) as Seed;
  const random=encounterRandom(seed);
  const candidates=common?drawChallengers(floor,random).map(candidate=>{
   const teamSeed=[0,1,2,3].map(()=>Math.floor(random()*65536)) as Seed;
   return {...candidate,encounter:generateNpcEncounter(floor,teamSeed,candidate.sample,candidate.rank,rule,progression)};
  }):drawLegacyChallengers(floor,random);
  this.db.prepare('INSERT INTO challenger_encounters(event_id,candidates_json) VALUES (?,?)').run(eventId,JSON.stringify(candidates));
 }
 row(eventId:string){return this.db.prepare('SELECT * FROM challenger_encounters WHERE event_id=?').get(eventId) as Encounter|undefined;}
 pending(runId:string){return this.db.prepare("SELECT c.* FROM challenger_encounters c JOIN run_events e ON e.id=c.event_id WHERE e.run_id=? AND e.status!='complete'").get(runId) as Encounter|undefined;}
 view(eventId:string){const row=this.row(eventId);return row?{phase:row.phase,challengers:(JSON.parse(row.candidates_json) as SavedChallengerDefinition[]).map(challengerCandidate)}:{};}
 definition(eventId:string,id:unknown){const row=this.row(eventId);const definition=row&&(JSON.parse(row.candidates_json) as SavedChallengerDefinition[]).find(c=>c.id===id);if(!definition)throw new BattleRequestError('저장된 도전자 후보를 선택하세요.',400);return definition;}
 start(eventId:string,id:string,battleId:string){this.db.prepare("UPDATE challenger_encounters SET selected_id=?,battle_id=?,phase='battle' WHERE event_id=?").run(id,battleId,eventId);this.db.prepare('UPDATE run_events SET choice_id=? WHERE id=?').run(id,eventId);}
 retry(previous:string,next:string){this.db.prepare('UPDATE challenger_encounters SET battle_id=? WHERE battle_id=?').run(next,previous);}
 win(eventId:string,owner:string){
  const row=this.row(eventId)!;const definition=this.definition(eventId,row.selected_id);
  const result=applyRewardOption(this.db,owner,definition.rewardDefinition);
  if(definition.selections){result.selections=definition.selections.map(selection=>{
   this.db.prepare('INSERT INTO event_reward_selections VALUES (?,?,?)').run(eventId,selection.id,JSON.stringify(selection));
   return {id:selection.id,title:selection.title,state:'pending',candidates:selection.candidates.map(({effects,...display})=>display)};
  });}
  this.db.prepare("UPDATE run_events SET status='reward',result_json=? WHERE id=?").run(JSON.stringify(result),eventId);
  this.db.prepare("UPDATE challenger_encounters SET phase='reward' WHERE event_id=?").run(eventId);
 }
}

