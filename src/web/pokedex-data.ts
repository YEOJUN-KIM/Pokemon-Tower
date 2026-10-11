import localizedAbilities from '../data/ability-names.json' with {type:'json'};
export type PokemonFormPreview={species:string;name:string;kind:'mega'|'gigantamax';spriteKey:string;types:string[];baseStats:import('../data/training').StatBlock;ability:string};
export type PokedexEntry = {forms?:PokemonFormPreview[];baseStats:import('../data/training').StatBlock;species: string; id: number; name: string; types: string[]; ability: string; moves: string[]; level: number;generation:number;canMega:boolean;canGigantamax:boolean;battleReady?:boolean;aliases?:string[]};
export const typeColors:Record<string,string>={노말:'#8b92a4',불꽃:'#e5714a',물:'#5392da',전기:'#c4a432',풀:'#57995f',얼음:'#55a5ac',격투:'#b96053',독:'#9860b6',땅:'#b48c59',비행:'#8a89cf',에스퍼:'#d26291',벌레:'#899e43',바위:'#9d9058',고스트:'#78649d',드래곤:'#6863c7',악:'#776d72',강철:'#738e9e',페어리:'#c780b3'};
export const abilityNames: Record<string,string> = {
  ...localizedAbilities,
  Blaze:'맹화', Torrent:'급류', Overgrow:'심록', Static:'정전기', Intimidate:'위협', Immunity:'면역',
  'Shell Armor':'조가비갑옷', Synchronize:'싱크로', 'Cursed Body':'저주받은바디', 'Inner Focus':'정신력',
  Sturdy:'옹골참', 'Water Absorb':'저수', 'Volt Absorb':'축전', Technician:'테크니션',
  'Sand Stream':'모래날림', 'Clear Body':'클리어바디', 'Rough Skin':'까칠한피부',
  'Solar Power':'선파워','Rain Dish':'젖은접시',Chlorophyll:'엽록소','Lightning Rod':'피뢰침',Moxie:'자기과신','Thick Fat':'두꺼운지방',Gluttony:'먹보','Flash Fire':'타오르는불꽃',Justified:'정의의마음','Skill Link':'스킬링크',Overcoat:'방진','Magic Bounce':'매직미러',Steadfast:'불굴의마음','Rock Head':'돌머리','Swift Swim':'쓱쓱','Hydration':'촉촉바디','Quick Feet':'속보','Light Metal':'라이트메탈',Swarm:'벌레의알림',Multiscale:'멀티스케일',Unnerve:'긴장감',Levitate:'부유',
};
