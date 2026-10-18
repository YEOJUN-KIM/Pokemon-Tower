import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {sinnohTrainers} from '../src/data/sinnoh-trainers';
import {pokemonSets} from '../src/data/teams';
import {isCollectibleSpecies} from '../src/data/pokedex-roster';
import {isHeldItem} from '../src/data/held-items';
import {FORMAT} from '../src/battle/run';

const builds:Record<string,{ability:string;item:string;moves:string[];role:string}>={};
function set(species:string,ability:string,item:string,moves:string,role:string){builds[species]={ability,item,moves:moves.split(','),role};}
set('Rampardos','Mold Breaker','Focus Sash','Stone Edge,Earthquake,Zen Headbutt,Superpower','Physical wallbreaker');
set('Probopass','Sturdy','Air Balloon','Power Gem,Earth Power,Thunder Wave,Flash Cannon','Special pressure / speed control');
set('Golem','Sturdy','Weakness Policy','Stone Edge,Earthquake,Fire Punch,Sucker Punch','Physical breaker / priority');
set('Aerodactyl','Rock Head','Expert Belt','Stone Edge,Dual Wingbeat,Earthquake,Ice Fang','Fast physical coverage');
set('Tyranitar','Sand Stream','Assault Vest','Stone Edge,Crunch,Earthquake,Ice Punch','Bulky sand breaker');
set('Archeops','Defeatist','Sitrus Berry','Stone Edge,Dual Wingbeat,U-turn,Earthquake','Fast pivot');
set('Roserade','Natural Cure','Black Sludge','Giga Drain,Sludge Bomb,Sleep Powder,Shadow Ball','Status / sustain');
set('Torterra','Overgrow','Leftovers','Wood Hammer,Earthquake,Stone Edge,Synthesis','Bulky physical / recovery');
set('Breloom','Technician','Focus Sash','Mach Punch,Bullet Seed,Spore,Rock Tomb','Priority / sleep / speed control');
set('Tangrowth','Regenerator','Rocky Helmet','Giga Drain,Knock Off,Sludge Bomb,Sleep Powder','Physical check / sustain');
set('Cherrim','Flower Gift','Sitrus Berry','Energy Ball,Dazzling Gleam,Pollen Puff,Leech Seed','Grass attrition / coverage');
set('Leafeon','Leaf Guard','Lum Berry','Leaf Blade,Knock Off,X-Scissor,Swords Dance','Physical setup');
set('Lucario','Inner Focus','Lum Berry','Close Combat,Extreme Speed,Ice Punch,Swords Dance','Physical setup / priority');
set('Machamp','No Guard','Sitrus Berry','Dynamic Punch,Knock Off,Stone Edge,Bullet Punch','Confusion / priority');
set('Medicham','Pure Power','Choice Scarf','High Jump Kick,Zen Headbutt,Ice Punch,Thunder Punch','Fast physical coverage');
set('Gallade','Sharpness','Scope Lens','Sacred Sword,Psycho Cut,Night Slash,Leaf Blade','Immediate physical coverage');
set('Toxicroak','Dry Skin','Black Sludge','Drain Punch,Poison Jab,Sucker Punch,Ice Punch','Sustain / priority');
set('Infernape','Iron Fist','Expert Belt','Close Combat,Flare Blitz,Mach Punch,U-turn','Fast physical pivot');
set('Floatzel','Water Veil','Mystic Water','Waterfall,Aqua Jet,Ice Punch,Crunch','Fast water / priority');
set('Gyarados','Intimidate','Lum Berry','Waterfall,Crunch,Ice Fang,Dragon Dance','Physical setup');
set('Quagsire','Unaware','Leftovers','Earthquake,Scald,Recover,Toxic','Bulky status / recovery');
set('Ludicolo','Own Tempo','Assault Vest','Hydro Pump,Giga Drain,Ice Beam,Focus Blast','Special coverage / sustain');
set('Empoleon','Competitive','Air Balloon','Hydro Pump,Flash Cannon,Ice Beam,Grass Knot','Special water / steel');
set('Swampert','Torrent','Sitrus Berry','Earthquake,Waterfall,Ice Punch,Stealth Rock','Bulky attacker / hazards');
set('Mismagius','Levitate','Leftovers','Shadow Ball,Mystical Fire,Energy Ball,Pain Split','Special disruption / recovery');
set('Gengar','Cursed Body','Focus Sash','Shadow Ball,Sludge Bomb,Focus Blast,Thunderbolt','Fast special coverage');
set('Drifblim','Unburden','Sitrus Berry','Shadow Ball,Air Slash,Will-O-Wisp,Destiny Bond','Burn / speed / trade');
set('Dusknoir','Pressure','Leftovers','Poltergeist,Earthquake,Will-O-Wisp,Pain Split','Bulky ghost / recovery');
set('Spiritomb','Infiltrator','Black Glasses','Dark Pulse,Shadow Ball,Will-O-Wisp,Sucker Punch','Burn / mixed priority');
set('Chandelure','Flash Fire','Choice Scarf','Shadow Ball,Flamethrower,Energy Ball,Psychic','Fast special breaker');
set('Bastiodon','Sturdy','Leftovers','Flash Cannon,Earth Power,Metal Burst,Stealth Rock','Steel defense / retaliation / hazards');
set('Steelix','Sturdy','Sitrus Berry','Heavy Slam,Earthquake,Stone Edge,Dragon Tail','Physical wall / phazing');
set('Magnezone','Sturdy','Air Balloon','Thunderbolt,Flash Cannon,Volt Switch,Body Press','Bulky special pivot');
set('Aggron','Rock Head','Choice Band','Head Smash,Heavy Slam,Earthquake,Ice Punch','Physical breaker');
set('Forretress','Sturdy','Rocky Helmet','Gyro Ball,Volt Switch,Spikes,Explosion','Hazards / slow pivot');
set('Excadrill','Mold Breaker','Expert Belt','Iron Head,Earthquake,Rock Slide,X-Scissor','Physical coverage');
set('Froslass','Cursed Body','Focus Sash','Ice Beam,Shadow Ball,Thunderbolt,Destiny Bond','Fast ice / trade');
set('Abomasnow','Snow Warning','Icy Rock','Blizzard,Giga Drain,Earth Power,Ice Shard','Snow / mixed priority');
set('Weavile','Pressure','Focus Sash','Icicle Crash,Knock Off,Ice Shard,Low Kick','Fast physical / priority');
set('Mamoswine','Thick Fat','Life Orb','Icicle Crash,Earthquake,Ice Shard,Stone Edge','Physical breaker / priority');
set('Glaceon','Snow Cloak','Choice Specs','Ice Beam,Freeze-Dry,Shadow Ball,Water Pulse','Special ice / water coverage');
set('Walrein','Thick Fat','Leftovers','Surf,Ice Beam,Earthquake,Yawn','Bulky mixed / sleep pressure');
set('Electivire','Motor Drive','Expert Belt','Wild Charge,Ice Punch,Earthquake,Cross Chop','Physical electric coverage');
set('Luxray','Guts','Flame Orb','Wild Charge,Crunch,Ice Fang,Facade','Physical status breaker');
set('Raichu','Lightning Rod','Focus Sash','Thunderbolt,Surf,Grass Knot,Nuzzle','Fast special / paralysis');
set('Jolteon','Volt Absorb','Wise Glasses','Thunderbolt,Shadow Ball,Volt Switch,Hyper Voice','Fast special pivot');
set('Rotom','Levitate','Sitrus Berry','Thunderbolt,Shadow Ball,Will-O-Wisp,Volt Switch','Burn / special pivot');
set('Drapion','Sniper','Scope Lens','Cross Poison,Night Slash,Earthquake,Ice Fang','Critical physical ace');
set('Heracross','Guts','Flame Orb','Close Combat,Megahorn,Facade,Stone Edge','Physical status breaker');
set('Scizor','Technician','Metal Coat','Bullet Punch,X-Scissor,Night Slash,Swords Dance','Setup / priority');
set('Yanmega','Speed Boost','Life Orb','Bug Buzz,Air Slash,Ancient Power,Protect','Speed setup / special');
set('Vespiquen','Pressure','Leftovers','Attack Order,Air Slash,Toxic,Roost','Bulky bug / recovery');
set('Beautifly','Swarm','Focus Sash','Bug Buzz,Air Cutter,Psychic,Quiver Dance','Special setup');
set('Hippowdon','Sand Stream','Leftovers','Earthquake,Stone Edge,Slack Off,Yawn','Sand / bulky recovery');
set('Gliscor','Poison Heal','Toxic Orb','Earthquake,Knock Off,Roost,U-turn','Sustain / pivot');
set('Rhyperior','Solid Rock','Assault Vest','Earthquake,Stone Edge,Megahorn,Ice Punch','Bulky physical breaker');
set('Whiscash','Oblivious','Sitrus Berry','Earthquake,Waterfall,Ice Beam,Zen Headbutt','Mixed ground / coverage');
set('Nidoking','Sheer Force','Life Orb','Earth Power,Sludge Wave,Ice Beam,Thunderbolt','Special ground breaker');
set('Magmortar','Vital Spirit','Assault Vest','Fire Blast,Thunderbolt,Focus Blast,Psychic','Special fire coverage');
set('Rapidash','Flash Fire','Wide Lens','Flare Blitz,Megahorn,High Horsepower,Hypnosis','Fast disruption / coverage');
set('Houndoom','Flash Fire','Focus Sash','Flamethrower,Dark Pulse,Sludge Bomb,Nasty Plot','Special setup');
set('Flareon','Guts','Toxic Orb','Flare Blitz,Facade,Quick Attack,Superpower','Physical breaker / priority');
set('Arcanine','Intimidate','Sitrus Berry','Flare Blitz,Extreme Speed,Crunch,Wild Charge','Physical pressure / priority');
set('Bronzong','Levitate','Sitrus Berry','Psychic,Flash Cannon,Earthquake,Hypnosis','Bulky mixed / sleep');
set('Alakazam','Magic Guard','Life Orb','Psychic,Shadow Ball,Focus Blast,Dazzling Gleam','Fast special coverage');
set('Espeon','Magic Bounce','Leftovers','Psychic,Dazzling Gleam,Shadow Ball,Morning Sun','Special pressure / recovery');
set('Mr. Mime','Filter','Light Clay','Psychic,Dazzling Gleam,Reflect,Light Screen','Screens / special');
set('Slowbro','Regenerator','Rocky Helmet','Scald,Psychic,Ice Beam,Slack Off','Physical check / recovery');
set('Gastrodon','Storm Drain','Leftovers','Earth Power,Scald,Ice Beam,Recover','Water immunity / recovery');
set('Milotic','Marvel Scale','Leftovers','Scald,Ice Beam,Recover,Mirror Coat','Special wall / retaliation');
set('Garchomp','Rough Skin','Lum Berry','Earthquake,Dragon Claw,Stone Edge,Swords Dance','Champion physical ace');
set('Golbat','Infiltrator','Eviolite','Brave Bird,Poison Fang,U-turn,Roost','Grunt pivot / poison');
set('Skuntank','Aftermath','Black Sludge','Poison Jab,Crunch,Sucker Punch,Flamethrower','Poison / dark mixed pressure');
set('Purugly','Thick Fat','Silk Scarf','Body Slam,Play Rough,Sucker Punch,U-turn','Fast physical disruption');
set('Bronzor','Levitate','Eviolite','Psychic,Flash Cannon,Hypnosis,Reflect','Grunt screens / sleep');
set('Kadabra','Magic Guard','Focus Sash','Psychic,Shadow Ball,Dazzling Gleam,Thunder Wave','Grunt special / paralysis');
set('Crobat','Infiltrator','Black Sludge','Brave Bird,Cross Poison,U-turn,Roost','Fast physical pivot');
set('Togekiss','Serene Grace','Sitrus Berry','Air Slash,Dazzling Gleam,Thunder Wave,Roost','Disruption / recovery');
set('Sharpedo','Speed Boost','Life Orb','Scald,Dark Pulse,Ice Beam,Protect','Special speed cleaner');
set('Honchkrow','Super Luck','Scope Lens','Brave Bird,Night Slash,Sucker Punch,Heat Wave','Mixed dark / priority');
set('Dialga','Pressure','Expert Belt','Roar of Time,Flash Cannon,Earth Power,Thunderbolt','Legendary special boss core');

