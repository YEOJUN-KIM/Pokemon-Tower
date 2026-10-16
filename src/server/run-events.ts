import {ChallengerEvents} from './challenger-events';
import {selectRunEvent,findEventChoice,rollChoiceReward,rollRewardOption} from '../game/run-events';
import {applyRewardOption,selectEventReward} from './rewards';
import type {RewardResult} from '../data/rewards';
import {spendCoins,applyReward} from './player-wallet';
import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {eventDefinitions,currentEventRulesVersion,isRunEventKind,type RunEventRegistry,type RunEventView,type EventReward} from '../data/run-events';
import {BattleRequestError} from './request-error';

type EventRow={id:string;kind:string;choice_id:string|null;result_json:string|null;run_id:string;after_floor:number;status:'choice'|'reward'|'complete';reward_kind:EventReward['kind']|null;amount:number};

// Mutations run inside TowerStore's transaction, including reward payment and receipt.
export class RunEvents {
 constructor(private readonly db:DatabaseSync,private readonly roll:(max:number)=>number,private readonly registry:RunEventRegistry=eventDefinitions){}
 enable(runId:string){this.db.prepare('INSERT INTO run_event_rules(run_id,version) VALUES (?,?)').run(runId,currentEventRulesVersion);}
 encounter(runId:string,afterFloor:number){
  if(afterFloor%5===0 || !this.db.prepare('SELECT 1 FROM run_event_rules WHERE run_id=?').get(runId))return;
  const previous=this.db.prepare('SELECT MAX(after_floor) AS floor FROM run_events WHERE run_id=?').get(runId) as {floor:number|null};
  const kind=selectRunEvent(afterFloor,previous.floor,this.roll,this.registry,this.rulesVersion(runId));
  if(!kind)return;
  const eventId=randomUUID();
  this.db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status) VALUES (?,?,?,?,'choice')").run(eventId,runId,afterFloor,kind);
  if(kind==='challenger-selection')new ChallengerEvents(this.db).create(eventId);
 }
 private rulesVersion(runId:string){return (this.db.prepare('SELECT version FROM run_event_rules WHERE run_id=?').get(runId) as {version:number}|undefined)?.version??1;}
 view(runId:string):RunEventView|null{
  const row=this.db.prepare("SELECT * FROM run_events WHERE run_id=? AND status!='complete' ORDER BY after_floor DESC LIMIT 1").get(runId) as EventRow|undefined;
  if(row)this.validateKind(row.kind);
  return row?{id:row.id,kind:row.kind,choiceId:row.choice_id,rulesVersion:this.rulesVersion(runId),...(row.result_json?{result:JSON.parse(row.result_json) as RewardResult}:{}),afterFloor:row.after_floor,phase:row.status as RunEventView['phase'],...new ChallengerEvents(this.db).view(row.id),reward:row.reward_kind?{kind:row.reward_kind,amount:row.amount}:null}:null;
 }
 earnedCoins(runId:string){
  const rows=this.db.prepare('SELECT reward_kind,amount,result_json FROM run_events WHERE run_id=?').all(runId) as EventRow[];
  // As with shop spending, losses do not reduce the cumulative gross earnings.
  return rows.reduce((sum,row)=>sum+(row.reward_kind==='coins'?row.amount:0)+(row.result_json?(JSON.parse(row.result_json) as RewardResult).entries.reduce((total,entry)=>total+(entry.kind==='coins'?entry.amount:0),0):0),0);
 }
 owned(owner:string,runId:string,eventId:string){
  const run=this.db.prepare('SELECT player_id,state,floor FROM runs WHERE id=?').get(runId) as {player_id:string;state:string;floor:number}|undefined;
  if(!run || run.player_id!==owner)throw new BattleRequestError('이 도전의 이벤트가 아닙니다.',404);
  const event=this.db.prepare('SELECT * FROM run_events WHERE id=? AND run_id=?').get(eventId,runId) as EventRow|undefined;
  if(!event)throw new BattleRequestError('이벤트를 찾을 수 없습니다.',404);
  if((run.state!=='select' && !(event.kind==='challenger-selection' && ['battle','lost'].includes(run.state))) || run.floor!==event.after_floor+1)throw new BattleRequestError('이미 지나간 이벤트입니다.',409);
  this.validateKind(event.kind);
  return event;
 }
 private validateKind(kind:string){
  if(!isRunEventKind(kind,this.registry))throw new BattleRequestError('알 수 없는 이벤트입니다. 이벤트 정의를 확인해 주세요.',409);
 }
 choose(owner:string,runId:string,eventId:string,choiceId:unknown){
  const row=this.owned(owner,runId,eventId);
  const choice=findEventChoice(row.kind,choiceId,this.registry,this.rulesVersion(runId));
  if(!choice)throw new BattleRequestError('이벤트를 진행하거나 지나가기를 선택하세요. 유효하지 않은 선택지입니다.',400);
  if(row.status!=='choice'){
   if(row.choice_id===choice.id)return;
   throw new BattleRequestError('이미 다른 선택으로 처리한 이벤트입니다.',409);
  }
  if(row.choice_id)throw new BattleRequestError('이미 도전자를 선택했습니다.',409);
  if(choice.outcome==='leave'){
   this.db.prepare("UPDATE run_events SET status='complete',choice_id=? WHERE id=?").run(choice.id,eventId);return;
  }
  if(choice.outcome==='challenger')throw new BattleRequestError('도전자 배틀을 시작해야 합니다.',409);
  if(choice.cost && !spendCoins(this.db,owner,choice.cost))throw new BattleRequestError(`${choice.cost}코인이 필요합니다.`,409);
  if(choice.outcome==='reward-result'){
   const option=rollRewardOption(choice.results,this.roll);
   const result=applyRewardOption(this.db,owner,option);
   this.db.prepare("UPDATE run_events SET status='reward',choice_id=?,result_json=? WHERE id=?").run(choice.id,JSON.stringify(result),eventId);
   return;
  }
  const reward=rollChoiceReward(choice,this.roll);
  applyReward(this.db,owner,reward);
  this.db.prepare("UPDATE run_events SET status='reward',choice_id=?,reward_kind=?,amount=? WHERE id=?").run(choice.id,reward.kind,reward.amount,eventId);
 }
 selectReward(owner:string,runId:string,eventId:string,selectionId:unknown,candidateId:unknown){this.owned(owner,runId,eventId);selectEventReward(this.db,owner,eventId,selectionId,candidateId);}
 continue(owner:string,runId:string,eventId:string){
  const row=this.owned(owner,runId,eventId);
  if(row.result_json && (JSON.parse(row.result_json) as RewardResult).selections?.some(s=>s.state==='pending'))throw new BattleRequestError('추가 보상을 먼저 선택하세요.',409);
  if(row.status==='choice')throw new BattleRequestError('이벤트에서 할 행동을 먼저 선택하세요.',409);
  if(row.status==='reward')this.db.prepare("UPDATE run_events SET status='complete' WHERE id=?").run(eventId);
 }
}
