'use client';
import {useEffect,useRef,useState,type ReactNode,type RefObject} from 'react';
import {statKeys,statNames,natureLabel,trainedStat,trainingCost,type StatKey,type TrainingProfile,type TrainingView} from '../data/training';
import {genderNames} from '../data/gender';
import {teraTypesForSpecies,teraNames} from '../data/tera';
import {moveInfo} from '../data/move-info';
import abilityDescriptions from '../data/ability-descriptions.json' with {type:'json'};
import {abilityNames,type PokedexEntry} from './pokedex-data';
import {moves,species} from './catalog';
import {PokedexDialog} from './pokedex-dialog';
import {GameChoice,GameChoiceList,type GameControl} from './game-menu';
import {NatureMatrix} from './nature-matrix';
import {FormEditor} from './form-editor';
import {PokemonImage} from './pokemon-image';
import {TypeBadge} from './type-badge';
import {MoveCategoryBadge} from './move-category-badge';
import {TeraTypeIcon} from './tera-type-icon';
import {type GameMenuKey} from './game-keyboard';
import {settingsKeys,totalPoints,totalPointLimit,pointMaximum,withStatPoints,ownedSettingMoves} from './pokemon-settings-model';
import styles from './styles/pokemon-settings.module.css';

type Picker={kind:'ev';stat:StatKey}|{kind:'move';slot:number}|{kind:'nature'|'ability'|'tera'|'form'};
const mainControls:GameControl[]=[{key:'↑ / ↓',label:'항목 이동'},{key:'← / →',label:'영역 이동'},{key:'Enter / Z',label:'선택'},{key:'Esc / X',label:'닫기'}];
const pickerControls=(direction='방향키',action='적용'):GameControl[]=>[{key:direction,label:'이동'},{key:'Enter / Z',label:action},{key:'Esc / X',label:'취소'}];

function useMenuKeys(ref:RefObject<HTMLElement|null>,handle:(command:GameMenuKey)=>boolean){
 const callback=useRef(handle);callback.current=handle;
 useEffect(()=>{const dialog=ref.current?.closest('dialog');const listener=(event:Event)=>{if(callback.current((event as CustomEvent<GameMenuKey>).detail))event.preventDefault();};dialog?.addEventListener('game-menu-key',listener);return()=>dialog?.removeEventListener('game-menu-key',listener);},[ref]);
}

