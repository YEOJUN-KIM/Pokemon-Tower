import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {pokemonSets} from '../src/data/teams';
import {FORMAT} from '../src/data/battle-rules';

// Trainer-scoped, explicit builds. Re-running replaces only generation 8 rows.
const trainers:any[]=[];
function t(id:string,name:string,category:string,specialty:string|null,tactic:string,concept:string,builds:string[]){
 const team=builds.map((line,index)=>{const [species,ability,item,nature,moves]=line.split(';');return {species,ability,item,nature,moves:moves.split('|'),role:index===0?'lead':index===1?'middle':'ace'};});
 trainers.push({id:id==='macrocosmos-grunt'?id:`named-${id}`,name,category,specialty,tactic,concept,team,entries:team.map(p=>p.species),ace:category==='boss'?'Copperajah':team[2].species,aiCeiling:category==='grunt'?'basic':['champion','boss','executive'].includes(category)||id==='raihan'?'expert':'tactical',minFloor:category==='boss'?75:category==='grunt'?1:5});
}
t('nessa','야청','gym','Water','physical','비 + 우선도 압박 + 쓱쓱 거다이갈가부기',[
 'Pelipper;Drizzle;Focus Sash;Timid;Scald|Hurricane|U-turn|Tailwind',
 'Golisopod;Emergency Exit;Sitrus Berry;Adamant;First Impression|Liquidation|Leech Life|Sucker Punch',
 'Drednaw;Swift Swim;;Adamant;Liquidation|Stone Edge|Crunch|Superpower']);
t('kabu','순무','gym','Fire','physical','가뭄 + 위협 + 거다이다태우지네',[
 'Torkoal;Drought;Leftovers;Bold;Lava Plume|Stealth Rock|Yawn|Body Press',
 'Arcanine;Intimidate;Sitrus Berry;Adamant;Flare Blitz|Extreme Speed|Wild Charge|Play Rough',
 'Centiskorch;Flash Fire;;Adamant;Fire Lash|Leech Life|Power Whip|Knock Off']);
t('bea','채두','gym','Fighting','setup','배수의진과 낮은 교체 빈도의 정면 돌파',[
 'Hawlucha;Unburden;Focus Sash;Jolly;Close Combat|Acrobatics|Poison Jab|Swords Dance',
 'Falinks;Battle Armor;Sitrus Berry;Adamant;No Retreat|Close Combat|Iron Head|Throat Chop',
 'Machamp;No Guard;;Adamant;Dynamic Punch|Knock Off|Ice Punch|Stone Edge']);
t('allister','어니언','gym','Ghost','status','도깨비불 + 병상첨병 + 탈 랭크업',[
 'Cursola;Weak Armor;Focus Sash;Modest;Strength Sap|Will-O-Wisp|Hex|Ancient Power',
 'Mimikyu;Disguise;Sitrus Berry;Jolly;Play Rough|Shadow Sneak|Swords Dance|Will-O-Wisp',
 'Gengar;Cursed Body;;Timid;Shadow Ball|Sludge Bomb|Focus Blast|Hypnosis']);
t('gordie','마쿠와','gym','Rock','bulk','모래 + 단단지 설치 + 거다이분석 지속 피해',[
 'Tyranitar;Sand Stream;Assault Vest;Adamant;Stone Edge|Crunch|Earthquake|Ice Punch',
 'Shuckle;Sturdy;Mental Herb;Careful;Sticky Web|Stealth Rock|Rock Tomb|Encore',
 'Coalossal;Steam Engine;;Modest;Heat Wave|Ancient Power|Earth Power|Solar Beam']);
t('melony','멜론','gym','Ice','setup','나비춤 + 스카프 물리 돌파 + 거다이선율',[
 'Frosmoth;Ice Scales;Focus Sash;Timid;Ice Beam|Bug Buzz|Quiver Dance|Giga Drain',
 'Darmanitan-Galar;Gorilla Tactics;Choice Scarf;Jolly;Icicle Crash|Flare Blitz|Earthquake|U-turn',
 'Lapras;Water Absorb;;Modest;Freeze-Dry|Hydro Pump|Thunderbolt|Ice Beam']);
t('marnie','마리','gym','Dark','physical','빠른 방해 + 위협 중견 + 벌크업 난전',[
 'Morpeko;Hunger Switch;Focus Sash;Jolly;Aura Wheel|Seed Bomb|Fake Out|Taunt',
 'Scrafty;Intimidate;Assault Vest;Adamant;Drain Punch|Crunch|Ice Punch|Poison Jab',
 'Grimmsnarl;Prankster;;Adamant;Spirit Break|Darkest Lariat|Bulk Up|Sucker Punch']);
t('bede','비트','gym','Fairy','special','특수 → 물리 → 매직미러 거다이 에이스',[
 'Gardevoir;Trace;Choice Scarf;Timid;Psychic|Moonblast|Shadow Ball|Energy Ball',
 'Rapidash-Galar;Pastel Veil;Life Orb;Jolly;Psycho Cut|Play Rough|Drill Run|Smart Strike',
 'Hatterene;Magic Bounce;;Modest;Psychic|Dazzling Gleam|Mystical Fire|Calm Mind']);
