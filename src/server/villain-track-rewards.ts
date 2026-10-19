import type {DatabaseSync} from 'node:sqlite';
import type {RewardEffect,RewardOption} from '../data/rewards';
import {villainRewardSettings as settings,villainStageText,type VillainCampaignRank,type VillainOrganization,type VillainTrackStage} from '../data/villain-tracks';
import {megaStones,canEquipGimmick} from '../data/gimmicks';
import {matchingZCrystals} from '../data/z-crystals';
import {allowsGimmick,type BattleRule} from '../data/run-rules';
import {selectedForm} from '../data/selectable-forms';
import {statKeys,type TrainingProfile} from '../data/training';
import {ownsRunItem} from './run-ownership';
const voucher={kind:'tool-voucher',rarity:'epic',choices:4,amount:1} as const;
export function snapshotVillainReward(db:DatabaseSync,runId:string,organization:VillainOrganization,stage:VillainTrackStage,rank:VillainCampaignRank,roll:(max:number)=>number):RewardOption{
 const entries:RewardEffect[]=[{kind:'coins',amount:settings[`${rank}Coins`]}];
 if(rank==='officer'){
  if(roll(100)<settings.officerVitaminPercent)for(let i=0;i<2;i++)entries.push({kind:'vitamin',stat:statKeys[roll(statKeys.length)],amount:1});
  else entries.push(voucher);
 }
 if(rank==='executive'){
  const roster=(db.prepare('SELECT species FROM members WHERE run_id=?').all(runId) as {species:string}[]).map(r=>r.species);
  const profiles=JSON.parse((db.prepare('SELECT profiles FROM runs WHERE id=?').get(runId) as {profiles:string}).profiles) as Record<string,TrainingProfile>;
  const rule=(db.prepare('SELECT rule FROM run_rules WHERE run_id=?').get(runId) as {rule:BattleRule}).rule;
  const usable=roster.filter(s=>!selectedForm(s,profiles[s]?.forme)?.requiredItem);
  const candidates=[...(allowsGimmick(rule,'mega')?Object.keys(megaStones).filter(item=>usable.some(s=>canEquipGimmick(s,item))):[]),...(allowsGimmick(rule,'zmove')?usable.flatMap(s=>matchingZCrystals(s,profiles[s]?.moves??[])):[]),...(allowsGimmick(rule,'dynamax')&&roster.some(s=>canEquipGimmick(s,'Dynamax Band'))?['Dynamax Band']:[]),...(allowsGimmick(rule,'terastallize')&&roster.length?['Tera Orb']:[])];
  const missing=[...new Set(candidates)].filter(item=>!ownsRunItem(db,runId,item));
  if(candidates.some(item=>ownsRunItem(db,runId,item))||!missing.length)entries.push(voucher);
  else {const item=missing[roll(missing.length)];entries.push(item==='Dynamax Band'||item==='Tera Orb'?{kind:'trainer-equipment',item,amount:1,fallbackPoints:100}:{kind:'item-exchange',items:[item],amount:1,fallbackCoins:300,direct:true});}
 }
 if(rank==='boss')entries.push({kind:'typed-egg-ticket',eggKind:'superRare',amount:settings.bossSuperRareTickets});
 return {id:`${organization}-${stage}`,title:villainStageText(organization,stage),tone:rank==='boss'?'great':'good',entries};
}
