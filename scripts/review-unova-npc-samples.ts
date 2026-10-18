import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {unovaTrainers} from '../src/data/unova-trainers';
import {pokemonSets} from '../src/data/teams';
import {isCollectibleSpecies} from '../src/data/pokedex-roster';
import {isHeldItem} from '../src/data/held-items';
import {FORMAT} from '../src/battle/run';

type Build={ability:string;item:string;moves:string[];role:string};
const builds:Record<string,Build>={};
function set(species:string,ability:string,item:string,moves:string,role:string){builds[species]={ability,item,moves:moves.split(','),role};}
// Every utility slot below is scored by the installed TowerPolicy. No sleep,
// screens, hazards, unsupported recovery, Protect or Trick Room placeholders.
set('Simisage','Overgrow','Sitrus Berry','Seed Bomb,Knock Off,Low Kick,Rock Slide','Fast Grass coverage');
set('Ferrothorn','Iron Barbs','Leftovers','Power Whip,Gyro Ball,Knock Off,Leech Seed','Slow Steel / Grass attrition');
set('Lilligant','Own Tempo','Lum Berry','Giga Drain,Pollen Puff,Quiver Dance,Petal Dance','Special Grass setup / sustain');
set('Whimsicott','Prankster','Leftovers','Moonblast,Giga Drain,Leech Seed,Toxic','Priority Grass attrition');
set('Leavanny','Swarm','Focus Sash','Leaf Blade,X-Scissor,Knock Off,Swords Dance','Physical Bug / Grass setup');
set('Amoonguss','Regenerator','Black Sludge','Giga Drain,Sludge Bomb,Foul Play,Toxic','Bulky Grass / Poison sustain');
set('Simisear','Blaze','Wise Glasses','Flamethrower,Grass Knot,Focus Blast,Nasty Plot','Fast special Fire pressure');
set('Darmanitan','Sheer Force','Choice Scarf','Flare Blitz,Earthquake,Rock Slide,U-turn','Fast physical Fire breaker');
set('Chandelure','Flash Fire','Expert Belt','Shadow Ball,Flamethrower,Energy Ball,Will-O-Wisp','Special Ghost / Fire disruption');
set('Arcanine','Intimidate','Sitrus Berry','Flare Blitz,Extreme Speed,Crunch,Wild Charge','Physical pressure / priority');
set('Heatmor','Flash Fire','Assault Vest','Fire Lash,Giga Drain,Knock Off,Superpower','Mixed Fire coverage');
set('Emboar','Reckless','Choice Band','Flare Blitz,Superpower,Wild Charge,Sucker Punch','Immediate Fire / Fighting breaker');
set('Simipour','Torrent','Expert Belt','Surf,Ice Beam,Grass Knot,Focus Blast','Fast special Water coverage');
set('Jellicent','Water Absorb','Leftovers','Scald,Shadow Ball,Will-O-Wisp,Recover','Water / Ghost recovery and burn');
set('Carracosta','Sturdy','White Herb','Waterfall,Stone Edge,Aqua Jet,Shell Smash','Physical Water setup / priority');
set('Seismitoad','Water Absorb','Sitrus Berry','Earth Power,Scald,Sludge Wave,Toxic','Water immunity / Ground coverage');
set('Samurott','Torrent','Mystic Water','Razor Shell,Megahorn,Aqua Jet,Swords Dance','Balanced physical Water / priority');
set('Basculin','Adaptability','Choice Band','Liquidation,Aqua Jet,Crunch,Superpower','Fast immediate Water pressure');
set('Watchog','Analytic','Silk Scarf','Retaliate,Knock Off,Low Kick,Thunder Punch','Straightforward Normal coverage');
set('Bouffalant','Sap Sipper','Assault Vest','Head Charge,Earthquake,Megahorn,Stone Edge','Bulky Normal breaker / Grass immunity');
set('Cinccino','Skill Link','Silk Scarf','Tail Slap,Bullet Seed,Rock Blast,U-turn','Fast multihit pressure / pivot');
set('Stoutland','Intimidate','Sitrus Berry','Facade,Crunch,Superpower,Wild Charge','Stable Normal physical coverage');
set('Sawsbuck','Sap Sipper','Lum Berry','Horn Leech,Double-Edge,Jump Kick,Swords Dance','Physical Grass sustain');
set('Braviary','Defiant','Sharp Beak','Brave Bird,Body Slam,Superpower,Roost','Flying pressure / recovery');
set('Crustle','Sturdy','White Herb','Stone Edge,X-Scissor,Earthquake,Shell Smash','Bulky physical Bug setup');
set('Escavalier','Overcoat','Assault Vest','Megahorn,Iron Head,Knock Off,Drill Run','Slow high-power Bug / Steel');
set('Accelgor','Sticky Hold','Focus Sash','Bug Buzz,Focus Blast,Energy Ball,Sludge Bomb','Fast special Bug coverage');
set('Galvantula','Compound Eyes','Focus Sash','Thunder,Bug Buzz,Energy Ball,Thunder Wave','Fast special Bug / Electric speed control');
set('Heracross','Guts','Flame Orb','Close Combat,Megahorn,Facade,Stone Edge','Physical Bug / Fighting breaker');
set('Zebstrika','Lightning Rod','Magnet','Volt Switch,Overheat,Thunder Wave,Signal Beam','Fast Electric pivot / speed control');
set('Emolga','Motor Drive','Sitrus Berry','Volt Switch,Air Slash,Signal Beam,Thunder Wave','Fast airborne pivot / paralysis');
set('Eelektross','Levitate','Assault Vest','Thunderbolt,Flamethrower,Giga Drain,Knock Off','Bulky Electric mixed coverage');
set('Ampharos','Static','Leftovers','Thunderbolt,Dragon Pulse,Focus Blast,Thunder Wave','Bulky special Electric / speed control');
set('Magnezone','Sturdy','Air Balloon','Thunderbolt,Flash Cannon,Thunder Wave,Body Press','Bulky Steel / Electric speed control');
set('Excadrill','Mold Breaker','Life Orb','Earthquake,Iron Head,Rock Slide,Swords Dance','Ground physical ace');
set('Krookodile','Intimidate','Expert Belt','Earthquake,Knock Off,Stone Edge,Close Combat','Heavy Ground / Dark coverage');
set('Golurk','Iron Fist','Assault Vest','Earthquake,Shadow Punch,Drain Punch,Ice Punch','Bulky Ground / Ghost immediate power');
set('Mamoswine','Thick Fat','Life Orb','Earthquake,Icicle Crash,Ice Shard,Stone Edge','Ground / Ice breaker and priority');
set('Hippowdon','Sand Stream','Leftovers','Earthquake,Stone Edge,Slack Off,Toxic','Bulky Ground sustain');
set('Swanna','Keen Eye','Wise Glasses','Surf,Hurricane,Ice Beam,Roost','Fast special Flying / Water recovery');
set('Unfezant','Super Luck','Scope Lens','Brave Bird,Return,Night Slash,U-turn','Fast physical Flying / critical pressure');
set('Skarmory','Sturdy','Rocky Helmet','Brave Bird,Body Press,Roost,Toxic','Physical Flying wall / recovery');
set('Archeops','Defeatist','Sitrus Berry','Stone Edge,Dual Wingbeat,Earthquake,U-turn','Fast Flying / Rock pivot');
set('Mandibuzz','Overcoat','Leftovers','Foul Play,Brave Bird,Roost,Toxic','Bulky Flying / Dark sustain');
set('Beartic','Slush Rush','Never-Melt Ice','Icicle Crash,Superpower,Aqua Jet,Swords Dance','Physical Ice pressure / priority');
set('Cryogonal','Levitate','Leftovers','Freeze-Dry,Water Pulse,Flash Cannon,Recover','Special Ice / coverage and recovery');
set('Vanilluxe','Snow Warning','Icy Rock','Blizzard,Water Pulse,Flash Cannon,Ice Shard','Snow / special Ice / priority');
set('Weavile','Pressure','Focus Sash','Icicle Crash,Knock Off,Ice Shard,Low Kick','Fast Ice / Dark priority');
set('Walrein','Thick Fat','Leftovers','Surf,Ice Beam,Earthquake,Toxic','Bulky mixed Ice / Water');
set('Haxorus','Mold Breaker','Lum Berry','Dragon Claw,Earthquake,Poison Jab,Dragon Dance','Physical Dragon ace / setup');
set('Druddigon','Rough Skin','Rocky Helmet','Dragon Claw,Earthquake,Fire Punch,Sucker Punch','Bulky physical Dragon / priority');
set('Hydreigon','Levitate','Expert Belt','Dark Pulse,Dragon Pulse,Flamethrower,Flash Cannon','Special Dragon / Dark coverage');
set('Flygon','Levitate','Choice Scarf','Earthquake,Dragon Claw,Rock Slide,U-turn','Fast Dragon pivot');
set('Altaria','Natural Cure','Leftovers','Dragon Pulse,Flamethrower,Toxic,Roost','Bulky Dragon status / recovery');
set('Salamence','Intimidate','Lum Berry','Dragon Claw,Earthquake,Fire Blast,Roost','Mixed Dragon pressure / recovery');
set('Snorlax','Thick Fat','Leftovers','Body Slam,Crunch,Earthquake,Heavy Slam','Bulky Normal physical pressure');
set('Scolipede','Speed Boost','Black Sludge','Poison Jab,Megahorn,Earthquake,Swords Dance','Fast physical Poison setup');
set('Garbodor','Aftermath','Rocky Helmet','Gunk Shot,Drain Punch,Seed Bomb,Toxic','Bulky Poison pressure');
set('Toxicroak','Dry Skin','Black Sludge','Drain Punch,Poison Jab,Sucker Punch,Ice Punch','Poison sustain / priority');
set('Crobat','Infiltrator','Black Sludge','Brave Bird,Cross Poison,U-turn,Roost','Fast Poison pivot');
set('Drapion','Sniper','Scope Lens','Cross Poison,Night Slash,Earthquake,Ice Fang','Physical Poison / Dark coverage');
set('Wailord','Water Veil','Assault Vest','Water Spout,Surf,Ice Beam,Heavy Slam','Bulky special Water pressure');
set('Floatzel','Water Veil','Mystic Water','Waterfall,Aqua Jet,Ice Punch,Crunch','Fast physical Water / priority');
set('Mantine','Water Absorb','Leftovers','Scald,Air Slash,Ice Beam,Roost','Special Water wall / recovery');
set('Cofagrigus','Mummy','Leftovers','Shadow Ball,Body Press,Energy Ball,Will-O-Wisp','Ghost wall / burn');
set('Drifblim','Unburden','Sitrus Berry','Shadow Ball,Air Slash,Will-O-Wisp,Strength Sap','Special Ghost disruption / recovery');
set('Froslass','Cursed Body','Focus Sash','Ice Beam,Shadow Ball,Thunderbolt,Destiny Bond','Fast special Ghost / trade');
set('Conkeldurr','Guts','Flame Orb','Drain Punch,Mach Punch,Knock Off,Ice Punch','Fighting breaker / sustain and priority');
set('Mienshao','Regenerator','Life Orb','Close Combat,Knock Off,Stone Edge,U-turn','Fast Fighting pivot');
set('Throh','Guts','Sitrus Berry','Storm Throw,Knock Off,Ice Punch,Bulk Up','Bulky Fighting pressure');
set('Sawk','Sturdy','Expert Belt','Close Combat,Knock Off,Stone Edge,Ice Punch','Immediate Fighting physical coverage');
set('Lucario','Inner Focus','Lum Berry','Close Combat,Meteor Mash,Extreme Speed,Ice Punch','Fighting / Steel coverage and priority');
set('Machamp','No Guard','Sitrus Berry','Dynamic Punch,Knock Off,Stone Edge,Bullet Punch','Confusion / Fighting power');
set('Scrafty','Intimidate','Leftovers','Drain Punch,Knock Off,Ice Punch,Dragon Dance','Bulky Dark / Fighting setup');
set('Kingambit','Defiant','Black Glasses','Iron Head,Knock Off,Sucker Punch,Swords Dance','Dark / Steel setup and priority');
set('Liepard','Prankster','Focus Sash','Knock Off,Play Rough,Sucker Punch,Thunder Wave','Dark disruption / paralysis and priority');
set('Sharpedo','Speed Boost','Life Orb','Waterfall,Crunch,Ice Fang,Aqua Jet','Fast physical Dark / Water');
set('Honchkrow','Super Luck','Scope Lens','Brave Bird,Night Slash,Sucker Punch,Heat Wave','Mixed Dark pressure / priority');
set('Gothitelle','Competitive','Leftovers','Psychic,Thunderbolt,Energy Ball,Calm Mind','Stable Psychic special pressure');
set('Reuniclus','Magic Guard','Leftovers','Psychic,Focus Blast,Calm Mind,Recover','Slow Psychic setup / recovery');
set('Sigilyph','Magic Guard','Life Orb','Psychic,Air Slash,Heat Wave,Roost','Special Psychic / Flying recovery');
set('Musharna','Synchronize','Leftovers','Psychic,Shadow Ball,Energy Ball,Thunder Wave','Bulky Psychic / speed control');
set('Metagross','Clear Body','Assault Vest','Meteor Mash,Zen Headbutt,Earthquake,Bullet Punch','Physical Steel / Psychic priority');
set('Alakazam','Magic Guard','Life Orb','Psychic,Shadow Ball,Focus Blast,Dazzling Gleam','Fast special Psychic coverage');
set('Volcarona','Flame Body','Sitrus Berry','Fiery Dance,Bug Buzz,Giga Drain,Quiver Dance','Veteran special setup / sustain');
set('Lapras','Water Absorb','Assault Vest','Surf,Freeze-Dry,Thunderbolt,Ice Shard','Champion Water / Ice coverage');
set('Aggron','Rock Head','Choice Band','Head Smash,Heavy Slam,Earthquake,Ice Punch','Physical Steel breaker');
set('Klinklang','Clear Body','Leftovers','Gear Grind,Wild Charge,Giga Impact,Thunder Wave','Mechanical Steel pressure / speed control');
set('Rotom','Levitate','Sitrus Berry','Volt Switch,Shadow Ball,Will-O-Wisp,Thunder Wave','Special Electric / Ghost pivot');
set('Beheeyem','Analytic','Assault Vest','Psychic,Thunderbolt,Energy Ball,Shadow Ball','Slow special Psychic coverage');
set('Porygon-Z','Adaptability','Silk Scarf','Tri Attack,Dark Pulse,Ice Beam,Thunderbolt','Special mechanical Normal coverage');
set('Zekrom','Teravolt','Expert Belt','Bolt Strike,Dragon Claw,Zen Headbutt,Crunch','Legendary physical Dragon / Electric core');
set('Zoroark','Illusion','Focus Sash','Dark Pulse,Flamethrower,Focus Blast,Nasty Plot','Illusion special pressure / setup');

