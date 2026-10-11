import type {Battle} from 'pokemon-showdown';
import {battleItemStats,battleItemNames,type BattleItemBag} from '../data/battle-items';
import {upgrades,type UpgradeKind} from '../data/shop';

export function installBattleItems(battle:Battle,initial:BattleItemBag){
  const bag={...initial},guarded=new WeakSet<object>(),critical=new WeakSet<object>();
  for(const [kind,count] of Object.entries(bag))if(!Object.hasOwn(upgrades,kind)||!Number.isSafeInteger(count)||count!<0)throw Error('Invalid battle item stock');
  battle.onEvent('TryBoost',battle.format,(boosts:Record<string,number>,pokemon:object,source:unknown)=>{if(guarded.has(pokemon)&&source!==pokemon)for(const stat of Object.keys(boosts))if(boosts[stat]<0)boosts[stat]=0;});
  battle.onEvent('ModifyCritRatio',battle.format,(ratio:number,source:object)=>critical.has(source)?ratio+1:ratio);
  battle.onEvent('SwitchOut',battle.format,(pokemon:object)=>{guarded.delete(pokemon);critical.delete(pokemon);});
  const legal=()=>{
    const side=battle.p1,pokemon=side?.active[0];if(side?.requestState!=='move'||!pokemon||pokemon.fainted)return [];
    return (Object.keys(upgrades) as UpgradeKind[]).filter(kind=>{
      if(!(bag[kind]!>0))return false;
      if(kind==='guard')return !guarded.has(pokemon);
      if(kind==='critical')return !critical.has(pokemon);
      const stat=battleItemStats[kind];return pokemon.hasAbility('contrary')?pokemon.boosts[stat]>-6:pokemon.boosts[stat]<6;
    });
  };
  return {bag,legal,use(kind:UpgradeKind){
    if(!legal().includes(kind))throw Error('Unavailable battle item');
    const pokemon=battle.p1.active[0];bag[kind]!--;
    battle.add('message',`${pokemon.name}에게 ${battleItemNames[kind]}를 사용했다!`);
    if(kind==='guard')guarded.add(pokemon);
    else if(kind==='critical')critical.add(pokemon);
    else battle.boost({[battleItemStats[kind]]:1},pokemon,pokemon);
    battle.sendUpdates();
  }};
}
