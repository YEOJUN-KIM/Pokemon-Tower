'use client';
import {useTutorial} from './tutorial-manager';
import {TutorialStep} from '../data/tutorial';
import {PokemonGenderIcon} from './pokemon-gender-icon';
import {GameChoice,GameChoiceList} from './game-menu';
import {useGameKeyboard,selectGameCursor} from './game-keyboard';
import {BaseStatRadar} from './base-stat-radar';
import {PokemonSummary} from './pokemon-summary';
import {teraNames,teraColors,teraTypesForSpecies} from '../data/tera';
import {TeraTypeIcon} from './tera-type-icon';
import {ChallengeRuleChoice} from './challenge-rule-choice';
import {PokedexParty} from './pokedex-party';
import {challengeRule,specialFormOptions,matchesSpecialForm,type SpecialFormFilter} from './pokedex-controls';
import styles from './styles/pokedex-menu.module.css';
import {battleRules,type BattleRule} from '../data/run-rules';
import {useEffect, useLayoutEffect, useMemo, useRef, useState,type CSSProperties} from 'react';
import type {BattleResponse,TowerView} from './contracts';
import {species} from './catalog';
import {PokemonImage} from './pokemon-image';
import {typeColors,abilityNames,selectedPokedexEntry,type PokedexEntry} from './pokedex-data';
import {PokemonSettings} from './pokemon-settings';
import {GameMenuProvider,GameMenuBar} from './game-menu-context';

import {natures,type TrainingView,type TrainingProfile} from '../data/training';
import {createPokemonNameIndex,preparePokemonNameQuery,matchesPokemonNameIndex} from './pokemon-search';
import {useRouter} from 'next/navigation';
import {PokedexDialog,PokemonActions} from './pokedex-dialog';
import {DexFilterDialog} from './dex-filter-dialog';

function Types({types}:{types:string[]}) {
  return <span className="dex-type-pills">{types.map(type=><span key={type} className="dex-type-pill" style={{'--type-color':typeColors[type] ?? '#80909c'} as CSSProperties}>{type}</span>)}</span>;
}

function Picture({entry,animated=false,shiny=false,forme}: {entry:PokedexEntry;animated?:boolean;shiny?:boolean;forme?:string}) {
  const form=entry.forms?.find(form=>form.species===forme);
  return <PokemonImage shiny={shiny} id={entry.id} spriteKey={form?.spriteKey??species[entry.species]?.spriteKey??entry.id} name={form?.name??entry.name} animated={animated} lazy fallback={<span className="dex-image-fallback" aria-label={`${entry.name} 이미지 없음`}>◇<small>{entry.name}</small></span>}/>;
}

