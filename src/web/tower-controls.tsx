'use client';
import {BagButton} from './bag';
import {RulePicker} from './rule-picker';
import {type BattleRule} from '../data/run-rules';
import {VillainOutcome} from './villain-outcome';
import {themeLabel} from '../data/tower-themes';
import {selectGameCursor} from './game-keyboard';

import {statKeys,statNames,type MoveSwap} from '../data/training';
import {useState,useRef,useEffect} from 'react';
import type {TowerView} from './contracts';
import {pokemonName, species, spriteUrl} from './catalog';
import {RecruitConfirmation,RecruitReplacementPicker} from './recruit-dialog';
import {RunMaintenance} from './run-maintenance';
import {RecruitCandidateDetails} from './recruit-candidate-details';
import {isShopFloor} from '../data/shop';
import {HeldItemManager} from './held-item-controls';
import {HeldItemLabel} from './held-item-label';

export function TowerControls({tower, selected, setSelected, busy, submit,error}: {
  tower: TowerView; selected: string[]; setSelected: (names: string[]) => void;
  busy: boolean; submit: (body: Record<string, unknown>) => Promise<void>;error?:string;
}) {
  const [rule,setRule]=useState<BattleRule>('basic');
  const [chosen, setChosen] = useState<string | null>(null);
  const [replaced, setReplaced] = useState<string | null>(null);
  const [confirming,setConfirming]=useState(false);
  const [replacing,setReplacing]=useState(false);
  const [collectOnly,setCollectOnly]=useState(false);
  const [inspecting,setInspecting]=useState(false);
  const [shopping,setShopping]=useState(tower.run?.state==='select' && (isShopFloor(tower.run.floor,tower.run.totalFloors)||!!tower.run.retries?.preparing));
  const confirmButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(chosen && confirmButton.current && !confirmButton.current.disabled)selectGameCursor(confirmButton.current);},[chosen]);
  useEffect(()=>{if(tower.run?.state==='select' && selected.length===3 && !busy && !shopping){const frame=requestAnimationFrame(()=>selectGameCursor(confirmButton.current));return ()=>cancelAnimationFrame(frame);}},[tower.run?.state,selected.length,busy,shopping]);
  const run = tower.run;
  if (run?.state === 'battle') return null;
  const recruiting = run?.state === 'recruit';
  const choosingNext = run?.state === 'select';
  const available = recruiting ? run.candidates : choosingNext ? run.roster : tower.unlocked;
  const full = recruiting && run.roster.length >= 6;
  const alreadyOwned=recruiting && !!chosen && run.roster.includes(chosen);
  const needsReplacement=full && !alreadyOwned;
  const pick = (name: string) => {
    if (recruiting) { setChosen(name);setReplaced(null); return; }
    setSelected(selected.includes(name) ? selected.filter(p => p !== name) : selected.length < 3 ? [...selected, name] : selected);
  };
  const recruit = (skip: boolean,moveSwap?:MoveSwap) => submit({type: 'recruit', runId: run!.id, battleId: run!.battleId, chosen: skip ? null : chosen, replaced: skip || alreadyOwned || collectOnly ? null : replaced,moveSwap,collectOnly:!skip && collectOnly});
  const start = () => submit(choosingNext ? {type: 'enter', runId: run.id, floor: run.floor, selected} : {type: 'start', selected,rule});
  if(shopping && run?.state==='select' && (isShopFloor(run.floor,run.totalFloors)||run.retries?.preparing))return <RunMaintenance tower={tower} busy={busy} submit={submit} error={error} onContinue={()=>setShopping(false)}/>;
  return <section className="tower-controls" data-testid={recruiting ? 'recruitment' : 'team-selection'}>
    {replacing && chosen && run && <RecruitReplacementPicker chosen={chosen} roster={run.roster} busy={busy} onCancel={()=>{setReplacing(false);setReplaced(null);}} onChoose={name=>{setReplaced(name);setConfirming(true);}}/>}
    {confirming && chosen && <RecruitConfirmation newSpecies={!tower.unlocked.includes(chosen)} archiveOnly={collectOnly} chosen={chosen} replaced={!collectOnly && needsReplacement ? replaced : null} incoming={run?.candidateIVs[chosen]} previous={run?.collectionIVs[chosen]} alreadyOwned={alreadyOwned} incomingMoves={run?.candidateMoves[chosen]} knownMoves={run?.collectionMoves[chosen]} currentMoves={run?.currentMoves[chosen]} onCancel={()=>setConfirming(false)} onConfirm={swap=>{setConfirming(false);setReplacing(false);void recruit(false,swap);}} />}
    {recruiting && <VillainOutcome event={run.villainEvent}/>}
    {recruiting && inspecting && chosen && <RecruitCandidateDetails name={chosen} run={run} onClose={()=>setInspecting(false)}/>}
    <div className="selection-title"><div><div className="eyebrow">{recruiting ? 'A NEW PARTNER' : choosingNext ? (run.theme ? themeLabel(run.theme) : 'NEXT FLOOR') : 'BUILD YOUR TEAM'}</div>
      <h2>{recruiting ? '새로운 동료를 선택하세요.' : choosingNext ? `${run.floor}층에 출전할 3마리를 선택하세요.` : run?.state === 'cleared' ? `${run.totalFloors}층 타워를 정복했어요!` : '함께 출발할 3마리를 선택하세요.'}</h2>
      <p>{recruiting ? run.raid?'특별한 보상을 받았습니다. 영입 선택 후 보상을 확인하세요.':`승리 보상 ${run.reward}코인을 받았습니다. 영입한 포켓몬은 도감에도 해금됩니다.` : choosingNext ? `${run.boss ? `${run.boss.title} ${run.boss.name} · ` : ""}이번 도전의 보유 멤버 ${run.roster.length} / 6마리 중 출전할 3마리를 고르세요. 첫 번째가 선봉입니다.` : `영구 도감 ${tower.unlocked.length}종 중 새 도전에 데려갈 3마리를 고르세요. 첫 번째가 선봉입니다. 새 도전의 세대 테마는 출발할 때 무작위로 정해집니다.`}</p></div>
      <span className="selection-count">{recruiting ? `${run.roster.length} / 6` : `${selected.length} / 3`}</span></div>
    <div className="pokemon-selection" data-keyboard-grid>{available.map(name => {
      const incoming=recruiting ? run.candidateIVs[name] : undefined,previous=recruiting ? run.collectionIVs[name] : undefined;
      const improvements=incoming && previous && tower.unlocked.includes(name) ? statKeys.filter(stat=>incoming[stat]>previous[stat]) : [];
      const newMoves=recruiting ? (run.candidateMoves[name] ?? []).filter(move=>!(run.collectionMoves[name] ?? []).includes(move)) : [];
      const picked = recruiting ? chosen === name : selected.includes(name);
      return <button key={name} className={`pokemon-choice ${picked ? 'picked' : ''}`} aria-pressed={picked} aria-label={`${pokemonName(name)} ${recruiting ? '영입 선택' : '선택'}`}
        disabled={busy || (!recruiting && !picked && selected.length >= 3)} onClick={() => pick(name)}>
        <span className="choice-order">{picked ? recruiting ? '✓' : `${selected.indexOf(name) + 1}번` : '+'}</span>
        <img src={spriteUrl(run?.partnerForms?.[name]??name)} alt="" width={80} height={80} onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
        <strong>{pokemonName(run?.partnerForms?.[name]??name)}</strong><small>{species[run?.partnerForms?.[name]??name]?.types.join(' · ')}</small>
        {choosingNext && <small>지닌 도구 · <HeldItemLabel item={run.heldItems?.[name]}/></small>}
        {recruiting && <span className={tower.unlocked.includes(name) ? "recruit-known-species" : "recruit-new-species"}>{tower.unlocked.includes(name) ? "도감 등록됨" : "새 포켓몬 · 도감 미등록"}</span>}
        {improvements.length>0 && <span className="recruit-iv-up" title={improvements.map(stat=>`${statNames[stat]} ${previous![stat]} → ${incoming![stat]}`).join(' · ')}>↑ 개체값 상승 · {improvements.length}개</span>}
        {newMoves.length>0 && <span className="recruit-new-moves">기술 수집 · 새 기술 {newMoves.length}개</span>}
      </button>;
    })}</div>
    {choosingNext && <BagButton run={run} busy={busy} submit={submit} error={error}/>}

    {recruiting && <button className="secondary-button" data-recruit-details disabled={busy||!chosen} onClick={()=>setInspecting(true)}>선택한 포켓몬 정보 · 기술·특성·종족값</button>}
    {!recruiting && !choosingNext && <RulePicker value={rule} onChange={setRule} disabled={busy}/>}
    {run?.hiddenBossPending && <p className="selection-note">히든 보스 레드가 등장했습니다! 같은 층에서 추가 대결합니다. HP·PP·상태를 회복하고 출전 팀을 다시 고릅니다.</p>}
    <div className="selection-actions">{recruiting ? <><button className="secondary-button" disabled={busy} onClick={() => recruit(true)}>영입 없이 계속</button><button className="secondary-button" disabled={busy || !chosen} onClick={()=>{setCollectOnly(true);setConfirming(true);}}>도감에 등록</button><button ref={confirmButton} data-recruit-continue className="primary-button" disabled={busy || !chosen} onClick={() => {setCollectOnly(false);setReplaced(null);if(needsReplacement)setReplacing(true);else setConfirming(true);}}>{alreadyOwned ? '성장 이어받기' : full ? '교체하고 데려가기' : '동료로 데려가기'} ↗</button></>
      : <button ref={confirmButton} data-keyboard-next className="primary-button" disabled={busy || selected.length !== 3} onClick={() => void start()}>{busy ? '준비 중…' : choosingNext ? `${run.floor}층 ${run.hiddenBossPending ? '히든 보스 도전' : run.boss ? '보스 도전' : '배틀 시작'}` : run ? '새 도전 시작' : '배틀 시작'} ↗</button>}</div>
    {!choosingNext && <p className="selection-note">{recruiting ? full ? '새 동료를 영입하려면 기존 멤버 1마리를 내보내야 합니다. 내보낸 포켓몬의 영구 도감 해금은 유지됩니다.' : '이번 도전에는 최대 6마리까지 보유할 수 있습니다. 영입은 1마리만 가능합니다.' : '도감 해금은 보유 멤버와 별개입니다. 새 도전은 선택한 3마리로 시작하며, 등반 중 영입하여 최대 6마리까지 보유합니다.'}</p>}
  </section>;
}
