import type {RaidBossDefinition,RaidCategory,RaidPhaseDefinition,RaidRouteDefinition,RaidTransformation,RaidRecruitmentPolicy} from './raids';
import {formItemFor,formItems,plateTypes} from './form-items';

function p(species:string,ability:string,moves:readonly string[],hpRatio:number,transformation:RaidTransformation='form',extra:Partial<RaidPhaseDefinition>={}):RaidPhaseDefinition{
 const item=formItemFor(species),teraType=item?formItems[item].type:undefined;
 return {species,ability,moves,hpRatio,transformation,...(item?{item}:{}),...(teraType?{teraType}:{}),...extra};
}
function route(id:string,attack:'atk'|'spa',phases:RaidPhaseDefinition[],recruit?:Partial<RaidRouteDefinition['recruit']>):RaidRouteDefinition{
 return {id,weight:1,attack,phases,recruit:{nature:attack==='atk'?'Adamant':'Modest',ability:phases[0].ability,moves:phases[0].moves,...recruit}};
}
function boss(id:string,species:string,category:RaidCategory,raidHpMultiplier:number,routes:RaidRouteDefinition[],recruitment?:RaidRecruitmentPolicy):RaidBossDefinition{
 return {id,species,category,raidHpMultiplier,...(recruitment?{recruitment}:{}),weight:category==='normal'?80:20,minFloor:1,ivRule:{perfect:['legendary','mythical'].includes(category)?6:4,protected:['hp','spe']},shinyRule:'standard',battleTraining:'elite',rewardProfile:'elite',routes};
}
const palafinMoves=['Wave Crash','Jet Punch','Close Combat','Ice Punch'];
const snorlaxMoves=['Body Slam','Crunch','High Horsepower','Heavy Slam'];
const volcaronaMoves=['Fiery Dance','Bug Buzz','Giga Drain','Psychic'];
const ogerponMoves=['Ivy Cudgel','Horn Leech','Play Rough'];
const rayquazaMoves=['Dragon Ascent','Dragon Claw','Earthquake','Extreme Speed'];
const arceusMoves=['Judgment','Earth Power','Ice Beam','Extreme Speed'];
const kyuremMoves=['Ice Beam','Dragon Pulse','Earth Power','Flash Cannon'];
const necrozmaMoves=['Photon Geyser','Power Gem','Earth Power','Dark Pulse'];
const ultraMoves=['Photon Geyser','Dragon Pulse','Earth Power','Power Gem'];
const terapagosMoves=['Tera Starstorm','Earth Power','Ice Beam','Flamethrower'];
const arceusPlates=Object.entries(plateTypes).map(([item,[type]])=>p('Arceus-'+type,'Multitype',arceusMoves,.33,'form',{item}));
function necrozmaRoute(form:'Necrozma-Dusk-Mane'|'Necrozma-Dawn-Wings'){
 const dusk=form==='Necrozma-Dusk-Mane';
 return route(dusk?'dusk-mane':'dawn-wings','spa',[
  p('Necrozma','Prism Armor',necrozmaMoves,.34),
  p(form,'Prism Armor',dusk?['Sunsteel Strike','Photon Geyser','Earthquake','Knock Off']:['Moongeist Beam','Photon Geyser','Power Gem','Heat Wave'],.33),
  p('Necrozma-Ultra','Neuroforce',ultraMoves,.33,'ultraBurst',{sourceSpecies:form}),
 ],{nature:'Serious'});
}