const path='scripts/data/npc/normal-npc-samples.json',source=JSON.parse(readFileSync(path,'utf8'));
const validator=new Showdown.TeamValidator(FORMAT),ids=new Set([...unovaTrainers.map(t=>t.id),'named-ghetsis']);
const replacements=[];
for(const t of unovaTrainers){
 const build=(species:string)=>{
  const b=structuredClone(builds[species]);assert.ok(b,species);
  if(t.id==='named-iris'&&species==='Haxorus')b.item='Focus Sash';
  if(t.id==='named-grimsley'&&species==='Krookodile')Object.assign(b,{ability:'Moxie',item:'Lum Berry',role:'Dark physical ace / snowball pressure'});
  if(t.category==='grunt'){
   b.item='Sitrus Berry';
   if(species==='Crobat')b.item='Black Sludge';
   if(species==='Krookodile')b.moves=['Crunch','Earthquake','Rock Slide','Fire Fang'];
   if(species==='Scrafty')b.moves=['Drain Punch','Crunch','Ice Punch','Poison Jab'];
  }
  if(t.id==='plasma-executive-zinzolin'&&species==='Vanilluxe')b.item='Never-Melt Ice';
  if(t.id==='plasma-executive-colress'&&species==='Metagross')b.item='Expert Belt';
  if(t.category==='boss'&&species==='Hydreigon')Object.assign(b,{item:'Life Orb',moves:['Dark Pulse','Draco Meteor','Fire Blast','Flash Cannon'],role:'Boss special Dragon / Dark wallbreaker'});
  if(t.category==='boss'&&species==='Eelektross')b.moves=['Thunderbolt','Flamethrower','Giga Drain','Drain Punch'];
  if(t.category==='boss'&&species==='Bouffalant')b.ability='Reckless';
  if(t.category==='hidden'&&species==='Vanilluxe')Object.assign(b,{ability:'Weak Armor',item:'Never-Melt Ice',moves:['Ice Beam','Water Pulse','Flash Cannon','Ice Shard'],role:'Special Ice / priority without partner snow interference'});
  if(t.category==='hidden'&&species==='Klinklang')b.item='Sitrus Berry';
  const attacks=b.moves.map(m=>Showdown.Dex.moves.get(m)).filter(m=>m.category!=='Status'),physical=attacks.filter(m=>m.category==='Physical').length>attacks.filter(m=>m.category==='Special').length;
  const evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0},fast=Showdown.Dex.species.get(species).baseStats.spe>=80;
  evs[physical?'atk':'spa']=32;evs[fast?'spe':'hp']=26;evs[fast?'hp':'spd']=8;
  if(species==='Cofagrigus')Object.assign(evs,{spa:0,def:32,hp:26,spd:8});
  const nature=species==='Cofagrigus'?'Bold':physical?'Adamant':'Modest';
  assert.ok(isCollectibleSpecies(species),`Unavailable ${species}`);assert.ok(isHeldItem(b.item),b.item);
  assert.equal(validator.validateSet({...structuredClone(pokemonSets[species]),ability:b.ability,item:b.item,moves:b.moves},{}),null,`${t.id}/${species}`);
  const supportedStatus=new Set(['toxic','willowisp','thunderwave','leechseed','dragondance','swordsdance','nastyplot','calmmind','bulkup','quiverdance','shellsmash','recover','roost','softboiled','slackoff','strengthsap','destinybond']);
  for(const move of b.moves){const m=Showdown.Dex.moves.get(move);if(m.category==='Status')assert.ok(supportedStatus.has(m.id),`Unsupported utility ${species}/${move}`);}
  return {species,item:b.item,gigantamax:false,role:b.role,profile:{statSystem:'points',ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs,nature,ability:b.ability,moves:b.moves}};
 };
 for(const id of t.category==='boss'?[t.id,'named-ghetsis']:[t.id])for(const stage of t.category==='hidden'?['first-gate','final-gate']:['leaders-early']){
  const early=t.category==='hidden'&&stage==='first-gate';
  replacements.push({id,name:t.name,generation:5,title:t.power,role:t.category==='hidden'?'champion':t.category==='veteran'?'elite':['grunt','executive','boss'].includes(t.category)?'villain':t.category,ace:early?'Zoroark':t.ace,signature:null,stage,...(t.category!=='hidden'?{allFloors:true}:{}),select:true,gimmickEnabled:false,...(!early&&t.category==='hidden'?{legendaryMinFloor:75}:{}),selectionRules:t.selectionRules,concept:t.concept,powerTier:t.power,team:t.entries.filter(p=>!early||p!=='Zekrom').map(build)});
 }
}
const pending=new Map<string,typeof replacements>();
for(const row of replacements){const list=pending.get(row.id)??[];list.push(row);pending.set(row.id,list);}
source.samples=source.samples.flatMap((s:{id:string})=>{if(!ids.has(s.id))return [s];const rows=pending.get(s.id)??[];pending.delete(s.id);return rows;});
source.samples.push(...[...pending.values()].flat());
writeFileSync(path,JSON.stringify(source,null,2)+'\n');
console.log(`Reviewed ${unovaTrainers.length} Unova NPCs (${replacements.length} runtime rows).`);

