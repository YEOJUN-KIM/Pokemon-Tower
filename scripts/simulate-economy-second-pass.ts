// Economy second pass (beta.6). Usage: tsx scripts/simulate-economy-second-pass.ts [runsPerPolicy=5000]
// Four spending policies over the real reward curve. Writes artifacts/economy/economy-second-pass.json (summary only).
import {mkdirSync,writeFileSync} from 'node:fs';
import {scoutGroups,type ScoutGroup} from '../src/data/run-economy';
import {rewardCurve,shopRun,startRoster,mulberry,policyNames,defaultOptions,type Ledger} from './lib/run-model';

const runs=Number(process.argv[2]??5000),curve=rewardCurve();
const summary:Record<string,unknown>={runsPerPolicy:runs,rewardCurveTotal:curve.reduce((a,b)=>a+b,0),note:'income = battle rewards only; no events or starting allowance; model player, not human'};
for(const policy of policyNames){
  const random=mulberry(9000+policyNames.indexOf(policy)),all:Ledger[]=[];
  for(let i=0;i<runs;i++){const roster=startRoster(random);all.push(shopRun(curve,random,defaultOptions(policy),roster).ledger);}
  const mean=(f:(l:Ledger)=>number)=>+(all.reduce((s,l)=>s+f(l),0)/runs).toFixed(2);
  const tier=Object.fromEntries(scoutGroups.map(g=>[g,{shownPerRun:mean(l=>l.tier[g].shown),affordablePerRun:mean(l=>l.tier[g].affordable),boughtPerRun:mean(l=>l.tier[g].bought),
    runsWithShown:+(all.filter(l=>l.tier[g].shown>0).length/runs).toFixed(3),runsWithAffordable:+(all.filter(l=>l.tier[g].affordable>0).length/runs).toFixed(3),runsWithBought:+(all.filter(l=>l.tier[g].bought>0).length/runs).toFixed(3)}])) as Record<ScoutGroup,unknown>;
  const spend=mean(l=>l.held+l.support+l.scout+l.reroll+l.gimmick);
  summary[policy]={supportByTier:Object.fromEntries(['basic','advanced','special'].map(t=>[t,mean(l=>l.supportByTier[t])])),supportLeft:mean(l=>l.supportLeft),gimmickSupply:{shopsAfter50:mean(l=>l.gimmickShops),shown:mean(l=>l.gimmickShown),affordable:mean(l=>l.gimmickAffordable),usable:mean(l=>l.gimmickUsable),runsWithShown:+(all.filter(l=>l.gimmickShown>0).length/runs).toFixed(3)},income:mean(l=>l.earned),spend,endCoins:mean(l=>l.endCoins),held:mean(l=>l.held),support:mean(l=>l.support),scout:mean(l=>l.scout),reroll:mean(l=>l.reroll),gimmick:mean(l=>l.gimmick),
    heldBuys:mean(l=>l.heldBuys),supportBuys:mean(l=>l.supportBuys),supportUses:mean(l=>l.supportUses),scoutBuys:mean(l=>l.scoutBuys),rerollCount:mean(l=>l.rerollCount),gimmickBuys:mean(l=>l.gimmickBuys),
    runsWithExtraGimmick:+(all.filter(l=>l.gimmickBuys>0).length/runs).toFixed(3),
    share:{held:+(mean(l=>l.held)/spend).toFixed(3),support:+(mean(l=>l.support)/spend).toFixed(3),scout:+(mean(l=>l.scout)/spend).toFixed(3),reroll:+(mean(l=>l.reroll)/spend).toFixed(3),gimmick:+(mean(l=>l.gimmick)/spend).toFixed(3)},
    coinsAtFloor:Object.fromEntries([10,20,30,40,50,60,70,80,90,100].map(f=>[f,Math.round(all.reduce((s,l)=>s+(l.coinsAt[f]??0),0)/runs)])),tier};
  console.log(policy,JSON.stringify({sup:mean(l=>l.supportBuys),use:mean(l=>l.supportUses),left:mean(l=>l.supportLeft),gShown:mean(l=>l.gimmickShown),gAff:mean(l=>l.gimmickAffordable),gUsable:mean(l=>l.gimmickUsable),income:mean(l=>l.earned),spend,end:mean(l=>l.endCoins),held:mean(l=>l.held),support:mean(l=>l.support),scout:mean(l=>l.scout),reroll:mean(l=>l.reroll),gimmick:mean(l=>l.gimmick),gimmickBuys:mean(l=>l.gimmickBuys),scoutBuys:mean(l=>l.scoutBuys)}));
}
mkdirSync('artifacts/economy',{recursive:true});writeFileSync(process.env.ECON_OUT??'artifacts/economy/economy-second-pass.json',JSON.stringify(summary,null,1));
