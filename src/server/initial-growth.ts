import type {DatabaseSync} from 'node:sqlite';
import {INITIAL_GROWTH_POINTS} from '../data/training';

// Initialize new-game resources before the player chooses whether to learn the controls.
// Reuse the existing durable receipt; completed legacy saves are deliberately left alone.
export function initializeStartingGrowth(db:DatabaseSync,owner:string) {
  db.exec('SAVEPOINT initial_growth');
  try {
    const granted=db.prepare("UPDATE player_tutorial SET reward_granted=1 WHERE player_id=? AND step='NotStarted' AND reward_granted=0").run(owner);
    if(granted.changes){
      const updated=db.prepare('UPDATE players SET growth_points=growth_points+? WHERE id=?').run(INITIAL_GROWTH_POINTS,owner);
      if(!updated.changes)throw Error('Starting player is missing.');
    }
    db.exec('RELEASE initial_growth');
  }catch(error){db.exec('ROLLBACK TO initial_growth; RELEASE initial_growth');throw error;}
}
