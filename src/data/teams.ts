import Showdown from 'pokemon-showdown';
import {megaStones} from './gimmicks';
import {teraTypesForSpecies} from './tera';
import roster from './battle-roster.json' with {type:'json'};
import {statKeys,type TrainingProfile} from './training';
import {separateForms,selectedForm} from './selectable-forms';
export const POINT_TEAM_MARKER='towerpointsv1';
const { Teams } = Showdown;

// Temporary level-50 sets. Final starter forms, growth and balance remain undecided.
const set = (species: string, ability: string, moves: string[]) => ({
  name: species, species, ability, moves, level: 50,
  gender: Showdown.Dex.species.get(species).gender || 'M' as const,
  nature: 'Serious', item: '', shiny: false, pokeball: '',
  // 1 HP EV acknowledges the intentionally untrained fixture to Showdown's validator; stats are unchanged.
  evs: {hp: 1, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
  ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
});

export const legacySets = {
  Charizard: set('Charizard', 'Blaze', ['Flamethrower', 'Air Slash', 'Dragon Pulse', 'Slash']),
  Blastoise: set('Blastoise', 'Torrent', ['Surf', 'Ice Beam', 'Dark Pulse', 'Flash Cannon']),
  Venusaur: set('Venusaur', 'Overgrow', ['Energy Ball', 'Sludge Bomb', 'Earth Power', 'Tackle']),
  Pikachu: set('Pikachu', 'Static', ['Thunderbolt', 'Quick Attack', 'Thunder Shock', 'Swift']),
  Gyarados: set('Gyarados', 'Intimidate', ['Waterfall', 'Ice Fang', 'Bite', 'Tackle']),
  Snorlax: set('Snorlax', 'Immunity', ['Body Slam', 'Crunch', 'Ice Punch', 'Rock Slide']),
  Arcanine: set('Arcanine', 'Intimidate', ['Flamethrower', 'Crunch', 'Extreme Speed', 'Play Rough']),
  Raichu: set('Raichu', 'Static', ['Thunderbolt', 'Grass Knot', 'Focus Blast', 'Quick Attack']),
  Cloyster: set('Cloyster', 'Shell Armor', ['Ice Beam', 'Surf', 'Rock Blast', 'Ice Shard']),
  Espeon: set('Espeon', 'Synchronize', ['Psychic', 'Shadow Ball', 'Dazzling Gleam', 'Swift']),
  Gengar: set('Gengar', 'Cursed Body', ['Shadow Ball', 'Sludge Bomb', 'Thunderbolt', 'Dark Pulse']),
  Lucario: set('Lucario', 'Inner Focus', ['Aura Sphere', 'Flash Cannon', 'Dark Pulse', 'Extreme Speed']),
  Golem: set('Golem', 'Sturdy', ['Earthquake', 'Rock Slide', 'Body Slam', 'Heavy Slam']),
  Lapras: set('Lapras', 'Water Absorb', ['Surf', 'Ice Beam', 'Thunderbolt', 'Psychic']),
  Jolteon: set('Jolteon', 'Volt Absorb', ['Thunderbolt', 'Shadow Ball', 'Hyper Voice', 'Swift']),
  Scizor: set('Scizor', 'Technician', ['Bullet Punch', 'X-Scissor', 'Close Combat', 'Iron Head']),
  Dragonite: set('Dragonite', 'Inner Focus', ['Dragon Claw', 'Earthquake', 'Fire Punch', 'Extreme Speed']),
  Tyranitar: set('Tyranitar', 'Sand Stream', ['Crunch', 'Rock Slide', 'Earthquake', 'Ice Punch']),
  Metagross: set('Metagross', 'Clear Body', ['Meteor Mash', 'Zen Headbutt', 'Earthquake', 'Bullet Punch']),
  Garchomp: set('Garchomp', 'Rough Skin', ['Dragon Claw', 'Earthquake', 'Rock Slide', 'Fire Fang']),
};
export const pokemonSets:Record<string,ReturnType<typeof set>>={...Object.fromEntries(Object.entries(roster).map(([name,entry])=>[name,set(name,entry.ability,entry.moves)])),...Object.fromEntries(Object.entries(separateForms).map(([name,entry])=>[name,set(name,entry.ability,entry.moves)])),...legacySets};
export type PokemonSpecies = string;
export const starters = ['Charizard', 'Blastoise', 'Venusaur'];
export const initialPartners = [
  ...starters, 'Meganium','Typhlosion','Feraligatr','Sceptile','Blaziken','Swampert',
  'Torterra','Infernape','Empoleon','Serperior','Emboar','Samurott','Chesnaught','Delphox','Greninja',
  'Decidueye','Incineroar','Primarina','Rillaboom','Cinderace','Inteleon','Meowscarada','Skeledirge','Quaquaval',
];
export function trainedSet(name:string,profile?:TrainingProfile) {
  if (!Object.hasOwn(pokemonSets, name)) throw new Error(`Unknown species: ${name}`);
  const base=structuredClone(pokemonSets[name as keyof typeof pokemonSets]);
  const form=selectedForm(name,profile?.forme);
  if(profile?.forme&&!form)throw Error('Invalid selected form');
  if(form){base.species=profile!.forme!;base.item=form.requiredItem??'';}
  // Keep a stable, legal nickname across the three Paldean breeds.
  if(name==='Tauros-Paldea-Combat')base.name='Tauros-Paldea';
  if(profile) {
    if(profile.gender)base.gender=profile.gender;
    base.shiny=profile.shiny ?? false;
    base.ivs={...profile.ivs};base.evs={...profile.evs};base.moves=[...profile.moves];base.ability=profile.ability;base.nature=profile.nature ?? 'Serious';
    // Persist the stat-system version in Showdown's otherwise unused, losslessly packed ball metadata.
    // Replays and old battles can then distinguish stat points from legacy EVs.
    if(profile.statSystem!=='points' && profile.runBonuses)base.pokeball='towerlegacyboost'+statKeys.map(k=>profile.runBonuses?.[k]??0).join('x');
    if(profile.statSystem==='points')base.pokeball=POINT_TEAM_MARKER+(profile.runBonuses ? 'boost'+statKeys.map(k=>profile.runBonuses?.[k]??0).join('x') : '');
    // A harmless 1 HP EV acknowledges an intentionally untrained set to the validator.
    if(!base.pokeball && Object.values(base.evs).every(value=>value===0))base.evs.hp=1;
  }
  const types=teraTypesForSpecies(base.species);
  return {...base,teraType:profile?.teraType ?? (types.length===1?types[0]:Showdown.Dex.species.get(name).types[0])};
}
export const packTeam = (names: string[],profiles:Record<string,TrainingProfile>={},items:Record<string,string>={},gigantamax:string[]=[]) => Teams.pack(names.map(name=>({...trainedSet(name,profiles[name]),item:selectedForm(name,profiles[name]?.forme)?.requiredItem??items[name]??'',...(gigantamax.includes(name)?{gigantamax:true}:{})})));
export const packPlayerTeam = (names:string[],profiles:Record<string,TrainingProfile>={},items:Record<string,string>={},trainerDynamax=false) => packTeam(names,profiles,items,names.filter(name=>(trainerDynamax||items[name]==='Dynamax Band') && !megaStones[items[name]] && !!Showdown.Dex.species.get(profiles[name]?.forme??name).canGigantamax));
export const playerTeam = packTeam(starters);
export const opponentTeam = packTeam(['Pikachu', 'Gyarados', 'Snorlax']);

export function pointBonuses(ball:string){const match=ball.toLowerCase().replace(/[^a-z0-9]/g,'').match(/^(?:towerpointsv1boost|towerlegacyboost)(\d+)x(\d+)x(\d+)x(\d+)x(\d+)x(\d+)$/);if(!match)return {};if(match.slice(1).some(n=>Number(n)>100))throw Error("Invalid run stat bonus");return Object.fromEntries(statKeys.map((k,i)=>[k,Number(match[i+1])])) as Partial<import("./training").StatBlock>;}
