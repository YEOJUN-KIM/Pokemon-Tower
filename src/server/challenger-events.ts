import type {DatabaseSync} from 'node:sqlite';
import {challengers,challengerCandidate,type ChallengerDefinition} from '../data/challengers';
import {applyRewardOption} from './rewards';
import {BattleRequestError} from './request-error';

type Encounter={event_id:string;candidates_json:string;selected_id:string|null;battle_id:string|null;phase:'choice'|'battle'|'reward'};
// The owning TowerStore transaction covers battle creation, grants and receipts.
export class ChallengerEvents{
 constructor(private readonly db:DatabaseSync){}
 create(eventId:string){this.db.prepare('INSERT INTO challenger_encounters(event_id,candidates_json) VALUES (?,?)').run(eventId,JSON.stringify(challengers));}
 row(eventId:string){return this.db.prepare('SELECT * FROM challenger_encounters WHERE event_id=?').get(eventId) as Encounter|undefined;}
 pending(runId:string){return this.db.prepare("SELECT c.* FROM challenger_encounters c JOIN run_events e ON e.id=c.event_id WHERE e.run_id=? AND e.status!='complete'").get(runId) as Encounter|undefined;}
 view(eventId:string){const row=this.row(eventId);return row?{phase:row.phase,challengers:(JSON.parse(row.candidates_json) as ChallengerDefinition[]).map(challengerCandidate)}:{};}
 definition(eventId:string,id:unknown){const row=this.row(eventId);const definition=row&&(JSON.parse(row.candidates_json) as ChallengerDefinition[]).find(c=>c.id===id);if(!definition)throw new BattleRequestError('저장된 도전자 후보를 선택하세요.',400);return definition;}
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

