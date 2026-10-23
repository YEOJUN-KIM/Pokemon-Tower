// Applied when a new battle snapshot / shop offer is created; saved payouts stay intact.
export const battleEconomy={baseRewardMultiplier:1.25,rankMultipliers:{normal:1,elite:1.5,master:2},systemItemPriceMultiplier:.75} as const;
export function battleCoinReward(base:number,rank:'normal'|'elite'|'master'='normal'){
 return Math.round(base*battleEconomy.baseRewardMultiplier*battleEconomy.rankMultipliers[rank]);
}
export const systemItemPrice=(base:number)=>Math.round(base*battleEconomy.systemItemPriceMultiplier);
