import {mkdirSync, writeFileSync} from 'node:fs';
import {floors} from './data/floors';
import {packTeam, starters} from './data/teams';
import {DamagePolicy} from './battle/policy';
import {engineVersion, FORMAT, runBattle} from './battle/run';

// Offline diagnostics only. Team orders and opponents are known here; no game AI receives extra information.
const orders = starters.flatMap(a => starters.filter(b => b !== a).flatMap(b => starters.filter(c => c !== a && c !== b).map(c => [a,b,c])));
const report = {engineVersion, format:FORMAT, samplesPerOrder:12, policy:'damage-policy-v1', notes:'Fixed starter sets, all six orders. Not human win rates and not a recruited-roster benchmark.', floors:[] as {floor:number; name:string; wins:number; battles:number; averageTurns:number; defaultOrderWins:number}[]};
for (const floor of floors) {
  let wins = 0; let turns = 0; let defaultOrderWins = 0;
  for (const [index,team] of orders.entries()) for (let seed = 1; seed <= 12; seed++) {
    const log = await runBattle({teams:{p1:packTeam(team),p2:packTeam([...floor.opponents])},seed:[seed,2,3,4],player:new DamagePolicy(),opponent:new DamagePolicy()});
    turns += log.turns;
    if (log.winner === 'Player') {wins++; if (index === 0) defaultOrderWins++;}
  }
  const result = {floor:floor.number,name:floor.name,wins,battles:72,averageTurns:Number((turns / 72).toFixed(1)),defaultOrderWins};
  report.floors.push(result);
  console.log(`${floor.number}층: 스타터 AI ${wins}/72 승리, 기본 순서 ${defaultOrderWins}/12, 평균 ${result.averageTurns}턴`);
}
mkdirSync('logs',{recursive:true});
writeFileSync('logs/tower-balance.json',JSON.stringify(report,null,2));
console.log('Saved logs/tower-balance.json');
