import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {mysteryChest,eventKinds,eventDefinitions,merchantTicketPrice,type RunEventView,type EventReward,type RunEventKind} from '../data/run-events';
import {BattleRequestError} from './battle-session';

type EventRow={id:string;kind:RunEventKind;run_id:string;after_floor:number;status:'choice'|'reward'|'complete';reward_kind:EventReward['kind']|null;amount:number};

// Mutations run inside TowerStore's transaction, including reward payment and receipt.
export class RunEvents {
 constructor(private readonly db:DatabaseSync,private readonly roll:(max:number)=>number){}
 enable(runId:string){this.db.prepare('INSERT INTO run_event_rules(run_id,version) VALUES (?,1)').run(runId);}
 encounter(runId:string,afterFloor:number){
  if(afterFloor%5===0 || !this.db.prepare('SELECT 1 FROM run_event_rules WHERE run_id=?').get(runId))return;
  const previous=this.db.prepare('SELECT MAX(after_floor) AS floor FROM run_events WHERE run_id=?').get(runId) as {floor:number|null};
  if(previous.floor!==null && afterFloor-previous.floor<=mysteryChest.cooldownFloors)return;
  if(this.roll(100)>=mysteryChest.encounterPercent)return;
  let draw=this.roll(100);const kind=eventKinds.find(kind=>{draw-=eventDefinitions[kind].weight;return draw<0;})!;
  this.db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status) VALUES (?,?,?,?,'choice')").run(randomUUID(),runId,afterFloor,kind);
 }
 view(runId:string):RunEventView|null{
  const row=this.db.prepare("SELECT * FROM run_events WHERE run_id=? AND status!='complete' ORDER BY after_floor DESC LIMIT 1").get(runId) as EventRow|undefined;
  return row?{id:row.id,kind:row.kind,afterFloor:row.after_floor,phase:row.status as RunEventView['phase'],reward:row.reward_kind?{kind:row.reward_kind,amount:row.amount}:null}:null;
 }
 earnedCoins(runId:string){return (this.db.prepare("SELECT COALESCE(SUM(amount),0) AS coins FROM run_events WHERE run_id=? AND reward_kind='coins'").get(runId) as {coins:number}).coins;}
 private owned(owner:string,runId:string,eventId:string){
  const run=this.db.prepare('SELECT player_id,state,floor FROM runs WHERE id=?').get(runId) as {player_id:string;state:string;floor:number}|undefined;
  if(!run || run.player_id!==owner)throw new BattleRequestError('이 도전의 이벤트가 아닙니다.',404);
  const event=this.db.prepare('SELECT * FROM run_events WHERE id=? AND run_id=?').get(eventId,runId) as EventRow|undefined;
  if(!event)throw new BattleRequestError('이벤트를 찾을 수 없습니다.',404);
  if(run.state!=='select' || run.floor!==event.after_floor+1)throw new BattleRequestError('이미 지나간 이벤트입니다.',409);
  return event;
 }
 choose(owner:string,runId:string,eventId:string,choice:unknown){
  if(choice!=='open' && choice!=='skip')throw new BattleRequestError('이벤트를 진행하거나 지나가기를 선택하세요.',400);
  const row=this.owned(owner,runId,eventId);
  if(row.status!=='choice'){
   if((choice==='open' && row.reward_kind)||(choice==='skip' && !row.reward_kind))return;
   throw new BattleRequestError('이미 다른 선택으로 처리한 이벤트입니다.',409);
  }
  if(choice==='skip'){this.db.prepare("UPDATE run_events SET status='complete' WHERE id=?").run(eventId);return;}
  if(row.kind==='traveling-merchant'){
   const paid=this.db.prepare('UPDATE players SET coins=coins-? WHERE id=? AND coins>=?').run(merchantTicketPrice,owner,merchantTicketPrice);
   if(!paid.changes)throw new BattleRequestError(`${merchantTicketPrice}코인이 필요합니다.`,409);
  }
  const reward:EventReward=row.kind!=='mystery-chest'?{kind:'egg-ticket',amount:1}:this.roll(100)<mysteryChest.coinsPercent?{kind:'coins',amount:mysteryChest.coins}:{kind:'egg-ticket',amount:mysteryChest.eggTickets};
  if(reward.kind==='coins')this.db.prepare('UPDATE players SET coins=coins+? WHERE id=?').run(reward.amount,owner);
  else this.db.prepare('INSERT INTO permanent_upgrades(player_id,egg_tickets) VALUES (?,?) ON CONFLICT(player_id) DO UPDATE SET egg_tickets=egg_tickets+excluded.egg_tickets').run(owner,reward.amount);
  this.db.prepare("UPDATE run_events SET status='reward',reward_kind=?,amount=? WHERE id=?").run(reward.kind,reward.amount,eventId);
 }
 continue(owner:string,runId:string,eventId:string){
  const row=this.owned(owner,runId,eventId);
  if(row.status==='choice')throw new BattleRequestError('이벤트에서 할 행동을 먼저 선택하세요.',409);
  if(row.status==='reward')this.db.prepare("UPDATE run_events SET status='complete' WHERE id=?").run(eventId);
 }
}
