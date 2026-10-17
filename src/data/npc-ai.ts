import type {TrainerSample,TrainerTactic} from './trainer-catalog';

export const npcAiTiers=['basic','tactical','expert'] as const;
export type NpcAiTier=typeof npcAiTiers[number];
export type NpcAi={tier:NpcAiTier;tactic:TrainerTactic};

// Decision capability only. Never changes team generation or training values.
export function npcAi(floor:number,sample:Pick<TrainerSample,'kind'|'role'|'tactic'|'npcRank'|'aiCeiling'>,options:{challenger?:boolean;boss?:boolean}={}):NpcAi{
 const ordinary=sample.kind==='normal'&&(!sample.npcRank||sample.npcRank==='normal');
 const named=sample.kind==='named';
 const ceiling=sample.aiCeiling??(ordinary?'tactical':named&&floor<40&&sample.role!=='champion'&&sample.role!=='elite'&&!options.boss?'tactical':'expert');
 let tier:NpcAiTier=floor>=50?'expert':floor>=20?'tactical':'basic';
 if(sample.kind!=='normal'||sample.npcRank&&sample.npcRank!=='normal')tier=npcAiTiers[Math.max(1,npcAiTiers.indexOf(tier))];
 if(sample.role==='champion'||options.boss||options.challenger&&sample.npcRank==='master'||sample.aiCeiling==='expert'&&sample.role==='villain')tier='expert';
 return {tier:npcAiTiers[Math.min(npcAiTiers.indexOf(tier),npcAiTiers.indexOf(ceiling))],tactic:sample.tactic};
}
