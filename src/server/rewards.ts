import {BattleRequestError} from './request-error';
import type {DatabaseSync} from 'node:sqlite';
import type {RewardOption,RewardResult,RewardSelectionDefinition} from '../data/rewards';
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

// Generic selection completion. Effect definitions are immutable persisted server snapshots.
export function selectEventReward(db:DatabaseSync,owner:string,eventId:string,selectionId:unknown,candidateId:unknown){
 const row=db.prepare("SELECT result_json FROM run_events WHERE id=? AND status IN ('reward','complete')").get(eventId) as {result_json:string}|undefined;
 const result:RewardResult|null=row?.result_json?JSON.parse(row.result_json):null;
 const selection=result?.selections?.find(s=>s.id===selectionId);
 if(!selection || typeof candidateId!=='string')throw new BattleRequestError('선택 가능한 보상이 아닙니다.',400);
 if(selection.state==='selected'){if(selection.selectedId===candidateId)return;throw new BattleRequestError('이미 다른 보상을 선택했습니다.',409);}
 const saved=db.prepare('SELECT definition_json FROM event_reward_selections WHERE event_id=? AND selection_id=?').get(eventId,selection.id) as {definition_json:string}|undefined;
 const definition:RewardSelectionDefinition|undefined=saved?JSON.parse(saved.definition_json):undefined;
 const candidate=definition?.candidates.find(c=>c.id===candidateId);
 if(!candidate)throw new BattleRequestError('저장된 보상 후보를 선택하세요.',400);
 const granted=applyRewardOption(db,owner,{id:candidate.id,title:candidate.label,tone:result!.tone,entries:candidate.effects});
 result!.entries=[...result!.entries,...granted.entries];
 result!.selections=result!.selections!.map(s=>s.id===selection.id?{...s,state:'selected',selectedId:candidate.id}:s);
 db.prepare('UPDATE run_events SET result_json=? WHERE id=?').run(JSON.stringify(result),eventId);
}
