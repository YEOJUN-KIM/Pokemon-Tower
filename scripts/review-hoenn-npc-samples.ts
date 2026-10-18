import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {hoennTrainers} from '../src/data/hoenn-trainers';
import {pokemonSets} from '../src/data/teams';
import {isCollectibleSpecies} from '../src/data/pokedex-roster';
import {isHeldItem} from '../src/data/held-items';
import {FORMAT} from '../src/battle/run';

type SetRow={ability:string;item:string;moves:string[];role:string};
const builds:Record<string,SetRow>={};
function set(species:string,ability:string,item:string,moves:string,role:string){builds[species]={ability,item,moves:moves.split(','),role};}
set('Probopass','Sturdy','Air Balloon','Power Gem,Flash Cannon,Thunder Wave,Earth Power','Lead / speed control');
set('Armaldo','Battle Armor','Lum Berry','Rock Slide,X-Scissor,Earthquake,Rock Polish','Setup physical sweeper');
set('Cradily','Storm Drain','Leftovers','Giga Drain,Ancient Power,Toxic,Recover','Water check / attrition');
set('Aggron','Rock Head','Choice Band','Head Smash,Heavy Slam,Earthquake,Ice Punch','Physical wallbreaker');
set('Relicanth','Rock Head','Sitrus Berry','Head Smash,Waterfall,Earthquake,Yawn','Bulky attacker / disruption');
set('Golem','Sturdy','Weakness Policy','Stone Edge,Earthquake,Fire Punch,Sucker Punch','Physical breaker / priority');
set('Hariyama','Thick Fat','Assault Vest','Close Combat,Knock Off,Ice Punch,Bullet Punch','Bulky physical ace');
set('Medicham','Pure Power','Choice Scarf','Close Combat,Zen Headbutt,Ice Punch,Thunder Punch','Fast coverage');
set('Machamp','No Guard','Lum Berry','Dynamic Punch,Knock Off,Stone Edge,Bullet Punch','Physical pressure / confusion');
set('Breloom','Technician','Focus Sash','Spore,Bullet Seed,Mach Punch,Rock Tomb','Status / priority');
set('Heracross','Guts','Choice Scarf','Close Combat,Megahorn,Stone Edge,Knock Off','Fast breaker');
set('Hitmontop','Intimidate','Sitrus Berry','Close Combat,Mach Punch,Stone Edge,Toxic','Utility / priority');
set('Manectric','Lightning Rod','Expert Belt','Thunderbolt,Volt Switch,Flamethrower,Thunder Wave','Fast special pivot');
set('Magnezone','Sturdy','Air Balloon','Thunderbolt,Flash Cannon,Volt Switch,Thunder Wave','Bulky special / speed control');
set('Electrode','Aftermath','Light Clay','Thunderbolt,Reflect,Light Screen,Taunt','Fast screens / disruption');
set('Raichu','Lightning Rod','Focus Sash','Thunderbolt,Grass Knot,Surf,Thunder Wave','Ground coverage / speed control');
set('Ampharos','Static','Leftovers','Thunderbolt,Dragon Pulse,Focus Blast,Thunder Wave','Bulky special attacker');
set('Luxray','Intimidate','Sitrus Berry','Wild Charge,Crunch,Ice Fang,Quick Attack','Physical coverage / priority');
set('Torkoal','Drought','Sitrus Berry','Flamethrower,Solar Beam,Yawn,Body Press','Sun support / Water coverage / sleep pressure');
set('Camerupt','Solid Rock','Sitrus Berry','Flamethrower,Earth Power,Ancient Power,Yawn','Fire / Ground wallbreaker');
set('Magcargo','Flame Body','White Herb','Fire Blast,Earth Power,Power Gem,Shell Smash','Setup special breaker');
set('Ninetales','Flash Fire','Heat Rock','Flamethrower,Energy Ball,Will-O-Wisp,Nasty Plot','Fast coverage / burn');
set('Houndoom','Flash Fire','Focus Sash','Flamethrower,Dark Pulse,Sludge Bomb,Nasty Plot','Fast special breaker');
set('Darmanitan','Sheer Force','Choice Scarf','Flare Blitz,Rock Slide,Earthquake,U-turn','Fast physical breaker');
set('Slaking','Truant','Choice Band','Return,Earthquake,Fire Punch,Sucker Punch','Immediate physical ace');
set('Spinda','Contrary','Sitrus Berry','Superpower,Return,Rock Slide,Teeter Dance','Contrary / disruption');
set('Zangoose','Immunity','Silk Scarf','Return,Close Combat,Quick Attack,Swords Dance','Physical cleaner / priority');
set('Tauros','Intimidate','Life Orb','Return,Earthquake,Stone Edge,Zen Headbutt','Fast physical pressure');
set('Exploud','Scrappy','Choice Specs','Boomburst,Flamethrower,Ice Beam,Focus Blast','Special wallbreaker');
set('Altaria','Natural Cure','Leftovers','Dragon Claw,Return,Earthquake,Roost','Bulky dragon / Mega Fairy pressure');
set('Skarmory','Sturdy','Rocky Helmet','Brave Bird,Body Press,Roost,Toxic','Physical wall / recovery');
set('Pelipper','Keen Eye','Sitrus Berry','Scald,Hurricane,Roost,U-turn','Water coverage / pivot');
set('Tropius','Harvest','Sitrus Berry','Giga Drain,Air Slash,Leech Seed,Roost','Sustain / grass coverage');
set('Swellow','Guts','Flame Orb','Facade,Brave Bird,U-turn,Quick Attack','Fast physical cleaner');
set('Dragonite','Multiscale','Lum Berry','Dragon Dance,Dragon Claw,Fire Punch,Extreme Speed','Setup / priority');
set('Solrock','Levitate','Sitrus Berry','Rock Slide,Zen Headbutt,Earthquake,Trick Room','Physical Trick Room attacker');
set('Lunatone','Levitate','Leftovers','Psychic,Power Gem,Ice Beam,Trick Room','Special Trick Room setter');
set('Claydol','Levitate','Sitrus Berry','Earth Power,Psychic,Ice Beam,Trick Room','Bulky room setter / coverage');
set('Xatu','Magic Bounce','Leftovers','Psychic,Heat Wave,Thunder Wave,Roost','Status reflection / speed control');
set('Gallade','Sharpness','Scope Lens','Psycho Cut,Sacred Sword,Leaf Blade,Shadow Sneak','Physical coverage / priority');
set('Gardevoir','Trace','Choice Scarf','Psychic,Moonblast,Thunderbolt,Focus Blast','Independent fast special attacker');
set('Milotic','Marvel Scale','Leftovers','Scald,Ice Beam,Toxic,Recover','Water control / recovery');
set('Walrein','Thick Fat','Sitrus Berry','Surf,Ice Beam,Encore,Super Fang','Bulky Water / disruption');
set('Whiscash','Oblivious','Sitrus Berry','Earthquake,Waterfall,Stone Edge,Dragon Dance','Electric immunity / setup');
set('Luvdisc','Swift Swim','Focus Sash','Scald,Ice Beam,Charm,Attract','Status utility');
set('Crawdaunt','Adaptability','Life Orb','Crabhammer,Knock Off,Aqua Jet,Swords Dance','Physical breaker / priority');
set('Seaking','Lightning Rod','Sitrus Berry','Waterfall,Drill Run,Megahorn,Knock Off','Electric immunity / coverage');
set('Kingdra','Swift Swim','Scope Lens','Surf,Draco Meteor,Ice Beam,Focus Energy','Rain special ace');
set('Politoed','Drizzle','Damp Rock','Scald,Ice Beam,Encore,Perish Song','Rain lead / disruption');
set('Lapras','Water Absorb','Assault Vest','Surf,Freeze-Dry,Thunderbolt,Ice Shard','Water check / coverage');
set('Scrafty','Intimidate','Lum Berry','Drain Punch,Knock Off,Ice Punch,Dragon Dance','Bulky setup / disruption');
set('Shiftry','Chlorophyll','Life Orb','Leaf Blade,Knock Off,Sucker Punch,Swords Dance','Grass coverage / priority');
set('Zoroark','Illusion','Focus Sash','Dark Pulse,Flamethrower,Focus Blast,Nasty Plot','Special disruption');
set('Sharpedo','Speed Boost','Life Orb','Waterfall,Crunch,Ice Fang,Protect','Speed setup / cleaner');
set('Mandibuzz','Overcoat','Rocky Helmet','Foul Play,Roost,Toxic,Taunt','Physical check / disruption');
set('Absol','Super Luck','Lum Berry','Knock Off,Sucker Punch,Play Rough,Swords Dance','Physical ace / priority');
set('Banette','Insomnia','Spell Tag','Shadow Claw,Shadow Sneak,Knock Off,Will-O-Wisp','Physical ghost / burn');
set('Mismagius','Levitate','Sitrus Berry','Shadow Ball,Dazzling Gleam,Thunderbolt,Nasty Plot','Special coverage');
set('Drifblim','Unburden','Sitrus Berry','Shadow Ball,Thunderbolt,Will-O-Wisp,Strength Sap','Burn / sustain / speed');
set('Chandelure','Flash Fire','Choice Scarf','Shadow Ball,Flamethrower,Energy Ball,Psychic','Fast special breaker');
set('Dusknoir','Pressure','Leftovers','Poltergeist,Shadow Sneak,Will-O-Wisp,Pain Split','Bulky ghost / priority');
set('Sableye','Prankster','Leftovers','Foul Play,Will-O-Wisp,Recover,Taunt','Status / recovery / Mega reflection');
set('Abomasnow','Snow Warning','Icy Rock','Blizzard,Giga Drain,Ice Shard,Earth Power','Snow / mixed coverage');
set('Beartic','Slush Rush','Life Orb','Icicle Crash,Superpower,Aqua Jet,Swords Dance','Snow attacker / priority');
set('Froslass','Cursed Body','Focus Sash','Ice Beam,Shadow Ball,Thunderbolt,Will-O-Wisp','Fast special / burn');
set('Vanilluxe','Snow Warning','Choice Specs','Blizzard,Freeze-Dry,Flash Cannon,Ice Beam','Snow / special breaker');
set('Glalie','Inner Focus','Life Orb','Return,Earthquake,Ice Shard,Crunch','Mega physical ice breaker');
set('Dragalge','Adaptability','Assault Vest','Draco Meteor,Sludge Wave,Hydro Pump,Thunderbolt','Special dragon / Fairy check');
set('Flygon','Levitate','Choice Scarf','Earthquake,Dragon Claw,Rock Slide,U-turn','Fast pivot / electric immunity');
set('Haxorus','Mold Breaker','Lum Berry','Dragon Dance,Dragon Claw,Earthquake,Poison Jab','Physical setup');
set('Salamence','Intimidate','Lum Berry','Dragon Claw,Return,Earthquake,Roost','Immediate dragon / Mega Flying pressure');
set('Metagross','Clear Body','Assault Vest','Meteor Mash,Zen Headbutt,Earthquake,Bullet Punch','Physical champion ace / priority');
set('Wailord','Water Veil','Assault Vest','Water Spout,Surf,Ice Beam,Heavy Slam','Bulky Water pressure');
set('Tentacruel','Liquid Ooze','Black Sludge','Scald,Sludge Bomb,Ice Beam,Toxic','Special bulk / poison');
set('Ludicolo','Rain Dish','Leftovers','Scald,Giga Drain,Ice Beam,Leech Seed','Water check / sustain');
set('Gyarados','Intimidate','Lum Berry','Waterfall,Earthquake,Ice Fang,Dragon Dance','Physical setup / ground immunity');
set('Mightyena','Intimidate','Sitrus Berry','Crunch,Play Rough,Sucker Punch,Taunt','Attack reduction / priority');
set('Crobat','Infiltrator','Black Sludge','Brave Bird,U-turn,Taunt,Roost','Fast pivot / disruption');
set('Weezing','Levitate','Rocky Helmet','Sludge Bomb,Flamethrower,Will-O-Wisp,Pain Split','Ground immunity / physical check');
set('Muk','Sticky Hold','Black Sludge','Poison Jab,Knock Off,Shadow Sneak,Curse','Bulky poison / priority');
set('Groudon','Drought','Assault Vest','Precipice Blades,Fire Punch,Stone Edge,Thunder Punch','Legendary sun lead / bulky coverage');
set('Kyogre','Drizzle','Leftovers','Surf,Thunder,Ice Beam,Calm Mind','Legendary rain boss');

