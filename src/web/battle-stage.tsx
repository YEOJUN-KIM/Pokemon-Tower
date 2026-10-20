'use client';
import {useState,useLayoutEffect,useRef} from 'react';
import {PokedexDialog} from './pokedex-dialog';
import {GameChoice,GameChoiceList} from './game-menu';
import {TowerControls} from './tower-controls';
import styles from './styles/post-battle.module.css';

export function BattleStage(props:Parameters<typeof TowerControls>[0]){
 const [skipping,setSkipping]=useState(false),[returnCandidate,setReturnCandidate]=useState(''),run=props.tower.run!,recruiting=run.state==='recruit';
 const layout=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  if(recruiting)return;
  const arena=document.querySelector('.battle-panel .arena');if(!arena)return;
  const position=()=>{const box=arena.getBoundingClientRect();layout.current?.style.setProperty('--preparation-top',`${box.top+8}px`);layout.current?.style.setProperty('--preparation-height',`${Math.max(0,box.height-16)}px`);};
  position();const observer=new ResizeObserver(position);observer.observe(arena);window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
  return()=>{observer.disconnect();window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);};
 },[recruiting]);
 const controls=recruiting?[{key:'← / →',label:'포켓몬 선택'},{key:'Enter / Z',label:'메뉴'},{key:'Esc / X',label:'넘어가기'}]:[{key:'방향키',label:'포켓몬 선택'},{key:'Enter / Z',label:'결정'}];
 return <div ref={layout} className={styles.stageLayout}>
  <PokedexDialog title={recruiting?'동료 영입':'출전 준비'} context={recruiting?'recruit-candidates':'floor-team'} controls={controls} className={`${styles.scope} ${styles.panel} ${!recruiting?styles.preparationPanel:''}`} hideClose={!recruiting} large onClose={()=>{if(recruiting&&!props.busy){setReturnCandidate(document.querySelector<HTMLElement>('[data-recruit-candidate][data-game-cursor=true]')?.dataset.recruitCandidate??run.candidates[0]??'');setSkipping(true);}}}>
   <TowerControls {...props}/>
  </PokedexDialog>
  {skipping&&<PokedexDialog title="영입하지 않고 넘어가시겠습니까?" context="recruit-skip" className={`${styles.scope} ${styles.panel}`} returnFocus={`[data-recruit-candidate="${returnCandidate}"]`} onClose={()=>setSkipping(false)} controls={[{key:'↑ / ↓',label:'선택'},{key:'Enter / Z',label:'결정'},{key:'Esc / X',label:'취소'}]} testId="recruit-skip">
   <GameChoiceList><GameChoice disabled={props.busy} onClick={()=>void props.submit({type:'recruit',runId:run.id,battleId:run.battleId,chosen:null,replaced:null})}>넘어가기</GameChoice><GameChoice data-initial-focus disabled={props.busy} onClick={()=>setSkipping(false)}>취소</GameChoice></GameChoiceList>
  </PokedexDialog>}
 </div>;
}
