import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {pokemonSets} from '../src/data/teams';
import {FORMAT} from '../src/data/battle-rules';

const trainers:any[]=[];
function t(id:string,name:string,category:string,type:string|null,tactic:string,concept:string,tera:string|null,builds:string[]){
 const team=builds.map((line,i)=>{const [species,ability,item,nature,moves]=line.split(';');return {species,ability,item,nature,moves:moves.split('|'),role:['lead','middle','ace'][i],...(i===2&&tera?{teraType:tera}:{})};});
 trainers.push({id:`named-${id}`,name,category,specialty:type,tactic,concept,team,entries:team.map(p=>p.species),ace:team[2].species,teraType:tera,aiCeiling:category==='gym'?'tactical':'expert',minFloor:category==='hidden'?50:category==='event'?75:5});
}
t('brassius','콜사','gym','Grass','status','수면 + 넘치는씨 그래스필드 + 풀 테라 개척하기','Grass',[
 'Breloom;Poison Heal;Toxic Orb;Adamant;Spore|Bullet Seed|Mach Punch|Rock Tomb',
 'Arboliva;Seed Sower;Sitrus Berry;Modest;Energy Ball|Earth Power|Dazzling Gleam|Leech Seed',
 'Sudowoodo;Sturdy;Expert Belt;Adamant;Trailblaze|Stone Edge|Fire Punch|Sucker Punch']);
t('iono','모야모','gym','Electric','special','전기 운영 + 부유 전기 테라 무우마직','Electric',[
 'Kilowattrel;Wind Power;;Timid;Thunderbolt|Hurricane|Air Slash|Volt Switch',
 'Bellibolt;Electromorphosis;Leftovers;Modest;Parabolic Charge|Muddy Water|Reflect|Sucker Punch',
 'Mismagius;Levitate;Expert Belt;Timid;Tera Blast|Shadow Ball|Mystical Fire|Energy Ball']);
t('kofu','곤포','gym','Water','special','비 + 메가런처 + 물 테라 집게해머','Water',[
 'Pelipper;Drizzle;Sitrus Berry;Modest;Hurricane|Surf|U-turn|Tailwind',
 'Clawitzer;Mega Launcher;Life Orb;Modest;Water Pulse|Dark Pulse|Dragon Pulse|Aura Sphere',
 'Crabominable;Iron Fist;Punching Glove;Adamant;Crabhammer|Ice Hammer|Drain Punch|Thunder Punch']);
t('ryme','라임','gym','Ghost','status','상태이상 + 성묘 + 음파 기술','Ghost',[
 'Mimikyu;Disguise;Sitrus Berry;Jolly;Will-O-Wisp|Play Rough|Shadow Sneak|Swords Dance',
 'Houndstone;Fluffy;Spell Tag;Adamant;Last Respects|Play Rough|Crunch|Shadow Sneak',
 'Toxtricity;Punk Rock;Throat Spray;Modest;Overdrive|Boomburst|Hex|Sludge Bomb']);
t('tulip','리파','gym','Psychic','special','특방 하락 + 예리함 물리 중견 + 에스퍼 테라','Psychic',[
 'Espathra;Opportunist;;Timid;Lumina Crash|Dazzling Gleam|Reflect|Shadow Ball',
 'Gallade;Sharpness;Expert Belt;Jolly;Psycho Cut|Sacred Sword|Leaf Blade|Night Slash',
 'Florges;Flower Veil;Sitrus Berry;Modest;Psychic|Moonblast|Energy Ball|Calm Mind']);
t('grusha','그루샤','gym','Ice','setup','순풍 + 물리 압박 + 얼음 테라','Ice',[
 'Frosmoth;Ice Scales;Focus Sash;Timid;Ice Beam|Bug Buzz|Tailwind|Quiver Dance',
 'Cetitan;Thick Fat;Assault Vest;Adamant;Ice Spinner|Liquidation|Earthquake|Ice Shard',
 'Altaria;Natural Cure;Never-Melt Ice;Modest;Ice Beam|Dragon Pulse|Moonblast|Hurricane']);
t('rika','칠리','elite','Ground','bulk','설치 + 안정적인 땅 운영 + 저수 토오','Ground',[
 'Donphan;Sturdy;Rocky Helmet;Adamant;Stealth Rock|Earthquake|Knock Off|Ice Shard',
 'Camerupt;Solid Rock;;Modest;Earth Power|Flamethrower|Flash Cannon|Ancient Power',
 'Clodsire;Water Absorb;Leftovers;Careful;Earthquake|Poison Jab|Stone Edge|Recover']);
t('poppy','뽀삐','elite','Steel','bulk','설치 + 빛의장막 특수 압박 + 거대해머','Steel',[
 'Copperajah;Sheer Force;Sitrus Berry;Adamant;Stealth Rock|Heavy Slam|Play Rough|High Horsepower',
 'Magnezone;Sturdy;Light Clay;Modest;Light Screen|Tri Attack|Flash Cannon|Discharge',
 'Tinkaton;Mold Breaker;Air Balloon;Adamant;Gigaton Hammer|Play Rough|Knock Off|Brick Break']);
t('larry-elite','청목','elite','Flying','physical','위협 + 스카프 유턴 + 효율적 공격','Flying',[
 'Staraptor;Intimidate;Choice Scarf;Jolly;Brave Bird|Close Combat|U-turn|Double-Edge',
 'Altaria;Natural Cure;Sitrus Berry;Modest;Draco Meteor|Hurricane|Flamethrower|Ice Beam',
 'Flamigo;Scrappy;Life Orb;Jolly;Brave Bird|Close Combat|Throat Chop|Liquidation']);
