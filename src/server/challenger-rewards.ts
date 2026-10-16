import type {DatabaseSync} from 'node:sqlite';
import {rankRewardProfiles as profiles,type RankRewardSnapshot} from '../data/challenger-rewards';
import type {NpcRank} from '../data/npc-ranks';
import type {RewardEffect,RewardOption,RewardSelectionDefinition} from '../data/rewards';
import {heldItemKeys,itemName} from '../data/held-items';
import {itemShopRule} from '../data/held-item-shop';
import {machineMoves} from '../data/shop';
import {machineRarity} from '../data/machine-rarities';
import {trainerEquipmentKeys} from '../data/trainer-equipment';
import {statKeys} from '../data/training';
import {trainingOptions} from './training';
import {moveLearnsets,profileLearnset} from './move-learnsets';
import type {TrainingProfile} from '../data/training';
import {allowsRuleItem,type BattleRule} from '../data/run-rules';

export function weightedRewardId<T extends string>(pool:readonly {id:T;weight:number}[],random:()=>number):T{
 let draw=random()*pool.reduce((n,c)=>n+c.weight,0);
 return pool.find(c=>(draw-=c.weight)<0)?.id??pool.at(-1)!.id;
}
const pick=<T>(values:readonly T[],random:()=>number)=>values[Math.floor(random()*values.length)];
export const epicRewardItems=heldItemKeys.filter(item=>itemShopRule(item).rarity==='epic');
export const eliteRewardMachines=machineMoves.filter(move=>['unique','epic'].includes(machineRarity(move)));
// Only reward randomness uses this source. Team/rank generation uses a different seed.
export function snapshotRankReward(db:DatabaseSync,runId:string,rank:NpcRank,random:()=>number):RankRewardSnapshot{
 const run=db.prepare('SELECT player_id,profiles FROM runs WHERE id=?').get(runId) as {player_id:string;profiles:string};
 const roster=(db.prepare('SELECT species FROM members WHERE run_id=?').all(runId) as {species:string}[]).map(r=>r.species);
 const training:Record<string,TrainingProfile>=JSON.parse(run.profiles);
 const rule=(db.prepare('SELECT rule FROM run_rules WHERE run_id=?').get(runId) as {rule:BattleRule}).rule;
 const result=(id:string,entries:readonly RewardEffect[],selections?:readonly RewardSelectionDefinition[]):RankRewardSnapshot=>({rewardSnapshotVersion:2,rewardDefinition:{id:`${rank}-${id}`,title:rank==='normal'?'소소한 보상':rank==='elite'?'희귀한 보상':'특별한 보상',tone:rank==='master'?'great':'good',entries},...(selections?{selections}:{})});
 if(rank==='normal')return weightedRewardId(profiles.normal.pool,random)==='coins'?result('coins',[{kind:'coins',amount:profiles.normal.coins}]):result('egg',[{kind:'egg-ticket',amount:1}]);
 if(rank==='elite'){
  const profile=profiles.elite;
  switch(weightedRewardId(profile.pool,random)){
   case 'coins':return result('coins',[{kind:'coins',amount:profile.coins}]);
   case 'eggs':return result('eggs',[{kind:'egg-ticket',amount:profile.eggMin+Math.floor(random()*(profile.eggMax-profile.eggMin+1))}]);
   case 'growth':return result('growth',[{kind:'growth-points',amount:profile.growth}]);
   case 'vitamins':{
    const count=profile.vitaminMin+Math.floor(random()*(profile.vitaminMax-profile.vitaminMin+1)),pool=[...statKeys],entries:RewardEffect[]=[];
    for(let i=0;i<count;i++){const index=Math.floor(random()*pool.length),stat=pool.splice(index,1)[0];entries.push({kind:'vitamin',stat,amount:1});}
    return result('vitamins',entries);
   }
   case 'epic':return result('epic',[{kind:'item-exchange',items:epicRewardItems.filter(item=>allowsRuleItem(rule,item)),amount:1,fallbackCoins:profile.coins}]);
   case 'machine':{
    const moves=eliteRewardMachines.filter(move=>roster.some(species=>!moveLearnsets[species].selfMoves.includes(move)&&!profileLearnset(species,training[species]?.forme).selfMoves.includes(move)&&trainingOptions(species,training[species]?.forme).learnableMoves.includes(move)&&!db.prepare('SELECT 1 FROM move_unlocks WHERE player_id=? AND species=? AND move=?').get(run.player_id,species,move)&&!training[species]?.moves.includes(move)));
    return moves.length?result('machine',[{kind:'machine',move:pick(moves,random),amount:1}]):result('machine-fallback',[{kind:'coins',amount:profile.coins}]);
   }
  }
 }
 const profile=profiles.master,eggKind=weightedRewardId(profile.eggs,random);
 const egg:RewardEffect=eggKind==='normal'?{kind:'egg-ticket',amount:profile.tickets}:{kind:'typed-egg-ticket',eggKind,amount:1};
 const equipment=trainerEquipmentKeys.filter(item=>allowsRuleItem(rule,item)&&!db.prepare('SELECT 1 FROM run_trainer_equipment WHERE run_id=? AND item=?').get(runId,item));
 const equipmentItem=equipment.length?pick(equipment,random):null;
 // All unique trainer equipment owned: a snapshotted, clearly named fallback.
 const equipmentEffect:RewardEffect=equipmentItem?{kind:'trainer-equipment',item:equipmentItem,amount:1,fallbackPoints:profile.equipmentFallback}:{kind:'coins',amount:profile.equipmentFallbackCoins};
 const candidates={
  eggs:{id:'eggs',label:eggKind==='normal'?`알 뽑기권 ${profile.tickets}장`:eggKind==='superRare'?'슈퍼레어 알 티켓 1장':'이로치 알 티켓 1장',effects:[egg]},
  growth:{id:'growth',label:`성장 포인트 ${profile.growth.toLocaleString()}P`,effects:[{kind:'growth-points',amount:profile.growth}]},
  equipment:{id:'equipment',label:equipmentItem?itemName(equipmentItem):`장비 대체 보상 · 타워 코인 ${profile.equipmentFallbackCoins.toLocaleString()}`,description:equipmentItem?'이미 보유하게 되면 성장 포인트로 대체':'현재 룰에서 받을 수 있는 미보유 장비가 없을 때 지급',effects:[equipmentEffect]},
 } satisfies Record<string,RewardSelectionDefinition['candidates'][number]>;
 const selections:RewardSelectionDefinition[]=[{id:'master-reward',title:'특별한 보상 · 하나를 선택하세요',expanded:true,candidates:profile.categories.slice(0,profile.selectionCount).map(category=>candidates[category])}];
 return result('selection',[],selections);
}
