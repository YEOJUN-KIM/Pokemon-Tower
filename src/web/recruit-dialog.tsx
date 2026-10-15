'use client';
import {selectGameCursor} from './game-keyboard';

import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {pokemonName, spriteUrl, moves} from './catalog';
import {effect} from './game-audio';
import {PokedexDialog} from './pokedex-dialog';
import {statKeys,statNames,type StatBlock,type IVGain,type MoveSwap,type MoveGain} from '../data/training';

function partnerWithParticle(name:string,subject=false) {
  const text=pokemonName(name);
  const last=text.charCodeAt(text.length-1)-0xac00;
  const hasFinal=last >= 0 && last <= 11171 && last % 28 !== 0;
  return `${text}${subject ? hasFinal ? '이' : '가' : hasFinal ? '을' : '를'}`;
}

function PartnerImage({name}: {name:string}) {
  const [failed,setFailed]=useState(false);
  return failed ? <span className="recruit-image-fallback" aria-label={pokemonName(name)}>◉</span> : <img src={spriteUrl(name)} alt={pokemonName(name)} width={120} height={120} onError={()=>setFailed(true)} />;
}

export function RecruitReplacementPicker({chosen,roster,busy,onCancel,onChoose}:{chosen:string;roster:string[];busy:boolean;onCancel:()=>void;onChoose:(name:string)=>void}){
  return <PokedexDialog title="교체할 포켓몬 선택" large returnFocus="[data-recruit-continue]" onClose={onCancel}>
    <div className="recruit-replacement" data-testid="recruit-replacement-picker">
      <p>{partnerWithParticle(chosen)} 맞이할 자리를 골라주세요.</p>
      <div className="recruit-replacement-grid">{roster.map((name,index)=><button className="pokemon-choice" key={name} data-initial-focus={index===0 ? true : undefined} data-replace-species={name} aria-label={`${pokemonName(name)} 교체 선택`} disabled={busy} onClick={()=>onChoose(name)}><PartnerImage name={name}/><strong>{pokemonName(name)}</strong></button>)}</div>
      <p className="selection-note">교체된 포켓몬의 영구 도감 해금은 유지됩니다.</p>
      <button className="secondary-button" onClick={onCancel}>돌아가기</button>
    </div>
  </PokedexDialog>;
}

