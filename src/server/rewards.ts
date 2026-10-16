import type {DatabaseSync} from 'node:sqlite';
import type {RewardOption,RewardResult} from '../data/rewards';
import {resolveReward} from '../game/rewards';
import {spendCoins,applyReward} from './player-wallet';

// The caller owns the receipt and transaction. All entries and that receipt
// must commit together, including messages/empty results which grant nothing.
export function applyRewardOption(db:DatabaseSync,owner:string,option:RewardOption):RewardResult {
 const wallet=db.prepare('SELECT coins FROM players WHERE id=?').get(owner) as {coins:number}|undefined;
 if(!wallet)throw Error('Reward wallet not found');
 const result=resolveReward(option,wallet.coins);
 for(const entry of result.entries){
  if(entry.kind==='message')continue;
  if(entry.kind==='coin-loss'){
   if(!spendCoins(db,owner,entry.amount))throw Error('Reward wallet changed');
  }else applyReward(db,owner,entry);
 }
 return result;
}
