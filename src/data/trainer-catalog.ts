import {johtoReferences} from './johto-builds';
import {regionalTrainerSamples} from './regional-trainers';
import type {BossView} from '../shared/contracts';
import {namedTrainerIntro} from './named-trainer-intros';
export type TrainerTactic='balanced'|'physical'|'special'|'speed'|'status'|'setup'|'bulk';
export type TrainerSample={aiCeiling?:import('./npc-ai').NpcAiTier;id:string;name:string;title:string;kind:'normal'|'elite'|'named';npcRank?:import('./npc-ranks').NpcRank;generation:number|null;specialty:string|null;tactic:TrainerTactic;portrait:string;role?:BossView['role'];minFloor:number;entries?:readonly string[];ace?:string;concept:string};

const types=[
  ['Normal','반바지 소년','youngster-gen4','balanced','다양한 공격과 무난한 내구'],
  ['Fire','불꽃 조련사','firebreather-gen4','special','강한 불꽃 공격과 보조 견제'],
  ['Water','낚시꾼','fisherman-gen4','bulk','물 타입의 내구와 안정적인 공격'],
  ['Electric','전기 기술자','guitarist-gen4','speed','빠른 전기 공격과 마비'],
  ['Grass','정원사','aromalady-gen4','status','풀 공격과 씨뿌리기·상태이상'],
  ['Ice','스키 선수','skier-gen4','special','얼음 공격으로 약점 공략'],
  ['Fighting','태권왕','blackbelt-gen4','physical','정면에서 강한 물리 공격'],
  ['Poison','독 연구원','scientist-gen4','status','독 타입 공격과 상태이상'],
  ['Ground','유적 탐험가','ruinmaniac-gen4','physical','땅 공격과 단단한 물리 파티'],
  ['Flying','새 조련사','birdkeeper-gen4','speed','빠른 비행 공격과 견제'],
  ['Psychic','초능력자','psychic-gen4','special','특수 공격 중심의 파티'],
  ['Bug','곤충 수집가','bugcatcher-gen4','setup','벌레 공격과 능력치 강화'],
  ['Rock','등산가','hiker-gen4','bulk','바위 공격과 단단한 방어'],
  ['Ghost','영매','channeler-gen3','status','고스트 공격과 교란'],
  ['Dragon','드래곤 조련사','dragon-tamer-gen4','setup','드래곤 공격과 능력치 강화'],
  ['Dark','밤의 승부사','roughneck-gen4','physical','악 타입 공격과 보조 견제'],
  ['Steel','강철 기술자','worker-gen4','bulk','저항이 많은 파티와 안정적인 공격'],
  ['Fairy','동화 소녀','fairytalegirl','special','페어리 공격과 특수 견제'],
] as const;
export const normalTrainerSamples:TrainerSample[]=types.map(([specialty,name,portrait,tactic,concept])=>({id:`normal-${specialty.toLowerCase()}`,name,title:'',kind:'normal',generation:null,specialty,tactic,portrait,minFloor:1,concept}));
export const eliteTrainerSamples:TrainerSample[]=types.map(([specialty,,,,concept],i)=>({id:`elite-${specialty.toLowerCase()}`,name:normalTrainerSamples[i].name,title:'엘리트 트레이너',kind:'elite',generation:null,specialty,tactic:i%3===0 ? 'setup' : i%3===1 ? 'status' : 'balanced',portrait:'acetrainer-gen4',role:'elite',minFloor:4,concept:`${concept}; 강화·상태이상·견제를 추가한 구성`}));
export const mixedTrainerSamples:TrainerSample[]=[
  {id:'normal-mixed',name:'여행 트레이너',title:'',kind:'normal',generation:null,specialty:null,tactic:'balanced',portrait:'youngster-gen4',minFloor:1,concept:'서로 다른 타입을 섞어 약점을 보완'},
  {id:'elite-rush',name:'속공 전문가',title:'엘리트 트레이너',kind:'elite',generation:null,specialty:null,tactic:'speed',portrait:'acetrainer-gen4',role:'elite',minFloor:4,concept:'빠른 포켓몬과 선공 기술을 선호'},
  {id:'elite-endurance',name:'내구 전문가',title:'엘리트 트레이너',kind:'elite',generation:null,specialty:null,tactic:'bulk',portrait:'acetrainer-gen4',role:'elite',minFloor:4,concept:'내구가 높은 포켓몬과 회복 기술을 선호'},
];
function named(generation:number,id:string,name:string,role:NonNullable<BossView['role']>,specialty:string|null,tactic:TrainerTactic,entries:readonly string[],concept:string,portrait=id,aiCeiling:TrainerSample['aiCeiling']=role==='villain'?'expert':undefined):TrainerSample {
  return {...(aiCeiling?{aiCeiling}:{}),id:`named-${id}`,name,title:role==='gym' ? (id==='kiawe' ? '캡틴' : '체육관 관장') : role==='champion' ? (id==='kukui' ? '리그 최종 상대' : '챔피언') : '악당조직',kind:'named',generation,specialty,tactic,portrait,role,minFloor:role==='gym' ? 5 : role==='champion' ? 10 : 8,entries,concept};
}
// Candidate entries inspired by each trainer's theme, not exact original-game parties.
// Keep the ace and choose two partners; Pokémon generations are unrestricted.
export const namedTrainerSamples:TrainerSample[]=[
  named(1,'brock','웅','gym','Rock','bulk',['Golem','Sudowoodo','Tyranitar','Kabutops','Omastar','Aerodactyl'],'바위와 물리 내구'),
  named(1,'giovanni','비주기','villain','Ground','physical',['Persian','Nidoking','Rhyperior','Nidoqueen','Dugtrio','Kangaskhan'],'대표 페르시온과 땅 공격'),
  named(1,'blue','그린','champion',null,'balanced',['Pidgeot','Alakazam','Arcanine','Blastoise','Exeggutor','Machamp'],'다양한 타입과 공격 방식'),
  named(2,'falkner','비상','gym','Flying','speed',['Pidgeot','Noctowl','Skarmory','Swellow','Xatu','Honchkrow'],'비행 파티의 속도와 방어'),
  named(2,'archer','아폴로','villain',null,'status',['Houndoom','Golbat','Weezing','Muk','Crobat','Raticate'],'로켓단의 악·독 조합','archer','tactical'),
  named(2,'lance','목호','champion',null,'physical',['Dragonite','Gyarados','Charizard','Aerodactyl','Kingdra','Salamence'],'강한 드래곤과 비행 파트너'),
  named(3,'flannery','민지','gym','Fire','special',['Torkoal','Camerupt','Blaziken','Magcargo','Ninetales','Rapidash'],'느린 불꽃과 빠른 공격수'),
  named(3,'maxie','마적','villain',null,'physical',['Camerupt','Mightyena','Crobat','Weezing','Solrock','Claydol'],'마그마단의 땅·악·비행'),
  named(3,'steven','성호','champion','Steel','bulk',['Metagross','Skarmory','Aggron','Cradily','Armaldo','Claydol'],'강철 내구와 물리 공격'),
  named(4,'volkner','전진','gym','Electric','speed',['Luxray','Raichu','Electivire','Jolteon','Lanturn','Rotom'],'전기 공격과 넓은 견제'),
  named(4,'cyrus','태홍','villain',null,'physical',['Weavile','Honchkrow','Crobat','Gyarados','Houndoom','Magnezone'],'빠른 악·비행 공격'),
  named(4,'cynthia','난천','champion',null,'balanced',['Garchomp','Togekiss','Spiritomb','Lucario','Milotic','Roserade'],'다양한 타입의 빈틈 적은 파티'),
  named(5,'elesa','카밀레','gym','Electric','speed',['Zebstrika','Emolga','Galvantula','Ampharos','Rotom','Eelektross'],'빠른 전기 파티'),
  named(5,'ghetsis','게치스','villain',null,'status',['Hydreigon','Cofagrigus','Eelektross','Seismitoad','Bisharp','Drapion'],'공격과 교란을 섞은 파티'),
  named(5,'alder','노간주','champion',null,'setup',['Volcarona','Escavalier','Bouffalant','Accelgor','Druddigon','Vanilluxe'],'강화형 특수 공격과 물리 파트너'),
  named(6,'valerie','마슈','gym','Fairy','special',['Sylveon','Mr. Mime','Mawile','Clefable','Azumarill','Togekiss'],'페어리 특수 공격과 강철 보완'),
  named(6,'lysandre','플라드리','villain',null,'physical',['Pyroar','Gyarados','Honchkrow','Mienshao','Houndoom','Toxicroak'],'불꽃과 강한 물리 공격수'),
  named(6,'diantha','카르네','champion',null,'special',['Gardevoir','Aurorus','Hawlucha','Goodra','Gourgeist','Tyrantrum'],'특수 공격과 빠른 물리 공격'),
  named(7,'kiawe','키아웨','gym','Fire','physical',['Salazzle','Turtonator','Arcanine','Marowak','Talonflame','Magmortar'],'알로라의 불꽃 파트너'),
  named(7,'lusamine','루자미네','villain',null,'bulk',['Clefable','Lilligant','Bewear','Milotic','Mismagius','Tsareena'],'부드러운 외형과 강한 내구'),
  named(7,'kukui','쿠쿠이','champion',null,'balanced',['Incineroar','Lycanroc','Ninetales','Braviary','Magnezone','Snorlax'],'알로라 리그의 혼합 파티'),
  named(8,'nessa','야청','gym','Water','physical',['Drednaw','Golisopod','Barraskewda','Pelipper','Seaking','Toxapex'],'물 타입의 속도와 물리 공격'),
  named(8,'rose','로즈','villain','Steel','bulk',['Copperajah','Ferrothorn','Perrserker','Escavalier','Klinklang','Magnezone'],'강철 파티와 높은 내구'),
  named(8,'leon','단델','champion',null,'balanced',['Charizard','Dragapult','Aegislash','Haxorus','Rillaboom','Seismitoad'],'리자몽을 중심으로 한 혼합 파티'),
  named(9,'iono','모야모','gym','Electric','special',['Bellibolt','Kilowattrel','Mismagius','Luxray','Electrode','Eelektross'],'전기 파티와 대표 무우마직'),
  named(9,'giacomo','피냐','villain','Dark','physical',['Kingambit','Honchkrow','Krookodile','Mabosstiff','Weavile','Umbreon'],'스타단 악 타입 파티','giacomo','tactical'),
  named(9,'geeta','테사','champion',null,'balanced',['Glimmora','Kingambit','Espathra','Avalugg','Veluza','Gogoat'],'팔데아 대표 포켓몬의 혼합 파티'),
];
export const legacyNamedTrainerSamples=[...namedTrainerSamples];
// Johto theme additions; Pokémon generations remain unrestricted.
namedTrainerSamples.push(
  named(2,'bugsy','호일','gym','Bug','physical',['Scizor','Heracross','Pinsir','Yanmega','Forretress','Beedrill'],'벌레의 공격과 내구'),
  named(2,'whitney','꼭두','gym','Normal','bulk',['Miltank','Snorlax','Blissey','Tauros','Porygon-Z','Lopunny'],'노말 내구와 공격'),
  named(2,'morty','유빈','gym','Ghost','status',['Gengar','Mismagius','Dusknoir','Banette','Spiritomb','Chandelure'],'고스트 견제와 상태이상'),
  named(2,'chuck','사도','gym','Fighting','physical',['Poliwrath','Machamp','Hitmonlee','Hitmonchan','Conkeldurr','Lucario'],'격투 물리 공격'),
  named(2,'jasmine','규리','gym','Steel','bulk',['Steelix','Scizor','Skarmory','Magnezone','Metagross','Bronzong'],'강철 방어와 반격'),
  named(2,'pryce','류옹','gym','Ice','balanced',['Mamoswine','Lapras','Dewgong','Glalie','Weavile','Froslass'],'얼음 공격과 다양한 견제'),
  named(2,'clair','이향','gym','Dragon','balanced',['Kingdra','Dragonite','Salamence','Flygon','Haxorus','Dragalge'],'드래곤 혼합 공격'),
  {...named(2,'will','일목','elite','Psychic','special',['Xatu','Espeon','Slowking','Exeggutor','Jynx','Alakazam'],'에스퍼 특수 공격'),title:'사천왕'},
  {...named(2,'koga','독수','elite','Poison','status',['Crobat','Venomoth','Muk','Weezing','Ariados','Toxicroak'],'독 상태이상과 견제'),title:'사천왕'},
  {...named(2,'bruno','시바','elite','Fighting','physical',['Machamp','Hitmonlee','Hitmonchan','Hitmontop','Steelix','Hariyama'],'격투 공격과 바위·강철 보완'),title:'사천왕'},
  {...named(2,'karen','카렌','elite','Dark','balanced',['Umbreon','Houndoom','Honchkrow','Weavile','Absol','Spiritomb'],'악 타입의 공격과 내구'),title:'사천왕'},
  named(2,'red','레드','champion',null,'balanced',['Pikachu','Espeon','Snorlax','Venusaur','Charizard','Blastoise'],'2세대 테마의 최종 혼합 파티'),
);
const signatureSpecies:Record<string,string>={lance:'Dragonite',volkner:'Electivire',kiawe:'Marowak',giovanni:'Nidoking',bugsy:'Scizor',pryce:'Mamoswine',clair:'Kingdra',chuck:'Poliwrath',jasmine:'Steelix',whitney:'Miltank',morty:'Gengar',falkner:'Pidgeot',koga:'Crobat',bruno:'Machamp',karen:'Umbreon',will:'Xatu'};
for(const sample of namedTrainerSamples){
  const reference=johtoReferences[sample.id.slice(6)];
  if(reference)sample.entries=[...new Set(reference.sets.map(set=>set.species))];
  sample.ace=signatureSpecies[sample.id.slice(6)] ?? sample.entries![0];
  if(!sample.entries!.includes(sample.ace))sample.entries=[sample.ace,...sample.entries!.slice(1)];
}
namedTrainerSamples.push(...regionalTrainerSamples);
export const trainerCatalog=[...normalTrainerSamples,...eliteTrainerSamples,...mixedTrainerSamples,...namedTrainerSamples];
export function trainerView(sample:TrainerSample):BossView {
  return {...(sample.aiCeiling?{aiCeiling:sample.aiCeiling}:{}),id:sample.id,name:sample.name,title:sample.title,introduction:sample.kind==='named'?namedTrainerIntro(sample.id):'',victory:'',defeat:'',...(sample.role ? {role:sample.role} : {}),...(sample.npcRank?{npcRank:sample.npcRank}:{}),portrait:sample.portrait,kind:sample.kind,generation:sample.generation,specialty:sample.specialty};
}
