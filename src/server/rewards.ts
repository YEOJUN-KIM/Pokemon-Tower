import {grantRunItem,grantGrowth,grantStoredReward,grantEggTicket,grantEquipment} from './inventory-grants';
import {ownsRunItem,ownsMachine} from './run-ownership';
import {applyPokemonEnhancement} from './pokemon-enhancements';
import {isHeldItem} from '../data/held-items';
import {vitamins,machineMoves} from '../data/shop';
import {isTrainerEquipment} from '../data/trainer-equipment';
import {BattleRequestError} from './request-error';
import type {DatabaseSync} from 'node:sqlite';
import type {RewardOption,RewardResult,RewardSelectionDefinition} from '../data/rewards';
import {resolveReward} from '../game/rewards';
import {spendCoins,applyReward} from './player-wallet';

// The caller owns the receipt and transaction. All entries and that receipt
// must commit together, including messages/empty results which grant nothing.
export function applyRewardOption(db:DatabaseSync,owner:string,option:RewardOption,runId?:string):RewardResult {
 const wallet=db.prepare('SELECT coins FROM players WHERE id=?').get(owner) as {coins:number}|undefined;
 if(!wallet)throw Error('Reward wallet not found');
 const result=resolveReward(option,wallet.coins);
 const actual=[];
 for(const entry of result.entries){
  if(entry.kind==='tool-voucher'){if(!runId)throw Error('Voucher needs run context');grantStoredReward(db,runId,entry);actual.push(entry);continue;}
  if(entry.kind==='pokemon-enhancement'){if(!runId)throw Error('Enhancement needs run context');applyPokemonEnhancement(db,owner,runId,entry);actual.push(entry);continue;}
  if(entry.kind==='growth-points'){grantGrowth(db,owner,entry.amount);actual.push(entry);continue;}
  if(entry.kind==='typed-egg-ticket'){if(!['superRare','shiny'].includes(entry.eggKind))throw Error('Invalid egg reward');grantEggTicket(db,owner,entry.eggKind,entry.amount);actual.push(entry);continue;}
  if(['vitamin','machine','item-exchange','trainer-equipment'].includes(entry.kind)){
   if(!runId)throw Error('Run reward needs run context');
   if(entry.kind==='trainer-equipment'){
    if(!isTrainerEquipment(entry.item))throw Error('Invalid equipment reward');
    if(!grantEquipment(db,runId,entry.item)){grantGrowth(db,owner,entry.fallbackPoints);actual.push({kind:'growth-points' as const,amount:entry.fallbackPoints});continue;}
   }else if(entry.kind==='vitamin'||entry.kind==='machine'||entry.kind==='item-exchange'){
    if(entry.kind==='vitamin'&&!Object.hasOwn(vitamins,entry.stat)||entry.kind==='machine'&&!(machineMoves as readonly string[]).includes(entry.move)||entry.kind==='item-exchange'&&(!entry.items.length||!entry.items.every(isHeldItem)))throw Error('Invalid inventory reward');
    if(entry.kind==='item-exchange'&&entry.direct){
     if(entry.items.length!==1)throw Error('Direct held reward must contain one item');
     if(ownsRunItem(db,runId,entry.items[0])){const fallback={kind:'coins' as const,amount:entry.fallbackCoins};applyReward(db,owner,fallback);actual.push(fallback);continue;}
     grantRunItem(db,runId,entry.items[0],1);
    }else if(entry.kind==='machine'&&entry.fallbackCoins!==undefined&&ownsMachine(db,runId,entry.move)){
     const fallback={kind:'coins' as const,amount:entry.fallbackCoins};applyReward(db,owner,fallback);actual.push(fallback);continue;
    }else grantStoredReward(db,runId,entry);
   }
   actual.push(entry);continue;
  }
  actual.push(entry);
  if(entry.kind==='message')continue;
  if(entry.kind==='coin-loss'){
   if(!spendCoins(db,owner,entry.amount))throw Error('Reward wallet changed');
  }else if(entry.kind==='coins'||entry.kind==='egg-ticket')applyReward(db,owner,entry);
 }
 return {...result,entries:actual};
}

// Generic selection completion. Effect definitions are immutable persisted server snapshots.
export function selectEventReward(db:DatabaseSync,owner:string,eventId:string,selectionId:unknown,candidateId:unknown){
 const row=db.prepare("SELECT result_json,run_id FROM run_events WHERE id=? AND status IN ('reward','complete')").get(eventId) as {result_json:string;run_id:string}|undefined;
 const result:RewardResult|null=row?.result_json?JSON.parse(row.result_json):null;
 const selection=result?.selections?.find(s=>s.id===selectionId);
 if(!selection || typeof candidateId!=='string')throw new BattleRequestError('선택 가능한 보상이 아닙니다.',400);
 if(selection.state==='selected'){if(selection.selectedId===candidateId)return;throw new BattleRequestError('이미 다른 보상을 선택했습니다.',409);}
 const saved=db.prepare('SELECT definition_json FROM event_reward_selections WHERE event_id=? AND selection_id=?').get(eventId,selection.id) as {definition_json:string}|undefined;
 const definition:RewardSelectionDefinition|undefined=saved?JSON.parse(saved.definition_json):undefined;
 const candidate=definition?.candidates.find(c=>c.id===candidateId);
 if(!candidate)throw new BattleRequestError('저장된 보상 후보를 선택하세요.',400);
 const granted=applyRewardOption(db,owner,{id:candidate.id,title:candidate.label,tone:result!.tone,entries:candidate.effects},row!.run_id);
 result!.entries=[...result!.entries,...granted.entries];
 result!.selections=result!.selections!.map(s=>s.id===selection.id?{...s,state:'selected',selectedId:candidate.id}:s);
 db.prepare('UPDATE run_events SET result_json=? WHERE id=?').run(JSON.stringify(result),eventId);
}