export function RecruitConfirmation({archiveOnly=false,newSpecies=false,chosen,replaced,incoming,previous,alreadyOwned=false,incomingMoves=[],knownMoves=[],currentMoves=[],onCancel,onConfirm}: {archiveOnly?:boolean;newSpecies?:boolean;chosen:string;replaced:string | null;incoming?:StatBlock;previous?:StatBlock;alreadyOwned?:boolean;incomingMoves?:string[];knownMoves?:string[];currentMoves?:string[];onCancel:()=>void;onConfirm:(swap?:MoveSwap)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const element=dialog.current;element?.showModal();selectGameCursor(element?.querySelector<HTMLButtonElement>('.recruit-dialog-actions .primary-button'));return ()=>element?.close();},[]);
  return <dialog ref={dialog} className="recruit-dialog" data-testid="recruit-confirmation" aria-labelledby="recruit-confirm-title" onCancel={event=>{event.preventDefault();event.stopPropagation();onCancel();}}>
    <span className={newSpecies ? "recruit-new-species" : "recruit-known-species"}>{newSpecies ? "새 포켓몬 · 첫 도감 등록" : "이미 도감에 등록한 포켓몬"}</span>
    <h2 id="recruit-confirm-title">{archiveOnly ? `${partnerWithParticle(chosen)} 도감에 등록할까요?` : alreadyOwned ? `${pokemonName(chosen)}의 개체값과 기술을 이어받을까요?` : replaced ? '이 포켓몬과 교체하겠습니까?' : `${partnerWithParticle(chosen)} 영입할까요?`}</h2>
    <div className="recruit-confirm-partners">{replaced && <><div><PartnerImage name={replaced} /><strong>{pokemonName(replaced)}</strong><small>이번 도전에서 내보내기</small></div><span aria-hidden="true">→</span></>}<div><PartnerImage name={chosen} /><strong>{pokemonName(chosen)}</strong><small>{archiveOnly ? '도감에 등록' : '새로운 동료'}</small></div></div>
    <p>{archiveOnly ? '도감에 등록하고, 다음 도전부터 선택할 수 있습니다.' : alreadyOwned ? '보유한 동료의 개체값과 기술을 이어받습니다.' : replaced ? '선택한 멤버와 교체합니다. 두 포켓몬 모두 도감에 남습니다.' : '이번 도전의 동료로 합류하고, 도감에도 등록됩니다.'}</p>
    {!archiveOnly && incoming && previous && <details className="recruit-iv-details"><summary>개체값 비교</summary><div className="stat-table-scroll"><table className="growth-stat-table" aria-label="영입 개체값 비교"><thead><tr><th>개체값</th>{statKeys.map(stat=><th key={stat}>{statNames[stat]}</th>)}<th>합계</th></tr></thead><tbody><tr><th>현재 도감</th>{statKeys.map(stat=><td key={stat}>{previous[stat]}</td>)}<td>{statKeys.reduce((sum,stat)=>sum+previous[stat],0)}</td></tr><tr><th>상대</th>{statKeys.map(stat=><td key={stat}>{incoming[stat]}</td>)}<td>{statKeys.reduce((sum,stat)=>sum+incoming[stat],0)}</td></tr><tr><th>영입 후</th>{statKeys.map(stat=><td key={stat} className={incoming[stat]>previous[stat] ? 'improved-iv' : ''}>{Math.max(previous[stat],incoming[stat])}{incoming[stat]>previous[stat] ? ' ↑' : ''}</td>)}<td>{statKeys.reduce((sum,stat)=>sum+Math.max(previous[stat],incoming[stat]),0)}</td></tr></tbody></table><p className="iv-comparison-note">높은 값만 이어받으며, 기존 도감 개체값은 낮아지지 않습니다.</p></div></details>}
    <div className="recruit-collection-summary" aria-label="등록할 포켓몬과 기술"><strong>포켓몬: {newSpecies ? "새 도감 등록" : "기존 도감 갱신"}</strong><span>기술: {incomingMoves.filter(move=>!knownMoves.includes(move)).length ? `새 기술 ${incomingMoves.filter(move=>!knownMoves.includes(move)).length}개 수집` : "새로 수집할 기술 없음"}</span></div>
    <div className="recruit-dialog-actions"><button className="secondary-button" onClick={onCancel}>취소</button><button className="primary-button" onClick={()=>onConfirm()}>{archiveOnly ? '도감에 등록' : alreadyOwned ? '성장 이어받기' : replaced ? '교체하고 데려가기' : '동료로 데려가기'}</button></div>
  </dialog>;
}

export type Recruitment = {newSpecies?:boolean;hiddenBossPending?:boolean;archiveOnly?:boolean;chosen:string;replaced:string | null;roster:string[];cleared:boolean;ivGain?:IVGain|null;moveGain?:MoveGain|null;alreadyOwned?:boolean};

