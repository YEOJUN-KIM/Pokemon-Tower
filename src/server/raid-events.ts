import type {DatabaseSync} from 'node:sqlite';
import {randomInt} from 'node:crypto';
import Showdown from 'pokemon-showdown';
import {raidBossDefinitions,type RaidSnapshot} from '../data/raids';
import {statKeys,type StatBlock} from '../data/training';
import {npcRankTraining} from '../data/npc-ranks';
import {npcTrainingProfile} from './npc-training';
import {snapshotRankReward} from './challenger-rewards';
import {rollEncounterShiny} from './shiny';
import {speciesGender} from './pokemon-gender';
import {POINT_TEAM_MARKER} from '../data/teams';
import {applyRewardOption} from './rewards';
import {resolveRaidPhases} from './raid-phases';
import {validateRaidHP} from '../battle/raid-hp';
import {premiumRaidRecruitment,raidRecruitmentTeam} from './raid-recruitment';
import {raidTrainingPoints} from './raid-training';

function weighted<T extends {weight:number}>(pool:readonly T[],random:()=>number):T{
 let draw=random()*pool.reduce((sum,p)=>sum+p.weight,0);
 const result=pool.find(p=>(draw-=p.weight)<0)??pool.at(-1);
 if(!result)throw Error('No eligible raid boss');return result;
}
export function createRaidSnapshot(db:DatabaseSync,runId:string,floor:number,random=()=>randomInt(0x1000000)/0x1000000,fixture?:{bossId:string;routeId?:string}):RaidSnapshot{
 const boss=fixture?raidBossDefinitions.find(b=>b.id===fixture.bossId)!:weighted(raidBossDefinitions.filter(b=>floor>=b.minFloor),random);
 if(!boss)throw Error('Unknown raid fixture');
 const route=fixture?.routeId?boss.routes.find(r=>r.id===fixture.routeId)!:weighted(boss.routes,random);
 if(!route)throw Error('Unknown raid route');
 const phases=resolveRaidPhases(route.phases,boss.species,random);
 const individual=npcTrainingProfile(boss.species,[...route.recruit.moves],floor,'elite',route.attack==='spa'?'special':'physical',random,npcRankTraining(floor,'elite'));
 individual.evs=raidTrainingPoints(individual.evs,boss.battleTraining);
 const protectedStats=boss.id==='mewtwo'?[route.attack,'spe'] as const:boss.ivRule.protected;
 const perfect=new Set(protectedStats),remaining=statKeys.filter(k=>!perfect.has(k));
 while(perfect.size<boss.ivRule.perfect)perfect.add(remaining.splice(Math.floor(random()*remaining.length),1)[0]);
 individual.ivs=Object.fromEntries(statKeys.map(k=>[k,perfect.has(k)?31:Math.floor(random()*31)])) as StatBlock;
 // Keep the legacy draw order and non-core IVs. Guaranteed Raid core IVs can
 // be below 31; they never affect the independently packed premium reward.
 if(boss.ivRule.protectedIv!==undefined){
  if(!Number.isInteger(boss.ivRule.protectedIv)||boss.ivRule.protectedIv<0||boss.ivRule.protectedIv>31)throw Error('Invalid Raid protected IV');
  for(const stat of protectedStats)individual.ivs[stat]=boss.ivRule.protectedIv;
 }
 if(boss.battleTraining!=='elite')individual.ivs.hp=Math.max(16,individual.ivs.hp);
 individual.nature=route.recruit.nature;individual.ability=route.recruit.ability;
 individual.shiny=rollEncounterShiny(max=>Math.floor(random()*max));
 individual.gender=speciesGender(boss.species,random());
 const set=(profile:typeof individual)=>({name:boss.species,species:boss.species,level:50,item:'',pokeball:POINT_TEAM_MARKER,...structuredClone(profile),gender:profile.gender??'N'});
 // The saved starting slots are separate from the current-form validation view.
 const opponentTeam=Showdown.Teams.pack(phases.map(phase=>({...set({...individual,moves:[...phase.moves]}),item:phase.item??''})));
 // Item/money reward table stays elite; Pokémon quality has its own profile.
 const reward=snapshotRankReward(db,runId,'elite',random).rewardDefinition;
 const snapshot:RaidSnapshot={version:1,rewardProfile:boss.rewardProfile,transformationAdapter:1,recruitment:boss.recruitment??{mode:'baseSpecies'},...(boss.hpMode?{hpMode:boss.hpMode}:boss.raidHpMultiplier!==undefined?{raidHpMultiplier:boss.raidHpMultiplier}:{}),bossId:boss.id,species:boss.species,category:boss.category,routeId:route.id,individual,phases,opponentTeam,recruitTeam:'',reward:{...reward,title:'특별한 보상'}};
 snapshot.recruitTeam=premiumRaidRecruitment(snapshot);
 validateRaidHP(snapshot);return snapshot;
}
type RaidRow={event_id:string;snapshot_json:string;battle_id:string|null};
export class RaidEvents{
 constructor(private readonly db:DatabaseSync){}
 create(eventId:string,runId:string,floor:number){const snapshot=createRaidSnapshot(this.db,runId,floor);this.db.prepare('INSERT INTO raid_encounters(event_id,snapshot_json) VALUES (?,?)').run(eventId,JSON.stringify(snapshot));}
 row(eventId:string){return this.db.prepare('SELECT * FROM raid_encounters WHERE event_id=?').get(eventId) as RaidRow|undefined;}
 forBattle(battleId:string){return this.db.prepare('SELECT * FROM raid_encounters WHERE battle_id=?').get(battleId) as RaidRow|undefined;}
 snapshot(row:RaidRow){return JSON.parse(row.snapshot_json) as RaidSnapshot;}
 recruitmentTeam(row:RaidRow){return raidRecruitmentTeam(this.snapshot(row));}
 view(eventId:string){const row=this.row(eventId);if(!row)return {};const saved=this.snapshot(row),status=(this.db.prepare('SELECT status FROM run_events WHERE id=?').get(eventId) as {status:string}).status;return {raid:{spriteId:Showdown.Dex.species.get(saved.species).num,category:saved.category},phase:status==='reward'?'reward' as const:row.battle_id?'battle' as const:'choice' as const};}
 start(eventId:string,battleId:string){this.db.prepare('UPDATE raid_encounters SET battle_id=? WHERE event_id=?').run(battleId,eventId);this.db.prepare("UPDATE run_events SET choice_id='challenge' WHERE id=?").run(eventId);}
 retry(previous:string,next:string){this.db.prepare('UPDATE raid_encounters SET battle_id=? WHERE battle_id=?').run(next,previous);}
 win(row:RaidRow,owner:string,runId:string){const result=applyRewardOption(this.db,owner,this.snapshot(row).reward,runId);this.db.prepare("UPDATE run_events SET status='reward',result_json=? WHERE id=?").run(JSON.stringify(result),row.event_id);}
}
