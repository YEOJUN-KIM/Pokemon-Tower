import type {SelectionRules} from './npc-selection-rules';
import type {NpcGimmick} from './npc-gimmicks';

export type HoennTrainer={id:string;name:string;category:'gym'|'elite'|'champion'|'grunt'|'executive'|'boss';power:string;ace:string;entries:string[];concept:string;signature:NpcGimmick|null;selectionRules?:SelectionRules;aiCeiling?:'basic'|'tactical'|'expert'};
const mega=(species:string,item:string):NpcGimmick=>({rule:'mega',species,item});
const z=(species:string,item:string):NpcGimmick=>({rule:'z',species,item});
const row=(id:string,name:string,category:HoennTrainer['category'],power:string,ace:string,pool:string,concept:string,signature:NpcGimmick|null=null,selectionRules?:SelectionRules,aiCeiling?:HoennTrainer['aiCeiling']):HoennTrainer=>({id,name,category,power,ace,entries:pool.split(','),concept,signature,selectionRules,aiCeiling});
// Candidate membership is a tower adaptation; provenance and roster substitutions
// are documented in docs/gameplay/hoenn-named-trainers.md. No special encounters.
export const hoennTrainers:HoennTrainer[]=[
 row('named-roxanne','원규','gym','Gym','Probopass','Probopass,Armaldo,Cradily,Aggron,Relicanth,Golem','마비로 속도를 제어하고 바위 물리 공격수로 압박',null,{preferredLead:['Probopass'],atLeastOneOf:['Armaldo','Aggron','Golem']},'tactical'),
 row('named-brawly','철구','gym','Gym','Hariyama','Hariyama,Medicham,Machamp,Breloom,Heracross,Hitmontop','내구형 격투 에이스와 빠른 공격수·선공기',z('Hariyama','Fightinium Z'),{atLeastOneOf:['Medicham','Breloom','Heracross']}),
 row('named-wattson','암페어','gym','Gym','Manectric','Manectric,Magnezone,Electrode,Raichu,Ampharos,Luxray','빠른 특수 압박과 마비·볼트체인지',mega('Manectric','Manectite'),{atLeastOneOf:['Electrode','Raichu'],preferredLead:['Manectric']}),
 row('named-flannery','민지','gym','Gym','Torkoal','Torkoal,Camerupt,Magcargo,Ninetales,Houndoom,Darmanitan','하품·화상과 불꽃 화력, 빠른 파트너',z('Torkoal','Firium Z'),{atLeastOneOf:['Ninetales','Houndoom','Darmanitan']}),
 row('named-norman','종길','gym','Upper Gym','Slaking','Slaking,Spinda,Zangoose,Tauros,Exploud','게으름을 감수하는 정면 화력과 특수·선공기 보완',z('Slaking','Normalium Z'),{required:['Slaking'],atLeastOneOf:['Exploud']}),
 row('named-winona','은송','gym','Upper Gym','Altaria','Altaria,Skarmory,Pelipper,Tropius,Swellow,Dragonite','비행 복합 타입의 내구·속도·강화 분담',mega('Altaria','Altarianite'),{atLeastOneOf:['Swellow','Dragonite']}),
 row('named-tateandliza','풍&란','gym','Upper Gym','Solrock','Solrock,Lunatone,Claydol,Xatu,Gallade,Gardevoir','태양과 달, 느린 트릭룸 축과 독립 공격수',null,{atLeastOneOf:['Solrock','Lunatone'],preferredLead:['Lunatone','Claydol']}),
 row('named-wallace-gym','윤진','gym','Upper Gym','Milotic','Milotic,Walrein,Whiscash,Luvdisc,Crawdaunt,Seaking','회복·상태이상과 안정적인 물 타입 운영',z('Milotic','Waterium Z'),{atLeastOneOf:['Whiscash','Crawdaunt']}),
 row('named-juan','아단','gym','Upper Gym','Kingdra','Kingdra,Walrein,Crawdaunt,Whiscash,Politoed,Lapras','비와 킹드라, 노련한 물 타입 견제',z('Kingdra','Waterium Z'),{required:['Politoed'],preferredLead:['Politoed']}),
 row('named-sidney','혁진','elite','Elite Four','Absol','Scrafty,Shiftry,Zoroark,Sharpedo,Mandibuzz,Absol','악 타입 공격과 교란',mega('Absol','Absolite'),{atLeastOneOf:['Scrafty','Mandibuzz']}),
 row('named-phoebe','회연','elite','Elite Four','Sableye','Banette,Mismagius,Drifblim,Chandelure,Dusknoir,Sableye','화상·회복·교란과 특수 화력',mega('Sableye','Sablenite'),{preferredLead:['Sableye'],atLeastOneOf:['Mismagius','Chandelure']}),
 row('named-glacia','미혜','elite','Elite Four','Glalie','Abomasnow,Beartic,Froslass,Vanilluxe,Walrein,Glalie','얼음 화력과 물·얼음 내구축',mega('Glalie','Glalitite'),{atLeastOneOf:['Walrein','Abomasnow']}),
 row('named-drake','권수','elite','Elite Four+','Salamence','Altaria,Dragalge,Kingdra,Flygon,Haxorus,Salamence','드래곤의 물리·특수 공격 분담',mega('Salamence','Salamencite'),{atLeastOneOf:['Dragalge','Kingdra']}),
 row('named-steven','성호','champion','Champion','Metagross','Skarmory,Claydol,Aggron,Cradily,Armaldo,Metagross','강철·광물·화석의 챔피언',mega('Metagross','Metagrossite'),{atLeastOneOf:['Cradily','Armaldo','Claydol'],preferredLead:['Skarmory','Claydol']}),
 row('named-wallace','윤진','champion','Champion','Milotic','Wailord,Tentacruel,Ludicolo,Whiscash,Gyarados,Milotic','물 타입 챔피언의 회복·흡수·물리 압박',z('Milotic','Waterium Z'),{atLeastOneOf:['Ludicolo','Whiscash']}),
 row('magma-grunt','마그마단 조직원','grunt','Normal / Lower Gym','','Mightyena,Crobat,Camerupt,Weezing,Magcargo','악·독 공용축과 불꽃·땅'),
 row('magma-executive-tabitha','호걸','executive','Upper Gym','Camerupt','Camerupt,Mightyena,Crobat,Weezing,Magcargo','불꽃·땅 압박과 독 타입 보완',null,{preferredLead:['Crobat']}),
 row('magma-executive-courtney','구열','executive','Upper Gym / Lower Elite Four','Camerupt','Camerupt,Mightyena,Crobat,Weezing,Magcargo','메가폭타의 화력과 화상·회복 파트너',mega('Camerupt','Cameruptite'),{preferredLead:['Crobat']}),
 row('magma-boss-maxie','마적','boss','Champion+','Groudon','Groudon,Camerupt,Crobat,Weezing,Mightyena','그란돈과 메가폭타의 땅·불꽃 최종 보스',mega('Camerupt','Cameruptite'),{required:['Groudon'],preferredLead:['Groudon']}),
 row('aqua-grunt','아쿠아단 조직원','grunt','Normal / Lower Gym','','Mightyena,Crobat,Sharpedo,Muk,Wailord','악·독 공용축과 물·악'),
 row('aqua-executive-matt','해조','executive','Upper Gym / Lower Elite Four','Sharpedo','Sharpedo,Mightyena,Crobat,Muk,Crawdaunt','가속 후 메가진화하는 빠른 물·악 압박',mega('Sharpedo','Sharpedonite'),{preferredLast:['Sharpedo']}),
 row('aqua-executive-shelly','이연','executive','Upper Gym','Sharpedo','Sharpedo,Mightyena,Crobat,Muk,Wailord','도발·맹독·하품과 물 타입 운영'),
 row('aqua-boss-archie','아강','boss','Champion+','Kyogre','Kyogre,Sharpedo,Crobat,Muk,Mightyena','가이오가와 메가샤크니아의 물·악 최종 보스',mega('Sharpedo','Sharpedonite'),{required:['Kyogre'],preferredLast:['Sharpedo']}),
];

export function hoennTrainer(id:string){return hoennTrainers.find(row=>row.id===id);}
