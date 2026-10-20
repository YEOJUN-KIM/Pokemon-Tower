'use client';
import {useLayoutEffect,useRef} from 'react';
import type {ChallengerCandidate} from '../data/challengers';
import {selectGameCursor} from './game-keyboard';
import {TrainerPortrait} from './trainer-portrait';
import {PlayerMirrorPortrait} from './player-mirror-portrait';
import styles from './styles/challenger-candidates.module.css';

export function ChallengerDetail({candidate,result=false}:{candidate:ChallengerCandidate|undefined;result?:boolean}){
 if(!candidate)return null;
 return <><div className={`${styles.scope} ${styles.opponent} enemy-position`} data-event-target><span className={styles.portrait} data-mirror={candidate.mirror||undefined}>{candidate.mirror?<PlayerMirrorPortrait/>:<TrainerPortrait sprite={candidate.portrait} width={120} height={144} alt={`${candidate.title} 트레이너`}/>}</span></div>{!result&&<aside id="challenger-preview" className={`${styles.scope} ${styles.detail}`} aria-label="도전자 상세" data-testid="challenger-detail" data-candidate={candidate.id}>

  <h2>{candidate.title}</h2><p>{candidate.difficulty} {'★'.repeat(candidate.danger)}</p>
  {candidate.specialHint&&<p className={styles.hint} data-testid="challenger-special-hint">{candidate.specialHint}</p>}
  <strong className={styles.reward}>{candidate.rewardPreview}</strong>
 </aside>}</>;
}

export function ChallengerCandidates({candidates,selectedId,busy,onFocus,onConfirm}:{candidates:readonly ChallengerCandidate[];selectedId:string;busy:boolean;onFocus:(id:string)=>void;onConfirm:(id:string)=>void}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{selectGameCursor(ref.current?.querySelector<HTMLButtonElement>('[data-initial-focus]'));},[]);
 return <div ref={ref} className={`${styles.scope} ${styles.menu} event-choices`} data-testid="challenger-candidates" aria-busy={busy}>
  <div className={styles.list} data-keyboard-list role="group" aria-label="도전할 트레이너">
   {candidates.map((candidate,index)=><button key={candidate.id} disabled={busy} data-initial-focus={index===0?true:undefined} data-challenger={candidate.id} aria-pressed={selectedId===candidate.id} aria-controls="challenger-preview" onFocus={event=>{onFocus(candidate.id);selectGameCursor(event.currentTarget);}} onClick={()=>onFocus(candidate.id)}>
    <span className={styles.pointer} aria-hidden="true">&gt;</span>{index+1}. {candidate.title}
   </button>)}
   <button disabled={busy} data-challenger="back" aria-pressed={selectedId==='back'} onFocus={event=>{onFocus('back');selectGameCursor(event.currentTarget);}} onClick={()=>onConfirm('back')}><span className={styles.pointer} aria-hidden="true">&gt;</span>4. 돌아간다</button>
  </div>
  <div className={styles.confirm}><button disabled={busy||selectedId==='back'} onClick={()=>onConfirm(selectedId)}>도전한다</button><small>1–3 확인 · Z / Enter 도전 · X 돌아가기</small></div>
 </div>;
}
