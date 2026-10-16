import {randomUUID} from 'node:crypto';
import type {TowerStore} from '../src/server/tower-store';
import type {StatKey} from '../src/data/training';
import {applyRewardOption} from '../src/server/rewards';
import {transaction} from '../src/server/storage/transaction';

export function useVitaminReward(store:TowerStore,owner:string,run:string,floor:number,stat:StatKey,species:string){
 transaction(store.db,()=>applyRewardOption(store.db,owner,{id:'fixture-vitamin',title:'영양제',tone:'good',entries:[{kind:'vitamin',stat,amount:1}]},run));
 const entry=store.view(owner).run!.rewardInventory!.at(-1)!;
 store.useReward(owner,run,randomUUID(),entry.id,species);
}
export function vitaminCount(store:TowerStore,run:string,species:string){return Number(store.db.prepare('SELECT COUNT(*) AS n FROM vitamin_purchases WHERE run_id=? AND species=?').get(run,species)!.n);}
export function vitaminBonus(store:TowerStore,run:string,species:string,stat:StatKey){return Number(store.db.prepare('SELECT points FROM run_stat_boosts WHERE run_id=? AND species=? AND stat=?').get(run,species,stat)?.points??0);}
