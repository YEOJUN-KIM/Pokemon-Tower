'use client';
import {useLayoutEffect,useRef} from 'react';
import type {ChallengerCandidate} from '../data/challengers';
import {selectGameCursor} from './game-keyboard';
import styles from './styles/challenger-candidates.module.css';

export function ChallengerCandidates({candidates,busy,onSelect}:{candidates:readonly ChallengerCandidate[];busy:boolean;onSelect:(id:string)=>void}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{selectGameCursor(ref.current?.querySelector<HTMLButtonElement>('[data-initial-focus]'));},[busy]);
 return <div ref={ref} className={`${styles.scope} event-choices`} data-testid="challenger-candidates" data-keyboard-list>
  <h2>도전자 선택전</h2><p>상대와 보상을 확인하고 승부할 도전자를 고르자.</p>
  <div className={styles.candidates}>{candidates.map((candidate,index)=><button key={candidate.id} className={styles.candidate} disabled={busy} data-initial-focus={index===0?true:undefined} data-challenger={candidate.id} onClick={()=>onSelect(candidate.id)}>
   <img src={`/sprites/trainers/${candidate.portrait}.png`} width="80" height="80" alt=""/>
   <strong><span className={styles.pointer} aria-hidden="true">&gt; </span>{candidate.title}</strong>
   <span>{candidate.difficulty} · 위험도 {'★'.repeat(candidate.danger)}</span>
   <span>{candidate.battleStyle}</span><small>보상</small><span>{candidate.rewardPreview}</span>
  </button>)}</div>
  <button className={styles.back} disabled={busy} onClick={()=>onSelect('back')}><span className={styles.pointer} aria-hidden="true">&gt; </span>돌아간다</button>
 </div>;
}
