import type {DatabaseSync} from 'node:sqlite';
import type {EventReward} from '../data/run-events';

// Call within the owning operation's transaction. Receipts and ownership checks
// stay with that operation, so a failed grant also rolls back its payment.
export function spendCoins(db:DatabaseSync,owner:string,amount:number):boolean {
  return !!db.prepare('UPDATE players SET coins=coins-? WHERE id=? AND coins>=?').run(amount,owner,amount).changes;
}

export function grantCoins(db:DatabaseSync,owner:string,amount:number):void {
  db.prepare('UPDATE players SET coins=coins+? WHERE id=?').run(amount,owner);
}

export function applyReward(db:DatabaseSync,owner:string,reward:EventReward):void {
  switch(reward.kind){
    case 'coins': grantCoins(db,owner,reward.amount); break;
    case 'egg-ticket':
      db.prepare('INSERT INTO permanent_upgrades(player_id,egg_tickets) VALUES (?,?) ON CONFLICT(player_id) DO UPDATE SET egg_tickets=egg_tickets+excluded.egg_tickets').run(owner,reward.amount);
      break;
    default: {
      const unsupported:never=reward.kind;
      throw new Error(`Unsupported reward: ${unsupported}`);
    }
  }
}
