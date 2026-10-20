import test from 'node:test';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {resolveBattleMovePreviews} from '../src/battle/move-preview';
import {plateTypes} from '../src/data/form-items';

type Case={species:string;ability:string;item?:string;move:string;expected:string;weather?:string;terrain?:string;forme?:string;tera?:string};
const cases:Case[]=[
 ...[['Ogerpon','', 'Grass'],['Ogerpon-Wellspring','Wellspring Mask','Water'],['Ogerpon-Hearthflame','Hearthflame Mask','Fire'],['Ogerpon-Cornerstone','Cornerstone Mask','Rock']].map(([species,item,expected])=>({species,item,ability:species==='Ogerpon'?'Defiant':species.includes('Wellspring')?'Water Absorb':species.includes('Hearthflame')?'Mold Breaker':'Sturdy',move:'Ivy Cudgel',expected})),
 {species:'Arceus',ability:'Multitype',move:'Judgment',expected:'Normal'},
 ...Object.entries(plateTypes).map(([item,[type]])=>({species:`Arceus-${type}`,item,ability:'Multitype',move:'Judgment',expected:type})),
 {species:'Silvally',ability:'RKS System',move:'Multi-Attack',expected:'Normal'},
 ...Object.values(plateTypes).map(([type])=>({species:`Silvally-${type}`,item:`${type} Memory`,ability:'RKS System',move:'Multi-Attack',expected:type})),
 {species:'Genesect',ability:'Download',move:'Techno Blast',expected:'Normal'},
 ...[['Burn','Fire'],['Douse','Water'],['Chill','Ice'],['Shock','Electric']].map(([drive,type])=>({species:`Genesect-${drive}`,ability:'Download',item:`${drive} Drive`,move:'Techno Blast',expected:type})),
 ...[['Oricorio','Fire'],['Oricorio-Pom-Pom','Electric'],['Oricorio-Pau','Psychic'],['Oricorio-Sensu','Ghost']].map(([species,type])=>({species,ability:'Dancer',move:'Revelation Dance',expected:type})),
 {species:'Morpeko',ability:'Hunger Switch',move:'Aura Wheel',expected:'Electric'},
 {species:'Morpeko',ability:'Hunger Switch',forme:'Morpeko-Hangry',move:'Aura Wheel',expected:'Dark'},
 {species:'Castform',ability:'Forecast',move:'Weather Ball',weather:'raindance',expected:'Water'},
 {species:'Arboliva',ability:'Seed Sower',move:'Terrain Pulse',terrain:'grassyterrain',expected:'Grass'},
 {species:'Tauros-Paldea-Blaze',ability:'Intimidate',move:'Raging Bull',expected:'Fire'},
 {species:'Sylveon',ability:'Pixilate',move:'Hyper Voice',expected:'Fairy'},
 {species:'Primarina',ability:'Liquid Voice',move:'Hyper Voice',expected:'Water'},
 {species:'Salamence-Mega',ability:'Aerilate',move:'Hyper Voice',expected:'Flying'},
 {species:'Glalie-Mega',ability:'Refrigerate',move:'Hyper Voice',expected:'Ice'},
 {species:'Golem-Alola',ability:'Galvanize',move:'Hyper Voice',expected:'Electric'},
 {species:'Delcatty',ability:'Normalize',move:'Thunderbolt',expected:'Normal'},
 {species:'Pikachu',ability:'Static',move:'Tera Blast',tera:'Fire',expected:'Fire'},
 {species:'Terapagos-Stellar',ability:'Teraform Zero',move:'Tera Starstorm',tera:'Stellar',expected:'Stellar'},
 {species:'Pikachu',ability:'Static',move:'Thunderbolt',expected:'Electric'},
 {species:'Pikachu',ability:'Static',move:'Hidden Power',expected:'Dark'},
 {species:'Pikachu',ability:'Static',item:'Cheri Berry',move:'Natural Gift',expected:'Fire'},
];
export function previewBattle(species:string,ability:string,item='',move='Tackle'){
 const battle=new Showdown.Battle({formatid:'gen9customgame',seed:'1,2,3,4'});
 battle.setPlayer('p1',{name:'Player',team:[{name:species,species,ability,item,moves:[move],level:50}]});
 battle.setPlayer('p2',{name:'Enemy',team:[{name:'Mew',species:'Mew',ability:'Synchronize',item:'',moves:['Splash'],level:100}]});
 if(battle.requestState==='teampreview'){battle.choose('p1','team 1');battle.choose('p2','team 1');}
 return battle;
}
for(const entry of cases)test(`${entry.species} ${entry.move} ${entry.item??''}: native damage and preview ${entry.expected}`,()=>{
 const battle=previewBattle(entry.species,entry.ability,entry.item,entry.move);
 try{
  const pokemon=battle.p1.active[0]!;
  if(entry.forme)pokemon.formeChange(entry.forme);
  if(entry.weather)battle.field.setWeather(entry.weather,pokemon);
  if(entry.terrain)battle.field.setTerrain(entry.terrain,pokemon);
  if(entry.tera){pokemon.teraType=entry.tera as any;pokemon.terastallized=entry.tera as any;}
  const before={seed:battle.prng.getSeed(),log:[...battle.log],item:pokemon.item,ability:pokemon.ability,forme:pokemon.species.name};
  const preview=resolveBattleMovePreviews(battle,'p1',[entry.move])[0];assert.equal(preview.type,entry.expected);
  assert.deepEqual({seed:battle.prng.getSeed(),log:[...battle.log],item:pokemon.item,ability:pokemon.ability,forme:pokemon.species.name},before);
  let actual='';battle.onEvent('BasePower',battle.format,(power:number,source:any,_target:any,move:any)=>{if(source.side.id==='p1')actual=move.type;return power;});
  battle.choose('p1','move 1');battle.choose('p2','move 1');assert.equal(actual,preview.type);
 }finally{battle.destroy();}
});

