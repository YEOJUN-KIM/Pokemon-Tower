import Showdown from 'pokemon-showdown';
import {raidBossDefinitions,type RaidSnapshot,type RaidPhaseNumber,type RaidRecruitmentPolicy} from '../data/raids';
import {collectionSpecies,selectedForm} from '../data/selectable-forms';
import {pokemonSets,trainedSet} from '../data/teams';
import {isCollectibleSpecies} from '../data/pokedex-roster';
import {defaultProfile} from './training';
import {genderOptions} from './pokemon-gender';
import {statKeys,type StatBlock} from '../data/training';

// Build from ordinary player defaults, never from a Phase's moves, ability or points.
export function premiumRaidRecruitment(raid:RaidSnapshot):string{
 const target=resolveRaidRecruitSpecies(raid),{base,forme}=identity(target);
 const route=raidBossDefinitions.find(b=>b.id===raid.bossId)!.routes.find(r=>r.id===raid.routeId)!;
 const attack=raid.bossId==='zygarde'?'atk':route.attack;
 const profile=defaultProfile(base,forme);
 // The base Mewtwo defaults are special. Its X reward needs a legal player
 // physical build to match Jolly/Atk training, without copying the Phase build.
 if(base==='Mewtwo'&&route.id==='x')profile.moves=['Zen Headbutt','Drain Punch','Earthquake','Ice Punch'];
 profile.ivs=Object.fromEntries(statKeys.map(k=>[k,31])) as StatBlock;
 profile.nature=route.recruit.nature==='Serious'?(attack==='atk'?'Adamant':'Modest'):route.recruit.nature;
 profile.evs={hp:2,atk:0,def:0,spa:0,spd:0,spe:32};profile.evs[attack]=32;
 if(base==='Snorlax')profile.evs={hp:32,atk:32,def:0,spa:0,spd:2,spe:0};
 profile.shiny=!!raid.individual.shiny;profile.gender=raid.individual.gender;
 const genders=genderOptions(base);
 if(!genders.includes(profile.gender!))profile.gender=genders[0];
 return Showdown.Teams.pack([trainedSet(base,profile)]);
}

export type RaidRecruitSet=NonNullable<ReturnType<typeof Showdown.Teams.unpack>>[number]&{raidForme?:string};
type Handling={production?:boolean;warn?:(message:string)=>void};
export function raidRecruitmentPolicy(raid:RaidSnapshot):RaidRecruitmentPolicy{
 // Older snapshots already contain the selected phases. Read their declaration
 // from the registry without editing the snapshot used by battle/replay.
 return raid.recruitment??raidBossDefinitions.find(b=>b.id===raid.bossId)?.recruitment??{mode:'baseSpecies'};
}
export function raidPhaseByNumber(raid:Pick<RaidSnapshot,'phases'>,phase:RaidPhaseNumber){
 if(!Number.isInteger(phase)||phase<1||phase>4||!raid.phases[phase-1]?.species)throw Error(`Raid reward Phase ${phase} is missing (Phase numbers start at 1)`);
 return raid.phases[phase-1];
}
function identity(species:string){
 const base=collectionSpecies(species),forme=base===species?undefined:species;
 if(!Object.hasOwn(pokemonSets,base)||!isCollectibleSpecies(base)||forme&&!selectedForm(base,forme))throw Error(`Unsupported Raid recruitment Species/Form: ${species}`);
 return {base,forme};
}
export function resolveRaidRecruitSpecies(raid:RaidSnapshot,handling:Handling={}):string{
 try{
  const policy=raidRecruitmentPolicy(raid);
  if(policy.mode!=='baseSpecies'&&policy.mode!=='phaseSpecies')throw Error('Invalid Raid recruitment policy');
  const species=policy.mode==='phaseSpecies'?raidPhaseByNumber(raid,policy.phase).species:raid.species;
  identity(species);return species;
 }catch(error){
  const message=`[raid-recruitment] ${raid.bossId}: ${error instanceof Error?error.message:String(error)}; falling back to ${raid.species}`;
  if(!(handling.production??process.env.NODE_ENV==='production'))throw Error(message,{cause:error});
  (handling.warn??console.error)(message);identity(raid.species);return raid.species;
 }
}

export function packedRaidRecruitment(raid:RaidSnapshot,handling:Handling={}):string{
 const target=resolveRaidRecruitSpecies(raid,handling),original=Showdown.Teams.unpack(raid.recruitTeam);
 if(original?.length!==1)throw Error('Invalid saved Raid recruitment team');
 const incoming=original[0],{base,forme}=identity(target);
 // Preserve frozen recruitment settings when the saved team already matches.
 // Legacy exceptions have a base-species team: create the selected reward via
 // existing ordinary player defaults, retaining Raid IV/nature/shiny policy.
 if(incoming.species===target)return raid.recruitTeam;
 const profile={...defaultProfile(base,forme),ivs:{...(incoming.ivs??raid.individual.ivs)},nature:incoming.nature,shiny:!!incoming.shiny};
 const genders=genderOptions(base);profile.gender=(genders.includes(incoming.gender as typeof genders[number])?incoming.gender:genders[0]) as typeof genders[number];
 return Showdown.Teams.pack([trainedSet(base,profile)]);
}
export function raidRecruitmentTeam(raid:RaidSnapshot,handling:Handling={}):RaidRecruitSet[]{
 return Showdown.Teams.unpack(packedRaidRecruitment(raid,handling))!.map(set=>{
  const {base,forme}=identity(set.species);
  return {...set,name:base,species:base,...(forme?{raidForme:forme}:{})};
 });
}
