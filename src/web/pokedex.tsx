'use client';
import Link from 'next/link';
import {useGameKeyboard,selectGameCursor} from './game-keyboard';
import {BaseStatRadar} from './base-stat-radar';
import {PokemonSummary} from './pokemon-summary';
import {teraNames,teraColors,teraTypesForSpecies} from '../data/tera';
import {RulePicker} from './rule-picker';
import {type BattleRule} from '../data/run-rules';
import {useEffect, useMemo, useRef, useState,type CSSProperties} from 'react';
import type {BattleResponse,TowerView} from './contracts';
import {moves} from './catalog';
import {PokemonImage} from './pokemon-image';
import {typeColors,abilityNames,type PokedexEntry} from './pokedex-data';
import {MoveEditor} from './move-editor';
import {TrainingEditor} from './training-editor';
import {natureLabel,type TrainingView,type TrainingProfile} from '../data/training';
import {createPokemonNameIndex,preparePokemonNameQuery,matchesPokemonNameIndex} from './pokemon-search';
import {useRouter} from 'next/navigation';
import {PokedexDialog,PokemonActions} from './pokedex-dialog';
import {DexFilterDialog} from './dex-filter-dialog';
import {ivSummary} from './iv-summary';

function Types({types}:{types:string[]}) {
  return <span className="dex-type-pills">{types.map(type=><span key={type} className="dex-type-pill" style={{'--type-color':typeColors[type] ?? '#80909c'} as CSSProperties}>{type}</span>)}</span>;
}

function Picture({entry,animated=false,shiny=false}: {entry:PokedexEntry;animated?:boolean;shiny?:boolean}) {
  return <PokemonImage shiny={shiny} id={entry.id} name={entry.name} animated={animated} lazy fallback={<span className="dex-image-fallback" aria-label={`${entry.name} 이미지 없음`}>◇<small>{entry.name}</small></span>}/>;
}

