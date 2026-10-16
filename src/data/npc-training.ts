export type NpcTrainingTier='casual'|'standard'|'advanced'|'elite'|'master';
export type NpcItemTier='none'|'basic'|'competitive'|'premium';
export type NpcTrainingDefinition={ivRange:readonly [number,number];evBudget:number;itemTier:NpcItemTier;buildQuality:'simple'|'balanced'|'optimized'};
// Floor controls the species pool separately. These are absolute training targets.
export const npcTrainingProfiles:Record<NpcTrainingTier,NpcTrainingDefinition>={
 casual:{ivRange:[0,6],evBudget:2,itemTier:'none',buildQuality:'simple'},
 standard:{ivRange:[5,12],evBudget:8,itemTier:'basic',buildQuality:'balanced'},
 advanced:{ivRange:[10,18],evBudget:18,itemTier:'competitive',buildQuality:'optimized'},
 elite:{ivRange:[16,22],evBudget:28,itemTier:'premium',buildQuality:'optimized'},
 master:{ivRange:[20,25],evBudget:40,itemTier:'premium',buildQuality:'optimized'},
};
export function npcTrainingTargets(floor:number,tier:NpcTrainingTier){
 if(!Number.isSafeInteger(floor)||floor<1||floor>100)throw Error('Unsupported NPC training floor');
 const definition=npcTrainingProfiles[tier],progress=Math.max(0,(floor-5)/95);
 const ivRange=definition.ivRange.map(value=>Math.floor(value+(31-value)*progress)) as [number,number];
 // Weak trainers remain less invested even on high floors; all legal budgets stay <= 66.
 const lateBudget={casual:18,standard:30,advanced:46,elite:60,master:66}[tier];
 return {...definition,ivRange,evBudget:Math.floor(definition.evBudget+(lateBudget-definition.evBudget)*progress)};
}
