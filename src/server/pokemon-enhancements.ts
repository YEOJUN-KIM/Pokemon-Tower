import type {DatabaseSync} from 'node:sqlite';
import type {TrainingProfile,StatKey} from '../data/training';
import {statKeys} from '../data/training';
import type {RewardEffect,RewardSelectionDefinition} from '../data/rewards';
import {defaultProfile} from './training';
import {pokemonName} from '../data/pokemon-catalog';
import {BattleRequestError} from './request-error';
export type EnhancementMode='one-iv'|'six-iv'|'shiny';
const statNames:Record<StatKey,string>={hp:'HP',atk:'공격',def:'방어',spa:'특수공격',spd:'특수방어',spe:'스피드'};
function context(db:DatabaseSync,owner:string,runId:string,species:string){
 const run=db.prepare('SELECT profiles FROM runs WHERE id=? AND player_id=?').get(runId,owner) as {profiles:string}|undefined;
 if(!run||!db.prepare('SELECT 1 FROM members WHERE run_id=? AND species=?').get(runId,species)||!db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get(owner,species))throw new BattleRequestError('현재 도전의 보유 포켓몬을 선택하세요.',409);
 const row=db.prepare('SELECT profile,revision FROM pokemon_training WHERE player_id=? AND species=?').get(owner,species) as {profile:string;revision:number}|undefined;
 const saved:TrainingProfile=row?JSON.parse(row.profile):defaultProfile(species),profiles:Record<string,TrainingProfile>=JSON.parse(run.profiles),current=profiles[species]??saved;
 return {saved,current,profiles,revision:row?.revision??0};
}
export function enhancementCandidates(db:DatabaseSync,owner:string,runId:string,mode:EnhancementMode):RewardSelectionDefinition['candidates']{
 return (db.prepare('SELECT species FROM members WHERE run_id=? ORDER BY slot').all(runId) as {species:string}[]).flatMap(({species})=>{
  const {saved,current}=context(db,owner,runId,species),stats=statKeys.filter(stat=>current.ivs[stat]<31);
  const effect=(stat?:StatKey):RewardEffect=>({kind:'pokemon-enhancement',mode,species,...(stat?{stat}:{}),amount:1});
  if(mode==='one-iv')return stats.map(stat=>({id:`${species}:${stat}`,label:`${pokemonName(species)} · ${statNames[stat]} → V`,species,stat,effects:[effect(stat)]}));
  if(mode==='six-iv'&&!stats.length||mode==='shiny'&&(current.shiny||saved.shiny))return [];
  return [{id:species,label:pokemonName(species),species,effects:[effect()]}];
 });
}
// Runs inside the event selection transaction; its persisted selection is the receipt.
export function applyPokemonEnhancement(db:DatabaseSync,owner:string,runId:string,effect:Extract<RewardEffect,{kind:'pokemon-enhancement'}>){
 if(effect.amount!==1||!['one-iv','six-iv','shiny'].includes(effect.mode)||effect.mode==='one-iv'&&!statKeys.includes(effect.stat!))throw Error('Invalid enhancement reward');
 const id=effect.mode==='one-iv'?`${effect.species}:${effect.stat}`:effect.species;
 if(!enhancementCandidates(db,owner,runId,effect.mode).some(c=>c.id===id))throw new BattleRequestError('이미 달성했거나 강화할 수 없는 대상입니다.',409);
 const {saved,current,profiles,revision}=context(db,owner,runId,effect.species);
 const change=(profile:TrainingProfile):TrainingProfile=>effect.mode==='shiny'?{...profile,shiny:true}:{...profile,ivs:{...profile.ivs,...Object.fromEntries((effect.mode==='one-iv'?[effect.stat!]:statKeys).map(stat=>[stat,31]))}};
 db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?) ON CONFLICT(player_id,species) DO UPDATE SET profile=excluded.profile,revision=excluded.revision').run(owner,effect.species,JSON.stringify(change(saved)),revision+1);
 profiles[effect.species]=change(current);
 db.prepare('UPDATE runs SET profiles=? WHERE id=?').run(JSON.stringify(profiles),runId);
}
