import {readFileSync,writeFileSync} from 'node:fs';
import Showdown from 'pokemon-showdown';
import {generateOpponentTeam,encounterPool,selectTrainerSample} from '../src/server/opponent-team';
import {opponentProfile} from '../src/server/opponent-training';
import {towerTrainerEncounter} from '../src/data/tower-trainers';
import {trainerCatalog} from '../src/data/trainer-catalog';
import {allowedOpponentSpecies} from '../src/data/opponent-species';
import {packTeam} from '../src/data/teams';
import type {TowerTheme} from '../src/data/tower-themes';
import type {Seed} from '../src/battle/run';
const input='artifacts/experiments/balance/hundred-floor-release-courses.json',output='artifacts/experiments/balance/hundred-floor-six-z-courses.json';
const report=JSON.parse(readFileSync(input,'utf8'));let regenerated=0,zeroed=0;
for(const course of report.courses){const previous:string[][]=[];
 for(const encounter of course.encounters){
  const original=Showdown.Teams.unpack(encounter.enemy)!;
  if(original.some(set=>!allowedOpponentSpecies(set.species,encounter.trainer==='named-red'))){
   const trainer=towerTrainerEncounter(encounter.floor,course.id,course.theme as TowerTheme);let sample=trainerCatalog.find(sample=>sample.id===encounter.trainer);
   if(sample?.specialty && encounterPool(encounter.floor,'hundred-floor-v1').filter(name=>Showdown.Dex.species.get(name).types.includes(sample!.specialty!)).length<3){sample=selectTrainerSample(encounter.floor,encounter.seed,[],'hundred-floor-v1');encounter.trainer=sample.id;encounter.role=sample.role??'trainer';}
   const entries=generateOpponentTeam(encounter.floor,encounter.seed as Seed,previous.slice(-3).flat(),trainer,sample,'hundred-floor-v1');
   const profiles=Object.fromEntries(entries.map((entry,i)=>[entry.name,{...opponentProfile(entry.name,entry.moves,encounter.floor,{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},'hundred-floor-v1'),ivs:encounter.floor<=10?{hp:0,atk:0,def:0,spa:0,spd:0,spe:0}:original[i].ivs!,...(entry.ability?{ability:entry.ability}:{})}]));
   encounter.enemy=packTeam(entries.map(entry=>entry.name),profiles,Object.fromEntries(entries.map(entry=>[entry.name,entry.item??''])));regenerated++;
  }
  if(encounter.floor<=10){const team=Showdown.Teams.unpack(encounter.enemy)!;for(const set of team)set.ivs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};encounter.enemy=Showdown.Teams.pack(team);zeroed++;}
  previous.push(Showdown.Teams.unpack(encounter.enemy)!.map(set=>set.species));
 }
}
report.sixZSource=input;report.sixZChange={zeroed,regenerated,notes:'Same seeds, regional identities, rewards and later allowed teams; floors 1-10 zero IVs. Teams containing removed NFE species regenerated under current species rules. Old unknown normal samples use generic generation.'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log({output,zeroed,regenerated});
