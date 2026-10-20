import {moveTypeNames} from './move-info';
// Shared by equipment, shops and future reward/event adapters. No simulator dependency.
export type FormEquipment={name:string;description:string;price:number;consumable:false;species:string;forme?:string;ability?:string;type?:string};
const names:Record<string,string>={Zacian:'자시안',Zamazenta:'자마젠타',Ogerpon:'오거폰',Arceus:'아르세우스',Silvally:'실버디',Genesect:'게노세크트'};
const equipment=(name:string,species:string,forme:string,price:number,ability?:string,type?:string):FormEquipment=>({name,species,forme,price,ability,type,consumable:false,description:`${names[species]??species}에게 지니게 하면 ${forme} 모습이 됩니다. 대응 포켓몬이 지니면 빼앗기거나 교환·제거되지 않습니다.`});
export const plateTypes={
 'Flame Plate':['Fire','불구슬플레이트'], 'Splash Plate':['Water','물방울플레이트'], 'Zap Plate':['Electric','우뢰플레이트'], 'Meadow Plate':['Grass','초록플레이트'], 'Icicle Plate':['Ice','고드름플레이트'], 'Fist Plate':['Fighting','주먹플레이트'], 'Toxic Plate':['Poison','맹독플레이트'], 'Earth Plate':['Ground','대지플레이트'], 'Sky Plate':['Flying','푸른하늘플레이트'], 'Mind Plate':['Psychic','이상한플레이트'], 'Insect Plate':['Bug','비단벌레플레이트'], 'Stone Plate':['Rock','암석플레이트'], 'Spooky Plate':['Ghost','원령플레이트'], 'Draco Plate':['Dragon','용의플레이트'], 'Dread Plate':['Dark','공포플레이트'], 'Iron Plate':['Steel','강철플레이트'], 'Pixie Plate':['Fairy','정령플레이트'],
} as const;
const typeLabels:Record<string,string>={Fire:'파이어',Water:'워터',Electric:'일렉트릭',Grass:'그래스',Ice:'아이스',Fighting:'파이팅',Poison:'포이즌',Ground:'그라운드',Flying:'플라잉',Psychic:'사이킥',Bug:'버그',Rock:'록',Ghost:'고스트',Dragon:'드래곤',Dark:'다크',Steel:'스틸',Fairy:'페어리'};
export const formItems:Record<string,FormEquipment>={
 'Rusted Sword':equipment('녹슨검','Zacian','Zacian-Crowned',5000,'Intrepid Sword'),
 'Rusted Shield':equipment('녹슨방패','Zamazenta','Zamazenta-Crowned',5000,'Dauntless Shield'),
 'Wellspring Mask':equipment('우물의가면','Ogerpon','Ogerpon-Wellspring',5000,'Water Absorb','Water'),
 'Hearthflame Mask':equipment('화덕의가면','Ogerpon','Ogerpon-Hearthflame',5000,'Mold Breaker','Fire'),
 'Cornerstone Mask':equipment('주춧돌의가면','Ogerpon','Ogerpon-Cornerstone',5000,'Sturdy','Rock'),
 ...Object.fromEntries(Object.entries(plateTypes).map(([item,[type,name]])=>[item,equipment(name,'Arceus',`Arceus-${type}`,3000,'Multitype')])),
 ...Object.fromEntries(Object.values(plateTypes).map(([type])=>[`${type} Memory`,equipment(`${typeLabels[type]}메모리`,'Silvally',`Silvally-${type}`,3000,'RKS System')])),
 ...Object.fromEntries([['Burn','블레이즈'],['Chill','프리즈'],['Douse','아쿠아'],['Shock','라이트닝']].map(([drive,name])=>[`${drive} Drive`,equipment(`${name}카세트`,'Genesect',`Genesect-${drive}`,3000,'Download')])),
 'Ultranecrozium Z':{name:'울트라네크로Z',species:'Necrozma',price:5000,consumable:false,description:'황혼의 갈기·새벽의 날개 네크로즈마에게 지니게 하면 울트라버스트를 사용할 수 있습니다. 울트라네크로즈마는 포톤가이저를 전용 Z기술로 강화할 수 있습니다.'},
};
export const equipmentFormSpecies=new Set(['Zacian','Zamazenta','Ogerpon','Arceus','Silvally','Genesect']);
export function formItemFor(species:string){return Object.entries(formItems).find(([,i])=>i.forme===species)?.[0];}
export function equipmentBase(species:string){return formItems[formItemFor(species)??'']?.species??species;}
export function heldForm(species:string,item?:string|null){const base=equipmentBase(species),data=formItems[item??''];return data?.species===base&&data.forme?data.forme:base;}
export function canEquipFormItem(species:string,item:string,forme?:string){const data=formItems[item];if(!data)return true;const effective=forme??species;if(item==='Ultranecrozium Z')return ['Necrozma-Dusk-Mane','Necrozma-Dawn-Wings'].includes(effective);return equipmentBase(species)===data.species;}
// Origin forms retain their existing directly selected, fixed-item policy.
export function hasFixedFormItem(species:string,requiredItem?:string){return !!requiredItem&&!equipmentFormSpecies.has(equipmentBase(species));}

// Shared descriptions are presentation only. The simulator remains the rules owner.
for(const [item,info] of Object.entries(formItems)){
 const type=info.type??Object.values(plateTypes).find(([type])=>info.forme===`${info.species}-${type}`)?.[0];
 const label=type?moveTypeNames[type]??type:'';
 const effect=info.species==='Arceus'?`아르세우스를 ${label} 타입으로 바꾸고 심판의뭉치를 ${label} 타입으로 만든다. ${label} 타입 기술의 위력이 20% 증가한다.`:info.species==='Silvally'?`실버디를 ${label} 타입으로 바꾸고 멀티어택을 ${label} 타입으로 만든다.`:info.species==='Genesect'?`게노세크트의 테크노버스터를 ${moveTypeNames[({Burn:'Fire',Chill:'Ice',Douse:'Water',Shock:'Electric'} as Record<string,string>)[item.split(' ')[0]]]} 타입으로 만든다.`:info.species==='Ogerpon'?`오거폰을 ${info.name} 모습으로 바꾸고 덩굴방망이를 ${label} 타입으로 만든다. 공격 기술의 위력이 20% 증가한다.`:info.species==='Zacian'?'자시안을 검왕의 모습으로 바꾸고 아이언헤드를 거수참으로 만든다.':info.species==='Zamazenta'?'자마젠타를 방패왕의 모습으로 바꾸고 아이언헤드를 거수탄으로 만든다.':null;
 if(effect)info.description=`${effect} 대응 포켓몬이 지니면 빼앗기거나 교환·제거되지 않는다.`;
}
