import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {floors} from '../src/data/floors';
import {permanentPrices} from '../src/data/permanent-upgrades';
import {eventDefinitions,mysteryChestResults,type RunEventRegistry} from '../src/data/run-events';
import {selectRunEvent,rollRewardOption} from '../src/game/run-events';
import {rollItemOffers} from '../src/data/held-item-shop';
import {heldItems} from '../src/data/held-items';
import {rollMachineOffers,machinePrice} from '../src/data/machine-rarities';
import {machineMoves,upgrades,isShopFloor} from '../src/data/shop';
import {rankRewardProfiles} from '../src/data/challenger-rewards';
import {drawChallengers} from '../src/data/challengers';
import {hiddenShopProductPool} from '../src/data/hidden-shop';
import {hiddenShopProducts,snapshotHiddenShop} from '../src/server/hidden-shop';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {trainingCost} from '../src/data/training';
import {defaultProfile} from '../src/server/training';
import {villainCampaignTracks,villainTrackEligible,villainChance,villainRewardSettings} from '../src/data/villain-tracks';
import type {RewardEffect} from '../src/data/rewards';

// Conditional cash-flow simulation, NOT a battle/win-rate predictor. Fixed depths
// separate economy from combat. Independent RNG streams keep encounters paired
// across price variants and spending policies, even when purchases diverge.
const samples=Number(process.env.ECONOMY_SAMPLES??256);
if(!Number.isSafeInteger(samples)||samples<1)throw Error('ECONOMY_SAMPLES must be positive');
function rng(seed:number){let x=seed>>>0;return()=>{x+=0x6d2b79f5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const mean=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/Math.max(1,xs.length);
const quantile=(xs:number[],p:number)=>[...xs].sort((a,b)=>a-b)[Math.floor((xs.length-1)*p)]??0;
type Variant={id:string;startingCoins?:number;reward:(floor:number)=>number;egg:number;trainingMultiplier:number;eliteEggMax:number;masterEggs:number;masterGrowth:number;eliteGrowth:number;merchant:number;chestScale:number;giftWeight:number;hiddenQuantityPrice:boolean};
const baselinePath='artifacts/experiments/balance/currency-balance-baseline.json';
const store=new TowerStore(':memory:');store.ensurePlayer('sim');const runId=store.battle(store.start('sim',starters)).run_id;
const liveProducts=hiddenShopProducts(store.db,runId);store.close();
const base=defaultProfile('Charizard'),trained=structuredClone(base);trained.evs.spa=32;trained.evs.spe=32;trained.evs.hp=2;trained.nature='Modest';trained.ability='Solar Power';
const liveBaseline={floors,egg:permanentPrices.egg,profiles:rankRewardProfiles,products:liveProducts,registry:eventDefinitions,chest:mysteryChestResults,training:trainingCost(base,trained),hiddenPool:hiddenShopProductPool};
if(!existsSync(baselinePath))throw Error('Missing frozen pre-balance baseline');
const baseline=JSON.parse(readFileSync(baselinePath,'utf8')) as typeof liveBaseline;
const profiles=baseline.profiles;
const variants:Variant[]=[
 {id:'current',reward:f=>baseline.floors[f-1].reward,egg:baseline.egg,trainingMultiplier:1,eliteEggMax:profiles.elite.eggMax,masterEggs:profiles.master.tickets,masterGrowth:profiles.master.growth,eliteGrowth:profiles.elite.growth,merchant:300,chestScale:1,giftWeight:30,hiddenQuantityPrice:false},
 ...[0,15,30].map(step=>({id:`candidate-${step}`,reward:(f:number)=>180+Math.floor((f-1)/10)*step+(f%10===0?300:f%5===0?150:0),egg:200,trainingMultiplier:8,eliteEggMax:2,masterEggs:3,masterGrowth:500,eliteGrowth:120,merchant:900,chestScale:.5,giftWeight:15,hiddenQuantityPrice:true})),
];
variants.push({...variants.find(v=>v.id==='candidate-15')!,id:'candidate-15-max-allowance',startingCoins:450});
const products=baseline.products,originalTraining=baseline.training;
const rows:unknown[]=[];
for(const variant of variants){
 const registry:RunEventRegistry={...baseline.registry,'breeder-gift':{...baseline.registry['breeder-gift'],weight:variant.giftWeight}};
 const hidden=variant.id==='current'?products:[...products.filter(p=>p.category!=='egg-tickets'),...[1,2].map(quantity=>({...products.find(p=>p.category==='egg-tickets')!,id:`egg-ticket-${quantity}`,prices:{coins:[900,1400] as const,'growth-points':[160,200] as const},quantity,effect:{kind:'egg-ticket' as const,amount:quantity}}))];
 for(const depth of [10,30,50,100])for(const success of [.45,.75,1])for(const policy of ['survival','balanced','collector'] as const){
 const results=[];
 for(let seed=1;seed<=samples;seed++){
  let coins=variant.startingCoins??0,earned=0,spent=0,loss=0,growth=depth*20+Math.floor(depth/5)*50+(depth===100?100:10),tickets=0,rare=0,blocked=0,wanted=0,visits=0,previous:number|null=null,stage=0,failures=0,lastVillain:number|null=null,order=0,gear=0;
  const items=new Set<string>(),machines=new Set<string>(),track=Object.values(villainCampaignTracks)[seed%Object.keys(villainCampaignTracks).length];
  const buy=(price:number)=>{wanted++;if(coins<price+(policy==='collector'?300:600)){blocked++;return false;}coins-=price;spent+=price;return true;};
  const effects=(entries:readonly RewardEffect[])=>{for(const e of entries){if(e.kind==='coins'){coins+=e.amount;earned+=e.amount;}if(e.kind==='coin-loss'){const n=Math.floor(coins*e.percent/100);coins-=n;loss+=n;}if(e.kind==='egg-ticket')tickets+=e.amount;if(e.kind==='typed-egg-ticket')rare+=e.amount;if(e.kind==='growth-points')growth+=e.amount;}};
  for(let floor=1;floor<=depth;floor++){
   const random=rng(seed*100003+floor*97),roll=(n:number)=>Math.floor(random()*n);
   coins+=variant.reward(floor);earned+=variant.reward(floor);order++;
   // Route battles are additional encounters; campaign rolls use live stage gates.
   const next=track.stages[stage];
   if(villainTrackEligible(next,floor,order,lastVillain)){
    if(roll(100)<villainChance(failures)){failures=0;lastVillain=order;stage++;if(random()<success){const n=villainRewardSettings[`${next.rank}Coins`];coins+=n;earned+=n;order++;if(next.rank==='boss')rare++;}}else failures++;
   }
   const kind=selectRunEvent(floor,previous,roll,registry,2,order,k=>!k.startsWith('rocket-'));
   if(kind){previous=order;
    if(kind==='mystery-chest'){
     const table=baseline.chest.map(r=>({...r,option:{...r.option,entries:r.option.entries.map(e=>e.kind==='egg-ticket'?{...e,amount:Math.max(1,Math.round(e.amount*variant.chestScale))}:e)}}));
     effects(rollRewardOption(table,roll).entries);
    }else if(kind==='breeder-gift')tickets++;
    else if(kind==='traveling-merchant'&&policy==='collector'&&buy(variant.merchant))tickets++;
    else if(kind==='hidden-shop'){
     const snapshot=snapshotHiddenShop(hidden,random);
     for(const offer of snapshot.offers.filter(o=>policy==='collector'?o.category.includes('ticket'):o.category==='held-item'||o.category==='equipment').slice(0,2)){
      // Live snapshots now price bundles per ticket; undo that for the frozen
      // baseline, whose saved prices were per bundle.
      const price=offer.price/(offer.category==='egg-tickets'&&!variant.hiddenQuantityPrice?offer.quantity:1);
      if(offer.currency==='coins'){if(buy(price))effects([offer.effect]);}
      // GP spending is optional and isolated from the run wallet.
      else if(growth>=price+variant.egg){growth-=price;effects([offer.effect]);}
     }
    }else if(kind==='challenger-selection'||kind==='raid-encounter'){
     const rank=kind==='raid-encounter'?'elite':drawChallengers(floor,random).sort((a,b)=>b.danger-a.danger)[0].rank;
     if(random()<success){order++;
      if(rank==='master'){if(policy==='collector'){if(random()<.6)tickets+=variant.masterEggs;else rare++;}else growth+=variant.masterGrowth;}
      else{const profile=profiles[rank];let n=random()*100;const selected=profile.pool.find(p=>(n-=p.weight)<0)!.id;
       if(selected==='coins'){coins+=profile.coins;earned+=profile.coins;}
       if(selected==='eggs')tickets+=rank==='normal'?1:variant.id==='current'?3+roll(3):1+roll(variant.eliteEggMax);
       if(selected==='growth')growth+=variant.eliteGrowth;
      }
     }
    }
   }
   if(floor<depth&&isShopFloor(floor+1,100)){
    visits++;const shopRandom=rng(seed*99991+floor*193);
    // Current free rerolls: 1/category for fresh players, 3 at max upgrades.
    const rounds=policy==='survival'?1:3;
    for(let revision=0;revision<=rounds;revision++){
     for(const item of rollItemOffers(floor,shopRandom,x=>!items.has(x))){
      if(gear>=3||heldItems[item].price<600)continue;
      if(buy(heldItems[item].price)){items.add(item);gear++;}
     }
     for(const {move} of rollMachineOffers(machineMoves.filter(m=>!machines.has(m)).map(move=>({move})),floor,shopRandom)){
      if(machines.size>=6)break;if(buy(machinePrice(move)))machines.add(move);
     }
    }
    // Ten encounters between shops. Demand is explicit, not a claimed optimal AI.
    const uses=policy==='survival'?10:policy==='balanced'?6:2;
    for(let n=0;n<uses;n++)buy(upgrades.attack.price);
   }
  }
  results.push({coins,earned,spent,loss,growth,tickets,rare,blocked,wanted,visits});
 }
 const trainingPrice=(originalTraining-100)*variant.trainingMultiplier+100;
 rows.push({variant:variant.id,depth,eventWinChance:success,policy,samples,coinIncome:mean(results.map(r=>r.earned)),coinSpent:mean(results.map(r=>r.spent)),walletMedian:quantile(results.map(r=>r.coins),.5),walletP10:quantile(results.map(r=>r.coins),.1),walletP90:quantile(results.map(r=>r.coins),.9),unaffordableShare:mean(results.map(r=>r.blocked/Math.max(1,r.wanted))),growth:mean(results.map(r=>r.growth)),tickets:mean(results.map(r=>r.tickets)),superRareOrShinyTickets:mean(results.map(r=>r.rare)),fullyTrainedPokemon:mean(results.map(r=>r.growth/trainingPrice)),paidEggs:mean(results.map(r=>r.growth/variant.egg))});
 }
}
mkdirSync('artifacts/reports',{recursive:true});
const report={samples,trajectories:rows.length*samples,notes:[
 'Conditional on 10/30/50/100 floor clears. No battles executed; event success is a sensitivity parameter, not a predicted win rate.',
 'Live event gates, item/TM rarity draws, challenger sample/rank draws, hidden-shop stock and campaign stage gates. Paired deterministic RNG seeds.',
 'Event defeats continue for accounting stress tests; actual defeat/retry, recruitment strength, compatibility, free equipment/vitamins and teleport route changes are not modeled. All three challenger candidates are inspected and the highest rank is chosen.',
 'Campaign runs before ordinary event in this model; live scheduling can differ. Reward snapshots and owned-item filtering are approximated. All compatible stock is assumed useful up to 3 gear/6 TMs. Gear loss is not modeled.',
 'Demand: survival/balanced/collector buy 10/6/2 battle consumables per checkpoint, with 600/600/300 reserve. Collector prioritizes event eggs; others choose master GP. GP shown net of modeled hidden-shop purchases.',
 'Current is the frozen pre-change baseline; candidate-15 is the selected economy. Max-allowance adds the approved 450 starting coins. New upgrades are implemented separately; this script does not mutate player saves.',
],variants:variants.map(({reward,...v})=>({...v,floorRewards:floors.map(f=>reward(f.number))})),hiddenShopBaseline:baseline.hiddenPool,rows};
writeFileSync('artifacts/experiments/balance/currency-balance-simulation.json',JSON.stringify(report,null,2));
for(const row of rows as {depth:number;eventWinChance:number;policy:string}[])if(row.eventWinChance===.75&&row.policy==='balanced')console.log(JSON.stringify(row));
console.log(`Wrote ${report.trajectories} trajectories to artifacts/experiments/balance/currency-balance-simulation.json`);