const sourcePath='scripts/data/npc/normal-npc-samples.json';
const source=JSON.parse(readFileSync(sourcePath,'utf8'));
const validator=new Showdown.TeamValidator(FORMAT);
const ids=new Set(hoennTrainers.map(t=>t.id));
// Named and campaign IDs share the same reviewed definition, as in the live
// canonical lookup. Preserve staged pre-legendary boss encounters.
for(const t of hoennTrainers.filter(t=>t.category==='boss'))ids.add(t.id.replace(/^(magma|aqua)-boss-/,'named-'));
const previous=source.samples;
source.samples=[];
for(const t of hoennTrainers){
 const build=(species:string)=>{
  const b=structuredClone(builds[species]);assert.ok(b,`Missing reviewed build ${species}`);
  if(t.id==='aqua-executive-shelly'&&species==='Sharpedo')Object.assign(b,{item:'Sitrus Berry',moves:['Scald','Dark Pulse','Ice Beam','Taunt'],role:'Special disruption / coverage'});
  if(t.id==='aqua-executive-shelly'&&species==='Muk')Object.assign(b,{moves:['Poison Jab','Knock Off','Toxic','Pain Split'],role:'Poison attrition / sustain'});
  if(t.id==='aqua-executive-shelly'&&species==='Wailord')Object.assign(b,{item:'Leftovers',moves:['Scald','Ice Beam','Toxic','Protect'],role:'Poison pressure / sustain'});
  if(t.category==='grunt'){
   b.item='Sitrus Berry';
   if(species==='Sharpedo')b.moves=['Waterfall','Crunch','Ice Fang','Aqua Jet'];
  }
  if(t.category==='boss'&&species===t.signature?.species)b.item=t.signature.item!;
  if(t.id.startsWith('magma-executive-')&&species==='Crobat')Object.assign(b,{item:'Life Orb',moves:['Brave Bird','U-turn','Giga Drain','Roost'],role:'Fast mixed coverage / Water-Ground check'});
  if(species==='Ninetales')b.item='Charcoal';
  if(t.id==='named-steven'&&species==='Claydol')Object.assign(b,{moves:['Earth Power','Psychic','Ice Beam','Reflect'],role:'Bulky coverage / screen'});
  const profile={statSystem:'points' as const,ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},nature:'Serious',ability:b.ability,moves:b.moves};
  const attacks=b.moves.map(m=>Showdown.Dex.moves.get(m)).filter(m=>m.category!=='Status');
  const physical=attacks.filter(m=>m.category==='Physical').length>attacks.filter(m=>m.category==='Special').length;
  const offense=physical?'atk':'spa',fast=Showdown.Dex.species.get(species).baseStats.spe>=80||species==='Metagross';
  profile.evs[offense]=32;profile.evs[fast?'spe':'hp']=26;profile.evs[fast?'hp':'spd']=8;
  profile.nature=physical?'Adamant':'Modest';
  assert.ok(isCollectibleSpecies(species),`Unavailable roster species ${species}`);
  assert.ok(isHeldItem(b.item),b.item);
  assert.equal(validator.validateSet({...structuredClone(pokemonSets[species]),ability:b.ability,item:b.item,moves:b.moves},{}),null,`${t.id}/${species}`);
  return {species,item:b.item,gigantamax:false,profile,role:b.role};
 };
 const aliases=t.category==='boss'?[t.id,t.id.replace(/^(magma|aqua)-boss-/,'named-')]:[t.id];
 for(const id of aliases){
  const stages=t.category==='boss'?['first-gate','final-gate']:['leaders-early'];
  for(const stage of stages){
   const early=t.category==='boss'&&stage==='first-gate';
   const pool=early?t.entries.filter(p=>p!==t.ace):t.entries;
   const ace=early?(id.includes('maxie')?'Camerupt':'Sharpedo'):t.ace;
   const selectionRules=early?undefined:t.selectionRules;
   source.samples.push({id,name:t.name,generation:3,title:t.power,role:t.category==='grunt'||t.category==='executive'||t.category==='boss'?'villain':t.category,ace,signature:t.signature,stage,...(t.category!=='boss'?{allFloors:true}:{}),select:true,gimmickEnabled:!!t.signature,...(!early&&t.category==='boss'?{legendaryMinFloor:75}:{}),selectionRules,concept:t.concept,powerTier:t.power,team:pool.map(build)});
  }
 }
}
const replacements=new Map<string,unknown[]>();
for(const s of source.samples){const rows=replacements.get(s.id)??[];rows.push(s);replacements.set(s.id,rows);}
source.samples=previous.flatMap((s:{id:string})=>{if(!ids.has(s.id))return [s];const rows=replacements.get(s.id)??[];replacements.delete(s.id);return rows;});
source.samples.push(...[...replacements.values()].flat());
writeFileSync(sourcePath,JSON.stringify(source,null,2)+'\n');
console.log(`Reviewed ${hoennTrainers.length} Hoenn NPCs; runtime export is the next step.`);




