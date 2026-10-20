'use client';
import {useLayoutEffect,useRef} from 'react';
import {useDialogControls} from './game-menu-context';
import type {BattleView,TowerView} from './contracts';
import styles from './styles/battle-result.module.css';

export function BattleResultDialog({battle, tower, onContinue,onRetry,busy=false}: {battle: BattleView; tower: TowerView; onContinue: () => void;onRetry?:()=>void;busy?:boolean}) {
  useDialogControls('battle-result',[{key:'↑ / ↓',label:'선택'},{key:'Enter / Z',label:'결정'}]);
  const dialog = useRef<HTMLDialogElement>(null);
  const label=battle.winner==='tie'?'무승부':'패배';
  const retry=tower.run?.retries?.canRetry;
  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className={styles.defeat} data-testid="result-dialog" aria-labelledby="result-title" onCancel={event=>event.preventDefault()}>
    <h2 id="result-title">{label}</h2>
    <div className={styles.actions} data-keyboard-list>
      <button className="primary-button" disabled={busy||!retry} data-initial-focus={retry||undefined} autoFocus={!!retry} onClick={onRetry}>재도전 {tower.run?.retries?.remaining??0}/{tower.run?.retries?.limit??0}</button>
      <button className="secondary-button" disabled={busy} data-initial-focus={!retry||undefined} autoFocus={!retry} onClick={onContinue}>도전 종료</button>
    </div>
  </dialog>;
}
