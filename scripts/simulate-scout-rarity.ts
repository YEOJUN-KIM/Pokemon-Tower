// Monte Carlo for Scout rarity exposure. Usage: tsx scripts/simulate-scout-rarity.ts [runs=20000] [maxRerolls=0]
// A 100-floor run has shops at 11,21,...,91 (isShopFloor); each shows SCOUT_COUNT candidates.
import {isShopFloor} from '../src/data/shop';
import {scoutGroups,SCOUT_COUNT,type ScoutGroup} from '../src/data/run-economy';
import {rollScoutDraws,scoutPools} from '../src/data/scout';
import {mkdirSync,writeFileSync} from 'node:fs';

export function mulberry(seed:number){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function simulate(runs:number,rerolls:number){
  const floors=Array.from({length:100},(_,i)=>i+1).filter(f=>isShopFloor(f,100));
  const random=mulberry(20261103+rerolls),perFloor:Record<number,Record<ScoutGroup,number>>={};
  const exposure=Object.fromEntries(scoutGroups.map(g=>[g,0])) as Record<ScoutGroup,number>,counts=Object.fromEntries(scoutGroups.map(g=>[g,0])) as Record<ScoutGroup,number>;
  for(const f of floors)perFloor[f]=Object.fromEntries(scoutGroups.map(g=>[g,0])) as Record<ScoutGroup,number>;
  for(let run=0;run<runs;run++){
    const seen=new Set<ScoutGroup>();
    for(const floor of floors)for(let screen=0;screen<=rerolls;screen++)for(const draw of rollScoutDraws(floor-1,random)){seen.add(draw.group);counts[draw.group]++;perFloor[floor][draw.group]++;}
    for(const g of seen)exposure[g]++;
  }
  return {runs,rerolls,shops:floors.length,perRunAtLeastOne:Object.fromEntries(scoutGroups.map(g=>[g,exposure[g]/runs])),meanPerRun:Object.fromEntries(scoutGroups.map(g=>[g,counts[g]/runs])),perFloor:Object.fromEntries(floors.map(f=>[f,Object.fromEntries(scoutGroups.map(g=>[g,perFloor[f][g]/(runs*SCOUT_COUNT*(rerolls+1))]))]))};
}
if(process.argv[1]?.includes('simulate-scout-rarity')){
  const runs=Number(process.argv[2]??20000),maxRerolls=Number(process.argv[3]??0),out:unknown[]=[];
  console.log('pool sizes',Object.fromEntries(Object.entries(scoutPools()).map(([g,l])=>[g,l.length])));
  for(const rerolls of new Set([0,...(maxRerolls>0?[1,Math.min(3,maxRerolls),maxRerolls]:[])])){
    const r=simulate(runs,rerolls);out.push(r);
    console.log(`\nrerolls/shop=${rerolls} runs=${runs}`);console.log('P(at least one shown):',Object.fromEntries(Object.entries(r.perRunAtLeastOne).map(([g,v])=>[g,+(v*100).toFixed(2)+'%'])));
    console.log('mean shown per run:',Object.fromEntries(Object.entries(r.meanPerRun).map(([g,v])=>[g,+v.toFixed(3)])));
  }
  mkdirSync('artifacts/economy',{recursive:true});writeFileSync('artifacts/economy/scout-rarity.json',JSON.stringify(out,null,1));
}