function PokedexContent({entries,initialTower,onStart,startError='',returnToBattle=false}: {entries:PokedexEntry[];initialTower?:TowerView;onStart?:(selected:string[],rule:BattleRule)=>Promise<void>;startError?:string;returnToBattle?:boolean}) {
  const tutorial=useTutorial();
  const tutorialTarget=tutorial.state?.selectedSpecies;
  const followingTarget=!!tutorial.state&&[TutorialStep.PokemonInfo,TutorialStep.PokemonInfoViewed,TutorialStep.StatUpgrade].includes(tutorial.state.step as never);
  const partyLoaded=useRef(false);
  useEffect(()=>{if(tutorial.state&&!partyLoaded.current){partyLoaded.current=true;if(tutorial.state.step!==TutorialStep.Completed)setParty(tutorial.state.party);}},[tutorial.state]);
  useEffect(()=>{if(tutorial.state?.step===TutorialStep.SelectPokemon)setFilter('owned');},[tutorial.state?.step]);
  function changeParty(next:string[]){setParty(next);void tutorial.report('party',next);}
  const [rule,setRule]=useState<BattleRule>('chaos');
  const [confirmStart,setConfirmStart]=useState(false);
  const [focusZone,setFocusZone]=useState<'list'|'filters'|'party'|'rule'>('list');
  const [returnToTitle,setReturnToTitle]=useState(false);
  const [tower,setTower] = useState<TowerView | null>(initialTower ?? null);
  const [party,setParty]=useState<string[]>([]),[partyMenu,setPartyMenu]=useState<string|null>(null),[menu,setMenu]=useState(false),[settingsMenu,setSettingsMenu]=useState(false),[adjusting,setAdjusting]=useState(false),[inspecting,setInspecting]=useState(false),[starting,setStarting]=useState(false);
  const startLock=useRef(false),router=useRouter();
  const [training,setTraining]=useState<TrainingView[]>([]);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(true);
  const [favoritesOnly,setFavoritesOnly]=useState(false),[favoriteBusy,setFavoriteBusy]=useState<string|null>(null);
  const favoriteLock=useRef(false);
  const [filter,setFilter] = useState('all');
  const [query,setQuery] = useState('');
  const [type,setType]=useState('all'),[generation,setGeneration]=useState('all');
  const [specialForm,setSpecialForm]=useState<SpecialFormFilter>('all');
  const [filterPanel,setFilterPanel]=useState<'display'|'type'|'generation'|'special'|null>(null);
  const filterOptions={special:[...specialFormOptions],display:[{value:'all',label:'모두 보기'},{value:'owned',label:'보유 중'},{value:'unowned',label:'미보유'}],type:[{value:'all',label:'모든 타입'},...Object.keys(typeColors).map(name=>({value:name,label:name}))],generation:[{value:'all',label:'모든 세대'},...Array.from({length:9},(_,i)=>({value:String(i+1),label:`${i+1}세대`}))]};
  const indexed=useMemo(()=>entries.map(entry=>({entry,index:createPokemonNameIndex(entry.name,entry.species,entry.aliases)})),[entries]);
  const list=useRef<HTMLElement>(null);
  const shortcutCursor=useRef<{element:HTMLElement;inList:boolean;species?:string;index:number}|null>(null);
  function rememberShortcut(element?:HTMLElement|null){
    if(document.querySelector('dialog[open]'))return;
    const cursor=element??document.querySelector<HTMLElement>('[data-game-cursor=true]');if(!cursor)return;
    const inList=!!cursor.closest('.dex-list'),cards=Array.from(list.current?.querySelectorAll<HTMLElement>('.dex-card')??[]);
    shortcutCursor.current={element:cursor,inList,species:cursor.dataset.species,index:Math.max(0,cards.indexOf(cursor))};
  }
  const [page,setPage]=useState(0),[grid,setGrid]=useState({columns:10,rows:5});
  useEffect(()=>{
    const element=list.current;if(!element)return;
    const measure=()=>{const columns=Math.max(1,Math.min(10,Math.floor(element.clientWidth/(element.clientWidth<600 ? 74 : 102)))),rows=Math.max(1,Math.min(5,Math.floor(element.clientHeight/(element.clientWidth<600 ? 72 : 94))));setGrid(current=>current.columns===columns && current.rows===rows ? current : {columns,rows});};
    const observer=new ResizeObserver(measure);observer.observe(element);measure();return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{setPage(0);},[filter,query,type,generation,specialForm,favoritesOnly]);

  const [selected,setSelected] = useState(entries[0].species);
  useEffect(()=>{
    if(!followingTarget)return;
    setFilter('owned');setQuery('');setType('all');setGeneration('all');setSpecialForm('all');setFavoritesOnly(false);
    if(tutorialTarget)setSelected(tutorialTarget);
  },[followingTarget,tutorialTarget,tutorial.state?.step]);
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
  // The first onboarding-state read may initialize the starting wallet after this screen's first fetch.
  useEffect(() => {void refresh();},[tutorial.state?.rewardGranted]);
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
      rememberShortcut();
      setTower(current=>current ? {...current,favorites:data.tower!.favorites} : data.tower!);
    } catch(e){setError(e instanceof Error ? e.message : '즐겨찾기를 저장하지 못했습니다.');}
    finally{favoriteLock.current=false;setFavoriteBusy(null);}
  }
  const current = entries.find(entry => entry.species === selected)!;
  const saved=training.find(entry=>entry.species===selected);
  const selectedPreview=current.forms?.find(form=>form.species===saved?.profile.forme),shownCurrent=selectedPokedexEntry(current,saved?.profile.forme);
  async function saveTraining(entry:TrainingView,profile:TrainingProfile) {
    const response=await fetch('/api/battle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'train',species:entry.species,revision:entry.revision,profile})});
    const data:BattleResponse=await response.json();
    if(!response.ok)throw new Error(data.error ?? '설정을 저장하지 못했습니다.');
    setTower(data.tower);setTraining(data.training ?? []);await tutorial.refresh();
  }
  const searchQuery=preparePokemonNameQuery(query);
  const visible = indexed.filter(({entry,index}) => matchesPokemonNameIndex(index,searchQuery)
    && (!favoritesOnly || favorites.includes(entry.species))
    && (filter==='all' || (filter==='owned' ? unlocked.includes(entry.species) : !unlocked.includes(entry.species)))
    && (type==='all' || entry.types.includes(type) || entry.forms?.some(form=>form.kind==='selectable'&&form.types.includes(type))) && (generation==='all' || entry.generation===Number(generation))
    && matchesSpecialForm(entry,specialForm)).map(({entry})=>entry);
  const pageSize=grid.columns*grid.rows,pageCount=Math.max(1,Math.ceil(visible.length/pageSize)),currentPage=Math.min(page,pageCount-1);
  const pageEntries=visible.slice(currentPage*pageSize,(currentPage+1)*pageSize);
  const tutorialTargetIndex=followingTarget&&tutorialTarget?visible.findIndex(entry=>entry.species===tutorialTarget):-1;
  useEffect(()=>{if(tutorialTargetIndex>=0)setPage(Math.floor(tutorialTargetIndex/pageSize));},[tutorialTargetIndex,pageSize,tutorial.state?.step]);
  // Filter shortcuts preserve the current interaction region across list replacement.
  useLayoutEffect(()=>{
    const previous=shortcutCursor.current;if(!previous)return;shortcutCursor.current=null;
    if(previous.element.isConnected){selectGameCursor(previous.element);return;}
    if(previous.inList){const cards=Array.from(list.current?.querySelectorAll<HTMLElement>('.dex-card')??[]);selectGameCursor(cards.find(card=>card.dataset.species===previous.species)??cards[Math.min(previous.index,cards.length-1)]??list.current?.querySelector<HTMLElement>('[data-dex-empty-cursor]'));}
  },[favoritesOnly,filter,query,type,generation,specialForm,favorites]);
  const pageCursor=useRef<number|null>(null);
  useEffect(()=>{if(pageCursor.current===null)return;const index=pageCursor.current;const frame=requestAnimationFrame(()=>{const cards=Array.from(list.current?.querySelectorAll<HTMLButtonElement>('.dex-card') ?? []);pageCursor.current=null;selectGameCursor(cards[Math.min(index,cards.length-1)]);});return ()=>cancelAnimationFrame(frame);},[currentPage,grid.columns,grid.rows]);
  function focusList(){selectGameCursor(list.current?.querySelector<HTMLButtonElement>('.dex-card.selected')??list.current?.querySelector<HTMLButtonElement>('.dex-card'));}
  function openStart(){if(!busy&&!starting&&!activeRun&&party.length===3)setConfirmStart(true);}
  useGameKeyboard('.dex-toolbar input,.dex-toolbar button,.dex-list .dex-card,.dex-list [data-dex-empty-cursor],.dex-right-panel button,.dex-nav button,.dex-bottom button',grid.columns,!starting,(event,cursor,select)=>{
    const focused=cursor,card=focused?.matches('.dex-card'),key=event.key.toLowerCase();
    if(key==='f'){event.preventDefault();if(!event.repeat&&!busy)void toggleFavorite(selected);return true;}
    if(key==='v'){event.preventDefault();if(!event.repeat&&!busy){rememberShortcut(cursor);setPage(0);setFavoritesOnly(value=>!value);}return true;}
    if(key==='r'){event.preventDefault();if(!event.repeat&&!busy&&hasFilters){rememberShortcut(cursor);resetFilters();}return true;}
    const toolbar=Array.from(document.querySelectorAll<HTMLButtonElement>('.dex-toolbar input,.dex-toolbar button')).filter(button=>!button.disabled);
    const partyButtons=Array.from(document.querySelectorAll<HTMLButtonElement>('.dex-right-panel [data-party-slot]')).filter(button=>!button.disabled);
    if(focused?.closest('.dex-toolbar')&&event.key.startsWith('Arrow')){
      event.preventDefault();const index=toolbar.indexOf(focused);
      if(event.key==='ArrowDown')focusList();
      else if(event.key==='ArrowUp')select(document.querySelector('[data-settings-choice="challenge-rule"]'));
      else select(toolbar[Math.max(0,Math.min(toolbar.length-1,index+(event.key==='ArrowRight'?1:-1)))]);
      return true;
    }
    if(focused?.matches('[data-dex-empty-cursor]')){if(event.key.startsWith('Arrow')||['enter','z'].includes(key)){event.preventDefault();if(event.key==='ArrowUp')select(document.querySelector('[data-dex-filter="search"]'));else if(event.key==='ArrowDown')select(partyButtons[0]);return true;}}
    // Enter starts a complete party; Z keeps the card/party menu available for edits.
    if(key==='enter'&&party.length===3&&!activeRun&&focused?.closest('.dex-list,.dex-right-panel')){event.preventDefault();if(!event.repeat)openStart();return true;}
    if(card&&(key==='enter'||key==='z')){event.preventDefault();setMenu(true);return true;}
    if(key==='x'){event.preventDefault();if(returnToBattle)router.push('/battle');else setReturnToTitle(true);return true;}
    if(['PageDown','PageUp'].includes(event.key)){event.preventDefault();if(!event.repeat){const next=Math.max(0,Math.min(pageCount-1,currentPage+(event.key==='PageDown'?1:-1)));if(next!==currentPage){pageCursor.current=0;setPage(next);}}return true;}
    if(card&&event.key.startsWith('Arrow')){
      event.preventDefault();const cards=Array.from(list.current?.querySelectorAll<HTMLButtonElement>('.dex-card')??[]),index=cards.indexOf(focused!);
      const row=Math.floor(index/grid.columns);
      if(event.key==='ArrowRight'&&((index+1)%grid.columns===0||index===cards.length-1)){if(currentPage<pageCount-1){pageCursor.current=row*grid.columns;setPage(currentPage+1);}return true;}
      if(event.key==='ArrowLeft'&&index%grid.columns===0){if(currentPage>0){pageCursor.current=row*grid.columns+grid.columns-1;setPage(currentPage-1);}return true;}
      if(event.key==='ArrowDown'&&index+grid.columns>=cards.length){select(partyButtons[0]);return true;}
      if(event.key==='ArrowUp'&&index<grid.columns){select(document.querySelector('[data-dex-filter="search"]'));return true;}
      const delta=event.key==='ArrowDown'?grid.columns:event.key==='ArrowUp'?-grid.columns:event.key==='ArrowLeft'?-1:1;
      select(cards[index+delta]??cards[index]);return true;
    }
    if(focused?.closest('.dex-right-panel')&&event.key.startsWith('Arrow')){
      event.preventDefault();const index=partyButtons.indexOf(focused!);
      if(event.key==='ArrowLeft')focusList();
      else if(event.key==='ArrowDown'&&index===partyButtons.length-1)select(document.querySelector('[data-dex-favorite-toggle]'));
      else if(event.key==='ArrowUp'&&index===0)select(document.querySelector('[data-dex-filter="search"]'));
      else if(['ArrowUp','ArrowDown'].includes(event.key))select(partyButtons[index+(event.key==='ArrowDown'?1:-1)]);
      return true;
    }
    if(focused?.closest('.dex-nav')&&event.key.startsWith('Arrow')){event.preventDefault();if(event.key!=='ArrowUp')select(document.querySelector('[data-dex-filter="search"]'));return true;}
    if(focused?.closest('.dex-bottom')&&event.key.startsWith('Arrow')){event.preventDefault();if(event.key==='ArrowUp')select(partyButtons.at(-1));else if(event.key==='ArrowLeft')focusList();return true;}
    return false;
  },cursor=>{if(cursor.dataset.species)setSelected(cursor.dataset.species);setFocusZone(cursor.closest('.dex-toolbar')?'filters':cursor.closest('.dex-right-panel')?'party':cursor.closest('.dex-nav')?'rule':'list');});
  const hasFilters=filter!=='all' || type!=='all' || generation!=='all' || specialForm!=='all' || !!query || favoritesOnly;
  function resetFilters(){setPage(0);setFavoritesOnly(false);setFilter('all');setType('all');setGeneration('all');setSpecialForm('all');setQuery('');}
  function choose(name:string) {
    if(followingTarget&&!tutorialTarget&&unlocked.includes(name))void tutorial.report('select-target',undefined,name);
    setSelected(name);
    setMenu(true);
  }
  async function start() {
    if(startLock.current || party.length!==3 || activeRun)return;
    setConfirmStart(false);const selectedRule=challengeRule(rule);startLock.current=true;setStarting(true);setError('');
    try {
      if(onStart)await onStart(party,selectedRule);
      else {
        const response=await fetch('/api/battle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'start',selected:party,rule:selectedRule})});
        const data:BattleResponse=await response.json();
        if(!response.ok)throw new Error(data.error ?? '도전을 시작하지 못했습니다.');
        if(data.battle)sessionStorage.setItem('tower-pending-intro',data.battle.id);
        router.push('/battle');
      }
    } catch(error){setError(error instanceof Error ? error.message : '도전을 시작하지 못했습니다.');}
    finally {startLock.current=false;setStarting(false);}
  }
  return <main className={`pokedex-screen dex-console dex-center ${styles.scope}`} data-dex-reorganized>
    <header className="dex-nav" aria-label="도감 정보"><div className="dex-heading"><h1>포켓몬 도감</h1><ChallengeRuleChoice value={rule} onChange={setRule}/><div className="dex-progress"><strong data-testid="dex-progress">{tower?unlocked.length:'—'} / {entries.length}</strong></div></div></header>
    {(error || startError) && <div className="error-banner" role="alert">{error || startError}<button disabled={busy} onClick={() => void refresh()}>다시 불러오기</button></div>}
    {busy && <p role="status">해금 상태를 불러오는 중…</p>}
    <div className="dex-toolbar" aria-label="도감 검색 및 필터">
      <div className="dex-search dex-filter-control"><span>검색</span><input data-dex-filter="search" data-game-text-input type="search" aria-label="이름 검색" placeholder="이름 검색" value={query} onFocus={event=>selectGameCursor(event.currentTarget)} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.nativeEvent.isComposing)return;if(event.key==='Tab')document.body.dataset.gameInput='native';if(['ArrowLeft','ArrowRight'].includes(event.key) && !event.shiftKey){event.preventDefault();event.stopPropagation();const controls=Array.from(document.querySelectorAll<HTMLInputElement|HTMLButtonElement>('.dex-toolbar input,.dex-toolbar button')).filter(control=>!control.disabled),index=controls.indexOf(event.currentTarget),next=(index+(event.key==='ArrowRight'?1:controls.length-1))%controls.length;selectGameCursor(controls[next]);return;}if(event.key==='ArrowUp'){event.preventDefault();event.stopPropagation();selectGameCursor(document.querySelector('[data-settings-choice="challenge-rule"]'));return;}if(['Enter','ArrowDown','Escape'].includes(event.key)){event.preventDefault();event.stopPropagation();selectGameCursor(list.current?.querySelector<HTMLButtonElement>('.dex-card') ?? document.querySelector<HTMLButtonElement>('[data-dex-filter="display"]'));}}}/><button className="dex-search-reset" data-dex-filter="search-reset" aria-label="검색 초기화" disabled={!query||busy||starting} onClick={()=>{setQuery('');requestAnimationFrame(()=>selectGameCursor(document.querySelector('[data-dex-filter="search"]')));}}>초기화</button></div>
      <div className="dex-filters">{(['display','type','generation','special'] as const).map(kind=>{const title=kind==='display' ? '표시' : kind==='type' ? '타입' : kind==='special'?'특수 형태':'세대',value=kind==='display' ? filter : kind==='type' ? type : kind==='special'?specialForm:generation;return <div key={kind} className="dex-filter-control"><span>{title}</span><button data-dex-filter={kind} aria-label={`${title} 선택 열기`} aria-haspopup="dialog" aria-expanded={filterPanel===kind} disabled={kind==='display' && !tower} onClick={()=>setFilterPanel(kind)}><span>{filterOptions[kind].find(option=>option.value===value)?.label}</span><i>▾</i></button></div>;})}
