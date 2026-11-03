// Shared Run Coin shopping model for the beta.6 economy and late-game simulations.
// A rough, deterministic player model, not a balance-grade AI. All prices and odds come from the game data.
import Showdown from 'pokemon-showdown';
import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {TowerStore} from '../../src/server/tower-store';
import {starters,initialPartners} from '../../src/data/teams';
import {isShopFloor} from '../../src/data/shop';
import {rollShopProducts,shopProductInfo,shopProductOptions,shopChoiceGroups} from '../../src/data/shop-products';
import {gimmickItemFamily} from '../../src/data/held-item-shop';
import {heldItems,type HeldItem} from '../../src/data/held-items';
import {canEquipGimmick,megaStones,DYNAMAX_ITEM} from '../../src/data/gimmicks';
import {rollSupportOffers,supportPrice,supportCatalog,scoutRerollPrice,scoutGroups,FIRST_GIMMICK_FLOOR,playerGimmickFamilies,type ScoutGroup} from '../../src/data/run-economy';
import {rollScoutDraws,type ScoutDraw} from '../../src/data/scout';

// What-if prices for the model only: SUPPORT_PRICES="350,800,1700" (basic,advanced,special), GIMMICK_PRICE_SCALE=0.8.
const tierPrices=process.env.SUPPORT_PRICES?.split(',').map(Number);
const modelSupportPrice=(kind:string)=>tierPrices?tierPrices[{basic:0,advanced:1,special:2}[supportCatalog[kind].tier]]:supportPrice(kind);
const gimmickScale=Number(process.env.GIMMICK_PRICE_SCALE??1);
const stockCapOff=process.env.SUPPORT_STOCK_CAP==='off';
const stockCap:Record<string,number>={greedy:99,conservative:2,balanced:3,aggressive:6};
export type PolicyName='greedy'|'conservative'|'balanced'|'aggressive';
export const policyNames:PolicyName[]=['greedy','conservative','balanced','aggressive'];
export function mulberry(seed:number){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export const bst=(name:string)=>Showdown.Dex.species.get(name).bst;
const tierRank=(g:ScoutGroup)=>scoutGroups.indexOf(g);

// Mean battle reward per floor from real generated courses (cached; small).
export function rewardCurve(courses=12):number[]{
  const path='artifacts/economy/reward-curve.json';
  if(existsSync(path))return JSON.parse(readFileSync(path,'utf8')).curve;
  const sums=Array(100).fill(0);
  for(let c=0;c<courses;c++){
    const store=new TowerStore(':memory:');
    try{
      const owner='curve'+c;store.ensurePlayer(owner);const first=store.start(owner,starters),id=store.battle(first).run_id;
      for(let floor=1;floor<=100;floor++){let battle=first;if(floor>1){store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,id);battle=store.enter(owner,id,floor,starters);}sums[floor-1]+=store.battle(battle).reward;}
    }finally{store.close();}
  }
  const curve=sums.map(s=>Math.round(s/courses));mkdirSync('artifacts/economy',{recursive:true});writeFileSync(path,JSON.stringify({courses,curve}));return curve;
}

// Held item usefulness for one Pokemon; simplified from the old balance scripts.
export function itemScore(item:string,name:string):number{
  const moves=Showdown.Dex.species.get(name);const attacker=Math.max(moves.baseStats.atk,moves.baseStats.spa);
  const base:Record<string,number>={'Life Orb':35,Leftovers:30,'Sitrus Berry':28,'Choice Band':attacker===moves.baseStats.atk?30:0,'Choice Specs':attacker===moves.baseStats.spa?30:0,'Choice Scarf':22,'Assault Vest':24,'Expert Belt':20,'Rocky Helmet':18,'Focus Sash':16,Eviolite:0,'Muscle Band':10,'Wise Glasses':10,'Black Sludge':0,'Lum Berry':14,'Scope Lens':8,'Wide Lens':6};
  if(item in base)return base[item];
  const d=Showdown.Dex.items.get(item);
  return d.onBasePower&&moves.types.some(t=>d.name&&heldItems[item as HeldItem]?.description.includes(({Fire:'불꽃',Water:'물',Grass:'풀',Electric:'전기',Ice:'얼음',Normal:'노말',Ground:'땅',Flying:'비행',Psychic:'에스퍼',Fighting:'격투',Dark:'악',Dragon:'드래곤',Steel:'강철',Poison:'독',Rock:'바위',Bug:'벌레',Ghost:'고스트',Fairy:'페어리'} as Record<string,string>)[t]+' 타입'))?18:0;
}

