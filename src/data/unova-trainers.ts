import type {SelectionRules} from './npc-selection-rules';
import type {TrainerTactic} from './trainer-catalog';

export type UnovaTrainer={id:string;name:string;category:'gym'|'elite'|'veteran'|'champion'|'grunt'|'executive'|'boss'|'hidden';power:string;ace:string;entries:string[];concept:string;tactic:TrainerTactic;aiCeiling:'tactical'|'expert';signature:null;selectionRules?:SelectionRules};
const row=(id:string,name:string,category:UnovaTrainer['category'],power:string,ace:string,pool:string,concept:string,tactic:TrainerTactic,aiCeiling:UnovaTrainer['aiCeiling']='tactical'):UnovaTrainer=>({id,name,category,power,ace,entries:pool.split(','),concept,tactic,aiCeiling,signature:null});
export const unovaTrainers:UnovaTrainer[]=[
 row('named-cilan','덴트','gym','Gym','Simisage','Simisage,Ferrothorn,Lilligant,Whimsicott,Leavanny,Amoonguss','풀 회복·씨뿌리기와 지속 압박','status'),
 row('named-chili','팟','gym','Gym','Simisear','Simisear,Darmanitan,Chandelure,Arcanine,Heatmor,Emboar','빠르고 직선적인 불꽃 화력','physical'),
 row('named-cress','콘','gym','Gym','Simipour','Simipour,Jellicent,Carracosta,Seismitoad,Samurott,Basculin','빠른 물 공격과 내구·회복의 균형','balanced'),
 row('named-lenora','알로에','gym','Gym','Watchog','Watchog,Bouffalant,Cinccino,Stoutland,Sawsbuck,Braviary','노말 기본기와 정면 승부','physical'),
 row('named-burgh','아티','gym','Gym','Leavanny','Leavanny,Crustle,Escavalier,Accelgor,Galvantula,Heracross','다양한 벌레 복합 타입과 물리·특수 분담','setup'),
 row('named-elesa','카밀레','gym','Upper Gym','Zebstrika','Zebstrika,Emolga,Galvantula,Eelektross,Ampharos,Magnezone','빠른 전기 피벗과 땅 견제','speed'),
 row('named-clay','야콘','gym','Upper Gym','Excadrill','Excadrill,Krookodile,Seismitoad,Golurk,Mamoswine,Hippowdon','묵직한 땅 물리전과 내구','physical'),
 row('named-skyla','풍란','gym','Upper Gym','Swanna','Swanna,Unfezant,Skarmory,Archeops,Braviary,Mandibuzz','빠른 비행과 내구형 비행의 타입 분담','speed'),
 row('named-brycen','담죽','gym','Upper Gym','Beartic','Beartic,Cryogonal,Vanilluxe,Weavile,Mamoswine,Walrein','얼음 내구와 물리·특수·선공기','bulk'),
 row('named-drayden','사간','gym','Upper Gym','Haxorus','Haxorus,Druddigon,Hydreigon,Flygon,Altaria,Salamence','정면 승부형 드래곤','physical'),
 row('named-cheren','체렌','gym','Gym','Stoutland','Stoutland,Cinccino,Bouffalant,Braviary,Sawsbuck,Snorlax','안정적인 노말 정석 전투','balanced'),
 row('named-roxie','보미카','gym','Gym','Scolipede','Scolipede,Garbodor,Toxicroak,Crobat,Drapion,Amoonguss','빠른 독 공격과 거친 상태 압박','status'),
 row('named-marlon','시즈','gym','Upper Gym','Jellicent','Jellicent,Carracosta,Wailord,Floatzel,Mantine,Samurott','자유로운 물 공격과 회복','balanced'),
 row('named-shauntal','망초','elite','Elite Four','Chandelure','Chandelure,Cofagrigus,Golurk,Jellicent,Drifblim,Froslass','고스트 특수 압박과 화상·교란','special'),
 row('named-marshal','연무','elite','Elite Four','Conkeldurr','Conkeldurr,Mienshao,Throh,Sawk,Lucario,Machamp','격투 물리 압박과 선공기·피벗','physical'),
 row('named-grimsley','블래리','elite','Elite Four','Krookodile','Krookodile,Scrafty,Kingambit,Liepard,Sharpedo,Honchkrow','악 속임수·우선기·빠른 압박','speed'),
 row('named-caitlin','카틀레야','elite','Elite Four','Gothitelle','Gothitelle,Reuniclus,Sigilyph,Musharna,Metagross,Alakazam','에스퍼 특수전과 회복·상태 운영','special'),
 row('named-alder','노간주','veteran','Elite Four+','Volcarona','Volcarona,Accelgor,Escavalier,Bouffalant,Druddigon,Vanilluxe','공식 여섯 동료와 불카모스 중심 베테랑','setup'),
 row('named-iris','아이리스','champion','Champion','Haxorus','Haxorus,Hydreigon,Druddigon,Archeops,Lapras,Aggron','드래곤과 다양한 타입의 공식 챔피언 팀','balanced','expert'),
 row('plasma-grunt','플라스마단 조직원','grunt','Normal / Lower Gym','','Watchog,Liepard,Garbodor,Krookodile,Scrafty,Crobat','노말·악·독 조직 공용 파티','status'),
 row('plasma-executive-zinzolin','비오','executive','Upper Gym / Lower Elite Four','Cryogonal','Cryogonal,Weavile,Mamoswine,Vanilluxe,Walrein,Krookodile','얼음·악 간부 운영과 특수 회복','bulk'),
 row('plasma-executive-colress','아크로마','executive','Elite Four / Lower Champion','Klinklang','Klinklang,Magnezone,Metagross,Rotom,Beheeyem,Porygon-Z','기계·강철과 전기·에스퍼 특수전','special','expert'),
 row('plasma-boss-ghetsis','게치스','boss','Champion+','Hydreigon','Hydreigon,Cofagrigus,Eelektross,Seismitoad,Kingambit,Bouffalant','전설 없이 강압적인 혼합 견제','balanced','expert'),
 row('named-n','N','hidden','Hidden Boss / Champion+','Zekrom','Zekrom,Carracosta,Archeops,Vanilluxe,Klinklang,Zoroark','전설과 하나 동료의 상징적인 히든 조우','balanced','expert'),
];
export const unovaTrainer=(id:string)=>unovaTrainers.find(t=>t.id===id);