export function PokemonSettings({entry,pokemon,points,onSave,onClose,initial='stats',returnFocus='.dex-card[aria-pressed="true"]'}:{entry:TrainingView;pokemon:PokedexEntry;points:number;onSave:(entry:TrainingView,profile:TrainingProfile)=>Promise<void>;onClose:()=>void;initial?:'stats'|'moves';returnFocus?:string}){
 const [draft,setDraft]=useState(()=>structuredClone(entry.profile)),[picker,setPicker]=useState<Picker|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const root=useRef<HTMLDivElement>(null),lock=useRef(false);
 const chosenForm=entry.formOptions?.find(form=>form.species===(draft.forme??entry.species));
 const identityTypes=pokemon.forms?.find(form=>form.species===draft.forme)?.types??pokemon.types;
 const shown={...entry,baseStats:chosenForm?.baseStats??entry.baseStats,abilities:chosenForm?.abilities??entry.abilities,learnableMoves:chosenForm?.learnableMoves??entry.learnableMoves,unlockedMoves:[...new Set([...entry.unlockedMoves,...chosenForm?.selfMoves??[]])]};
 const cost=trainingCost(draft.forme!==entry.profile.forme&&chosenForm?{...entry.profile,ability:chosenForm.settings?.ability??chosenForm.ability}:entry.profile,draft),changed=JSON.stringify(entry.profile)!==JSON.stringify(draft);
 const genders=entry.genders??['N'],gender=draft.gender??genders[0],availableMoves=ownedSettingMoves(shown);
 useEffect(()=>{setDraft(structuredClone(entry.profile));},[entry.revision]);
 useMenuKeys(root,({key,cursor,select})=>{
  if(!key.startsWith('arrow'))return false;
  const rows=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-settings-column]:not(:disabled)')??[]),col=cursor?.dataset.settingsColumn;
  let next:HTMLButtonElement|undefined;
  if(col){const column=rows.filter(row=>row.dataset.settingsColumn===col),index=column.indexOf(cursor!);
   if(key==='arrowup')next=column[Math.max(0,index-1)];
   if(key==='arrowdown')next=column[index+1]??root.current?.querySelector<HTMLButtonElement>('[data-settings-save]:not(:disabled)')??cursor!;
   if(key==='arrowleft'||key==='arrowright'){const target=key==='arrowleft'?'left':'right',other=rows.filter(row=>row.dataset.settingsColumn===target);next=target===col?cursor!:other[Math.min(index,other.length-1)];}
  }else next=key==='arrowright'?rows.find(row=>row.dataset.settingsColumn==='right'):rows[0];
  select(next);return true;
 });
 async function save(){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');try{await onSave(entry,draft);setMessage('설정 저장 완료');}catch(error){setMessage(error instanceof Error?error.message:'설정을 저장하지 못했습니다.');}finally{lock.current=false;setBusy(false);}}
 const value=(key:StatKey,profile=draft)=>trainedStat(shown.baseStats[key],profile.ivs[key],profile.evs[key],key,profile.nature);
 function open(next:Picker){setPicker(next);}
 function row(id:string,column:'left'|'right',label:string,content:ReactNode,action:()=>void,disabled=false){return <GameChoice key={id} className={styles.row} data-settings-row={id} data-settings-column={column} data-initial-focus={(initial==='stats'?id==='hp':id==='move-0')||undefined} disabled={busy||disabled} aria-label={label} onClick={action}>{content}<span className={styles.chevron} aria-hidden>›</span></GameChoice>;}
 const returnRow=picker?.kind==='ev'?picker.stat:picker?.kind==='move'?`move-${picker.slot}`:picker?.kind;
 return <PokedexDialog title={`${pokemon.name} 포켓몬 설정`} context="pokemon-settings" controls={mainControls} className={`${styles.scope} ${styles.main}`} testId="pokemon-settings" returnFocus={returnFocus} large onClose={()=>{if(!lock.current)onClose();}}>
  <div ref={root} className={styles.content} aria-busy={busy}>
   <div className={styles.identity}><PokemonImage id={pokemon.id} spriteKey={chosenForm?.spriteKey??species[entry.species]?.spriteKey??pokemon.id} name={chosenForm?.name??pokemon.name} shiny={draft.shiny} animated width={112} height={112} maxPixelScale={2} fallback={<span>◇</span>}/><div><small>No. {String(pokemon.nationalId??pokemon.id).padStart(3,'0')}</small><strong>{chosenForm?.name??pokemon.name}{draft.shiny?' ✦':''}</strong><span>{genderNames[gender]} · {identityTypes.join(' / ')}</span></div>{!!entry.formOptions?.length&&<GameChoice className={styles.form} data-settings-row="form" disabled={busy} onClick={()=>open({kind:'form'})}>모습 설정 ›</GameChoice>}<div className={styles.budget}><span>능력 포인트 <b>{totalPoints(draft)} / {totalPointLimit}</b></span><span>보유 성장 <b>{points.toLocaleString()}P</b></span></div></div>
   <div className={styles.columns}>
    <section className={styles.column} aria-label="기본 능력치와 개체 세팅"><h3>기본 능력치 <small>현재 수치 / 배분 / 개체값</small></h3>
     {statKeys.map(key=>row(key,'left',`${statNames[key]} 조절`,<><span>{statNames[key]}</span><b>{value(key)}</b><span className={styles.allocation}><i style={{width:`${draft.evs[key]/32*100}%`}}/></span><small>+{draft.evs[key]}</small><small className={styles.iv}>IV {draft.ivs[key]}</small></>,()=>open({kind:'ev',stat:key})))}
     {row('nature','left','성격 선택',<><span>성격</span><strong>{natureLabel(draft.nature)}</strong></>,()=>open({kind:'nature'}))}
     {row('gender','left','성별 바꾸기',<><span>성별 바꾸기</span><strong>{genderNames[gender]}</strong>{genders.length<2&&<small>{gender==='N'?'변경 불가':'고정'}</small>}</>,()=>setDraft(current=>({...current,gender:genders[(genders.indexOf(gender)+1)%genders.length]})),genders.length<2)}
    </section>
    <section className={styles.column} aria-label="전투 세팅"><h3>전투 세팅 <small>보유 기술 배치</small></h3>
     {Array.from({length:4},(_,slot)=>{const name=draft.moves[slot],info=moveInfo[name];return row(`move-${slot}`,'right',`기술 ${slot+1} 선택`,<><small>기술 {slot+1}</small><strong>{moves[name]?.name??name??(slot>draft.moves.length?'앞 칸부터 배치':'빈 기술 칸')}</strong>{info&&<span className={styles.moveMeta}><TypeBadge type={info.type}/><MoveCategoryBadge category={info.category}/><small>위력 {info.power||'—'}</small></span>}</>,()=>open({kind:'move',slot}),slot>draft.moves.length||(!name&&!availableMoves.some(move=>!draft.moves.includes(move))));})}
     {row('ability','right','특성 선택',<><span>특성</span><strong>{abilityNames[draft.ability]??draft.ability}</strong></>,()=>open({kind:'ability'}))}
     {row('tera','right','테라스탈 선택',<><span>테라스탈</span><TeraTypeIcon type={draft.teraType??'Normal'} size={26}/><strong>{teraNames[draft.teraType??'Normal']}</strong></>,()=>open({kind:'tera'}))}
    </section>
   </div>
   <div className={styles.save}><div><span>저장한 설정은 새 도전부터 적용</span><small>배분 +1당 1P · 성격 / 특성 변경 각각 50P · 감소 시 환불 없음</small></div><GameChoice data-settings-save className={styles.apply} disabled={busy||!changed||points<cost} onClick={()=>void save()}>{busy?'저장 중…':points<cost?`성장 ${cost}P 필요`:`${cost}P로 설정 저장`}</GameChoice></div>
   <p className={styles.message} role="status">{message||(!changed?'저장된 설정':'변경 사항을 저장해 주세요.')}</p>
  </div>
  {picker&&<SettingsPicker picker={picker} entry={shown} draft={draft} pokemon={pokemon} onApply={profile=>{setDraft(profile);setMessage('');setPicker(null);}} onClose={()=>setPicker(null)} returnFocus={`[data-settings-row="${returnRow}"]`}/>}
 </PokedexDialog>;
}