test('current form, weather and item suppression update the same preview without stale types',()=>{
 const battle=previewBattle('Arceus-Fire','Multitype','Flame Plate','Judgment');
 try{assert.equal(resolveBattleMovePreviews(battle,'p1',['Judgment'])[0].type,'Fire');battle.field.addPseudoWeather('magicroom',battle.p1.active[0]!);assert.equal(resolveBattleMovePreviews(battle,'p1',['Judgment'])[0].type,'Normal');battle.field.removePseudoWeather('magicroom');assert.equal(resolveBattleMovePreviews(battle,'p1',['Judgment'])[0].type,'Fire');}finally{battle.destroy();}
});

for(const suppression of ['magicroom','embargo'])for(const [species,ability,item,move,expected] of [
 ['Arceus-Fire','Multitype','Flame Plate','Judgment','Normal'],
 ['Silvally-Fire','RKS System','Fire Memory','Multi-Attack','Normal'],
 ['Genesect-Burn','Download','Burn Drive','Techno Blast','Normal'],
 ['Ogerpon-Hearthflame','Mold Breaker','Hearthflame Mask','Ivy Cudgel','Fire'],
])test(`${suppression}: ${move} uses native suppression and current form`,()=>{
 const battle=previewBattle(species,ability,item,move);
 try{
  const pokemon=battle.p1.active[0]!;
  if(suppression==='magicroom')battle.field.addPseudoWeather(suppression,pokemon);else pokemon.addVolatile(suppression,pokemon);
  const preview=resolveBattleMovePreviews(battle,'p1',[move])[0];assert.equal(preview.type,expected);
  let actual='';battle.onEvent('BasePower',battle.format,(power:number,source:any,_target:any,attack:any)=>{if(source.side.id==='p1')actual=attack.type;return power;});battle.choose('p1','move 1');battle.choose('p2','move 1');assert.equal(actual,preview.type);
 }finally{battle.destroy();}
});
