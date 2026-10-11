'use client';
import {PokedexDialog} from './pokedex-dialog';

export function DexFilterDialog({kind,title,value,options,onApply,onClose}:{kind:string;title:string;value:string;options:{value:string;label:string}[];onApply:(value:string)=>void;onClose:()=>void}) {
  return <PokedexDialog title={`${title} 선택`} returnFocus={`[data-dex-filter="${kind}"]`} onClose={onClose}>
    <div className={`dex-filter-options ${options.length>5 ? 'dex-filter-grid' : ''}`} aria-label={`${title} 항목`}>{options.map(option=><button key={option.value} aria-pressed={value===option.value} data-initial-focus={value===option.value || undefined} onClick={()=>onApply(option.value)}><i aria-hidden="true">{value===option.value ? '●' : '○'}</i>{option.label}</button>)}</div>
    <p className="dex-filter-hint">방향키 선택 · Enter/Z 적용 · X 취소</p>
  </PokedexDialog>;
}
