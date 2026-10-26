'use client';
import {PokemonGenderIcon} from './pokemon-gender-icon';
import {GameChoice,GameChoiceList,GameMenuFooter,type GameControl} from './game-menu';
import {selectGameCursor} from './game-keyboard';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {PokemonImage} from './pokemon-image';
import {species} from './catalog';
import {typeColors,type PokedexEntry} from './pokedex-data';
import {useDialogControls,useManagedGameMenu} from './game-menu-context';
import menuStyles from './styles/game-menu-context.module.css';

export function PokedexDialog({title,titleColor,onClose,children,large=false,returnFocus,initialFocus,className='',controls,testId,context='dialog',hideClose=false,hideHeading=false,pokemonSpecies}:{title:string;titleColor?:string;pokemonSpecies?:string;onClose:()=>void;children:ReactNode;large?:boolean;returnFocus?:string;initialFocus?:string;className?:string;controls?:GameControl[]|false;testId?:string;context?:string;hideClose?:boolean;hideHeading?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  const managed=useManagedGameMenu();
  useDialogControls(context,controls===false?[]:controls??[{key:'방향키',label:'이동'},{key:'Enter / Z',label:'결정'},{key:'Esc / X',label:'뒤로'}]);
  useLayoutEffect(()=>{const dialog=ref.current;dialog?.showModal();selectGameCursor(dialog?.querySelector<HTMLButtonElement>('[data-initial-focus]'));if(initialFocus)dialog?.querySelector<HTMLElement>(initialFocus)?.focus({preventScroll:true});return ()=>{const target=returnFocus ? document.querySelector<HTMLElement>(returnFocus) : null;dialog?.close();selectGameCursor(target);target?.focus({preventScroll:true});};},[]);
  return <dialog ref={ref} data-pokemon-species={pokemonSpecies} data-managed-menu={managed||undefined} data-testid={testId} className={`dex-dialog ${large ? 'dex-training-dialog' : 'dex-action-dialog'} ${managed?menuStyles.scopeDialog:''} ${className}`} aria-label={title} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}}>{!hideHeading&&<div className="dex-dialog-heading"><h2 style={titleColor ? {color:titleColor} : undefined}>{title}</h2>{!hideClose&&<button onClick={onClose} aria-label={`${title} 닫기`}>×</button>}</div>}<div className="game-dialog-body">{children}</div>{controls!==false&&<GameMenuFooter controls={controls}/>}</dialog>;
}
export function PokemonActions({mode,shiny=false,gender,entry,pokemonSpecies,canChoose,canAdjust,chosen,full,onChoose,onAdjust,onInfo,onClose}:{mode:'selection'|'collection';shiny?:boolean;gender?:import('../data/gender').PokemonGender;entry:PokedexEntry;pokemonSpecies?:string;canChoose:boolean;canAdjust:boolean;chosen:boolean;full:boolean;onChoose:()=>void;onAdjust:()=>void;onInfo:()=>void;onClose:()=>void}) {
  const actions=mode==='selection'
    ? [{label:chosen?'포켓몬 제외':'포켓몬 넣기',description:chosen?'출발 파티에서 제외':!canAdjust?entry.battleReady===false?'배틀 지원 준비 중':'영입하면 선택할 수 있어요':full?'출발 파티가 가득 찼어요':'출발 파티에 추가',disabled:!chosen&&!canChoose,run:onChoose}]
    : [];
  actions.push({label:'포켓몬 설정',description:'능력치 · 성격 · 기술 · 특성',disabled:!canAdjust,run:onAdjust},{label:'포켓몬 정보',description:'종족값 · 특성 · 성격 · 기술',disabled:false,run:onInfo},{label:'취소',description:'목록으로 돌아가기',disabled:false,run:onClose});
  return <PokedexDialog pokemonSpecies={pokemonSpecies??entry.species} title={`${entry.name} ${mode==='selection'?'선택 메뉴':'도감 메뉴'}`} className="dex-partner-dialog" onClose={onClose}>
    <div className="dex-action-partner"><div className="dex-menu-sprite"><PokemonImage shiny={shiny} id={entry.id} spriteKey={species[entry.species]?.spriteKey??entry.id} name={entry.name} animated maxPixelScale={2} width={100} height={100} fallback={<span>◇</span>}/></div><div className="dex-menu-identity"><small>No. {String(entry.nationalId??entry.id).padStart(3,'0')} · {entry.region&&`${entry.region} · `}{entry.generation}세대</small><strong>{entry.name}<PokemonGenderIcon gender={gender}/></strong><span className="dex-menu-types">{entry.types.map(type=><i key={type} style={{backgroundColor:typeColors[type]??'#71817b'}}>{type}</i>)}</span>{mode==='selection'&&chosen&&<span className="dex-menu-picked">✓ 출발 파티</span>}</div></div>
    <GameChoiceList className="dex-action-options">{actions.map((action,index)=><GameChoice key={action.label} data-number-shortcut={index+1} aria-keyshortcuts={String(index+1)} aria-label={action.label} disabled={action.disabled} onClick={action.run}><b>{String(index+1).padStart(2,'0')}</b><span><strong>{action.label}</strong><small>{action.description}</small></span></GameChoice>)}</GameChoiceList>
  </PokedexDialog>;
}
