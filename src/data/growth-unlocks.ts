import type {ItemRarity} from './held-item-shop';
import {machineRarity} from './machine-rarities';

// Provisional permanent-growth prices (growth points). Kept as data so they can be tuned.
export const HIDDEN_ABILITY_UNLOCK_PRICE=1000;
// Move unlocks reuse the existing machine rarity grade; moves outside the machine list grade as 'uncommon'.
export const moveUnlockPrices:Record<ItemRarity,number>={uncommon:300,rare:500,unique:800,epic:1200,legendary:1800};
export function moveUnlockPrice(move:string):number{return moveUnlockPrices[machineRarity(move)];}