const path='scripts/data/npc/normal-npc-samples.json',source=JSON.parse(readFileSync(path,'utf8'));
// v12 TowerPolicy scores only a subset of utility moves. Preserve each role
// with supported utility rather than leaving zero-score sleep/screens/hazards.
const utility:Record<string,Record<string,string>>={
 Roserade:{'Sleep Powder':'Leech Seed'},Torterra:{Synthesis:'Leech Seed'},Breloom:{Spore:'Swords Dance'},Tangrowth:{'Sleep Powder':'Leech Seed'},
 Swampert:{'Stealth Rock':'Toxic'},Mismagius:{'Pain Split':'Thunder Wave'},Dusknoir:{'Pain Split':'Shadow Sneak'},
 Bastiodon:{'Metal Burst':'Body Press','Stealth Rock':'Toxic'},Forretress:{Spikes:'Toxic'},Walrein:{Yawn:'Toxic'},
 Yanmega:{Protect:'Giga Drain'},Hippowdon:{Yawn:'Toxic'},Rapidash:{Hypnosis:'Will-O-Wisp'},
 Bronzong:{Hypnosis:'Toxic'},Espeon:{'Morning Sun':'Calm Mind'},'Mr. Mime':{Reflect:'Thunder Wave','Light Screen':'Energy Ball'},
 Sharpedo:{Protect:'Aqua Jet'},
};
const validator=new Showdown.TeamValidator(FORMAT);
const ids=new Set(sinnohTrainers.map(t=>t.id));ids.add('named-cyrus');
const replacements=[];
for(const t of sinnohTrainers){
 const build=(species:string)=>{
  const b=structuredClone(builds[species]);assert.ok(b,species);
  if(t.id==='named-flint'&&species==='Infernape')b.moves[3]='Thunder Punch';
  if(t.id==='named-cynthia'&&species==='Spiritomb')Object.assign(b,{item:'Leftovers',moves:['Dark Pulse','Shadow Ball','Will-O-Wisp','Pain Split'],role:'Bulky ghost / recovery'});
  if(t.id==='named-cynthia'&&species==='Lucario')b.moves=['Close Combat','Extreme Speed','Meteor Mash','Ice Punch'];
  if(t.id==='galactic-executive-jupiter'&&species==='Crobat')Object.assign(b,{item:'Expert Belt',moves:['Brave Bird','Cross Poison','Heat Wave','U-turn'],role:'Mixed poison pressure / pivot'});
  if(t.id==='galactic-executive-jupiter'&&species==='Bronzong')Object.assign(b,{item:'Leftovers',moves:['Psychic','Flash Cannon','Shadow Ball','Toxic'],role:'Special poison attrition'});
  if(t.id==='galactic-executive-saturn'&&species==='Alakazam')b.moves[3]='Thunder Wave';
  if(t.id==='galactic-executive-saturn'&&species==='Crobat')Object.assign(b,{moves:['Air Slash','Sludge Bomb','Taunt','Roost'],role:'Special disruption / recovery'});
  if(t.id==='galactic-executive-saturn'&&species==='Skuntank')Object.assign(b,{moves:['Dark Pulse','Sludge Bomb','Flamethrower','Taunt'],role:'Special dark / disruption'});
  if(t.id==='galactic-executive-saturn'&&species==='Bronzong')Object.assign(b,{item:'Light Clay',moves:['Psychic','Flash Cannon','Reflect','Hypnosis'],role:'Screen / sleep / special'});
  if(t.category==='boss'&&species==='Houndoom')b.moves[0]='Fire Blast';
  if(t.category==='grunt'&&species==='Alakazam')Object.assign(b,{item:'Sitrus Berry',moves:['Psychic','Shadow Ball','Dazzling Gleam','Thunder Wave'],role:'Grunt special / paralysis'});
  if(t.id==='named-cynthia'&&species==='Spiritomb')b.moves[3]='Toxic';
  if(t.id==='galactic-executive-saturn'&&species==='Crobat')b.moves[2]='Giga Drain';
  if(t.id==='galactic-executive-saturn'&&species==='Skuntank')b.moves[3]='Toxic';
  if(t.id==='galactic-executive-saturn'&&species==='Bronzong')Object.assign(b,{item:'Leftovers',moves:['Psychic','Flash Cannon','Grass Knot','Toxic'],role:'Special coverage / poison'});
  if(species==='Mr. Mime')b.item='Sitrus Berry';
  b.moves=b.moves.map(m=>utility[species]?.[m]??m);
  if(utility[species])b.role=b.role.replace(/sleep|hazards|Screens|Screen|retaliation/gi,'status control');
  if(species==='Bastiodon')b.role='Steel wall / defense-based pressure / poison';
  if(species==='Mismagius')b.role='Special disruption / paralysis';
  if(species==='Dusknoir')b.role='Bulky ghost / burn / priority';
  if(species==='Espeon')b.role='Special pressure / Calm Mind';
  const attacks=b.moves.map(m=>Showdown.Dex.moves.get(m)).filter(m=>m.category!=='Status'),physical=attacks.filter(m=>m.category==='Physical').length>attacks.filter(m=>m.category==='Special').length;
  const evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0},fast=Showdown.Dex.species.get(species).baseStats.spe>=80;
  evs[physical?'atk':'spa']=32;evs[fast?'spe':'hp']=26;evs[fast?'hp':'spd']=8;
  if(species==='Bastiodon')Object.assign(evs,{spa:0,def:32,hp:26,spd:8});
  assert.ok(isCollectibleSpecies(species),`Unavailable ${species}`);assert.ok(isHeldItem(b.item),b.item);
  assert.equal(validator.validateSet({...structuredClone(pokemonSets[species]),ability:b.ability,item:b.item,moves:b.moves},{}),null,`${t.id}/${species}`);
  assert.ok(!b.moves.includes('Trick Room'));
  return {species,item:b.item,gigantamax:false,role:b.role,profile:{statSystem:'points',ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs,nature:physical?'Adamant':'Modest',ability:b.ability,moves:b.moves}};
 };
 for(const id of t.category==='boss'?[t.id,'named-cyrus']:[t.id])for(const stage of t.category==='boss'?['first-gate','final-gate']:['leaders-early']){
  const early=t.category==='boss'&&stage==='first-gate';
  replacements.push({id,name:t.name,generation:4,title:t.power,role:['grunt','executive','boss'].includes(t.category)?'villain':t.category,ace:early?'Weavile':t.ace,signature:null,stage,...(t.category!=='boss'?{allFloors:true}:{}),select:true,gimmickEnabled:false,...(!early&&t.category==='boss'?{legendaryMinFloor:75}:{}),selectionRules:t.selectionRules,concept:t.concept,powerTier:t.power,team:t.entries.filter(p=>!early||p!=='Dialga').map(build)});
 }
}
const pending=new Map<string,typeof replacements>();
for(const row of replacements){const list=pending.get(row.id)??[];list.push(row);pending.set(row.id,list);}
source.samples=source.samples.flatMap((s:{id:string})=>{if(!ids.has(s.id))return [s];const rows=pending.get(s.id)??[];pending.delete(s.id);return rows;});
source.samples.push(...[...pending.values()].flat());
writeFileSync(path,JSON.stringify(source,null,2)+'\n');
console.log(`Reviewed ${sinnohTrainers.length} Sinnoh definitions (${replacements.length} runtime rows).`);