export default function Pokedex({entries,initialTower,onStart,startError=''}: {entries:PokedexEntry[];initialTower?:TowerView;onStart?:(selected:string[],rule:BattleRule)=>Promise<void>;startError?:string}) {
  const [rule,setRule]=useState<BattleRule>('basic');
  const [ruleMenu,setRuleMenu]=useState(false);
  const [returnToTitle,setReturnToTitle]=useState(false);
  const focusStart=useRef(false);
  const [tower,setTower] = useState<TowerView | null>(initialTower ?? null);
  const [party,setParty]=useState<string[]>([]),[partyMenu,setPartyMenu]=useState<string|null>(null),[menu,setMenu]=useState(false),[settingsMenu,setSettingsMenu]=useState(false),[adjusting,setAdjusting]=useState(false),[editingMoves,setEditingMoves]=useState(false),[inspecting,setInspecting]=useState(false),[starting,setStarting]=useState(false);
  useEffect(()=>{if(focusStart.current && party.length===3 && !menu){const frame=requestAnimationFrame(()=>{focusStart.current=false;selectGameCursor(document.querySelector('.dex-start-button'));});return ()=>cancelAnimationFrame(frame);}},[party,menu]);
  const startLock=useRef(false),router=useRouter();
  const [training,setTraining]=useState<TrainingView[]>([]);
  const [savedNotice,setSavedNotice]=useState('');
  const savedNoticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(savedNoticeTimer.current)clearTimeout(savedNoticeTimer.current);},[]);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(true);
  const [favoritesOnly,setFavoritesOnly]=useState(false),[favoriteBusy,setFavoriteBusy]=useState<string|null>(null);
  const favoriteLock=useRef(false);
  const [filter,setFilter] = useState('all');
  const [query,setQuery] = useState('');
  const [type,setType]=useState('all'),[generation,setGeneration]=useState('all');
  const [mega,setMega]=useState(false),[gigantamax,setGigantamax]=useState(false);
  const [filterPanel,setFilterPanel]=useState<'display'|'type'|'generation'|null>(null);
  const filterOptions={display:[{value:'all',label:'전체'},{value:'owned',label:'보유'},{value:'unowned',label:'미보유'}],type:[{value:'all',label:'모든 타입'},...Object.keys(typeColors).map(name=>({value:name,label:name}))],generation:[{value:'all',label:'모든 세대'},...Array.from({length:9},(_,i)=>({value:String(i+1),label:`${i+1}세대`}))]};
  const indexed=useMemo(()=>entries.map(entry=>({entry,index:createPokemonNameIndex(entry.name,entry.species,entry.aliases)})),[entries]);
  const list=useRef<HTMLElement>(null);
  const [page,setPage]=useState(0),[grid,setGrid]=useState({columns:10,rows:5});
  useEffect(()=>{
    const element=list.current;if(!element)return;
    const measure=()=>{const columns=Math.max(1,Math.min(10,Math.floor(element.clientWidth/(element.clientWidth<600 ? 74 : 102)))),rows=Math.max(1,Math.min(5,Math.floor(element.clientHeight/(element.clientWidth<600 ? 72 : 94))));setGrid(current=>current.columns===columns && current.rows===rows ? current : {columns,rows});};
    const observer=new ResizeObserver(measure);observer.observe(element);measure();return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{setPage(0);},[filter,query,type,generation,mega,gigantamax,favoritesOnly]);
  const [selected,setSelected] = useState(entries[0].species);
  const detail = useRef<HTMLElement>(null);
  async function refresh() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/battle?view=collection',{cache:'no-store'});
      const data:BattleResponse = await response.json();
      if (!response.ok) throw new Error(data.error ?? '도감 저장을 불러오지 못했습니다.');
      setTower(data.tower);
      setTraining(data.training ?? []);
    } catch(e) {setError(e instanceof Error ? e.message : '서버에 연결할 수 없습니다.');}
    finally {setBusy(false);}
  }
  useEffect(() => {void refresh();},[]);
  const activeRun = tower?.run && ['select','battle','recruit'].includes(tower.run.state);
  const owned = activeRun ? tower!.run!.roster : [];
  const unlocked = tower?.unlocked ?? [];
  const favorites=tower?.favorites ?? [];
  async function toggleFavorite(name:string) {
    if(favoriteLock.current || !tower)return;
    favoriteLock.current=true;setFavoriteBusy(name);setError('');
    try {
      const response=await fetch('/api/battle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'favorite',species:name,enabled:!favorites.includes(name)})});
      const data:{tower?:TowerView;error?:string}=await response.json();
      if(!response.ok || !data.tower)throw new Error(data.error ?? '즐겨찾기를 저장하지 못했습니다.');
      setTower(current=>current ? {...current,favorites:data.tower!.favorites} : data.tower!);
    } catch(e){setError(e instanceof Error ? e.message : '즐겨찾기를 저장하지 못했습니다.');}
    finally{favoriteLock.current=false;setFavoriteBusy(null);}
  }
  const current = entries.find(entry => entry.species === selected)!;
  const saved=training.find(entry=>entry.species===selected);
  async function saveTraining(entry:TrainingView,profile:TrainingProfile) {
    const response=await fetch('/api/battle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'train',species:entry.species,revision:entry.revision,profile})});
    const data:BattleResponse=await response.json();
    if(!response.ok)throw new Error(data.error ?? '설정을 저장하지 못했습니다.');
    setTower(data.tower);setTraining(data.training ?? []);
    if(savedNoticeTimer.current)clearTimeout(savedNoticeTimer.current);
    setSavedNotice('설정 저장 완료');
    savedNoticeTimer.current=setTimeout(()=>{setSavedNotice('');savedNoticeTimer.current=null;},2500);
  }
  const searchQuery=preparePokemonNameQuery(query);
  const visible = indexed.filter(({entry,index}) => matchesPokemonNameIndex(index,searchQuery)
    && (!favoritesOnly || favorites.includes(entry.species))
    && (filter==='all' || (filter==='owned' ? unlocked.includes(entry.species) : !unlocked.includes(entry.species)))
    && (type==='all' || entry.types.includes(type)) && (generation==='all' || entry.generation===Number(generation))
    && (!mega || entry.canMega) && (!gigantamax || entry.canGigantamax)).map(({entry})=>entry);
  const pageSize=grid.columns*grid.rows,pageCount=Math.max(1,Math.ceil(visible.length/pageSize)),currentPage=Math.min(page,pageCount-1);
  const pageEntries=visible.slice(currentPage*pageSize,(currentPage+1)*pageSize);
  const pageCursor=useRef<number|null>(null);
  useEffect(()=>{if(pageCursor.current===null)return;const index=pageCursor.current;const frame=requestAnimationFrame(()=>{const cards=Array.from(list.current?.querySelectorAll<HTMLButtonElement>('.dex-card') ?? []);pageCursor.current=null;selectGameCursor(cards[Math.min(index,cards.length-1)]);});return ()=>cancelAnimationFrame(frame);},[currentPage,grid.columns,grid.rows]);
  useGameKeyboard('.dex-nav button,.dex-toolbar input,.dex-toolbar button,.dex-catalog-actions button,.dex-list .dex-card,.dex-pagination button,.dex-right-panel button',grid.columns,!starting,(event,cursor,select)=>{
    const focused=cursor,card=focused?.matches('.dex-card'),key=event.key.toLowerCase();
    if(key==='f'){event.preventDefault();if(!event.repeat && !busy)void toggleFavorite(selected);return true;}
    if(key==='v'){event.preventDefault();if(!event.repeat && !busy)setFavoritesOnly(value=>!value);return true;}
    if(key==='r'){event.preventDefault();if(!event.repeat && !busy)resetFilters();return true;}
    const toolbar=Array.from(document.querySelectorAll<HTMLButtonElement>('.dex-toolbar input,.dex-toolbar button')).filter(button=>!button.disabled);
    if(focused?.closest('.dex-toolbar') && event.key.startsWith('Arrow')) {
      event.preventDefault();const index=toolbar.indexOf(focused);
      if(event.key==='ArrowDown'){const cards=Array.from(list.current?.querySelectorAll<HTMLButtonElement>('.dex-card') ?? []);select(cards[Math.min(cards.length-1,Math.floor(index*grid.columns/toolbar.length))] ?? document.querySelector<HTMLButtonElement>('.dex-catalog-actions button:not(:disabled)'));}
      else if(event.key==='ArrowUp')return true;
      else select(toolbar[Math.max(0,Math.min(toolbar.length-1,index+(event.key==='ArrowRight' ? 1 : -1)))]);
      return true;
    }
    if(focused?.closest('.dex-catalog-actions') && event.key.startsWith('Arrow')) {
      event.preventDefault();const actions=Array.from(document.querySelectorAll<HTMLButtonElement>('.dex-catalog-actions button:not(:disabled)'));
      if(event.key==='ArrowUp')select(toolbar.at(-1));else if(event.key==='ArrowDown')select(list.current?.querySelector<HTMLButtonElement>('.dex-card'));else select(actions[Math.max(0,Math.min(actions.length-1,actions.indexOf(focused)+(event.key==='ArrowRight' ? 1 : -1)))]);return true;
    }
    if(card && (key==='enter'||key==='z')){event.preventDefault();setSavedNotice('');setMenu(true);return true;}
    if(key==='x'){event.preventDefault();setReturnToTitle(true);return true;}
    if(['PageDown','PageUp'].includes(event.key)){event.preventDefault();if(!event.repeat){const next=Math.max(0,Math.min(pageCount-1,currentPage+(event.key==='PageDown' ? 1 : -1)));if(next!==currentPage){pageCursor.current=0;setPage(next);}}return true;}
    const partyButtons=Array.from(document.querySelectorAll<HTMLButtonElement>('.dex-party-slot button,.dex-start-party>.primary-button')).filter(button=>!button.disabled);
    if(card && event.key.startsWith('Arrow')) {
      event.preventDefault();const cards=Array.from(list.current?.querySelectorAll<HTMLButtonElement>('.dex-card') ?? []),index=cards.indexOf(focused!);
      const row=Math.floor(index/grid.columns);
      if(event.key==='ArrowRight' && ((index+1)%grid.columns===0 || index===cards.length-1)){if(currentPage<pageCount-1){pageCursor.current=row*grid.columns;setPage(currentPage+1);}return true;}
      if(event.key==='ArrowLeft' && index%grid.columns===0){if(currentPage>0){pageCursor.current=row*grid.columns+grid.columns-1;setPage(currentPage-1);}return true;}
      if(event.key==='ArrowDown' && index+grid.columns>=cards.length){select(partyButtons[0]);return true;}
      if(event.key==='ArrowUp' && index<grid.columns){select(toolbar[Math.min(toolbar.length-1,Math.floor(index*toolbar.length/grid.columns))]);return true;}
      const delta=event.key==='ArrowDown' ? grid.columns : event.key==='ArrowUp' ? -grid.columns : event.key==='ArrowLeft' && index%grid.columns>0 ? -1 : event.key==='ArrowRight' ? 1 : 0;
      select(cards[index+delta] ?? cards[index]);return true;
    }
    if(focused?.closest('.dex-right-panel') && ['ArrowUp','ArrowDown'].includes(event.key)) {event.preventDefault();const index=partyButtons.indexOf(focused!);select(partyButtons[Math.max(0,Math.min(partyButtons.length-1,index+(event.key==='ArrowDown' ? 1 : -1)))]);return true;}
    if(event.key==='ArrowLeft' && focused?.closest('.dex-right-panel')) {event.preventDefault();select(list.current?.querySelector<HTMLButtonElement>('.dex-card.selected'));return true;}
    return false;
  },cursor=>{if(cursor.dataset.species)setSelected(cursor.dataset.species);});
  const hasFilters=filter!=='all' || type!=='all' || generation!=='all' || mega || gigantamax || !!query || favoritesOnly;
  function resetFilters(){setFavoritesOnly(false);setFilter('all');setType('all');setGeneration('all');setMega(false);setGigantamax(false);setQuery('');}
  function choose(name:string) {
    setSavedNotice('');
    setSelected(name);
    setMenu(true);
  }
  async function start() {
    if(startLock.current || party.length!==3 || activeRun)return;
    setRuleMenu(false);startLock.current=true;setStarting(true);setError('');
    try {
      if(onStart)await onStart(party,rule);
      else {
        const response=await fetch('/api/battle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'start',selected:party,rule})});
        const data:BattleResponse=await response.json();
        if(!response.ok)throw new Error(data.error ?? '도전을 시작하지 못했습니다.');
        if(data.battle)sessionStorage.setItem('tower-pending-intro',data.battle.id);
        router.push('/battle');
      }
    } catch(error){setError(error instanceof Error ? error.message : '도전을 시작하지 못했습니다.');}
    finally {startLock.current=false;setStarting(false);}
  }
  return <main className="pokedex-screen dex-console dex-center">
    <nav className="dex-nav" aria-label="도감 메뉴"><Link href="/">← 타이틀로</Link><div className="dex-heading"><div><h1><span className="dex-device-light"/>포켓몬 도감</h1></div><div className="dex-heading-counters"><div className="dex-progress"><strong data-testid="dex-progress">{tower ? unlocked.length : '—'} / {entries.length}</strong><span>도감 보유</span></div><div className="dex-wallet" data-testid="growth-wallet"><span>성장 포인트</span><strong>{tower?.growthPoints.toLocaleString() ?? '…'}<small>P</small></strong></div></div></div><Link href="/upgrades">영구 업그레이드</Link><Link href={activeRun ? '/battle' : '/battle?prepare=1'}>{activeRun ? '게임 이어하기 ↗' : '새 도전 준비 ↗'}</Link></nav>
    {(error || startError) && <div className="error-banner" role="alert">{error || startError}<button disabled={busy} onClick={() => void refresh()}>다시 불러오기</button></div>}
    {busy && <p role="status">해금 상태를 불러오는 중…</p>}
    <div className="dex-toolbar" aria-label="도감 검색 및 필터">
      <div className="dex-search dex-filter-control"><span>검색</span><input data-dex-filter="search" data-game-text-input type="search" aria-label="검색" placeholder="이름 · 초성 · 영문 검색" value={query} onFocus={event=>selectGameCursor(event.currentTarget)} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.nativeEvent.isComposing)return;if(event.key==='Tab')document.body.dataset.gameInput='native';if(['ArrowLeft','ArrowRight'].includes(event.key) && !event.shiftKey){event.preventDefault();event.stopPropagation();const controls=Array.from(document.querySelectorAll<HTMLInputElement|HTMLButtonElement>('.dex-toolbar input,.dex-toolbar button')).filter(control=>!control.disabled),index=controls.indexOf(event.currentTarget),next=(index+(event.key==='ArrowRight'?1:controls.length-1))%controls.length;selectGameCursor(controls[next]);return;}if(['Enter','ArrowDown','Escape'].includes(event.key)){event.preventDefault();event.stopPropagation();selectGameCursor(list.current?.querySelector<HTMLButtonElement>('.dex-card') ?? document.querySelector<HTMLButtonElement>('[data-dex-filter="display"]'));}}}/><button className="dex-search-reset" data-dex-filter="search-reset" aria-label="검색 초기화" disabled={!query || busy || starting} onClick={()=>{setQuery('');requestAnimationFrame(()=>selectGameCursor(document.querySelector('[data-dex-filter="search"]')));}}>초기화</button></div>
      <div className="dex-filters">{(['display','type','generation'] as const).map(kind=>{const title=kind==='display' ? '표시' : kind==='type' ? '타입' : '세대',value=kind==='display' ? filter : kind==='type' ? type : generation;return <div key={kind} className="dex-filter-control"><span>{title}</span><button data-dex-filter={kind} aria-label={`${title} 선택 열기`} aria-haspopup="dialog" aria-expanded={filterPanel===kind} disabled={kind==='display' && !tower} onClick={()=>setFilterPanel(kind)}><span>{filterOptions[kind].find(option=>option.value===value)?.label}</span><i>▾</i></button></div>;})}
      <div className="dex-form-filters"><button aria-label="메가진화 가능" aria-pressed={mega} onClick={()=>setMega(value=>!value)}>{mega ? '✓' : '+'} 메가진화 가능</button><button aria-label="거다이맥스 가능" aria-pressed={gigantamax} onClick={()=>setGigantamax(value=>!value)}>{gigantamax ? '✓' : '+'} 거다이맥스 가능</button></div></div>
    </div>
    {filterPanel && <DexFilterDialog kind={filterPanel} title={filterPanel==='display' ? '표시' : filterPanel==='type' ? '타입' : '세대'} value={filterPanel==='display' ? filter : filterPanel==='type' ? type : generation} options={filterOptions[filterPanel]} onApply={value=>{if(filterPanel==='display')setFilter(value);else if(filterPanel==='type')setType(value);else setGeneration(value);setFilterPanel(null);}} onClose={()=>setFilterPanel(null)}/>}
    <div className="dex-layout"><div className="dex-catalog"><div className="dex-catalog-heading"><h2>포켓몬 목록 <span>{visible.length}</span></h2><div className="dex-catalog-actions"><button className={`dex-favorites-filter ${favoritesOnly ? 'active' : ''}`} aria-pressed={favoritesOnly} disabled={busy} onClick={()=>setFavoritesOnly(value=>!value)}>★ 즐겨찾기 · V <span>{favorites.length}</span></button><button onClick={resetFilters} disabled={!hasFilters}>필터 초기화 · R</button></div></div><section ref={list} className="dex-list" aria-label="포켓몬 목록" data-testid="dex-list" style={{'--dex-columns':grid.columns,'--dex-rows':grid.rows} as CSSProperties}>{pageEntries.map(entry => <div className="dex-card-wrap" key={entry.species}><button disabled={starting} className={`dex-card ${tower && !unlocked.includes(entry.species) ? 'locked' : ''} ${selected === entry.species ? 'selected' : ''} ${party.includes(entry.species) ? 'in-party' : ''}`} aria-label={`${entry.name} 상세 보기`} aria-pressed={selected === entry.species} data-species={entry.species} onClick={() => choose(entry.species)}>
      <span className="dex-card-top"><span className="dex-number">#{String(entry.id).padStart(3,'0')}</span>{party.includes(entry.species) ? <span className="dex-party-order">{party.indexOf(entry.species)+1}</span> : null}</span><Picture shiny={training.find(t=>t.species===entry.species)?.profile.shiny} entry={entry} animated={selected===entry.species}/><strong>{entry.name}</strong><Types types={entry.types}/><span className="dex-card-bottom"><small>{entry.generation}세대</small><span>{entry.canMega && <i title="메가진화 가능">M</i>}{entry.canGigantamax && <i title="거다이맥스 가능">G</i>}</span></span>
    </button><button className={`dex-favorite ${favorites.includes(entry.species) ? 'active' : ''}`} aria-label={`${entry.name} 즐겨찾기 ${favorites.includes(entry.species) ? '해제' : '추가'}`} aria-pressed={favorites.includes(entry.species)} title={favorites.includes(entry.species) ? '즐겨찾기 해제 · F' : '즐겨찾기 추가 · F'} disabled={busy || starting || favoriteBusy!==null} onClick={()=>void toggleFavorite(entry.species)}><span aria-hidden="true">{favorites.includes(entry.species) ? '★' : '☆'}</span></button></div>)}{visible.length === 0 && <div className="dex-empty"><span>⌕</span><p>조건에 맞는 포켓몬이 없습니다.</p><small>이름을 바꾸거나 필터를 초기화해 보세요.</small></div>}</section><nav className="dex-pagination" aria-label="도감 페이지"><button disabled={currentPage===0} onClick={()=>setPage(currentPage-1)} aria-label="이전 페이지">← 이전</button><span><strong>{currentPage+1} / {pageCount}</strong><small>{visible.length ? `${currentPage*pageSize+1}–${Math.min((currentPage+1)*pageSize,visible.length)} / ${visible.length}종` : '0종'}</small></span><button disabled={currentPage===pageCount-1} onClick={()=>setPage(currentPage+1)} aria-label="다음 페이지">다음 →</button></nav></div>
    <section className="dex-partner-display" aria-label="선택한 포켓몬" data-testid="dex-partner-display">
      <header><span>No. {String(current.id).padStart(3,'0')}</span><span>{current.generation}세대</span></header>
      <div className="dex-partner-stage"><PokemonImage shiny={saved?.profile.shiny} id={current.id} name={current.name} animated maxPixelScale={2} width={160} height={160} fallback={<span className="dex-image-fallback">◇</span>}/></div>
      <h2>{current.name}{saved?.profile.shiny ? ' ✦' : ''}</h2><Types types={current.types}/>
      {saved && <small className="dex-partner-ivs">개체값 {ivSummary(saved.profile)}</small>}<div className="dex-partner-stats"><span>종족값</span><BaseStatRadar stats={current.baseStats}/></div><dl className="dex-partner-traits"><div><dt>특성</dt><dd>{abilityNames[saved?.profile.ability??current.ability]??current.ability}</dd></div><div><dt>성격</dt><dd>{natureLabel(saved?.profile.nature??'Serious')}</dd></div></dl>
      {(()=>{const allowed=teraTypesForSpecies(current.species),tera=saved?.profile.teraType??(allowed.length===1?allowed[0]:Object.keys(teraNames).find(t=>teraNames[t]===current.types[0])??'Normal');return <div className="dex-partner-tera"><span>테라 타입</span><strong style={{color:teraColors[tera]}}>{teraNames[tera]}</strong></div>;})()}
      <button className="dex-inspect-button" onClick={()=>setInspecting(true)}>{current.name} 기본 정보 ↗</button>
    </section>
    <aside className="dex-right-panel"><section className="dex-start-party" data-testid="team-selection" aria-label="출발 파티"><div className="dex-catalog-heading"><h2>출발 파티</h2><span>{party.length} / 3</span></div><div className="dex-party-slots" data-testid="team-preview">{[0,1,2].map(slot=>{
      const entry=entries.find(value=>value.species===party[slot]);
      return entry ? <div className="dex-party-slot" key={slot}><span>{slot===0 ? '01 · 선봉' : `0${slot+1}`}</span><Picture shiny={training.find(t=>t.species===entry.species)?.profile.shiny} entry={entry}/><strong>{entry.name}</strong><button className="dex-party-menu-button" aria-label={`${entry.name} 파티 메뉴`} disabled={starting} onClick={()=>{setSelected(entry.species);setPartyMenu(entry.species);}}>선택</button></div> : <div key={slot} className="dex-party-slot preview-empty" aria-label={`${slot+1}번 미선택`}><span>0{slot+1}</span><i>＋</i><small>포켓몬 선택</small></div>;
    })}</div><p>{activeRun ? '진행 중인 도전은 이어하기로 계속하세요.' : '3마리를 선택하면 출발할 수 있어요. 첫 번째가 선봉입니다.'}</p><button className="primary-button dex-start-button" disabled={busy || starting || !!activeRun || party.length!==3} onClick={()=>setRuleMenu(true)}>{starting ? '준비 중…' : '새 도전 시작'} ↗</button></section>
    </aside></div>
    {ruleMenu && <PokedexDialog title="새 도전 · 배틀 룰 선택" className="dex-settings-dialog dex-start-dialog" returnFocus=".dex-start-button" onClose={()=>{if(!starting)setRuleMenu(false);}}><p>이번 도전에서 사용할 배틀 룰을 선택하세요.</p><RulePicker value={rule} onChange={setRule} disabled={busy||starting}/><button className="primary-button" disabled={busy||starting} onClick={()=>void start()}>이 룰로 도전 시작</button></PokedexDialog>}
    {returnToTitle && <PokedexDialog title="타이틀 화면으로 돌아가시겠습니까?" onClose={()=>setReturnToTitle(false)}><div className="dex-action-options"><button data-initial-focus onClick={()=>setReturnToTitle(false)}>계속하기</button><button onClick={()=>router.push('/')}>타이틀로 돌아가기</button></div></PokedexDialog>}
    {inspecting && <PokedexDialog title={`${current.name} 기본 정보`} large onClose={()=>setInspecting(false)}><PokemonSummary entry={current} profile={saved?.profile}/></PokedexDialog>}
    {partyMenu && <PokedexDialog title={`${current.name} 파티 메뉴`} onClose={()=>setPartyMenu(null)}><div className="dex-action-options"><button aria-label="파티에서 제외" data-initial-focus onClick={()=>{setParty(values=>values.filter(name=>name!==partyMenu));setPartyMenu(null);}}><b>01</b><span><strong>파티에서 제외</strong></span></button><button aria-label="포켓몬 설정" onClick={()=>{setPartyMenu(null);setSettingsMenu(true);}}><b>02</b><span><strong>포켓몬 설정</strong></span></button><button aria-label="취소" onClick={()=>setPartyMenu(null)}><b>03</b><span><strong>취소</strong></span></button></div></PokedexDialog>}
    {settingsMenu && <PokedexDialog title={`${current.name} 포켓몬 설정`} onClose={()=>setSettingsMenu(false)}><div className="dex-action-partner"><Picture shiny={saved?.profile.shiny} entry={current} animated/><strong>{current.name}</strong></div><div className="dex-action-options"><button aria-label="능력치 조정" disabled={!saved} data-initial-focus onClick={()=>{setSettingsMenu(false);setAdjusting(true);}}>개체값 · 능력 포인트 · 성격</button><button aria-label="기술배치" disabled={!saved} onClick={()=>{setSettingsMenu(false);setEditingMoves(true);}}>기술배치</button><button onClick={()=>{setSettingsMenu(false);setInspecting(true);}}>기본 정보</button><button onClick={()=>setSettingsMenu(false)}>돌아가기</button></div></PokedexDialog>}
    {menu && <PokemonActions shiny={saved?.profile.shiny} entry={current} canChoose={!!saved && party.length<3 && !party.includes(current.species)} canAdjust={!!saved} chosen={party.includes(current.species)} full={party.length>=3} onChoose={()=>{if(party.includes(current.species))setParty(values=>values.filter(name=>name!==current.species));else if(party.length<3){focusStart.current=party.length===2;setParty(values=>[...values,current.species]);}setMenu(false);}} onAdjust={()=>{setMenu(false);setAdjusting(true);}} onMoves={()=>{setMenu(false);setEditingMoves(true);}} onInfo={()=>{setMenu(false);setInspecting(true);}} onClose={()=>setMenu(false)}/>}
    {adjusting && saved && tower && <PokedexDialog title={`${current.name} 능력치 조정`} className="dex-settings-dialog" returnFocus='.dex-card[aria-pressed="true"]' large onClose={()=>setAdjusting(false)}><TrainingEditor key={`${saved.species}-${saved.revision}`} entry={saved} points={tower.growthPoints} onSave={saveTraining} showMoves={false}/>{savedNotice && <p role="status" className="dex-save-notice">{savedNotice}</p>}</PokedexDialog>}
    {editingMoves && saved && <PokedexDialog title={`${current.name} 기술배치`} className="dex-settings-dialog" returnFocus='.dex-card[aria-pressed="true"]' large onClose={()=>setEditingMoves(false)}><MoveEditor key={`${saved.species}-${saved.revision}`} entry={saved} onSave={saveTraining}/>{savedNotice && <p role="status" className="dex-save-notice">{savedNotice}</p>}</PokedexDialog>}
    <footer><div className="dex-control-hints"><span><kbd>방향키</kbd> 이동</span><span><kbd>Enter / Z</kbd> 선택·설정</span><span><kbd>X</kbd> 타이틀·뒤로</span><span><kbd>F</kbd> 즐겨찾기</span><span><kbd>V</kbd> 즐겨찾기 목록</span><span><kbd>R</kbd> 필터 초기화</span><span><kbd>← / →</kbd> 목록 끝에서 페이지</span></div><span><a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noreferrer">Sprites: PokéAPI</a> / <a href="https://play.pokemonshowdown.com/sprites/" target="_blank" rel="noreferrer">Smogon</a></span></footer>
  </main>;
}
