import {writeFile} from 'node:fs/promises';
import Showdown from 'pokemon-showdown';
import {pokemonSets,packTeam,starters} from '../src/data/teams';
import {pokedexEntries} from '../src/server/pokedex-entries';
import {defaultProfile,validateProfile} from '../src/server/training';
import {opponentMoves,encounterRandom,encounterPool,generateOpponentTeam} from '../src/server/opponent-team';
import {moveLearnsets} from '../src/server/move-learnsets';
import {FORMAT,runBattle,engineVersion,replayBattle} from '../src/battle/run';
import {TowerPolicy} from '../src/battle/tower-policy';
import {species,moves} from '../src/web/catalog';
import {abilityNames} from '../src/web/pokedex-data';
import {missingAnimation} from '../src/data/sprite-animation';
import spriteCoverage from '../artifacts/reports/sprite-coverage.json' with {type:'json'};

const entries=pokedexEntries(),validator=new Showdown.TeamValidator(FORMAT),failures:{species:string;phase:string;error:string}[]=[],results:unknown[]=[];
const baseline=packTeam(starters);
for(const [index,entry] of entries.entries()) {
  const name=entry.species;
  try {
    const profile=defaultProfile(name);validateProfile(name,profile);
    if(!profile.moves.every(move=>moveLearnsets[name].selfMoves.includes(move)))throw Error('Non-self starting move');
    if(!species[name]?.id || !abilityNames[profile.ability] || profile.moves.some(move=>!moves[move]))throw Error('Missing display metadata');
    const partners=starters.filter(other=>other!==name).slice(0,2),stats:Record<string,unknown>={species:name,startingMoves:profile.moves,legalMoves:moveLearnsets[name].legalMoves.length};
    for(const n of [1,77,513,4096]) {
      const selected=opponentMoves(name,encounterRandom([n,2,3,4]));
      const errors=validator.validateSet({...structuredClone(pokemonSets[name]),moves:selected},{});
      if(errors)throw Error(`Seed ${n}: ${errors.join('; ')}`);
    }
    const opponentProfile={...profile,moves:opponentMoves(name,encounterRandom([index+1,2,3,4]))};
    for(const side of ['player','opponent'] as const) {
      const team=packTeam([name,...partners],{[name]:side==='player' ? profile : opponentProfile});
      try {
        const log=await runBattle({teams:side==='player' ? {p1:team,p2:baseline} : {p1:baseline,p2:team},seed:[index+1,2,3,4],player:new TowerPolicy(),opponent:new TowerPolicy()});
        stats[side]={winner:log.winner,turns:log.turns,active:log.publicProtocol.some(line=>line.includes(`|${name}, L50`))};
        if(index%100===0)await replayBattle(log);
      }catch(error){failures.push({species:name,phase:side,error:String(error)});}
    }
    results.push(stats);
  }catch(error){failures.push({species:name,phase:'data',error:String(error)});}
  if((index+1)%50===0)console.log(`Audited ${index+1}/${entries.length}; failures ${failures.length}`);
}
const samples=[1,4,9,20,30,100].map(floor=>{
  const leads=new Set<string>(),teams=new Set<string>();
  for(let seed=1;seed<=200;seed++){const team=generateOpponentTeam(floor,[seed,2,3,4]);leads.add(team[0].name);teams.add(team.map(p=>p.name).join(','));}
  return {floor,pool:encounterPool(floor).length,distinctLeads:leads.size,distinctTeams:teams.size};
});
const report={checkedAt:new Date().toISOString(),engineVersion,format:FORMAT,count:entries.length,battleCount:results.length*2,policy:'tower-policy-v2; neutral 6Z player profile and useful opponent moves. Seeded integration smoke tests, not win-rate balancing.',failures,
  spriteCoverage:{sourceCommit:spriteCoverage.commit,front:entries.length,back:entries.length,animatedBoth:entries.filter(entry=>!missingAnimation.has(entry.id)).length,staticOnly:entries.filter(entry=>missingAnimation.has(entry.id)).map(entry=>({id:entry.id,name:entry.name})),method:'Exact national IDs checked against the existing complete PokeAPI sprite-tree audit, not downloading 1,210 images.'},samples,results};
await writeFile('artifacts/reports/battle-roster-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(`Finished ${results.length} species / ${results.length*2} battles; failures ${failures.length}`);
if(failures.length){console.log(JSON.stringify(failures,null,2));process.exitCode=1;}