// Initial HP-only tuning. Native form stats/abilities are the only other changes.
// The two original bosses remain in raids.ts without changing their saved builds.
export const expandedRaidBosses:readonly RaidBossDefinition[]=[
 boss('metagross','Metagross','normal',2.2,[route('mega','atk',[
  p('Metagross','Clear Body',['Meteor Mash','Zen Headbutt','Earthquake','Bullet Punch'],.55),
  p('Metagross-Mega','Tough Claws',['Meteor Mash','Zen Headbutt','Ice Punch','Bullet Punch'],.45,'mega'),
 ])]),
 boss('palafin','Palafin','normal',2,[route('hero','atk',[
  p('Palafin','Zero to Hero',palafinMoves,.4),p('Palafin-Hero','Zero to Hero',palafinMoves,.6),
 ])]),
 boss('snorlax','Snorlax','normal',2.3,[route('gigantamax','atk',[
  p('Snorlax','Thick Fat',snorlaxMoves,.45),p('Snorlax-Gmax','Thick Fat',snorlaxMoves,.55,'gigantamax',{persistent:true}),
 ])]),
 boss('hoopa','Hoopa','mythical',2.2,[route('unbound','spa',[
  p('Hoopa','Magician',['Psychic','Shadow Ball','Energy Ball','Thunderbolt'],.45),
  p('Hoopa-Unbound','Magician',['Hyperspace Fury','Psychic','Drain Punch','Thunderbolt'],.55),
 ],{nature:'Serious'})]),
 boss('shaymin','Shaymin','mythical',2,[route('sky','spa',[
  p('Shaymin','Natural Cure',['Seed Flare','Earth Power','Psychic','Dazzling Gleam'],.5),
  p('Shaymin-Sky','Serene Grace',['Seed Flare','Air Slash','Earth Power','Dazzling Gleam'],.5),
 ])]),
 boss('volcarona','Volcarona','normal',2.2,[
  route('slither-wing','atk',[p('Volcarona','Flame Body',volcaronaMoves,.5),p('Slither Wing','Protosynthesis',['First Impression','Close Combat','Leech Life','Flare Blitz'],.5,'replacement')],{nature:'Serious'}),
  route('iron-moth','spa',[p('Volcarona','Flame Body',volcaronaMoves,.5),p('Iron Moth','Quark Drive',['Fiery Dance','Sludge Wave','Energy Ball','Dazzling Gleam'],.5,'replacement')]),
 ],{mode:'phaseSpecies',phase:2}),
 boss('ogerpon','Ogerpon','sub-legendary',2.8,[route('masks','atk',[
  p('Ogerpon','Defiant',[...ogerponMoves,'Knock Off'],.25),
  p('Ogerpon-Wellspring','Water Absorb',[...ogerponMoves,'Stomping Tantrum'],.25),
  p('Ogerpon-Cornerstone','Sturdy',[...ogerponMoves,'Low Kick'],.25),
  p('Ogerpon-Hearthflame','Mold Breaker',[...ogerponMoves,'Stomping Tantrum'],.25),
 ])]),
 boss('diancie','Diancie','mythical',2.2,[route('mega','spa',[
  p('Diancie','Clear Body',['Diamond Storm','Moonblast','Earth Power','Psychic'],.55),
  p('Diancie-Mega','Magic Bounce',['Diamond Storm','Moonblast','Earth Power','Mystical Fire'],.45,'mega'),
 ],{nature:'Serious'})]),
 boss('groudon','Groudon','legendary',2.6,[route('primal','atk',[
  p('Groudon','Drought',['Precipice Blades','Heat Crash','Stone Edge','Thunder Punch'],.5),
  p('Groudon-Primal','Desolate Land',['Precipice Blades','Fire Punch','Stone Edge','Thunder Punch'],.5,'primal'),
 ])]),
 boss('kyogre','Kyogre','legendary',2.6,[route('primal','spa',[
  p('Kyogre','Drizzle',['Origin Pulse','Thunder','Ice Beam','Ancient Power'],.5),
  p('Kyogre-Primal','Primordial Sea',['Origin Pulse','Thunder','Ice Beam','Ancient Power'],.5,'primal'),
 ])]),
 boss('rayquaza','Rayquaza','legendary',2.6,[route('mega','atk',[
  p('Rayquaza','Air Lock',rayquazaMoves,.5),p('Rayquaza-Mega','Delta Stream',rayquazaMoves,.5,'mega'),
 ])]),
 boss('arceus','Arceus','mythical',3,[route('plates','spa',[
  p('Arceus','Multitype',arceusMoves,.34),
  p('Arceus','Multitype',arceusMoves,.33,'form',{randomBranch:{id:'plate',options:arceusPlates,excludePrevious:true}}),
  p('Arceus','Multitype',arceusMoves,.33,'form',{randomBranch:{id:'plate',options:arceusPlates,excludePrevious:true}}),
 ],{nature:'Serious'})]),
 boss('kyurem','Kyurem','legendary',2.5,[
  route('black','atk',[p('Kyurem','Pressure',kyuremMoves,.5),p('Kyurem-Black','Teravolt',['Fusion Bolt','Icicle Spear','Dragon Claw','Earth Power'],.5)],{nature:'Serious'}),
  route('white','spa',[p('Kyurem','Pressure',kyuremMoves,.5),p('Kyurem-White','Turboblaze',['Fusion Flare','Ice Beam','Dragon Pulse','Earth Power'],.5)]),
 ],{mode:'phaseSpecies',phase:2}),
 boss('zygarde','Zygarde','legendary',3,[route('mega','spa',[
  p('Zygarde','Aura Break',['Thousand Arrows','Dragon Tail','Crunch','Glare'],.34),
  // Abilities below match the installed Dex, including the existing Z-A Mega.
  p('Zygarde-Complete','Power Construct',['Thousand Arrows','Core Enforcer','Extreme Speed','Glare'],.33),
  p('Zygarde-Mega','Aura Break',['Thousand Arrows','Core Enforcer','Extreme Speed','Dragon Pulse'],.33,'mega',{sourceSpecies:'Zygarde-Complete'}),
 ],{nature:'Serious'})]),
 boss('necrozma','Necrozma','legendary',3,[necrozmaRoute('Necrozma-Dusk-Mane'),necrozmaRoute('Necrozma-Dawn-Wings')]),
 boss('zacian','Zacian','legendary',2.5,[route('crowned','atk',[
  p('Zacian','Intrepid Sword',['Play Rough','Sacred Sword','Crunch','Wild Charge'],.5),
  p('Zacian-Crowned','Intrepid Sword',['Behemoth Blade','Play Rough','Sacred Sword','Wild Charge'],.5),
 ])]),
 boss('zamazenta','Zamazenta','legendary',2.5,[route('crowned','atk',[
  p('Zamazenta','Dauntless Shield',['Close Combat','Crunch','Stone Edge','Body Press'],.5),
  p('Zamazenta-Crowned','Dauntless Shield',['Behemoth Bash','Body Press','Crunch','Stone Edge'],.5),
 ])]),
 boss('terapagos','Terapagos','legendary',2.8,[route('stellar','spa',[
  p('Terapagos-Terastal','Tera Shell',terapagosMoves,.55,'form',{sourceSpecies:'Terapagos',nativeEntry:true}),
  p('Terapagos-Stellar','Teraform Zero',terapagosMoves,.45,'stellar'),
 ],{ability:'Tera Shift'})]),
];