</div>
      <div className="dex-filter-actions"><button className="dex-favorites-filter" aria-pressed={favoritesOnly} disabled={busy} onClick={()=>setFavoritesOnly(value=>!value)}>★만 보기 <kbd>V</kbd></button><button data-dex-reset onClick={resetFilters} disabled={!hasFilters}>필터 초기화 <kbd>R</kbd></button></div>
    </div>

    {filterPanel && <DexFilterDialog kind={filterPanel} title={filterPanel==='display' ? '표시' : filterPanel==='type' ? '타입' : filterPanel==='special'?'특수 형태':'세대'} value={filterPanel==='display' ? filter : filterPanel==='type' ? type : filterPanel==='special'?specialForm:generation} options={filterOptions[filterPanel]} onApply={value=>{if(filterPanel==='display')setFilter(value);else if(filterPanel==='type')setType(value);else if(filterPanel==='special')setSpecialForm(value as SpecialFormFilter);else setGeneration(value);setFilterPanel(null);}} onClose={()=>setFilterPanel(null)}/>}
    <div className="dex-layout"><div className="dex-catalog"><section ref={list} className="dex-list" data-page={currentPage+1} aria-label="포켓몬 목록" data-testid="dex-list" data-tutorial="starter-list" style={{'--dex-columns':grid.columns,'--dex-rows':grid.rows} as CSSProperties}>{pageEntries.map(entry => <div className="dex-card-wrap" key={entry.species}><button disabled={starting} className={`dex-card ${tower && !unlocked.includes(entry.species) ? 'locked' : ''} ${selected === entry.species ? 'selected' : ''} ${party.includes(entry.species) ? 'in-party' : ''}`} aria-label={`${entry.region?entry.region+' ':''}${entry.name} 상세 보기`} aria-pressed={selected === entry.species} data-species={entry.species} onClick={() => choose(entry.species)}>
      <span className="dex-card-top"><span className="dex-number">#{String(entry.nationalId??entry.id).padStart(3,'0')}</span>{party.includes(entry.species) ? <span className="dex-party-order">{party.indexOf(entry.species)+1}</span> : null}</span><Picture shiny={training.find(t=>t.species===entry.species)?.profile.shiny} forme={training.find(t=>t.species===entry.species)?.profile.forme} entry={entry} animated={selected===entry.species}/><strong>{entry.name}</strong><Types types={entry.types}/><span className="dex-card-bottom"><small>{entry.region&&<span className="dex-region-label">{entry.region}</span>}{entry.generation}세대</small><span>{entry.canMega && <i title="메가진화 가능">M</i>}{entry.canGigantamax && <i title="거다이맥스 가능">G</i>}</span></span>
    </button>{favorites.includes(entry.species)&&<button className="dex-favorite active" aria-label={`${entry.name} 즐겨찾기 해제`} aria-pressed={true} title="즐겨찾기 해제 · F" disabled={busy||starting||favoriteBusy!==null} onClick={()=>void toggleFavorite(entry.species)}><span aria-hidden="true">★</span></button>}</div>)}{visible.length === 0 && <div className="dex-empty" data-dex-empty-cursor tabIndex={-1} role="group" aria-label="포켓몬 목록 · 검색 결과 없음"><span>⌕</span><p>조건에 맞는 포켓몬이 없습니다.</p><small>이름을 바꾸거나 필터를 초기화해 보세요.</small></div>}</section></div>
    <section className="dex-partner-display" aria-label="선택한 포켓몬" data-testid="dex-partner-display">
      <header><span>No. {String(current.nationalId??current.id).padStart(3,'0')}</span><span className="dex-partner-origin">{current.region&&<span className="dex-region-label">{current.region}</span>}{current.generation}세대</span></header>
      <div className="dex-partner-stage"><PokemonImage shiny={saved?.profile.shiny} id={current.id} spriteKey={selectedPreview?.spriteKey??species[current.species]?.spriteKey??current.id} name={shownCurrent.name} animated maxPixelScale={2} width={160} height={160} fallback={<span className="dex-image-fallback">◇</span>}/></div>
      <h2>{shownCurrent.name}<PokemonGenderIcon gender={saved?.profile.gender}/>{saved?.profile.shiny ? ' ✦' : ''}</h2><Types types={shownCurrent.types}/>
      <div className="dex-partner-stats"><span>종족값</span><BaseStatRadar stats={shownCurrent.baseStats}/></div><dl className="dex-partner-traits"><div><dt>특성</dt><dd>{abilityNames[saved?.profile.ability??current.ability]??current.ability}</dd></div><div><dt>성격</dt><dd>{natures.find(nature=>nature.id===(saved?.profile.nature??'Serious'))?.name??'성실'}</dd></div></dl>
      {(()=>{const allowed=teraTypesForSpecies(current.species),tera=saved?.profile.teraType??(allowed.length===1?allowed[0]:Object.keys(teraNames).find(t=>teraNames[t]===current.types[0])??'Normal');return <div className="dex-partner-tera"><span>테라스탈 타입</span><strong style={{color:teraColors[tera]}}><TeraTypeIcon type={tera} size={32}/>{teraNames[tera]}</strong></div>;})()}
    </section>
    <PokedexParty party={party} entries={entries} training={training} disabled={starting} onOpen={name=>{setSelected(name);setPartyMenu(name);}} onBrowse={focusList}/></div>
    {confirmStart&&<PokedexDialog title="도전을 시작하시겠습니까?" className="dex-start-dialog" returnFocus=".dex-card.selected" initialFocus="[data-confirm-no]" onClose={()=>setConfirmStart(false)}><p>{party.map(name=>entries.find(entry=>entry.species===name)?.name??name).join(' · ')} · {battleRules[challengeRule(rule)].name}</p><GameChoiceList><GameChoice data-tutorial="start-battle" data-confirm-yes disabled={busy||starting||!!activeRun} onClick={()=>void start()}>예</GameChoice><GameChoice data-confirm-no data-initial-focus onClick={()=>setConfirmStart(false)}>아니요</GameChoice></GameChoiceList></PokedexDialog>}
    {returnToTitle && <PokedexDialog title="타이틀 화면으로 돌아가시겠습니까?" onClose={()=>setReturnToTitle(false)}><div className="dex-action-options"><button data-initial-focus onClick={()=>setReturnToTitle(false)}>계속하기</button><button onClick={()=>router.push('/')}>타이틀로 돌아가기</button></div></PokedexDialog>}
    {inspecting && <PokedexDialog pokemonSpecies={current.species} title={`${current.name} 기본 정보`} large onClose={()=>setInspecting(false)}><div data-tutorial="pokemon-info"><PokemonSummary key={`${current.species}:${saved?.revision??'loading'}`} entry={current} profile={saved?.profile} formOptions={saved?.formOptions}/></div></PokedexDialog>}
    {partyMenu && <PokedexDialog title={`${current.name} 파티 메뉴`} onClose={()=>setPartyMenu(null)}><div className="dex-action-options"><button aria-label="파티에서 제외" data-initial-focus onClick={()=>{changeParty(party.filter(name=>name!==partyMenu));setPartyMenu(null);}}><b>01</b><span><strong>파티에서 제외</strong></span></button><button aria-label="포켓몬 설정" onClick={()=>{setPartyMenu(null);setSettingsMenu(true);}}><b>02</b><span><strong>포켓몬 설정</strong></span></button><button aria-label="취소" onClick={()=>setPartyMenu(null)}><b>03</b><span><strong>취소</strong></span></button></div></PokedexDialog>}
    {menu && <PokemonActions pokemonSpecies={current.species} gender={saved?.profile.gender} shiny={saved?.profile.shiny} entry={shownCurrent} canChoose={!!saved && party.length<3 && !party.includes(current.species)} canAdjust={!!saved} chosen={party.includes(current.species)} full={party.length>=3} onChoose={()=>{if(party.includes(current.species))changeParty(party.filter(name=>name!==current.species));else if(party.length<3){changeParty([...party,current.species]);if(party.length===2&&!activeRun)setConfirmStart(true);}setMenu(false);}} onAdjust={()=>{setMenu(false);setAdjusting(true);}} onInfo={()=>{setMenu(false);setInspecting(true);void tutorial.report('info-open',undefined,current.species);}} onClose={()=>setMenu(false)}/>}

    {(settingsMenu||adjusting)&&saved&&tower&&<PokemonSettings key={saved.species} entry={saved} pokemon={current} points={tower.growthPoints} onSave={saveTraining} returnFocus={settingsMenu?`[data-party-slot="${party.indexOf(current.species)}"]`:'.dex-card[aria-pressed="true"]'} onClose={()=>{setSettingsMenu(false);setAdjusting(false);}}/>}
    <GameMenuBar controls={focusZone==='filters'?[{key:'← / →',label:'항목 이동'},{key:'Enter / Z',label:'선택'},{key:'↓',label:'목록'}]:focusZone==='rule'?[{key:'Enter / Z',label:'룰 선택'},{key:'↓',label:'검색'}]:party.length===3&&!activeRun?[{key:'Enter',label:'도전 시작'},{key:'Z',label:'선택·해제'},{key:'X',label:'뒤로'}]:[{key:'Enter / Z',label:'선택'},{key:'X',label:'뒤로'}]}>{tutorial.state?.step===TutorialStep.StartBattle&&party.length===3&&!confirmStart&&<button data-tutorial="start-battle" onClick={openStart}>도전 시작</button>}<button className="dex-footer-favorite" data-dex-favorite-toggle disabled={busy||starting||favoriteBusy!==null} aria-pressed={favorites.includes(selected)} onClick={()=>void toggleFavorite(selected)}>★ {favorites.includes(selected)?'등록 해제':'즐겨찾기'} <kbd>F</kbd></button></GameMenuBar>
  </main>;
}

export default function Pokedex(props:Parameters<typeof PokedexContent>[0]){return <GameMenuProvider><PokedexContent {...props}/></GameMenuProvider>;}
