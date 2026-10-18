import type {SelectionRules} from './npc-selection-rules';

export type SinnohTrainer={id:string;name:string;category:'gym'|'elite'|'champion'|'grunt'|'executive'|'boss';power:string;ace:string;entries:string[];concept:string;signature:null;selectionRules?:SelectionRules;aiCeiling:'tactical'|'expert'};
const row=(id:string,name:string,category:SinnohTrainer['category'],power:string,ace:string,pool:string,concept:string,selectionRules?:SelectionRules):SinnohTrainer=>({id,name,category,power,ace,entries:pool.split(','),concept,signature:null,selectionRules,aiCeiling:category==='champion'||category==='boss'?'expert':'tactical'});
// Modern tower sets; provenance and intentional adaptations are documented separately.
export const sinnohTrainers:SinnohTrainer[]=[
 row('named-roark','강석','gym','Gym','Rampardos','Rampardos,Probopass,Golem,Aerodactyl,Tyranitar,Archeops','직선적인 바위 물리 화력과 브레이커',{preferredLead:['Rampardos']}),
 row('named-gardenia','유채','gym','Gym','Roserade','Roserade,Torterra,Breloom,Tangrowth,Cherrim,Leafeon','풀의 수면·회복·지속전과 공격수'),
 row('named-maylene','자두','gym','Gym','Lucario','Lucario,Machamp,Medicham,Gallade,Toxicroak,Infernape','빠른 물리 압박과 선공기'),
 row('named-crasherwake','맥실러','gym','Gym','Floatzel','Floatzel,Gyarados,Quagsire,Ludicolo,Empoleon,Swampert','빠르고 공격적인 물 타입'),
 row('named-fantina','멜리사','gym','Upper Gym','Mismagius','Mismagius,Gengar,Drifblim,Dusknoir,Spiritomb,Chandelure','고스트 교란·화상·특수 압박'),
 row('named-byron','동관','gym','Upper Gym','Bastiodon','Bastiodon,Steelix,Magnezone,Aggron,Forretress,Excadrill','느리고 단단한 강철 방어전'),
 row('named-candice','무청','gym','Upper Gym','Froslass','Froslass,Abomasnow,Weavile,Mamoswine,Glaceon,Walrein','눈과 빠른 얼음 압박'),
 row('named-volkner','전진','gym','Upper Gym','Electivire','Electivire,Luxray,Raichu,Jolteon,Rotom,Magnezone','빠른 전기와 넓은 견제'),
 row('named-aaron','충호','elite','Elite Four','Drapion','Drapion,Heracross,Scizor,Yanmega,Vespiquen,Beautifly','벌레 공격과 다양한 역할, 원작 드래피온'),
 row('named-bertha','들국화','elite','Elite Four','Hippowdon','Hippowdon,Gliscor,Rhyperior,Whiscash,Golem,Nidoking','땅 내구·모래·물리와 특수 공격'),
 row('named-flint','대엽','elite','Elite Four','Infernape','Infernape,Magmortar,Rapidash,Houndoom,Flareon,Arcanine','불꽃 화력과 선공기'),
 row('named-lucian','오엽','elite','Elite Four','Bronzong','Bronzong,Alakazam,Espeon,Gallade,Mr. Mime,Slowbro','에스퍼 특수전·상태 제어·회복'),
 row('named-cynthia','난천','champion','Champion','Garchomp','Spiritomb,Roserade,Gastrodon,Lucario,Milotic,Garchomp','원작 여섯 파트너의 완성도'),
 row('galactic-grunt','갤럭시단 조직원','grunt','Normal / Lower Gym','','Crobat,Skuntank,Purugly,Bronzong,Toxicroak,Alakazam','조직 공용 독·강철·에스퍼'),
 row('galactic-executive-mars','마스','executive','Upper Gym / Lower Elite Four','Purugly','Purugly,Crobat,Bronzong,Raichu,Espeon,Togekiss','몬냥이 중심 빠른 물리·교란'),
 row('galactic-executive-jupiter','주피터','executive','Upper Gym / Lower Elite Four','Skuntank','Skuntank,Crobat,Bronzong,Toxicroak,Gengar,Tangrowth','독·악 공격 압박'),
 row('galactic-executive-saturn','새턴','executive','Upper Gym / Lower Elite Four','Toxicroak','Toxicroak,Crobat,Bronzong,Alakazam,Skuntank,Sharpedo','독개굴과 에스퍼·특수 운영'),
 row('galactic-boss-cyrus','태홍','boss','Champion+','Dialga','Weavile,Crobat,Honchkrow,Houndoom,Gyarados,Dialga','디아루가와 원작 악·비행 최종 보스'),
];
export const sinnohTrainer=(id:string)=>sinnohTrainers.find(t=>t.id===id);
