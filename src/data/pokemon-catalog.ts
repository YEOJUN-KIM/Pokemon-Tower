import megaForms from './mega-forms.json' with {type:'json'};
import gigantamaxForms from './gigantamax-forms.json' with {type:'json'};
import forms from './battle-forms.json' with {type:'json'};
import nationalDex from './pokedex.json' with {type:'json'};
import {selectableForms} from './selectable-forms';
import {moveTypeNames} from './move-info';

const legacySpecies: Record<string, {id: number; name: string; types: string[]; color: string}> = {
  Charizard: {id: 6, name: '리자몽', types: ['불꽃', '비행'], color: 'fire'},
  Blastoise: {id: 9, name: '거북왕', types: ['물'], color: 'water'},
  Venusaur: {id: 3, name: '이상해꽃', types: ['풀', '독'], color: 'grass'},
  Pikachu: {id: 25, name: '피카츄', types: ['전기'], color: 'electric'},
  Gyarados: {id: 130, name: '갸라도스', types: ['물', '비행'], color: 'water'},
  Snorlax: {id: 143, name: '잠만보', types: ['노말'], color: 'normal'},
  Arcanine: {id: 59, name: '윈디', types: ['불꽃'], color: 'fire'},
  Raichu: {id: 26, name: '라이츄', types: ['전기'], color: 'electric'},
  Cloyster: {id: 91, name: '파르셀', types: ['물', '얼음'], color: 'ice'},
  Espeon: {id: 196, name: '에브이', types: ['에스퍼'], color: 'psychic'},
  Gengar: {id: 94, name: '팬텀', types: ['고스트', '독'], color: 'ghost'},
  Lucario: {id: 448, name: '루카리오', types: ['격투', '강철'], color: 'fighting'},
  Golem: {id: 76, name: '딱구리', types: ['바위', '땅'], color: 'ground'},
  Lapras: {id: 131, name: '라프라스', types: ['물', '얼음'], color: 'water'},
  Jolteon: {id: 135, name: '쥬피썬더', types: ['전기'], color: 'electric'},
  Scizor: {id: 212, name: '핫삼', types: ['벌레', '강철'], color: 'steel'},
  Dragonite: {id: 149, name: '망나뇽', types: ['드래곤', '비행'], color: 'dragon'},
  Tyranitar: {id: 248, name: '마기라스', types: ['바위', '악'], color: 'dark'},
  Metagross: {id: 376, name: '메타그로스', types: ['강철', '에스퍼'], color: 'steel'},
  Garchomp: {id: 445, name: '한카리아스', types: ['드래곤', '땅'], color: 'dragon'},
};
export const species:Record<string,{id:number;name:string;types:string[];color:string;spriteKey?:string}>={...Object.fromEntries(nationalDex.map(entry=>[entry.species,{id:entry.id,name:entry.name,types:entry.types,color:(Object.keys(moveTypeNames).find(type=>moveTypeNames[type]===entry.types[0]) ?? 'Normal').toLowerCase()}])),...legacySpecies};
for(const [name,form] of Object.entries(forms)){const base=species[form.baseSpecies];if(base)species[name]={...base,id:form.id,...(form.forme==='Primal'?{name:'원시'+base.name}:{}),spriteKey:('spriteKey' in form ? form.spriteKey as string : undefined),types:form.types.map(type=>moveTypeNames[type] ?? type)};}
for(const [name,form] of Object.entries(selectableForms)){const base=species[form.baseSpecies];if(base)species[name]={...base,id:form.id,spriteKey:String(form.id),name:form.name,types:form.displayTypes};}
for(const name of ['Ogerpon-Teal-Tera','Ogerpon-Wellspring-Tera','Ogerpon-Hearthflame-Tera','Ogerpon-Cornerstone-Tera']){
 const normal=name==='Ogerpon-Teal-Tera'?'Ogerpon':name.replace(/-Tera$/,'');
 species[name]={...species[normal],types:species[name].types};
}
species['Tauros-Paldea']=species['Tauros-Paldea-Combat'];
for(const [name,form] of Object.entries(megaForms)){const base=species[form.baseSpecies];if(base)species[name]={...base,spriteKey:form.spriteKey,name:'메가'+base.name+(name.endsWith('-X')?'X':name.endsWith('-Y')?'Y':''),types:form.types.map(type=>moveTypeNames[type]??type)};}
for(const [name,form] of Object.entries(gigantamaxForms)){const base=species[name.replace(/-Gmax$/,'')]??species[form.baseSpecies];if(base)species[name]={...base,spriteKey:form.spriteKey,name:'거다이맥스 '+base.name};}
export const pokemonName = (name: string) => species[name]?.name ?? name;
