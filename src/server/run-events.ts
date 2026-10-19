import {HiddenBossEvents} from './hidden-boss-events';
import {VillainCampaigns} from './villain-campaigns';
import {isRocketStage} from '../data/villain-campaigns';
import {createTeleportSnapshot,teleportSegment} from '../data/teleport';
import {ChallengerEvents} from './challenger-events';
import {RaidEvents} from './raid-events';
import {HiddenShop} from './hidden-shop';
import {selectRunEvent,findEventChoice,rollChoiceReward,rollRewardOption} from '../game/run-events';
import {applyRewardOption,selectEventReward} from './rewards';
import type {RewardResult} from '../data/rewards';
import {spendCoins,applyReward} from './player-wallet';
import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {eventDefinitions,currentEventRulesVersion,isRunEventKind,type RunEventRegistry,type RunEventView,type EventReward} from '../data/run-events';
import {BattleRequestError} from './request-error';
import type {TowerProgression} from '../data/tower-progression';
import type {BattleRule} from '../data/run-rules';

type EventRow={id:string;kind:string;choice_id:string|null;result_json:string|null;run_id:string;after_floor:number;encounter_order:number;status:'choice'|'reward'|'complete';reward_kind:EventReward['kind']|null;amount:number};

// Mutations run inside TowerStore's transaction, including reward payment and receipt.
export class RunEvents {
 constructor(private readonly db:DatabaseSync,private readonly roll:(max:number)=>number,private readonly registry:RunEventRegistry=eventDefinitions){}
 enable(runId:string){this.db.prepare('INSERT INTO run_event_rules(run_id,version) VALUES (?,?)').run(runId,currentEventRulesVersion);}
 encounter(runId:string,afterFloor:number){
  if(!this.db.prepare('SELECT 1 FROM run_event_rules WHERE run_id=?').get(runId))return;
  if(this.view(runId))return;
  const campaigns=new VillainCampaigns(this.db);
  if(this.registry===eventDefinitions)campaigns.enableTrack(runId);
  const order=(this.db.prepare('SELECT cleared_count FROM run_encounter_progress WHERE run_id=?').get(runId) as {cleared_count:number}|undefined)?.cleared_count??0;
  if(campaigns.track(runId))this.db.prepare('INSERT OR IGNORE INTO run_event_followups(run_id,encounter_order,origin_floor) VALUES (?,?,?)').run(runId,order,afterFloor);
  const previous=this.db.prepare("SELECT MAX(encounter_order) AS position FROM run_events WHERE run_id=? AND kind!='villain-campaign'").get(runId) as {position:number|null};
  const segment=teleportSegment(afterFloor);
  const eligible=(kind:string)=>{
   return isRocketStage(kind)?!campaigns.track(runId)&&campaigns.eligible(runId,kind,afterFloor):kind!=='random-teleport'||(segment!==null&&!this.db.prepare('SELECT 1 FROM teleport_events t JOIN run_events e ON e.id=t.event_id WHERE e.run_id=? AND t.segment=?').get(runId,segment));
  };
  const kind=selectRunEvent(afterFloor,previous.position,this.roll,this.registry,this.rulesVersion(runId),order,eligible);
  if(!kind){this.followup(runId);return;}
  const eventId=randomUUID();
  this.db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status,encounter_order) VALUES (?,?,?,?,'choice',?)").run(eventId,runId,afterFloor,kind,order);
  if(kind==='random-teleport'){const snapshot=createTeleportSnapshot(afterFloor,this.roll);this.db.prepare('INSERT INTO teleport_events VALUES (?,?,?,?)').run(eventId,snapshot.segment,snapshot.originFloor,snapshot.destinationFloor);}
  if(isRocketStage(kind)){
   const rule=(this.db.prepare('SELECT rule FROM run_rules WHERE run_id=?').get(runId) as {rule:BattleRule}).rule;
   const progression=(this.db.prepare('SELECT version FROM run_progression WHERE run_id=?').get(runId) as {version:TowerProgression}|undefined)?.version??'legacy';
   new VillainCampaigns(this.db).create(eventId,runId,kind,afterFloor+1,rule,progression);
  }
  if(kind==='hidden-shop')new HiddenShop(this.db).create(eventId,runId);
  if(kind==='raid-encounter')new RaidEvents(this.db).create(eventId,runId,afterFloor+1);
  if(kind==='challenger-selection'){
   const rule=(this.db.prepare('SELECT rule FROM run_rules WHERE run_id=?').get(runId) as {rule:BattleRule}).rule;
   const progression=(this.db.prepare('SELECT version FROM run_progression WHERE run_id=?').get(runId) as {version:TowerProgression}|undefined)?.version??'legacy';
   const common=!!this.db.prepare('SELECT 1 FROM run_npc_rules WHERE run_id=?').get(runId);
   new ChallengerEvents(this.db).create(eventId,afterFloor+1,rule,progression,common);
  }
 }
 followup(runId:string){
  if(this.view(runId))return;
  const pending=this.db.prepare('SELECT * FROM run_event_followups WHERE run_id=? AND checked=0 ORDER BY encounter_order LIMIT 1').get(runId) as {encounter_order:number;origin_floor:number}|undefined;
  if(!pending)return;
  this.db.prepare('UPDATE run_event_followups SET checked=1 WHERE run_id=? AND encounter_order=?').run(runId,pending.encounter_order);
  const run=this.db.prepare('SELECT floor,state FROM runs WHERE id=?').get(runId) as {floor:number;state:string};
  if(run.state!=='select')return;
  const campaigns=new VillainCampaigns(this.db);
  if(!campaigns.rollTrack(runId,run.floor,pending.encounter_order,this.roll))return;
  const id=randomUUID(),rule=(this.db.prepare('SELECT rule FROM run_rules WHERE run_id=?').get(runId) as {rule:BattleRule}).rule;
  const progression=(this.db.prepare('SELECT version FROM run_progression WHERE run_id=?').get(runId) as {version:TowerProgression}|undefined)?.version??'legacy';
  // Use the current location after Teleport, while keeping the cleared encounter chronology.
  this.db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status,encounter_order) VALUES (?,?,?,'villain-campaign','choice',?)").run(id,runId,Math.max(1,run.floor-1),pending.encounter_order);
  campaigns.createTrack(id,runId,run.floor,pending.encounter_order,rule,progression,this.roll);
 }
 private rulesVersion(runId:string){return (this.db.prepare('SELECT version FROM run_event_rules WHERE run_id=?').get(runId) as {version:number}|undefined)?.version??1;}
 view(runId:string):RunEventView|null{
  const row=this.db.prepare("SELECT * FROM run_events WHERE run_id=? AND status!='complete' ORDER BY encounter_order DESC LIMIT 1").get(runId) as EventRow|undefined;
  if(row)this.validateKind(row.kind);
  return row?{id:row.id,kind:row.kind,choiceId:row.choice_id,rulesVersion:this.rulesVersion(runId),...(row.kind==='random-teleport'&&row.status!=='choice'&&row.choice_id==='teleport'?{teleport:{destinationFloor:this.teleport(row.id).destination_floor}}:{}),...(row.result_json?{result:JSON.parse(row.result_json) as RewardResult}:{}),...(row.kind==='hidden-shop'?{hiddenShop:new HiddenShop(this.db).view(row.id)}:{}),afterFloor:row.after_floor,phase:row.status as RunEventView['phase'],...new ChallengerEvents(this.db).view(row.id),...(row.kind==='raid-encounter'?new RaidEvents(this.db).view(row.id):{}),...new VillainCampaigns(this.db).view(row.id),...new HiddenBossEvents(this.db).view(row.id),reward:row.reward_kind?{kind:row.reward_kind,amount:row.amount}:null}:null;
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
  const specialState=event.kind==='raid-encounter'?['battle','lost','recruit'].includes(run.state):(event.kind==='challenger-selection'||event.kind==='hidden-boss'||event.kind==='villain-campaign'||isRocketStage(event.kind))&&['battle','lost'].includes(run.state);
  const expectedFloor=event.kind==='villain-campaign'?new VillainCampaigns(this.db).snapshot(new VillainCampaigns(this.db).row(event.id)!).floor!:event.kind==='hidden-boss'?event.after_floor:event.kind==='random-teleport'&&event.choice_id==='teleport'?this.teleport(event.id).destination_floor:event.after_floor+1;
  const order=(this.db.prepare('SELECT cleared_count FROM run_encounter_progress WHERE run_id=?').get(runId) as {cleared_count:number}|undefined)?.cleared_count??0;
  if((run.state!=='select'&&!specialState) || run.floor!==expectedFloor || event.kind==='random-teleport'&&event.encounter_order!==order)throw new BattleRequestError('이미 지나간 이벤트입니다.',409);
  this.validateKind(event.kind);
  return event;
 }
 private teleport(eventId:string){return this.db.prepare('SELECT destination_floor FROM teleport_events WHERE event_id=?').get(eventId) as {destination_floor:number};}
 private validateKind(kind:string){
  if(kind!=='hidden-boss'&&!isRunEventKind(kind,this.registry))throw new BattleRequestError('알 수 없는 이벤트입니다. 이벤트 정의를 확인해 주세요.',409);
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
  if(choice.outcome==='teleport'){
   const destination=this.teleport(eventId).destination_floor;
   this.db.prepare("UPDATE runs SET floor=? WHERE id=?").run(destination,runId);
   this.db.prepare("UPDATE run_events SET status='reward',choice_id=?,result_json=? WHERE id=?").run(choice.id,JSON.stringify({id:'teleport',title:destination+'층에 도착했다!',tone:'neutral',entries:[]}),eventId);
   return;
  }
  if(choice.outcome==='challenger'||choice.outcome==='raid'||choice.outcome==='villain'||choice.outcome==='hidden-boss')throw new BattleRequestError('이벤트 배틀을 시작해야 합니다.',409);
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
 purchase(owner:string,runId:string,eventId:string,productId:unknown){
  const row=this.owned(owner,runId,eventId);
  if(row.kind!=='hidden-shop'||row.status!=='choice')throw new BattleRequestError('열려 있는 히든상점이 아닙니다.',409);
  new HiddenShop(this.db).purchase(owner,runId,eventId,productId);
 }
 continue(owner:string,runId:string,eventId:string){
  const row=this.owned(owner,runId,eventId);
  if(row.result_json && (JSON.parse(row.result_json) as RewardResult).selections?.some(s=>s.state==='pending'))throw new BattleRequestError('추가 보상을 먼저 선택하세요.',409);
  if(row.kind==='raid-encounter'&&(this.db.prepare('SELECT state FROM runs WHERE id=?').get(runId) as {state:string}).state!=='select')throw new BattleRequestError('포켓몬 영입을 먼저 마쳐 주세요.',409);
  if(row.status==='choice')throw new BattleRequestError('이벤트에서 할 행동을 먼저 선택하세요.',409);
  if(row.status==='reward')this.db.prepare("UPDATE run_events SET status='complete' WHERE id=?").run(eventId);
 }
}
