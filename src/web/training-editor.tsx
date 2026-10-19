'use client';
import {GameAdjustRow,GameChoice,GameChoiceList,GameMenuFooter} from './game-menu';
import {genderNames} from '../data/gender';
import {useEffect,useState} from 'react';
import {FormEditor} from './form-editor';
import {teraTypesForSpecies,teraNames,type TeraType} from '../data/tera';
import {TeraTypeIcon} from './tera-type-icon';
import {statKeys,statNames,trainingCost,natures,natureLabel,trainedStat,type TrainingView,type TrainingProfile,type StatKey} from '../data/training';
import {abilityNames} from './pokedex-data';
import {moves} from './catalog';
import {NatureMatrix} from './nature-matrix';
import {StatRadar} from './stat-radar';
import {PokedexDialog} from './pokedex-dialog';
import {TypeBadge} from './type-badge';
import abilityDescriptions from '../data/ability-descriptions.json' with {type:'json'};
import styles from './styles/training-wallet.module.css';

export function TrainingEditor({entry,points,onSave,showMoves=true,inRun=false}:{inRun?:boolean;entry:TrainingView;points:number;onSave:(entry:TrainingView,profile:TrainingProfile)=>Promise<void>;showMoves?:boolean}) {
  const [draft,setDraft]=useState(()=>structuredClone(entry.profile));
  const [tab,setTab]=useState('stats');
  const [moveSlot,setMoveSlot]=useState<number|null>(null);
  const [picker,setPicker]=useState<'nature'|'ability'|'tera'|'gender'|null>(null);
  const tabs=[['stats','능력치'],['traits','성격·특성·테라스탈'],...(!inRun&&entry.formOptions?.length?[['forms','모습 설정']]:[]),...(showMoves?[['moves','기술']]:[])];
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{setDraft(structuredClone(entry.profile));},[entry.revision]);
  const formOption=entry.formOptions?.find(form=>form.species===(draft.forme??entry.species));
  const shownEntry={...entry,baseStats:formOption?.baseStats??entry.baseStats,abilities:formOption?.abilities??entry.abilities};
  const total=statKeys.reduce((sum,key)=>sum+draft.evs[key],0),cost=trainingCost(draft.forme!==entry.profile.forme&&formOption?{...entry.profile,ability:formOption.settings?.ability??formOption.ability}:entry.profile,draft);
  const valid=total<=66 && natures.some(nature=>nature.id===draft.nature) && new Set(draft.moves).size===4 && statKeys.every(key=>Number.isInteger(draft.evs[key]) && draft.evs[key]>=0 && draft.evs[key]<=32);
  const changed=JSON.stringify(draft)!==JSON.stringify(entry.profile),nature=natures.find(value=>value.id===draft.nature);
  function updatePoints(key:StatKey,value:number|((current:number)=>number)) {
    setDraft(current=>{
      const requested=typeof value==='function'?value(current.evs[key]):value;
      if(!Number.isFinite(requested))return current;
      const otherTotal=statKeys.reduce((sum,stat)=>sum+(stat===key ? 0 : current.evs[stat]),0);
      return {...current,evs:{...current.evs,[key]:Math.max(0,Math.min(32,66-otherTotal,Math.trunc(requested)))}};
    });
  }
  async function save(){setBusy(true);setMessage('');try{await onSave(entry,draft);}catch(error){setMessage(error instanceof Error ? error.message : '저장하지 못했습니다.');}finally{setBusy(false);}}
  return <section className="training-editor" data-tab-scope data-testid="training-editor" aria-label="포켓몬 영구 설정">
    {inRun&&<div className={styles.wallet} role="status" aria-label="보유 성장 포인트"><span>보유 성장 포인트 <small>영구 재화</small></span><strong data-testid="training-growth-wallet">{points.toLocaleString()}P</strong></div>}
    <div className="training-tabs" role="tablist" aria-label="육성 설정 종류" data-game-tabs>{tabs.map(([id,label])=><button key={id} id={`training-tab-${id}`} role="tab" aria-selected={tab===id} aria-controls={`training-panel-${id}`} onClick={()=>setTab(id)}>{label}</button>)}</div>

    <div role="tabpanel" id="training-panel-stats" aria-labelledby="training-tab-stats" hidden={tab!=='stats'}><div className="training-top-layout"><StatRadar entry={shownEntry} profile={draft}/><div className="training-point-panel">
    <div className="training-section-title"><h3>능력치 육성</h3>{!inRun&&<span>Lv.50</span>}</div>
    <div className="training-budget"><div><span>능력 포인트</span><strong data-testid="stat-point-total" aria-live="polite">{total}<small> / 66</small></strong></div><div className="training-budget-track"><i style={{width:`${total/66*100}%`}}/></div></div>
    <div className="training-stat-labels"><span>능력치</span><span>종족값</span><span>개체값</span><span>노력치</span><span>최종값</span></div>
    <div className="training-stat-list" aria-label="레벨 50 실제 능력치">{statKeys.map(key=>{
      const maximum=Math.min(32,66-total+draft.evs[key]);
      const stat=trainedStat(shownEntry.baseStats[key],draft.ivs[key],draft.evs[key],key,draft.nature);
      return <GameAdjustRow className="training-stat training-stat-select game-choice" key={key} data-training-stat={key} data-maxed={draft.evs[key]===32 || undefined} disabled={busy} aria-label={`${statNames[key]} 노력치 조정`} title="행 왼쪽 클릭: 감소 · 오른쪽 클릭: 증가 · 방향키 ←/→ 조정" onAdjust={delta=>updatePoints(key,value=>value+delta)}><span className="training-stat-name">{statNames[key]}</span><span className="training-base-value">{shownEntry.baseStats[key]}</span><span title={`${statNames[key]} 개체값 ${draft.ivs[key]} / 31`} className={`training-iv-value ${draft.ivs[key]===31?'iv-perfect':''}`}>{draft.ivs[key]}<small> / 31</small></span><span className="training-point-value"><span aria-hidden="true">◂</span><output aria-label={`${statNames[key]} 능력 포인트`} data-point-value={key}>{draft.evs[key]}</output><span aria-hidden="true">▸</span></span><strong data-stat={key} className={`training-stat-value ${nature?.plus===key?'stat-up':nature?.minus===key?'stat-down':''}`}>{stat}</strong></GameAdjustRow>;
    })}</div>
    </div></div></div>
    <div role="tabpanel" id="training-panel-traits" aria-labelledby="training-tab-traits" hidden={tab!=='traits'}>
    <div className="training-choice training-gender"><span>성별</span><button className="training-trait-button" data-trait="gender" aria-label="성별 선택" disabled={busy || (entry.genders?.length ?? 1)<2} onClick={()=>setPicker("gender")}>{genderNames[draft.gender ?? entry.genders?.[0] ?? "N"]}<span>{(entry.genders?.length ?? 1)<2?"고정":"선택 ▸"}</span></button></div>
    <div className="training-choice training-nature"><span>성격</span><button className="training-trait-button" data-trait="nature" aria-label="성격 선택" disabled={busy} onClick={()=>setPicker('nature')}>{natureLabel(draft.nature)}<span>선택 ▸</span></button></div>
    <div className="training-choice training-ability"><span>특성</span><button className="training-trait-button" data-trait="ability" aria-label="특성 선택" disabled={busy} onClick={()=>setPicker('ability')}>{abilityNames[draft.ability] ?? draft.ability}<span>선택 ▸</span></button></div>
    <div className="training-choice training-tera"><span><TeraTypeIcon type={draft.teraType ?? 'Normal'} size={32}/>테라스탈</span><button className="training-trait-button" data-trait="tera" aria-label="테라스탈 선택" disabled={busy} onClick={()=>setPicker('tera')}>{teraNames[draft.teraType ?? 'Normal']}<span>선택 ▸</span></button></div></div>
    {picker==='gender' && <PokedexDialog title="성별 선택" className="training-picker" returnFocus='.training-trait-button[data-trait="gender"]' onClose={()=>setPicker(null)}><p>성별 변경은 무료이며 저장한 설정부터 적용합니다.</p><div className="training-ability-options">{entry.genders?.map(gender=><button key={gender} aria-pressed={draft.gender===gender} onClick={()=>{setDraft(current=>({...current,gender}));setPicker(null);}}>{gender==='M'?'♂':'♀'} {genderNames[gender]}</button>)}</div></PokedexDialog>}
    {picker==='nature' && <PokedexDialog title="성격 선택" large className="training-picker training-nature-picker dex-settings-dialog" initialFocus='.nature-matrix button[aria-pressed=true]' returnFocus='.training-trait-button[data-trait="nature"]' onClose={()=>setPicker(null)}><NatureMatrix value={draft.nature} disabled={busy} onChange={nature=>{setDraft(current=>({...current,nature}));setPicker(null);}}/></PokedexDialog>}
    {picker==='ability' && <PokedexDialog title="특성 선택" className="training-picker" returnFocus='.training-trait-button[data-trait="ability"]' onClose={()=>setPicker(null)}><div className="training-ability-options" data-keyboard-list>{shownEntry.abilities.map(ability=><button key={ability} data-initial-focus={draft.ability===ability || undefined} aria-pressed={draft.ability===ability} aria-label={abilityNames[ability] ?? ability} onClick={()=>{setDraft(current=>({...current,ability}));setPicker(null);}}><strong>{abilityNames[ability] ?? ability}</strong><small>{(abilityDescriptions as Record<string,string>)[ability]}</small></button>)}</div></PokedexDialog>}
    {picker==='tera' && <PokedexDialog title="테라스탈 선택" className="training-picker" returnFocus='.training-trait-button[data-trait="tera"]' onClose={()=>setPicker(null)}><div className="training-tera-options" data-keyboard-grid>{teraTypesForSpecies(draft.forme??entry.species).map(type=><button key={type} data-initial-focus={(draft.teraType ?? 'Normal')===type || undefined} aria-pressed={(draft.teraType ?? 'Normal')===type} aria-label={teraNames[type]} onClick={()=>{setDraft(current=>({...current,teraType:type}));setPicker(null);}}><TeraTypeIcon type={type}/><TypeBadge type={type}/></button>)}</div></PokedexDialog>}
    {showMoves && <div role="tabpanel" id="training-panel-moves" aria-labelledby="training-tab-moves" hidden={tab!=='moves'}><div className="training-section-title"><h3>기술배치</h3><span>4 SLOTS</span></div><div className="training-move-grid">{draft.moves.map((move,index)=><GameChoice className="training-move-slot" key={index} data-training-move={index} aria-label={`기술 ${index+1} 선택`} disabled={busy} onClick={()=>setMoveSlot(index)}><small>기술 {index+1}</small><strong>{moves[move]?.name??move}</strong><TypeBadge type={moves[move]?.type??'Normal'}/></GameChoice>)}</div></div>}
    {moveSlot!==null&&<PokedexDialog title={`기술 ${moveSlot+1} 선택`} returnFocus={`[data-training-move="${moveSlot}"]`} onClose={()=>setMoveSlot(null)}><GameChoiceList>{entry.unlockedMoves.map(move=><GameChoice key={move} aria-pressed={draft.moves[moveSlot]===move} data-initial-focus={draft.moves[moveSlot]===move||undefined} onClick={()=>{setDraft(current=>{const next=[...current.moves],other=next.indexOf(move);if(other>=0)next[other]=next[moveSlot];next[moveSlot]=move;return {...current,moves:next};});setMoveSlot(null);}}>{moves[move]?.name??move}</GameChoice>)}</GameChoiceList></PokedexDialog>}
    {!inRun&&entry.formOptions?.length&&<div role="tabpanel" id="training-panel-forms" aria-labelledby="training-tab-forms" hidden={tab!=='forms'}><FormEditor entry={{...shownEntry,profile:draft}} disabled={busy} onChange={setDraft}/></div>}
    <details className="training-help"><summary>육성 규칙과 비용</summary><p>능력 포인트 +1당 성장 1P · 해금한 기술배치 무료 · 특성·성격 변경 각각 50P. 모습 변경 자체는 무료입니다. 능력 포인트를 낮추면 무료이며 환불되지 않습니다.</p><p>성격 보정은 +10% / −10%이며 HP는 영향을 받지 않습니다. 개체값은 영입으로만 높일 수 있습니다. 등록된 기술 중 이 포켓몬이 배울 수 있는 기술만 표시하며 중복 기술은 저장할 수 없습니다.</p></details>
    <div className="training-save-bar"><span>{inRun?'이번 도전과 영구 도감에 함께 저장':'저장한 설정은 새 도전부터 적용'}</span><button className="primary-button" disabled={busy || !valid || !changed || points<cost} onClick={()=>void save()}>{busy ? '저장 중…' : points<cost ? `성장 포인트 부족 · ${cost}P 필요` : `${cost}P로 설정 저장`}</button></div>
    {message && <p role="alert" className="training-invalid">{message}</p>}
    <GameMenuFooter controls={tab==='stats'?[{key:'↑ / ↓',label:'능력치'},{key:'← / →',label:'노력치 조정'},{key:'Enter / Z',label:'결정'},{key:'X',label:'뒤로'}]:undefined}/>
  </section>;
}
