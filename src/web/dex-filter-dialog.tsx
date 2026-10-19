'use client';
import {GameChoice,GameChoiceList} from './game-menu';
import {PokedexDialog} from './pokedex-dialog';

export function DexFilterDialog({kind,title,value,options,onApply,onClose}:{kind:string;title:string;value:string;options:{value:string;label:string}[];onApply:(value:string)=>void;onClose:()=>void}) {
  return <PokedexDialog title={`${title} 선택`} returnFocus={`[data-dex-filter="${kind}"]`} onClose={onClose}>
    <GameChoiceList grid={options.length>5} className={`dex-filter-options ${options.length>5 ? 'dex-filter-grid' : ''}`} aria-label={`${title} 항목`}>{options.map(option=><GameChoice key={option.value} aria-pressed={value===option.value} data-initial-focus={value===option.value || undefined} onClick={()=>onApply(option.value)}><i aria-hidden="true">{value===option.value ? '●' : '○'}</i>{option.label}</GameChoice>)}</GameChoiceList>
  </PokedexDialog>;
}