t('hassel','팔자크','elite','Dragon','setup','순풍 + 용의춤 + 드래곤 테라','Dragon',[
 'Noivern;Infiltrator;;Timid;Draco Meteor|Hurricane|Taunt|Flamethrower',
 'Haxorus;Mold Breaker;Lum Berry;Jolly;Dragon Dance|Outrage|Earthquake|Iron Head',
 'Baxcalibur;Thermal Exchange;Dragon Fang;Adamant;Glaive Rush|Icicle Crash|Earthquake|Ice Shard']);
t('geeta','테사','champion',null,'balanced','킬라플로르 설치 → 특방 압박 → 총대장 피니시','Dark',[
 'Glimmora;Toxic Debris;Focus Sash;Timid;Stealth Rock|Sludge Wave|Earth Power|Energy Ball',
 'Espathra;Opportunist;Life Orb;Timid;Lumina Crash|Dazzling Gleam|Shadow Ball|Calm Mind',
 'Kingambit;Supreme Overlord;Black Glasses;Adamant;Kowtow Cleave|Iron Head|Sucker Punch|Swords Dance']);
t('nemona','네모','hidden',null,'balanced','설치 + Volt Switch/U-turn + 변환자재 + 적극적 상성 운영','Grass',[
 'Lycanroc;Keen Eye;Focus Sash;Jolly;Stealth Rock|Accelerock|Stone Edge|Close Combat',
 'Pawmot;Iron Fist;Punching Glove;Jolly;Double Shock|Close Combat|Ice Punch|Volt Switch',
 'Meowscarada;Protean;Life Orb;Jolly;Flower Trick|Knock Off|U-turn|Sucker Punch']);
t('ai-sada','AI 올림','event',null,'setup','쾌청 + 고대활성 + 고동치는달 피니시',null,[
 'Scream Tail;Protosynthesis;Heat Rock;Jolly;Sunny Day|Reflect|Psychic|Play Rough',
 'Flutter Mane;Protosynthesis;Life Orb;Timid;Moonblast|Shadow Ball|Mystical Fire|Power Gem',
 'Roaring Moon;Protosynthesis;Booster Energy;Jolly;Dragon Dance|Crunch|Acrobatics|Earthquake']);
t('ai-turo','AI 투로','event',null,'balanced','개별 화력 + 쿼크차지 + 최종 무쇠무인',null,[
 'Iron Bundle;Quark Drive;Focus Sash;Timid;Freeze-Dry|Hydro Pump|Ice Beam|Encore',
 'Iron Hands;Quark Drive;Assault Vest;Adamant;Drain Punch|Thunder Punch|Ice Punch|Earthquake',
 'Iron Valiant;Quark Drive;Booster Energy;Naive;Moonblast|Close Combat|Psyshock|Shadow Ball']);

const validator=new Showdown.TeamValidator(FORMAT),keys=['hp','atk','def','spa','spd','spe'] as const;
const rows=trainers.map(t=>{
 const team=t.team.map((p:any)=>{
  assert.ok(pokemonSets[p.species],p.species);assert.ok(Showdown.Dex.abilities.get(p.ability).exists,p.ability);
  const set={...structuredClone(pokemonSets[p.species]),ability:p.ability,item:p.item,nature:p.nature,moves:p.moves};
  assert.equal(validator.validateSet(set,{}),null,`${t.id}/${p.species}`);
  const physical=p.moves.filter((m:string)=>Showdown.Dex.moves.get(m).category==='Physical').length>p.moves.filter((m:string)=>Showdown.Dex.moves.get(m).category==='Special').length;
  const points=t.category==='gym'?48:66,evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};evs[physical?'atk':'spa']=points===48?24:32;evs[Showdown.Dex.species.get(p.species).baseStats.spe>=80?'spe':'hp']=points===48?24:32;evs.spd=points-Object.values(evs).reduce((a,b)=>a+b,0);
  return {species:p.species,item:p.item,gigantamax:false,role:p.role,profile:{statSystem:'points',ivs:Object.fromEntries(keys.map(k=>[k,31])),evs,nature:p.nature,ability:p.ability,moves:p.moves,...(p.teraType?{teraType:p.teraType}:{})}};
 });
 t.signature=t.teraType?{rule:'tera',species:t.ace}:null;
 return {id:t.id,name:t.name,generation:9,role:t.category==='hidden'?'champion':t.category==='event'?'villain':t.category,ace:t.ace,signature:t.signature,stage:'leaders-early',allFloors:true,select:true,required:t.entries,selectionRules:{preferredLead:[t.entries[0]],preferredLast:[t.entries[2]]},gimmickEnabled:!!t.signature,concept:t.concept,team};
});
const path='scripts/data/npc/normal-npc-samples.json',source=JSON.parse(readFileSync(path,'utf8'));
source.samples=source.samples.filter((r:any)=>r.generation!==9);source.samples.push(...rows);
writeFileSync(path,JSON.stringify(source,null,2)+'\n');
writeFileSync('scripts/data/npc/paldea-design.json',JSON.stringify({trainers},null,2)+'\n');
console.log(`Reviewed ${trainers.length} Paldea triples; legal abilities, items and moves verified.`);