export function RecruitCelebration({recruitment,onContinue}: {recruitment:Recruitment;onContinue:()=>void}) {
  const {chosen,replaced,roster,cleared}=recruitment;
  const dialog=useRef<HTMLDialogElement>(null);
  const [capturing,setCapturing]=useState(!recruitment.archiveOnly);
  useLayoutEffect(()=>{
    const element=dialog.current;element?.showModal();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer=setTimeout(()=>setCapturing(false),reduced ? 0 : 1400);
    return ()=>{clearTimeout(timer);element?.close();};
  },[]);
  useEffect(()=>{if(!capturing)effect('partner');},[capturing]);
  return <dialog ref={dialog} className={`recruit-dialog recruit-celebration ${capturing ? 'is-capturing' : 'is-joined'}`} data-testid="recruit-celebration" data-phase={capturing ? 'capturing' : 'joined'} aria-labelledby="recruit-celebration-title" onCancel={event=>{event.preventDefault();if(capturing)setCapturing(false);else onContinue();}}>
    <span className="eyebrow">{capturing ? 'WELCOME TO THE TEAM' : 'A NEW JOURNEY TOGETHER'}</span>
    <h2 id="recruit-celebration-title" aria-live="polite">{capturing ? `${partnerWithParticle(chosen)} 맞이하는 중…` : recruitment.archiveOnly ? `${partnerWithParticle(chosen)} 도감에 등록했다!` : recruitment.alreadyOwned ? `${pokemonName(chosen)}의 성장을 이어받았다!` : `${partnerWithParticle(chosen,true)} 동료가 되었다!`}</h2>
    <div className="recruit-scene" aria-hidden="true"><div className="recruit-pokemon"><PartnerImage name={chosen} /></div>{capturing ? <><span className="recruit-capture-ring" /><span className="recruit-ball"><i /><b /><em /></span></> : <span className="recruit-welcome-star">✦</span>}</div>
    {capturing ? <><p>함께 다음 도전을 향해!</p><button className="secondary-button" data-silent autoFocus onClick={()=>setCapturing(false)}>연출 건너뛰기</button></> : <>
      <div className="recruit-collection-summary" aria-label="도감 등록 결과"><strong>{recruitment.newSpecies ? "새 포켓몬 · 도감 첫 등록!" : "기존 포켓몬 · 도감 갱신"}</strong><span>{recruitment.moveGain?.moves.length ? `새 기술 ${recruitment.moveGain.moves.length}개 수집` : "새로 수집한 기술 없음"}</span></div>
      {recruitment.ivGain && <div className="iv-gain" aria-label="도감 개체값 갱신">{recruitment.ivGain.changes.length ? recruitment.ivGain.changes.map(change=><span key={change.stat}>{statNames[change.stat]} {change.from} → <strong>{change.to}</strong></span>) : <span>도감 개체값은 기존의 더 높은 값으로 유지했어요.</span>}</div>}
      <p>{recruitment.archiveOnly ? '포켓몬과 기술·개체값을 도감에 저장했어요. 이번 파티는 유지하고, 다음 도전부터 선택할 수 있습니다.' : recruitment.alreadyOwned ? '보유 멤버와 도감의 개체값을 갱신했어요. 멤버 수는 그대로 유지됩니다.' : replaced ? `${pokemonName(replaced)}의 자리에 합류했어요. 내보낸 포켓몬의 영구 도감 해금은 유지됩니다.` : '이번 도전의 팀에 합류했어요. 다음 도전에서도 선택할 수 있습니다.'}</p>
      {!!recruitment.moveGain?.moves.length && <div className="collected-moves" aria-label="새로 해금한 기술">{recruitment.moveGain.moves.map(move=><span key={move}>{moves[move]?.name ?? move}<b>새 기술</b></span>)}</div>}
      {recruitment.moveGain?.equipped && <p>{moves[recruitment.moveGain.equipped.replaced]?.name ?? recruitment.moveGain.equipped.replaced} → {moves[recruitment.moveGain.equipped.move]?.name ?? recruitment.moveGain.equipped.move} · 이번 도전에 적용했어요.</p>}
      {!recruitment.archiveOnly && <div className="recruit-roster" role="group" aria-label="영입 후 보유 멤버">{roster.map(name=><div key={name} className={name === chosen ? 'new-partner' : ''}><PartnerImage name={name} /><strong>{pokemonName(name)}</strong>{name === chosen && <span>{recruitment.alreadyOwned ? '개체값 갱신' : '새 동료'}</span>}</div>)}</div>}
      <button className="primary-button" autoFocus onClick={onContinue}>{cleared ? '클리어 확인' : recruitment.hiddenBossPending ? '히든 보스 도전 준비' : '다음 층 준비'}</button>
    </>}
  </dialog>;
}
