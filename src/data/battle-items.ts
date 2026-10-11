import {upgrades,type UpgradeKind} from './shop';
export type BattleItemBag=Partial<Record<UpgradeKind,number>>;
export const battleItemStats={attack:'atk',speed:'spe',defense:'def',specialAttack:'spa',specialDefense:'spd',accuracy:'accuracy'} as const;
export const battleItemDescription=(kind:UpgradeKind)=>kind==='guard'?'현재 포켓몬의 능력치 하락 방지 · 교체 시 해제':kind==='critical'?'현재 포켓몬의 급소율 1단계 상승 · 교체 시 해제':`${({attack:'공격',speed:'스피드',defense:'방어',specialAttack:'특수공격',specialDefense:'특수방어',accuracy:'명중률'} as Record<string,string>)[kind]} +1랭크 · 교체 시 초기화`;
export const battleItemNames=Object.fromEntries(Object.entries(upgrades).map(([key,item])=>[key,item.name])) as Record<UpgradeKind,string>;
