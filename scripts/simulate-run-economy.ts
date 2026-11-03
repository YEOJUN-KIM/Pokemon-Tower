// First-pass Run Coin economy probe (beta.6). Usage: tsx scripts/simulate-run-economy.ts [runs=3000] [courses=8]
// Income comes from real generated 100-floor courses (battle rewards only; event coins and
// starting allowance are excluded). Spending uses a simple greedy policy, not a balance-grade AI.
import {mkdirSync,writeFileSync} from 'node:fs';
import {TowerStore} from '../src/server/tower-store';
import {starters} from '../src/data/teams';
import {isShopFloor} from '../src/data/shop';
import {rollShopProducts,shopProductInfo} from '../src/data/shop-products';
import {gimmickItemFamily,itemShopRule} from '../src/data/held-item-shop';
import {rollSupportOffers,supportPrice,supportCatalog,scoutRerollPrice,scoutPrices,FIRST_GIMMICK_FLOOR,playerGimmickFamilies,type ScoutGroup} from '../src/data/run-economy';
import {rollScoutDraws} from '../src/data/scout';
import {mulberry} from './simulate-scout-rarity';
import type {HeldItem} from '../src/data/held-items';

const runs=Number(process.argv[2]??3000),courseCount=Number(process.argv[3]??8);
function realCourses(){
  const courses:number[][]=[];
  for(let c=0;c<courseCount;c++){
    const store=new TowerStore(':memory:');
    try{
      const owner='econ'+c;store.ensurePlayer(owner);const first=store.start(owner,starters),id=store.battle(first).run_id,rewards:number[]=[];
      for(let floor=1;floor<=100;floor++){
        let battle=first;if(floor>1){store.db.prepare("UPDATE runs SET floor=?,state='select' WHERE id=?").run(floor,id);battle=store.enter(owner,id,floor,starters);}
        rewards.push(store.battle(battle).reward);
      }
      courses.push(rewards);
    }finally{store.close();}
  }
  return courses;
}
const courses=realCourses(),random=mulberry(77);
const scoutRank:ScoutGroup[]=['common','strong','pseudo','paradox','sublegendary','restricted','mythical'];
type Totals={earned:number;held:number;support:number;scout:number;rerolls:number;gimmick:number;left:number;scoutBuys:number;rerollCount:number;heldBuys:number;supportBuys:number;gimmickBuys:number;strongScouts:number;restrictedScouts:number};
const zero=():Totals=>({earned:0,held:0,support:0,scout:0,rerolls:0,gimmick:0,left:0,scoutBuys:0,rerollCount:0,heldBuys:0,supportBuys:0,gimmickBuys:0,strongScouts:0,restrictedScouts:0});
function playRun(course:number[]):Totals&{coinsAtShop:number[]}{
  const t=zero();let coins=0,freeGimmick=false,roster=3;const coinsAtShop:number[]=[];
  for(let floor=1;floor<=100;floor++){
    coins+=course[floor-1];t.earned+=course[floor-1];
    if(!isShopFloor(floor,100))continue;
    coinsAtShop.push(coins);
    const cleared=floor-1;
    // Held items: buy the best affordable card while leaving a reserve for Scout.
    const offers=rollShopProducts(cleared,random,item=>{const family=gimmickItemFamily(item as HeldItem);return !family||!playerGimmickFamilies.includes(family)||(cleared>=FIRST_GIMMICK_FLOOR&&freeGimmick);});
    if(cleared>=FIRST_GIMMICK_FLOOR&&!freeGimmick)freeGimmick=true;
    const priced=offers.map(id=>({id,price:shopProductInfo(id)?.price??0})).filter(o=>o.price>0).sort((a,b)=>b.price-a.price);
    for(const o of priced){
      if(coins-o.price<coins*0.45&&o.price>coins*0.3)continue;
      if(coins>=o.price){coins-=o.price;
        const family=gimmickItemFamily(o.id as HeldItem);
        if(family&&playerGimmickFamilies.includes(family)){t.gimmick+=o.price;t.gimmickBuys++;}else{t.held+=o.price;t.heldBuys++;}
        break;}
    }
    // Scout: reroll up to twice looking for a strong candidate, buy the best one if affordable.
    const budget=()=>coins*0.8;
    let draws=rollScoutDraws(cleared,random),rerolls=0;
    while(rerolls<2&&!draws.some(d=>scoutRank.indexOf(d.group)>=2&&d.price<=budget()-scoutRerollPrice(rerolls))&&budget()>scoutRerollPrice(rerolls)+scoutPrices.pseudo){
      const price=scoutRerollPrice(rerolls);coins-=price;t.rerolls+=price;t.rerollCount++;rerolls++;draws=rollScoutDraws(cleared,random);
    }
    const best=draws.filter(d=>d.price<=budget()).sort((a,b)=>scoutRank.indexOf(b.group)-scoutRank.indexOf(a.group))[0];
    if(best&&scoutRank.indexOf(best.group)>=1&&roster<=6){coins-=best.price;t.scout+=best.price;t.scoutBuys++;if(scoutRank.indexOf(best.group)>=1)t.strongScouts++;if(best.group==='restricted'||best.group==='mythical')t.restrictedScouts++;}
    // Support: spend leftovers on up to two cards.
    for(const kind of rollSupportOffers(cleared,random)){const price=supportPrice(kind);if(supportCatalog[kind]&&coins>=price&&t.supportBuys<999&&coins-price>=0){coins-=price;t.support+=price;t.supportBuys++;if(t.supportBuys%2===0)break;}}
  }
  t.left=coins;return {...t,coinsAtShop};
}
const results=Array.from({length:runs},(_,i)=>playRun(courses[i%courses.length]));
const mean=(f:(r:Totals)=>number)=>+(results.reduce((s,r)=>s+f(r),0)/runs).toFixed(1);
const summary={runs,courses:courseCount,meanEarned:mean(r=>r.earned),meanHeldSpend:mean(r=>r.held),meanHeldBuys:mean(r=>r.heldBuys),meanSupportSpend:mean(r=>r.support),meanSupportBuys:mean(r=>r.supportBuys),meanScoutSpend:mean(r=>r.scout),meanScoutBuys:mean(r=>r.scoutBuys),meanRerollSpend:mean(r=>r.rerolls),meanRerolls:mean(r=>r.rerollCount),meanGimmickSpend:mean(r=>r.gimmick),meanGimmickBuys:mean(r=>r.gimmickBuys),meanLeftover:mean(r=>r.left),meanRestrictedOrMythicalBought:mean(r=>r.restrictedScouts),
  coinsAtShop:Array.from({length:9},(_,i)=>+(results.reduce((s,r)=>s+r.coinsAtShop[i],0)/runs).toFixed(0)),perCourseTotalReward:courses.map(c=>c.reduce((a,b)=>a+b,0))};
console.log(JSON.stringify(summary,null,1));
mkdirSync('artifacts/economy',{recursive:true});writeFileSync('artifacts/economy/run-economy.json',JSON.stringify(summary,null,1));
