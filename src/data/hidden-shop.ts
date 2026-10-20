import type {RewardEffect} from './rewards';

export type HiddenShopCurrency='coins'|'growth-points';
export type HiddenShopCategory='vitamin'|'held-item'|'machine'|'egg-tickets'|'super-rare-ticket'|'equipment';
export const hiddenShopEventSettings={weight:12,minFloor:1,minRulesVersion:2,minItems:4,maxItems:5,purchaseLimit:2,duplicateCategoryPenalty:.25} as const;
type ProductGroup={weight:number;allowedCurrencies:readonly HiddenShopCurrency[];prices:Record<HiddenShopCurrency,readonly [number,number]>;quantities:readonly number[]};
// Weights belong to categories, not each expanded item: a large TM pool must
// not drown out tickets or vitamins. Prices are inclusive integer ranges.
export const hiddenShopProductPool:Record<HiddenShopCategory,ProductGroup>={
 vitamin:{weight:32,allowedCurrencies:['coins','growth-points'],prices:{coins:[400,700],'growth-points':[80,150]},quantities:[1]},
 'held-item':{weight:20,allowedCurrencies:['coins','growth-points'],prices:{coins:[1500,2500],'growth-points':[250,450]},quantities:[1]},
 machine:{weight:20,allowedCurrencies:['coins','growth-points'],prices:{coins:[1200,2000],'growth-points':[200,400]},quantities:[1]},
 'egg-tickets':{weight:24,allowedCurrencies:['coins','growth-points'],prices:{coins:[900,1400],'growth-points':[160,200]},quantities:[1,2]},
 'super-rare-ticket':{weight:3,allowedCurrencies:['coins','growth-points'],prices:{coins:[3000,5000],'growth-points':[600,1000]},quantities:[1]},
 equipment:{weight:1,allowedCurrencies:['coins','growth-points'],prices:{coins:[5000,8000],'growth-points':[1000,1500]},quantities:[1]},
};
// Optional per-product exceptions, e.g. 'vitamin-atk': {allowedCurrencies:['coins']}.
export const hiddenShopProductOverrides:Record<string,Partial<Pick<ProductGroup,'allowedCurrencies'|'prices'>>>={};
export type HiddenShopProduct={id:string;name:string;category:HiddenShopCategory;quantity:number;icon:string;description:string;allowedCurrencies:readonly HiddenShopCurrency[];prices:ProductGroup['prices'];effect:RewardEffect};
export type HiddenShopOffer=Omit<HiddenShopProduct,'allowedCurrencies'|'prices'> & {currency:HiddenShopCurrency;price:number;purchased:boolean};
export type HiddenShopSnapshot={version:1;purchaseLimit:number;offers:HiddenShopOffer[]};
export type HiddenShopView={purchaseLimit:number;purchasedCount:number;offers:Omit<HiddenShopOffer,'effect'>[]};