export type Ledger={earned:number;held:number;support:number;scout:number;reroll:number;gimmick:number;heldBuys:number;supportBuys:number;scoutBuys:number;rerollCount:number;gimmickBuys:number;supportUses:number;supportByTier:Record<string,number>;supportLeft:number;gimmickShops:number;gimmickShown:number;gimmickAffordable:number;gimmickUsable:number;
  tier:Record<ScoutGroup,{shown:number;affordable:number;bought:number}>;coinsAt:Record<number,number>;endCoins:number;freeGimmickAt:number|null};
export type RunState={coins:number;roster:string[];items:Record<string,string>;support:Record<string,number>;freeClaimed:boolean;ledger:Ledger};
const newLedger=():Ledger=>({earned:0,held:0,support:0,scout:0,reroll:0,gimmick:0,heldBuys:0,supportBuys:0,scoutBuys:0,rerollCount:0,gimmickBuys:0,supportUses:0,supportByTier:{basic:0,advanced:0,special:0},supportLeft:0,gimmickShops:0,gimmickShown:0,gimmickAffordable:0,gimmickUsable:0,
  tier:Object.fromEntries(scoutGroups.map(g=>[g,{shown:0,affordable:0,bought:0}])) as Ledger['tier'],coinsAt:{},endCoins:0,freeGimmickAt:null});
export const startRoster=(random:()=>number)=>{const pool=[...initialPartners];const roster:string[]=[];while(roster.length<3)roster.push(pool.splice(Math.floor(random()*pool.length),1)[0]);return roster;};
const teamValue=(roster:string[])=>[...roster].sort((a,b)=>bst(b)-bst(a));
export const topThree=(state:Pick<RunState,'roster'>)=>teamValue(state.roster).slice(0,3);

export type ModelOptions={policy:PolicyName;scout:boolean;gimmick:boolean;support:boolean;held:boolean};
export const defaultOptions=(policy:PolicyName):ModelOptions=>({policy,scout:true,gimmick:true,support:true,held:true});
const reserve=(policy:PolicyName,floor:number)=>policy==='conservative'?(floor>=40?6000:2500):0;

export function holderOf(items:Record<string,string>,item:string){return Object.entries(items).find(([,v])=>v===item)?.[0];}
export function pickGimmick(roster:string[],items:Record<string,string>,allowed:(item:string)=>boolean):{item:string;holder:string}|null{
  const sorted=teamValue(roster);
  for(const name of sorted)for(const stone of Object.keys(megaStones))if(allowed(stone)&&!holderOf(items,stone)&&canEquipGimmick(name,stone))return {item:stone,holder:name};
  for(const name of sorted)if(!holderOf(items,DYNAMAX_ITEM)&&canEquipGimmick(name,DYNAMAX_ITEM))return {item:DYNAMAX_ITEM,holder:name};
  return null;
}