t('raihan','금랑','gym','Dragon','balanced','모래 + 설치 + 유턴 + 적극적인 상성 운영',[
 'Gigalith;Sand Stream;Leftovers;Impish;Stealth Rock|Rock Blast|Body Press|Earthquake',
 'Flygon;Levitate;Life Orb;Jolly;Earthquake|Dragon Claw|Fire Punch|U-turn',
 'Duraludon;Stalwart;;Modest;Draco Meteor|Flash Cannon|Thunderbolt|Body Press']);
t('macrocosmos-grunt','매크로코스모스 직원','grunt','Steel','physical','강철 기본 공격; 다이맥스 없음',[
 'Perrserker;Tough Claws;;Serious;Iron Head|Fake Out|Crunch|U-turn',
 'Klinklang;Clear Body;;Serious;Gear Grind|Wild Charge|Shift Gear|Volt Switch',
 'Copperajah;Sheer Force;;Serious;Iron Head|Earthquake|Stone Edge|Play Rough']);
t('oleana','올리브','executive',null,'bulk','빠른 교란 → 밀로틱 내구전 → 거다이 피니셔',[
 'Froslass;Cursed Body;Focus Sash;Timid;Ice Beam|Shadow Ball|Will-O-Wisp|Destiny Bond',
 'Milotic;Competitive;Leftovers;Bold;Scald|Ice Beam|Recover|Mirror Coat',
 'Garbodor;Weak Armor;;Mild;Sludge Bomb|Psychic|Thunderbolt|Drain Punch']);
t('rose','로즈','boss','Steel','bulk','설치 → 거다이대왕끼리동 → 히든 일반 무한다이노',[
 'Ferrothorn;Iron Barbs;Leftovers;Relaxed;Stealth Rock|Power Whip|Gyro Ball|Leech Seed',
 'Copperajah;Sheer Force;;Adamant;Heavy Slam|Earthquake|Stone Edge|Power Whip',
 'Eternatus;Pressure;;Timid;Dynamax Cannon|Sludge Bomb|Flamethrower|Dragon Pulse']);
t('leon','단델','champion',null,'balanced','배틀스위치 + 유턴 + 거다이옥염 최종 에이스',[
 'Aegislash;Stance Change;Weakness Policy;Quiet;King\'s Shield|Shadow Ball|Sacred Sword|Flash Cannon',
 'Dragapult;Infiltrator;Life Orb;Naive;Dragon Darts|Phantom Force|Fire Blast|U-turn',
 'Charizard;Blaze;;Timid;Fire Blast|Air Slash|Solar Beam|Ancient Power']);

const validator=new Showdown.TeamValidator(FORMAT),keys=['hp','atk','def','spa','spd','spe'] as const;
const rows=trainers.map(trainer=>{
 trainer.signature=trainer.category==='grunt'?null:{rule:'dynamax',species:trainer.ace};
 const points=trainer.category==='grunt'?18:trainer.aiCeiling==='expert'?66:48;
 const team=trainer.team.map((p:any,index:number)=>{
  assert.ok(pokemonSets[p.species],p.species);
  const attacks=p.moves.map((m:string)=>Showdown.Dex.moves.get(m)).filter((m:any)=>m.category!=='Status');
  const physical=attacks.filter((m:any)=>m.category==='Physical'&&!m.overrideOffensiveStat).length>attacks.filter((m:any)=>m.category==='Special').length;
  const evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
  if(trainer.category==='grunt')for(const k of keys)evs[k]=3;
  else {evs[physical?'atk':'spa']=Math.min(32,points/2);evs[Showdown.Dex.species.get(p.species).baseStats.spe>=80?'spe':'hp']=Math.min(32,points/2);evs.spd=points-Object.values(evs).reduce((a,b)=>a+b,0);}
  const profile={statSystem:'points',ivs:Object.fromEntries(keys.map(k=>[k,trainer.category==='grunt'?12:31])),evs,nature:p.nature,ability:p.ability,moves:p.moves};
  assert.equal(validator.validateSet({...structuredClone(pokemonSets[p.species]),ability:p.ability,item:p.item,nature:p.nature,moves:p.moves},{}),null,`${trainer.id}/${p.species}`);
  return {species:p.species,item:p.item,gigantamax:trainer.signature?.species===p.species,role:index===2&&trainer.category==='boss'?'hidden':p.role,profile};
 });
 return {id:trainer.id,name:trainer.name,generation:8,title:trainer.category,role:['boss','executive','grunt'].includes(trainer.category)?'villain':trainer.category,ace:trainer.ace,signature:trainer.signature,stage:'leaders-early',allFloors:true,select:true,required:trainer.entries,selectionRules:{preferredLead:[trainer.entries[0]],preferredLast:[trainer.entries[2]]},...(trainer.category==='boss'?{legendaryMinFloor:75}:{}),gimmickEnabled:!!trainer.signature,concept:trainer.concept,powerTier:trainer.category,team};
});
const path='scripts/data/npc/normal-npc-samples.json',source=JSON.parse(readFileSync(path,'utf8'));
source.samples=source.samples.filter((r:any)=>r.generation!==8&&!trainers.some(t=>t.id===r.id));source.samples.push(...rows);
writeFileSync(path,JSON.stringify(source,null,2)+'\n');
writeFileSync('scripts/data/npc/galar-design.json',JSON.stringify({trainers},null,2)+'\n');
console.log(`Reviewed ${trainers.length} Galar triples.`);
