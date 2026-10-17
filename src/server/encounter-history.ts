import type {DatabaseSync} from 'node:sqlite';

// A retry replaces the previous attempt in recent history, rather than taking
// another slot. Floor is deliberately absent from the chronology.
export function recentEncounters(db:DatabaseSync,runId:string){
 return db.prepare(`SELECT opponent_team,trainer FROM (
   SELECT opponent_team,trainer,encounter_order,
     row_number() OVER(PARTITION BY encounter_order ORDER BY attempt DESC) AS latest
   FROM battles WHERE run_id=?
 ) WHERE latest=1 ORDER BY encounter_order DESC LIMIT 3`).all(runId) as {opponent_team:string;trainer:string|null}[];
}