// Plays every shop of a 100-floor run up to (and including) the shop at `upTo`.
export function shopRun(curve:number[],random:()=>number,options:ModelOptions,roster:string[],upTo=100):RunState{
  const {policy}=options,state:RunState={coins:0,roster:[...roster],items:{},support:{},freeClaimed:false,ledger:newLedger()};
  const L=state.ledger;
  for(let floor=1;floor<=Math.min(100,upTo);floor++){
    state.coins+=curve[floor-1];L.earned+=curve[floor-1];
    if(floor%10===0)L.coinsAt[floor]=state.coins;
    if(!isShopFloor(floor,100))continue;
    const cleared=floor-1,res=reserve(policy,cleared);
    // --- Scout
    const evaluate=(draws:ScoutDraw[],count:boolean)=>{if(count)for(const d of draws){const t=L.tier[d.group];t.shown++;if(d.price<=state.coins)t.affordable++;}};
    let draws=rollScoutDraws(cleared,random,new Set(state.roster));evaluate(draws,true);
    const third=()=>bst(teamValue(state.roster)[2]);
    const useful=(d:ScoutDraw)=>bst(d.species)>third()+20||tierRank(d.group)>=4;
    const budgetOk=(d:ScoutDraw,rerolled:number)=>{
      const coins=state.coins-(rerolled?0:0);
      switch(policy){
        case 'greedy':return tierRank(d.group)>=1&&d.price<=coins*0.8;
        case 'conservative':return useful(d)&&(tierRank(d.group)>=5?d.price<=coins:coins-d.price>=res);
        case 'balanced':return useful(d)&&(d.price<=coins*0.6||(tierRank(d.group)>=3&&d.price<=coins-1000));
        case 'aggressive':return useful(d)&&d.price<=coins;
      }
    };
    if(options.scout){
      const maxRerolls={greedy:2,conservative:0,balanced:1,aggressive:3}[policy];let rerolls=0;
      const best=()=>draws.filter(d=>budgetOk(d,rerolls)).sort((a,b)=>tierRank(b.group)-tierRank(a.group)||bst(b.species)-bst(a.species))[0];
      while(rerolls<maxRerolls&&!(best()&&tierRank(best()!.group)>=2)){
        const price=scoutRerollPrice(rerolls);
        const spare=policy==='aggressive'?price+1500:policy==='greedy'?price+scoutPricesMin():price+3000;
        if(state.coins<spare)break;
        state.coins-=price;L.reroll+=price;L.rerollCount++;rerolls++;draws=rollScoutDraws(cleared,random,new Set(state.roster));evaluate(draws,true);
      }
      const pick=best();
      if(pick){
        state.coins-=pick.price;L.scout+=pick.price;L.scoutBuys++;L.tier[pick.group].bought++;
        if(state.roster.length>=6)state.roster.splice(state.roster.indexOf(teamValue(state.roster).at(-1)!),1);
        state.roster.push(pick.species);
      }
    }
    // --- Held items (plus gimmick gear from the same four cards)
    const gimmickAllowed=(item:string)=>cleared>=FIRST_GIMMICK_FLOOR&&state.freeClaimed;
    const offers=rollShopProducts(cleared,random,item=>{const f=gimmickItemFamily(item as HeldItem);return !f||!playerGimmickFamilies.includes(f)||gimmickAllowed(item);});
    if(options.gimmick&&cleared>=FIRST_GIMMICK_FLOOR&&!state.freeClaimed){
      const free=pickGimmick(state.roster,state.items,()=>true);
      state.freeClaimed=true;if(free){state.items[free.holder]=free.item;L.freeGimmickAt=floor;}
    }else if(cleared>=FIRST_GIMMICK_FLOOR)state.freeClaimed=true;
    const maxHeld={greedy:1,conservative:1,balanced:1,aggressive:2}[policy];let heldBought=0;
    const priced=offers.map(id=>({id,price:Math.round((shopProductInfo(id)?.price??0)*(isGimmickProduct(id)?gimmickScale:1)),options:shopProductOptions(id)})).filter(o=>o.price>0).sort((a,b)=>b.price-a.price);
    if(cleared>=FIRST_GIMMICK_FLOOR){
      L.gimmickShops++;
      for(const o of priced.filter(x=>isGimmickProduct(x.id))){L.gimmickShown++;if(o.price<=state.coins)L.gimmickAffordable++;if(o.options.some(item=>!holderOf(state.items,item)&&state.roster.some(n=>canEquipGimmick(n,item))))L.gimmickUsable++;}
    }
    for(const o of priced){
      const first=o.options[0],family=gimmickItemFamily(first as HeldItem),isGimmick=!!family&&playerGimmickFamilies.includes(family);
      const afford=policy==='greedy'?state.coins-o.price>=state.coins*0.45||o.price<=state.coins*0.3:
        policy==='conservative'?o.price<=state.coins*0.35&&state.coins-o.price>=res:policy==='balanced'?o.price<=state.coins*0.45:true;
      const gimmickBypass=isGimmick&&policy==='balanced'&&process.env.LEGACY_GIMMICK_RULE!=='1';
      if(o.price>state.coins||(!afford&&!gimmickBypass))continue;
      if(isGimmick){
        if(!options.gimmick)continue;
        const optionsAllowed=o.options.filter(item=>item!=='Tera Orb'&&!holderOf(state.items,item));
        let target:{item:string;holder:string}|null=null;
        for(const item of optionsAllowed){const holder=teamValue(state.roster).find(n=>canEquipGimmick(n,item)&&(!state.items[n]||itemScore(state.items[n],n)<30));if(holder){target={item,holder};break;}}
        if(!target)continue;
        // A second gimmick measured about +9pp per late battle, so a balanced buyer takes it when it fits the purse.
        const legacyRule=process.env.LEGACY_GIMMICK_RULE==='1';
        const wantGimmick=policy==='aggressive'||(policy==='balanced'&&(legacyRule?o.price<=state.coins*0.6:state.coins-o.price>=500))||(policy==='conservative'&&state.coins-o.price>=res/2)||policy==='greedy';
        if(!wantGimmick)continue;
        state.coins-=o.price;L.gimmick+=o.price;L.gimmickBuys++;state.items[target.holder]=target.item;continue;
      }
      if(!options.held||heldBought>=maxHeld)continue;
      const item=first;let bestHolder:string|null=null,gain=0;
      for(const name of teamValue(state.roster)){const cur=state.items[name]?itemScore(state.items[name],name):0;const g=itemScore(item,name)-cur;if(g>gain&&!holderOf(state.items,item)){gain=g;bestHolder=name;}}
      if(!bestHolder||gain<=0||shopChoiceGroups[o.id])continue;
      state.coins-=o.price;L.held+=o.price;L.heldBuys++;heldBought++;state.items[bestHolder]=item;
    }
    // --- Support
    if(options.support){
      const stock=rollSupportOffers(cleared,random),maxBuy={greedy:2,conservative:1,balanced:2,aggressive:3}[policy];let bought=0;
      const rank=(k:string)=>({special:0,advanced:1,basic:2} as const)[supportCatalog[k].tier];
      for(const kind of [...stock].sort((a,b)=>rank(a)-rank(b))){
        const price=modelSupportPrice(kind);if(bought>=maxBuy||state.coins<price)continue;
        if(!stockCapOff&&Object.values(state.support).reduce((a,b)=>a+b,0)>=stockCap[policy])continue;
        const spare=policy==='aggressive'?0:policy==='balanced'?(supportCatalog[kind].tier==='special'?2500:700):policy==='greedy'?0:res+(supportCatalog[kind].tier==='basic'?0:3000);
        if(state.coins-price<spare)continue;
        state.coins-=price;L.support+=price;L.supportBuys++;L.supportByTier[supportCatalog[kind].tier]++;bought++;state.support[kind]=(state.support[kind]??0)+1;
      }
    }
    // Supports are spent over the following floors; keep the model's stock consistent with the policy's appetite.
    const spendPerInterval={greedy:2,conservative:cleared>=70?1:0,balanced:1,aggressive:3}[policy];
    for(let i=0;i<spendPerInterval;i++){const kind=Object.keys(state.support).filter(k=>state.support[k]>0).sort((a,b)=>rank2(b)-rank2(a))[0];if(!kind)break;if(floor+10<=upTo||upTo===100){state.support[kind]--;L.supportUses++;}}
  }
  L.endCoins=state.coins;L.supportLeft=Object.values(state.support).reduce((a,b)=>a+b,0);return state;
}
const rank2=(k:string)=>({basic:2,advanced:1,special:0} as const)[supportCatalog[k].tier];
const scoutPricesMin=()=>1200;

function isGimmickProduct(id:string){const f=gimmickItemFamily(shopProductOptions(id)[0] as HeldItem);return !!f&&playerGimmickFamilies.includes(f);}
