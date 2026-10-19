import Showdown from 'pokemon-showdown';
import {raidBossDefinitions,type RaidSnapshot,type RaidPhaseNumber,type RaidRecruitmentPolicy} from '../data/raids';
import {collectionSpecies,selectedForm} from '../data/selectable-forms';
import {pokemonSets,trainedSet} from '../data/teams';
import {isCollectibleSpecies} from '../data/pokedex-roster';
import {defaultProfile} from './training';
import {genderOptions} from './pokemon-gender';

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
