import zItems from './z-crystals.json' with {type:'json'};
import megaItems from './mega-items.json' with {type:'json'};
import {additionalHeldItems} from './additional-held-items';
export const baseHeldItems={
  'Red Orb':{name:'주홍구슬',description:'그란돈에게 지니게 하면 등장할 때 원시그란돈으로 원시회귀합니다. 메가진화·혼합 룰에서 팀의 메가진화/다이맥스 공용 사용권을 소비합니다.',price:5000,consumable:false},
  'Blue Orb':{name:'쪽빛구슬',description:'가이오가에게 지니게 하면 등장할 때 원시가이오가로 원시회귀합니다. 메가진화·혼합 룰에서 팀의 메가진화/다이맥스 공용 사용권을 소비합니다.',price:5000,consumable:false},
  'Sitrus Berry':{name:'자뭉열매',description:'배틀마다 1회, HP가 절반 이하가 되면 최대 HP의 1/4을 회복합니다.',price:225,consumable:false},
  Leftovers:{name:'먹다남은음식',description:'매 턴 종료 시 최대 HP의 1/16을 회복합니다.',price:600,consumable:false},
  Charcoal:{name:'목탄',description:'불꽃 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Mystic Water':{name:'신비의물방울',description:'물 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Miracle Seed':{name:'기적의씨',description:'풀 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Silk Scarf':{name:'실크스카프',description:'노말 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  Magnet:{name:'자석',description:'전기 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Never-Melt Ice':{name:'녹지않는얼음',description:'얼음 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Black Belt':{name:'검은띠',description:'격투 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Poison Barb':{name:'독바늘',description:'독 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Soft Sand':{name:'부드러운모래',description:'땅 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Sharp Beak':{name:'예리한부리',description:'비행 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Twisted Spoon':{name:'휘어진스푼',description:'에스퍼 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Silver Powder':{name:'은빛가루',description:'벌레 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Hard Stone':{name:'딱딱한돌',description:'바위 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Spell Tag':{name:'저주의부적',description:'고스트 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Dragon Fang':{name:'용의이빨',description:'드래곤 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Black Glasses':{name:'검은안경',description:'악 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Metal Coat':{name:'금속코트',description:'강철 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Fairy Feather':{name:'요정의깃털',description:'페어리 타입 공격 기술의 위력이 20% 증가합니다.',price:300,consumable:false},
  'Life Orb':{name:'생명의구슬',description:'공격 기술의 위력이 30% 증가하지만, 공격 후 최대 HP의 1/10을 잃습니다.',price:1350,consumable:false},
  'Choice Band':{name:'구애머리띠',description:'공격이 50% 증가하지만, 교체하기 전까지 처음 고른 기술만 사용할 수 있습니다.',price:1350,consumable:false},
  'Choice Specs':{name:'구애안경',description:'특수공격이 50% 증가하지만, 교체하기 전까지 처음 고른 기술만 사용할 수 있습니다.',price:1350,consumable:false},
  'Choice Scarf':{name:'구애스카프',description:'스피드가 50% 증가하지만, 교체하기 전까지 처음 고른 기술만 사용할 수 있습니다.',price:1350,consumable:false},
  'Expert Belt':{name:'달인의띠',description:'효과가 굉장한 공격 기술의 위력이 20% 증가합니다.',price:900,consumable:false},
  'Muscle Band':{name:'힘의머리띠',description:'물리 공격 기술의 위력이 10% 증가합니다.',price:600,consumable:false},
  'Wise Glasses':{name:'박식안경',description:'특수 공격 기술의 위력이 10% 증가합니다.',price:600,consumable:false},
  'Focus Sash':{name:'기합의띠',description:'HP가 가득 찼을 때 쓰러질 공격을 받아도 HP 1로 버팁니다. 배틀마다 1회 발동합니다.',price:1350,consumable:false},
  'Assault Vest':{name:'돌격조끼',description:'특수방어가 50% 증가하지만 변화 기술을 사용할 수 없습니다.',price:1350,consumable:false},
  'Rocky Helmet':{name:'울퉁불퉁멧',description:'접촉 공격을 받으면 상대 최대 HP의 1/6만큼 피해를 줍니다.',price:900,consumable:false},
  Eviolite:{name:'진화의휘석',description:'아직 진화할 수 있는 포켓몬의 방어와 특수방어가 50% 증가합니다.',price:1350,consumable:false},
  'Heavy-Duty Boots':{name:'통굽부츠',description:'등장할 때 스텔스록·압정·독압정·끈적끈적네트의 효과를 받지 않습니다.',price:900,consumable:false},
  'Wide Lens':{name:'광각렌즈',description:'기술의 명중률이 기존 명중률의 1.1배가 됩니다.',price:600,consumable:false},
  'Scope Lens':{name:'초점렌즈',description:'급소에 맞힐 확률의 랭크가 1단계 올라갑니다.',price:600,consumable:false},
  'Light Clay':{name:'빛의점토',description:'리플렉터·빛의장막·오로라베일의 지속 시간을 5턴에서 8턴으로 늘립니다.',price:900,consumable:false},
  ...additionalHeldItems,
} as const;
export const heldItems={...baseHeldItems,...megaItems,...zItems,'Dynamax Band':{name:'다이맥스밴드',description:'트레이너가 보유하면 팀의 포켓몬 한 마리가 배틀당 한 번, 3턴 동안 다이맥스할 수 있습니다.',price:5000,consumable:false},'Tera Orb':{name:'테라스탈오브',description:'트레이너가 보유하면 팀의 포켓몬 한 마리가 배틀당 한 번 테라스탈할 수 있습니다.',price:5000,consumable:false}} as const;
export type HeldItem=keyof typeof heldItems;
export const heldItemKeys=Object.keys(heldItems) as HeldItem[];
const heldItemsById=new Map(heldItemKeys.map(item=>[item.toLowerCase().replace(/[^a-z0-9]/g,''),item]));
export function normalizeHeldItem(value:string){return heldItemsById.get(value.toLowerCase().replace(/[^a-z0-9]/g,''))??null;}
export function itemIcon(item:HeldItem){return item.toLowerCase().replaceAll(' ','-');}
export function isHeldItem(value:unknown):value is HeldItem{return typeof value==='string' && Object.hasOwn(heldItems,value);}
export const npcItemNames:Record<string,string>={'Thick Club':'굵은뼈','Red Orb':'주홍구슬','Light Ball':'전기구슬','Flame Orb':'화염구슬','Toxic Orb':'맹독구슬','Black Sludge':'검은진흙','Lum Berry':'리샘열매','Wacan Berry':'초나열매'};
export function itemName(value?:string|null){const item=value?normalizeHeldItem(value):null;return item ? heldItems[item].name : value ? npcItemNames[value] ?? value : '없음';}

export function itemIconExtension(item:string){return ['Fairy Feather','Heavy-Duty Boots','Golisopite'].includes(item) ? 'svg' : 'png';}
