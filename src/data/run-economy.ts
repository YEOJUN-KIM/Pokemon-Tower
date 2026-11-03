// Run Coin economy (beta.6). Every price and probability for the checkpoint shop lives here.
// Provisional values: tune with scripts/simulate-run-economy.ts and scripts/simulate-scout-rarity.ts.
// Run Coin buys things that matter inside the current run only. Permanent growth uses growth points.
export const SHOP_CARD_COUNT=4;
export const SCOUT_COUNT=4;
// Build progression (hundred-floor-v2): player gimmicks are locked until this floor is cleared.
// The first gimmick is a free pick; later ones are bought from the Held Items pool.
export const FIRST_GIMMICK_FLOOR=50;
export const playerGimmickFamilies:readonly string[]=['mega','z','dynamax','tera'];

export type SupportTier='basic'|'advanced'|'special';
export type SupportEntry={tier:SupportTier;price:number;weight:number;minClearedFloor:number;ability?:string};
// Temporary Ability-like effects for one battle. Only abilities that work after switch-in are listed.
// Deferred: Magic Bounce, Good as Gold, Disguise. Excluded: switch-in only abilities and Huge/Pure Power.
export const abilitySupport={
  abilityLevitate:{name:'부유 부여',ability:'Levitate',icon:'air-balloon',description:'이번 전투 동안 특성 부유 효과를 얻는다 · 교체해도 유지'},
  abilityMagicGuard:{name:'매직가드 부여',ability:'Magic Guard',icon:'focus-sash',description:'이번 전투 동안 특성 매직가드 효과를 얻는다 · 교체해도 유지'},
  abilityMultiscale:{name:'멀티스케일 부여',ability:'Multiscale',icon:'guard-spec',description:'이번 전투 동안 특성 멀티스케일 효과를 얻는다 · 교체해도 유지'},
  abilityUnaware:{name:'천진 부여',ability:'Unaware',icon:'x-defense',description:'이번 전투 동안 특성 천진 효과를 얻는다 · 교체해도 유지'},
  abilityRegenerator:{name:'재생력 부여',ability:'Regenerator',icon:'x-sp-def',description:'이번 전투 동안 특성 재생력 효과를 얻는다 · 교체해도 유지'},
} as const;
export type AbilitySupportKind=keyof typeof abilitySupport;
export const isAbilitySupport=(kind:string):kind is AbilitySupportKind=>Object.hasOwn(abilitySupport,kind);

const basic={tier:'basic',price:300,weight:20,minClearedFloor:0} as const;
const advanced={tier:'advanced',price:700,weight:8,minClearedFloor:10} as const;
const special={tier:'special',price:1500,weight:4,minClearedFloor:20} as const;
// Keys are battle item kinds (see data/shop.ts upgrades). Accuracy stays a legacy bag item and is not sold.
export const supportCatalog:Record<string,SupportEntry>={
  attack:basic,defense:basic,specialAttack:basic,specialDefense:basic,speed:basic,
  critical:advanced,guard:advanced,
  ...Object.fromEntries(Object.entries(abilitySupport).map(([kind,entry])=>[kind,{...special,ability:entry.ability}])),
};
export const supportPrice=(kind:string)=>supportCatalog[kind]?.price??0;
export const supportTierLabels:Record<SupportTier,string>={basic:'기본',advanced:'고급',special:'특수'};

// Scout rarity groups, ordered from common to rare.
export const scoutGroups=['common','strong','pseudo','paradox','sublegendary','restricted','mythical'] as const;
export type ScoutGroup=typeof scoutGroups[number];
export const scoutGroupLabels:Record<ScoutGroup,string>={common:'일반',strong:'고성능',pseudo:'600족급',paradox:'패러독스',sublegendary:'준전설',restricted:'전설',mythical:'환상'};
export const scoutPrices:Record<ScoutGroup,number>={common:1200,strong:2000,pseudo:3000,paradox:3800,sublegendary:4500,restricted:6000,mythical:6500};
// Shop weights by cleared floor. Rows blend linearly between their floors.
type Row=Record<ScoutGroup,number>;
export const scoutWeightTable:readonly {floor:number;weights:Row}[]=[
  {floor:0,weights:{common:80,strong:20,pseudo:0,paradox:0,sublegendary:0,restricted:0,mythical:0}},
  {floor:20,weights:{common:60,strong:33,pseudo:6,paradox:1,sublegendary:0,restricted:0,mythical:0}},
  {floor:40,weights:{common:42,strong:38,pseudo:14,paradox:4,sublegendary:2,restricted:0,mythical:0}},
  {floor:60,weights:{common:28,strong:38,pseudo:20,paradox:7,sublegendary:5,restricted:0.8,mythical:0.3}},
  {floor:80,weights:{common:18,strong:34,pseudo:24,paradox:10,sublegendary:8,restricted:2.4,mythical:1}},
  {floor:90,weights:{common:12,strong:30,pseudo:26,paradox:12,sublegendary:10,restricted:4.2,mythical:2}},
];
export function scoutGroupWeights(clearedFloor:number):Row{
  const table=scoutWeightTable;let upper=table.findIndex(row=>row.floor>clearedFloor);
  if(upper===-1)return {...table.at(-1)!.weights};
  if(upper===0)upper=1;
  const a=table[upper-1],b=table[upper],t=Math.max(0,Math.min(1,(clearedFloor-a.floor)/(b.floor-a.floor)));
  return Object.fromEntries(scoutGroups.map(g=>[g,a.weights[g]+(b.weights[g]-a.weights[g])*t])) as Row;
}
// Rerolling replaces all four candidates. Price grows with rerolls already used at this checkpoint.
export const SCOUT_REROLL_BASE=800;
export const SCOUT_REROLL_STEP=400;
export const SCOUT_REROLL_CAP=4000;
export const scoutRerollPrice=(rerolls:number)=>Math.min(SCOUT_REROLL_CAP,SCOUT_REROLL_BASE+SCOUT_REROLL_STEP*Math.max(0,rerolls));

// Support stock depends on the cleared floor; entries below their minimum floor are not stocked.
export function supportKinds(clearedFloor:number){return Object.entries(supportCatalog).filter(([,entry])=>entry.minClearedFloor<=clearedFloor).map(([kind,entry])=>({kind,...entry}));}
export function rollSupportOffers(clearedFloor:number,random:()=>number,count=SHOP_CARD_COUNT):string[]{
  const pool=supportKinds(clearedFloor),result:string[]=[];
  while(result.length<count&&pool.length){
    let pick=random()*pool.reduce((sum,entry)=>sum+entry.weight,0),index=pool.length-1;
    for(let i=0;i<pool.length;i++){pick-=pool[i].weight;if(pick<0){index=i;break;}}
    result.push(pool[index].kind);pool.splice(index,1);
  }
  return result;
}