function SettingsPicker({picker,entry,draft,pokemon,onApply,onClose,returnFocus}:{picker:Picker;entry:TrainingView;draft:TrainingProfile;pokemon:PokedexEntry;onApply:(profile:TrainingProfile)=>void;onClose:()=>void;returnFocus:string}){
 const root=useRef<HTMLDivElement>(null),[amount,setAmount]=useState(picker.kind==='ev'?draft.evs[picker.stat]:0);
 const kind=picker.kind,titles={ev:'능력 포인트 조절',nature:'성격 선택',move:'보유 기술 선택',ability:'특성 선택',tera:'테라스탈 선택',form:'모습 설정'};
 const controls=kind==='ev'?[{key:'← / →',label:'수치 조절'},{key:settingsKeys.min.toUpperCase(),label:'MIN'},{key:settingsKeys.max.toUpperCase(),label:'MAX'},{key:'Enter / Z',label:'적용'},{key:'Esc / X',label:'취소'}]:pickerControls(kind==='move'||kind==='ability'?'↑ / ↓':'방향키',kind==='move'?'장착':'적용');
 const edited=picker.kind==='ev'?withStatPoints(draft,picker.stat,amount):draft;
 const maximum=picker.kind==='ev'?pointMaximum(draft,picker.stat):0;
 useMenuKeys(root,({key,event})=>{
  if(picker.kind!=='ev')return false;
  if(key==='arrowleft'||key==='arrowright'){setAmount(current=>Math.max(0,Math.min(maximum,current+(key==='arrowright'?1:-1))));return true;}
  if(key===settingsKeys.min){setAmount(0);return true;}
  if(key===settingsKeys.max){setAmount(maximum);return true;}
  if(key==='enter'||key==='z'){if(!event.repeat)onApply(edited);return true;}
  return false;
 });
 return <PokedexDialog title={titles[kind]} context={kind==='ev'?'ev-editor':`${kind}-picker`} controls={controls} className={`${styles.scope} ${styles.picker} ${kind==='nature'?styles.nature:''}`} large={kind==='nature'||kind==='move'} returnFocus={returnFocus} onClose={onClose} testId={`${kind}-picker`}>
  <div ref={root} className={styles.pickerContent}>
   {picker.kind==='ev'&&<><div className={styles.statHero}><span>{statNames[picker.stat]}</span><strong>{trainedStat(entry.baseStats[picker.stat],draft.ivs[picker.stat],amount,picker.stat,draft.nature)}</strong><small>현재 능력치 · 개체값 {draft.ivs[picker.stat]}</small></div><div className={styles.pointSummary}><span>투자 포인트 <b data-testid="ev-amount">{amount}</b></span><span>전체 사용 <b data-testid="ev-total">{totalPoints(edited)} / {totalPointLimit}</b></span></div><div className={styles.gauge}><GameChoice aria-label="MIN" onClick={()=>setAmount(0)}>MIN</GameChoice><input aria-label={`${statNames[picker.stat]} 투자 포인트`} type="range" min={0} max={maximum} value={amount} onChange={event=>setAmount(Number(event.target.value))} onKeyDown={event=>{const key=event.key.toLowerCase();if(['arrowleft','arrowright',settingsKeys.min,settingsKeys.max,'enter','z','escape','x'].includes(key)){event.preventDefault();event.stopPropagation();if(key==='escape'||key==='x')onClose();else if(key==='enter'||key==='z'){if(!event.repeat)onApply(edited);}else if(key===settingsKeys.min)setAmount(0);else if(key===settingsKeys.max)setAmount(maximum);else setAmount(current=>Math.max(0,Math.min(maximum,current+(key==='arrowright'?1:-1))));}}}/><GameChoice aria-label="MAX" onClick={()=>setAmount(maximum)}>MAX</GameChoice></div><p className={styles.limit}>항목 최대 32 · 남은 배분 {totalPointLimit-totalPoints(edited)} · 증가 비용 {Math.max(0,amount-draft.evs[picker.stat])}P</p><GameChoice className={styles.apply} data-initial-focus onClick={()=>onApply(edited)}>적용</GameChoice></>}
   {kind==='nature'&&<NatureMatrix value={draft.nature} onChange={nature=>onApply({...draft,nature})}/>}
   {picker.kind==='move'&&<><p className={styles.caption}>{pokemon.name} · 기술 {picker.slot+1}에 배치할 보유 기술</p><GameChoiceList className={styles.moveList}>{ownedSettingMoves(entry).map(name=>{const info=moveInfo[name],other=draft.moves.findIndex((move,index)=>move===name&&index!==picker.slot),current=draft.moves[picker.slot]===name;return <GameChoice className={styles.moveCard} key={name} data-move={name} aria-pressed={current} data-initial-focus={current||undefined} disabled={other>=0} onClick={()=>{const next=[...draft.moves];next[picker.slot]=name;onApply({...draft,moves:next});}}><span className={styles.moveTitle}><strong>{moves[name]?.name??name}</strong>{other>=0?<small>이미 장착됨 · 기술 {other+1}</small>:current?<small>현재 장착</small>:null}</span>{info&&<><span className={styles.moveMeta}><TypeBadge type={info.type}/><MoveCategoryBadge category={info.category}/><small>위력 {info.power||'—'} · 명중 {info.accuracy===true?'필중':info.accuracy} · PP {info.pp}</small></span><span className={styles.description}>{info.description}</span></>}</GameChoice>;})}</GameChoiceList>{!ownedSettingMoves(entry).length&&<p>현재 배치할 수 있는 보유 기술이 없습니다.</p>}</>}
   {kind==='ability'&&<GameChoiceList>{entry.abilities.map(ability=><GameChoice className={styles.moveCard} key={ability} aria-pressed={draft.ability===ability} data-initial-focus={draft.ability===ability||undefined} onClick={()=>onApply({...draft,ability})}><strong>{abilityNames[ability]??ability}</strong><span className={styles.description}>{(abilityDescriptions as Record<string,string>)[ability]??'특성 설명이 준비되지 않았습니다.'}</span></GameChoice>)}</GameChoiceList>}
   {kind==='tera'&&<GameChoiceList grid className={styles.teraGrid}>{teraTypesForSpecies(draft.forme??entry.species).map(type=><GameChoice className={styles.tera} key={type} aria-label={teraNames[type]} aria-pressed={draft.teraType===type} data-initial-focus={draft.teraType===type||undefined} onClick={()=>onApply({...draft,teraType:type})}><TeraTypeIcon type={type} size={30}/><TypeBadge type={type}/></GameChoice>)}</GameChoiceList>}
   {kind==='form'&&<FormPicker entry={{...entry,profile:draft}} onApply={onApply}/>}
  </div>
 </PokedexDialog>;
}
function FormPicker({entry,onApply}:{entry:TrainingView;onApply:(profile:TrainingProfile)=>void}){
 const [profile,setProfile]=useState(entry.profile);
 return <><FormEditor entry={{...entry,profile}} onChange={setProfile}/><GameChoice className={styles.apply} onClick={()=>onApply(profile)}>모습 적용</GameChoice></>;
}
