import {readFileSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {gentleMoves} from '../src/server/opponent-team';
import {johtoOriginalBuild} from '../src/data/johto-builds';
const cohort=JSON.parse(readFileSync('artifacts/hundred-floor-balanced-courses.json','utf8'));
for(const course of cohort.courses)for(const e of course.encounters){
 if(e.floor<51||e.floor>60)continue;
 const sets=Showdown.Teams.unpack(e.enemy)!;
 const team=gentleMoves(sets.map(p=>({name:p.species,moves:p.moves.map(m=>Showdown.Dex.moves.get(m).name),...(johtoOriginalBuild(e.trainer,p.species)?{ability:p.ability}: {})})));
 sets.forEach((p,i)=>p.moves=team[i].moves);e.enemy=Showdown.Teams.pack(sets);
}
cohort.notes='Same recorded regional runs and seeds as hundred-floor-balanced; only moves at floors 51-60 reprojected through the final live gentleMoves rule. IVs, species, items, trainers, rewards and seeds unchanged.';
writeFileSync('artifacts/hundred-floor-release-courses.json',JSON.stringify(cohort,null,2));
