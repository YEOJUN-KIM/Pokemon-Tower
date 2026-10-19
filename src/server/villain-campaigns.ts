import type {DatabaseSync} from 'node:sqlite';
import {campaignEligible,campaignReward,emptyCampaign,rocketCampaignSettings,type CampaignState,type RocketStage} from '../data/villain-campaigns';
import {organizationGrunt,villainLeaders} from '../data/villain-organizations';
import type {BattleRule} from '../data/run-rules';
import type {TowerProgression} from '../data/tower-progression';
import type {RewardOption} from '../data/rewards';
import {applyRewardOption} from './rewards';
import {snapshotTrainerEventBattle,type TrainerEventBattleSnapshot} from './trainer-event-battle';
import {campaignStage,isVillainOrganization,villainChance,villainTrackEligible,type VillainTrackStage,type VillainOrganization} from '../data/villain-tracks';
import {villainTrackSample} from './villain-track-samples';
import {snapshotVillainReward} from './villain-track-rewards';
import {runOrganization} from '../data/villain-organizations';
import type {TowerTheme} from '../data/tower-themes';

export type VillainSnapshot=TrainerEventBattleSnapshot&{organization:string;stage:RocketStage|VillainTrackStage;reward:RewardOption;next:CampaignState;trackIndex?:number;encounterOrder?:number;floor?:number};
export type VillainTrackRow={run_id:string;organization:VillainOrganization;stage_index:number;grunt_wins:number;pity:number;last_event_order:number|null;last_checked_order:number;completed:number};
type Encounter={event_id:string;snapshot_json:string;battle_id:string|null;claimed:number};
// All mutations are covered by the owning TowerStore transaction.
export class VillainCampaigns{
 constructor(private readonly db:DatabaseSync){}
 track(runId:string){return this.db.prepare('SELECT * FROM run_villain_tracks WHERE run_id=?').get(runId) as VillainTrackRow|undefined;}
 enableTrack(runId:string){
  if(this.track(runId))return;
  // A previously started v1 campaign keeps its saved progression and snapshots.
  if(this.state(runId).started||this.db.prepare('SELECT 1 FROM villain_event_encounters v JOIN run_events e ON e.id=v.event_id WHERE e.run_id=?').get(runId))return;
  const theme=(this.db.prepare('SELECT theme FROM run_themes WHERE run_id=?').get(runId) as {theme:TowerTheme}|undefined)?.theme;
  const picked=theme?runOrganization(runId,theme):'rocket',organization=picked==='aether'?'skull':picked;
  this.db.prepare('INSERT INTO run_villain_tracks(run_id,organization,completed) VALUES (?,?,?)').run(runId,organization??'none',isVillainOrganization(organization??'')?0:1);
  if(isVillainOrganization(organization??''))this.db.prepare('UPDATE run_villains SET organization=? WHERE run_id=?').run(organization!,runId);
 }
 rollTrack(runId:string,floor:number,order:number,roll:(max:number)=>number){
  const state=this.track(runId);if(!state||state.completed||state.last_checked_order>=order)return;
  this.db.prepare('UPDATE run_villain_tracks SET last_checked_order=? WHERE run_id=?').run(order,runId);
  const stage=campaignStage(state.organization,state.stage_index);
  if(!villainTrackEligible(stage,floor,order,state.last_event_order))return;
  if(roll(100)>=villainChance(state.pity)){this.db.prepare('UPDATE run_villain_tracks SET pity=pity+1 WHERE run_id=?').run(runId);return;}
  this.db.prepare('UPDATE run_villain_tracks SET pity=0,last_event_order=? WHERE run_id=?').run(order,runId);
  return {state,stage:stage!};
 }
 createTrack(eventId:string,runId:string,floor:number,order:number,rule:BattleRule,progression:TowerProgression,roll:(max:number)=>number){
  const state=this.track(runId)!,stage=campaignStage(state.organization,state.stage_index)!;
  const sample=villainTrackSample(stage.sampleId!);
  const snapshot:VillainSnapshot={...snapshotTrainerEventBattle(eventId,sample,floor,rule,progression),organization:state.organization,stage:stage.key,trackIndex:state.stage_index,encounterOrder:order,floor,reward:snapshotVillainReward(this.db,runId,state.organization,stage.key,stage.rank,roll),next:{...emptyCampaign}};
  this.db.prepare('INSERT INTO villain_event_encounters(event_id,snapshot_json) VALUES (?,?)').run(eventId,JSON.stringify(snapshot));
 }
 state(runId:string,organization=rocketCampaignSettings.organization):CampaignState{return this.db.prepare('SELECT started,clues,officer_defeated,boss_location_known,boss_defeated,completed FROM run_organization_campaigns WHERE run_id=? AND organization=?').get(runId,organization) as CampaignState|undefined??{...emptyCampaign};}
 eligible(runId:string,kind:RocketStage,floor:number){return campaignEligible(kind,this.state(runId),floor);}
 row(eventId:string){return this.db.prepare('SELECT * FROM villain_event_encounters WHERE event_id=?').get(eventId) as Encounter|undefined;}
 forBattle(id:string){return this.db.prepare('SELECT * FROM villain_event_encounters WHERE battle_id=?').get(id) as Encounter|undefined;}
 snapshot(row:Encounter){return JSON.parse(row.snapshot_json) as VillainSnapshot;}
 create(eventId:string,runId:string,stage:RocketStage,floor:number,rule:BattleRule,progression:TowerProgression){
  const organization=rocketCampaignSettings.organization;
  const sample=stage==='rocket-officer'?villainLeaders[organization].executive:stage==='rocket-boss'?villainLeaders[organization].boss:organizationGrunt(organization);
  const next={...this.state(runId)};
  if(stage==='rocket-intro')next.started=1;
  if(stage==='rocket-ambush')next.clues=Math.min(rocketCampaignSettings.requiredClues,next.clues+1);
  if(stage==='rocket-officer'){next.officer_defeated=1;next.boss_location_known=1;}
  if(stage==='rocket-boss'){next.boss_defeated=1;next.completed=1;}
  const snapshot:VillainSnapshot={...snapshotTrainerEventBattle(eventId,sample,floor,rule,progression),organization,stage,reward:campaignReward(stage,next.clues),next};
  this.db.prepare('INSERT INTO villain_event_encounters(event_id,snapshot_json) VALUES (?,?)').run(eventId,JSON.stringify(snapshot));
 }
 start(eventId:string,battleId:string){this.db.prepare('UPDATE villain_event_encounters SET battle_id=? WHERE event_id=?').run(battleId,eventId);this.db.prepare("UPDATE run_events SET choice_id='challenge' WHERE id=?").run(eventId);}
 retry(previous:string,next:string){this.db.prepare('UPDATE villain_event_encounters SET battle_id=? WHERE battle_id=?').run(next,previous);}
 view(eventId:string){const row=this.row(eventId);if(!row)return {};const s=this.snapshot(row);return {villain:{organization:s.organization,stage:s.stage,portrait:s.sample.portrait,name:s.sample.name,clues:s.next.clues},...(row.battle_id&&!row.claimed?{phase:'battle' as const}:{})};}
 win(row:Encounter,runId:string,owner:string){
  if(row.claimed)return;
  const snapshot=this.snapshot(row),s=snapshot.next;
  const result=applyRewardOption(this.db,owner,snapshot.reward,runId);
  if(snapshot.trackIndex!==undefined){
   const next=snapshot.trackIndex+1;
   const completed=!campaignStage(snapshot.organization as VillainOrganization,next);
   if(!this.db.prepare('UPDATE run_villain_tracks SET stage_index=?,grunt_wins=MIN(2,grunt_wins+?),completed=? WHERE run_id=? AND stage_index=?').run(next,snapshot.stage.startsWith('grunt-')?1:0,completed?1:0,runId,snapshot.trackIndex).changes)throw Error('Villain stage receipt mismatch');
  }else this.db.prepare(`INSERT INTO run_organization_campaigns VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(run_id,organization) DO UPDATE SET started=excluded.started,clues=excluded.clues,officer_defeated=excluded.officer_defeated,boss_location_known=excluded.boss_location_known,boss_defeated=excluded.boss_defeated,completed=excluded.completed`).run(runId,snapshot.organization,s.started,s.clues,s.officer_defeated,s.boss_location_known,s.boss_defeated,s.completed);
  this.db.prepare("UPDATE run_events SET status='reward',result_json=? WHERE id=?").run(JSON.stringify(result),row.event_id);
  this.db.prepare('UPDATE villain_event_encounters SET claimed=1 WHERE event_id=?').run(row.event_id);
 }
}
