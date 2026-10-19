import type {TrainerSample,TrainerTactic} from './trainer-catalog';
import {galarTrainer} from './galar-trainers';
import {paldeaTrainer} from './paldea-trainers';

export const npcAiTiers=['basic','tactical','expert'] as const;
export type NpcAiTier=typeof npcAiTiers[number];
export type NpcAi={tier:NpcAiTier;tactic:TrainerTactic;galar?:'gym'|'brawler'|'elite'|'executive'|'phases'|'champion'|'grunt';pivot?:'v1';galarAce?:'v2';advancedSwitch?:'v1'|'aggressive-v1';paldea?:string};

// Decision capability only. Never changes team generation or training values.
export function npcAi(floor:number,sample:Pick<TrainerSample,'kind'|'role'|'tactic'|'npcRank'|'aiCeiling'>&{id?:string},options:{challenger?:boolean;boss?:boolean}={}):NpcAi{
 const paldea=sample.id?paldeaTrainer(sample.id):undefined;
 if(paldea)return {tier:paldea.aiCeiling as NpcAiTier,tactic:sample.tactic,paldea:paldea.id,...(paldea.category==='hidden'?{advancedSwitch:'aggressive-v1' as const}:paldea.category==='elite'?{advancedSwitch:'v1' as const}:{}),...(['named-iono','named-kofu'].includes(paldea.id)?{pivot:'v1' as const}:{})};
 const galar=sample.id?galarTrainer(sample.id):undefined;
 if(galar){
  const style:NpcAi['galar']=galar.category==='grunt'?'grunt':galar.category==='boss'?'phases':galar.category==='champion'?'champion':galar.category==='executive'?'executive':galar.id==='named-raihan'?'elite':galar.id==='named-bea'?'brawler':'gym';
  return {tier:galar.aiCeiling as NpcAiTier,tactic:sample.tactic,galar:style,...(style==='elite'||style==='champion'?{pivot:'v1' as const,advancedSwitch:'v1' as const}:{}),...(style==='champion'?{galarAce:'v2' as const}:{})};
 }
 const ordinary=sample.kind==='normal'&&(!sample.npcRank||sample.npcRank==='normal');
 const named=sample.kind==='named';
 const ceiling=sample.aiCeiling??(ordinary?'tactical':named&&floor<40&&sample.role!=='champion'&&sample.role!=='elite'&&!options.boss?'tactical':'expert');
 let tier:NpcAiTier=floor>=50?'expert':floor>=20?'tactical':'basic';
 if(sample.kind!=='normal'||sample.npcRank&&sample.npcRank!=='normal')tier=npcAiTiers[Math.max(1,npcAiTiers.indexOf(tier))];
 if(sample.role==='champion'||options.boss||options.challenger&&sample.npcRank==='master'||sample.aiCeiling==='expert'&&sample.role==='villain')tier='expert';
 const selected=npcAiTiers[Math.min(npcAiTiers.indexOf(tier),npcAiTiers.indexOf(ceiling))];
 const elite=sample.kind==='elite'||['elite','champion'].includes(sample.role??'')||['elite','master'].includes(sample.npcRank??'');
 return {tier:selected,tactic:sample.tactic,...(selected==='expert'&&elite?{advancedSwitch:'v1' as const}:{})};
}
