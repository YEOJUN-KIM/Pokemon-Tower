// Single source of truth for shiny odds. Every RNG decision, UI label and test reads these tables.
// Entries are numerators over the scale of their kind, indexed by shinyCharmLevel (0 = no charm).
// Provisional values: tune with run simulations; keep each table non-decreasing.
export const SHINY_CHARM_MAX=5;
export const shinyOdds={
  // Egg machine draw: out of 10000. Level 0 is the pre-charm 0.24%.
  egg:{scale:10000,chances:[24,30,36,42,48,54]},
  // Encounter opponents: out of 65536. Level 0 equals the wild/NPC base 1/8192 (see server/shiny.ts).
  tower:{scale:65536,chances:[8,12,17,25,36,52]},
  // Scout offers (not connected yet): out of 10000. Fewer Pokemon are seen than in eggs, more than in the tower.
  scout:{scale:10000,chances:[6,9,13,18,25,35]},
} as const;
export type ShinyKind=keyof typeof shinyOdds;
export function shinyChance(kind:ShinyKind,level:number):number {
  const {scale,chances}=shinyOdds[kind];
  return chances[Math.max(0,Math.min(SHINY_CHARM_MAX,Math.trunc(level)||0))]/scale;
}
export const eggShinyChance=(level:number)=>shinyChance('egg',level);
export const towerShinyChance=(level:number)=>shinyChance('tower',level);
export const scoutShinyChance=(level:number)=>shinyChance('scout',level);
export function eggShinyWeight(level:number):number{return shinyChance('egg',level)*shinyOdds.egg.scale;}
// One draw: shiny when the roll lands under the numerator.
export function rollShiny(kind:ShinyKind,level:number,roll:(max:number)=>number):boolean {
  return roll(shinyOdds[kind].scale)<shinyChance(kind,level)*shinyOdds[kind].scale;
}
export function shinyPercent(chance:number):string{return `${(chance*100).toFixed(chance>=0.001?2:3)}%`;}
