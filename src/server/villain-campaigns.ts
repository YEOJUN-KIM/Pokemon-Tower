import type {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {campaignEligible,campaignReward,emptyCampaign,rocketCampaignSettings,type CampaignState,type RocketStage} from '../data/villain-campaigns';
import {organizationGrunt,villainLeaders} from '../data/villain-organizations';
import {generateOpponentTeam,type OpponentEntry} from './opponent-team';
import {opponentProfile} from './opponent-training';
import {packTeam} from '../data/teams';
import {statKeys,type StatBlock} from '../data/training';
import type {Seed} from '../battle/run';
import type {BattleRule} from '../data/run-rules';
import type {TowerProgression} from '../data/tower-progression';
import {trainerView,type TrainerSample} from '../data/trainer-catalog';
import {normalNpcTemplate} from './npc-templates';
import {npcGimmick,type NpcGimmick} from '../data/npc-gimmicks';
import {normalNpcCategory,normalNpcGimmicksEnabled} from '../data/normal-mode-stages';
import {megaStones,DYNAMAX_ITEM} from '../data/gimmicks';
import {primalOrbs} from '../data/primal-forms';
import {zCrystals} from '../data/z-crystals';
import type {RewardOption} from '../data/rewards';
import {applyRewardOption} from './rewards';

export type VillainSnapshot={organization:string;stage:RocketStage;sample:TrainerSample;seed:Seed;team:OpponentEntry[];opponentTeam:string;rule:BattleRule;trainer:ReturnType<typeof trainerView>;opponentTeraTickets:number;reward:RewardOption;next:CampaignState};
type Encounter={event_id:string;snapshot_json:string;battle_id:string|null;claimed:number};
// All mutations are covered by the owning TowerStore transaction.
export class VillainCampaigns{
 constructor(private readonly db:DatabaseSync){}
 state(runId:string,organization=rocketCampaignSettings.organization):CampaignState{return this.db.prepare('SELECT started,clues,officer_defeated,boss_location_known,boss_defeated,completed FROM run_organization_campaigns WHERE run_id=? AND organization=?').get(runId,organization) as CampaignState|undefined??{...emptyCampaign};}
 eligible(runId:string,kind:RocketStage,floor:number){return campaignEligible(kind,this.state(runId),floor);}
 row(eventId:string){return this.db.prepare('SELECT * FROM villain_event_encounters WHERE event_id=?').get(eventId) as Encounter|undefined;}
 forBattle(id:string){return this.db.prepare('SELECT * FROM villain_event_encounters WHERE battle_id=?').get(id) as Encounter|undefined;}
 snapshot(row:Encounter){return JSON.parse(row.snapshot_json) as VillainSnapshot;}
 create(eventId:string,runId:string,stage:RocketStage,floor:number,rule:BattleRule,progression:TowerProgression){
  const organization=rocketCampaignSettings.organization;
  const sample=stage==='rocket-officer'?villainLeaders[organization].executive:stage==='rocket-boss'?villainLeaders[organization].boss:organizationGrunt(organization);
  const bytes=createHash('sha256').update(eventId).digest(),seed=[0,2,4,6].map(i=>bytes.readUInt16BE(i)) as Seed;
  const team=generateOpponentTeam(floor,seed,[],null,sample,progression);
  const allowed=progression!=='legacy'&&normalNpcGimmicksEnabled(floor,normalNpcCategory(sample.role,sample.id,sample.kind));
  const template=normalNpcTemplate(sample.id,floor,sample.role);
  const plan=template?.signature??npcGimmick(sample.id,sample.generation,team.map(p=>p.name),sample.ace);
  const carrier=team.find(p=>p.item&&(megaStones[p.item]||primalOrbs[p.item]||p.item===DYNAMAX_ITEM||zCrystals[p.item]));
  const signature:NpcGimmick|null=allowed?(carrier?{rule:primalOrbs[carrier.item!]?'primal':megaStones[carrier.item!]?'mega':carrier.item===DYNAMAX_ITEM?'dynamax':'z',species:carrier.name,item:carrier.item}:plan?.rule==='tera'?plan:null):null;
  const profiles=Object.fromEntries(team.map(entry=>[entry.name,{...(entry.profile??opponentProfile(entry.name,entry.moves,floor,Object.fromEntries(statKeys.map((stat,i)=>[stat,bytes[i]%32])) as StatBlock,progression)),moves:entry.moves,...(entry.ability?{ability:entry.ability}:{}),gender:'N' as const}]));
  const next={...this.state(runId)};
  if(stage==='rocket-intro')next.started=1;
  if(stage==='rocket-ambush')next.clues=Math.min(rocketCampaignSettings.requiredClues,next.clues+1);
  if(stage==='rocket-officer'){next.officer_defeated=1;next.boss_location_known=1;}
  if(stage==='rocket-boss'){next.boss_defeated=1;next.completed=1;}
  const snapshot:VillainSnapshot={organization,stage,sample,seed,team,rule,trainer:{...trainerView(sample),introduction:stage==='rocket-intro'?'로켓단 조직원: “어이! 여긴 관계자 외 출입 금지다! 설마 우리가 여기 있는 걸 본 거냐?”':rocketCampaignSettings.stages[stage].intro,...(signature?{gimmick:signature}:{})},opponentTeraTickets:signature?.rule==='tera'?1:0,opponentTeam:packTeam(team.map(p=>p.name),profiles,Object.fromEntries(team.map(p=>[p.name,p.item??''])),team.filter(p=>p.gigantamax).map(p=>p.name)),reward:campaignReward(stage,next.clues),next};
  this.db.prepare('INSERT INTO villain_event_encounters(event_id,snapshot_json) VALUES (?,?)').run(eventId,JSON.stringify(snapshot));
 }
 start(eventId:string,battleId:string){this.db.prepare('UPDATE villain_event_encounters SET battle_id=? WHERE event_id=?').run(battleId,eventId);this.db.prepare("UPDATE run_events SET choice_id='challenge' WHERE id=?").run(eventId);}
 retry(previous:string,next:string){this.db.prepare('UPDATE villain_event_encounters SET battle_id=? WHERE battle_id=?').run(next,previous);}
 view(eventId:string){const row=this.row(eventId);if(!row)return {};const s=this.snapshot(row);return {villain:{organization:s.organization,stage:s.stage,portrait:s.sample.portrait,name:s.sample.name},...(row.battle_id&&!row.claimed?{phase:'battle' as const}:{})};}
 win(row:Encounter,runId:string,owner:string){
  if(row.claimed)return;
  const snapshot=this.snapshot(row),s=snapshot.next;
  const result=applyRewardOption(this.db,owner,snapshot.reward,runId);
  this.db.prepare(`INSERT INTO run_organization_campaigns VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(run_id,organization) DO UPDATE SET started=excluded.started,clues=excluded.clues,officer_defeated=excluded.officer_defeated,boss_location_known=excluded.boss_location_known,boss_defeated=excluded.boss_defeated,completed=excluded.completed`).run(runId,snapshot.organization,s.started,s.clues,s.officer_defeated,s.boss_location_known,s.boss_defeated,s.completed);
  this.db.prepare("UPDATE run_events SET status='reward',result_json=? WHERE id=?").run(JSON.stringify(result),row.event_id);
  this.db.prepare('UPDATE villain_event_encounters SET claimed=1 WHERE event_id=?').run(row.event_id);
 }
}
