'use client';
import {useState} from 'react';
import type {TowerView} from './contracts';
import {pokemonName,species} from './catalog';
import {PokemonImage} from './pokemon-image';
import {TypeBadge} from './type-badge';
import {PokedexDialog} from './pokedex-dialog';
import {GameChoice,GameChoiceList} from './game-menu';
import {GameDialogue} from './game-dialogue';
import {RecruitCandidateDetails} from './recruit-candidate-details';
import {RecruitReplacementPicker} from './recruit-dialog';
import {statKeys} from '../data/training';
import styles from './styles/post-battle.module.css';
import comparisonStyles from './styles/recruit-comparison.module.css';

export function RecruitChoices({tower,busy,submit,error}:{tower:TowerView;busy:boolean;error?:string;submit:(body:Record<string,unknown>)=>Promise<void>}){
 const run=tower.run!,[chosen,setChosen]=useState(run.candidates[0]??''),[menu,setMenu]=useState(false),[inspecting,setInspecting]=useState(false),[replacing,setReplacing]=useState(false);
 const details=run.candidateDetails?.[chosen],display=details?.forme??chosen,returnFocus=`[data-recruit-candidate="${chosen}"]`;
 function recruit(collectOnly:boolean,replaced:string|null=null){setMenu(false);setReplacing(false);void submit({type:'recruit',runId:run.id,battleId:run.battleId,chosen,replaced,collectOnly});}
 return <section data-testid="recruitment" className={`${styles.scope} ${styles.candidates}`} aria-busy={busy}>
  {error&&<p role="alert">{error}</p>}
  <GameDialogue messageKey={`${run.id}:${run.battleId}:victory`} text={run.raid?'배틀에서 승리했다!':`배틀에서 승리했다! ${run.reward.toLocaleString()}코인을 얻었다.`} label="승리 보상"/>
  <GameChoiceList grid className={styles.cards} data-keyboard-horizontal>{run.candidates.map((name,index)=>{
   const candidate=run.candidateDetails?.[name],shown=candidate?.forme??name,catalog=species[shown];
   const owned=tower.unlocked.includes(name),previous=run.collectionIVs[name],incoming=run.candidateIVs[name];
   const improved=owned&&previous&&incoming&&statKeys.some(stat=>incoming[stat]>previous[stat]);
   const moveId=(move:string)=>move.toLowerCase().replace(/[^a-z0-9]/g,''),knownMoves=new Set((run.collectionMoves[name]??[]).map(moveId));
   const newMoves=(run.candidateMoves[name]??candidate?.moves??[]).some(move=>!knownMoves.has(moveId(move)));
   return <GameChoice key={name} className={styles.card} data-recruit-candidate={name} data-initial-focus={index===0||undefined} aria-label={`${pokemonName(shown)} 영입 선택`} disabled={busy} onClick={()=>{setChosen(name);setMenu(true);}}>
    <PokemonImage id={catalog?.id??0} spriteKey={catalog?.spriteKey} name={pokemonName(shown)} shiny={candidate?.shiny} animated width={112} height={112} fallback={<span>◇</span>}/>
    <strong>{pokemonName(shown)}</strong><span className={styles.types}>{(candidate?.types??catalog?.types??[]).map(type=><TypeBadge key={type} type={type}/>)}</span>
    <span className={styles.candidateLabels}>
     {!owned&&<span className={comparisonStyles.newMove} data-recruit-badge="new-pokemon">NEW!</span>}
     {improved&&<span className={`${comparisonStyles.newMove} ${styles.ivBadge}`} data-recruit-badge="iv-improved">개체치 상승!</span>}
     {newMoves&&<span className={comparisonStyles.newMove} data-recruit-badge="new-move">NEW 기술</span>}
    </span>
   </GameChoice>;
  })}</GameChoiceList>
  {menu&&<PokedexDialog title={pokemonName(display)} testId="recruit-menu" context="recruit-menu" className={`${styles.scope} ${styles.panel}`} returnFocus={returnFocus} controls={[{key:'↑ / ↓',label:'항목 이동'},{key:'Enter / Z',label:'결정'},{key:'Esc / X',label:'취소'}]} onClose={()=>{if(!busy)setMenu(false);}}>
   <GameChoiceList><GameChoice data-initial-focus disabled={busy} onClick={()=>{if(run.roster.length>=6&&!run.roster.includes(chosen)){setMenu(false);setReplacing(true);}else recruit(false);}}>동료로 데려가기</GameChoice><GameChoice disabled={busy} onClick={()=>recruit(true)}>도감에 넣기</GameChoice><GameChoice disabled={busy} onClick={()=>{setMenu(false);setInspecting(true);}}>포켓몬 정보</GameChoice><GameChoice disabled={busy} onClick={()=>setMenu(false)}>취소</GameChoice></GameChoiceList>
  </PokedexDialog>}
  {inspecting&&<RecruitCandidateDetails name={chosen} run={run} owned={tower.unlocked.includes(chosen)} returnFocus={returnFocus} onClose={()=>setInspecting(false)}/>}
  {replacing&&<RecruitReplacementPicker chosen={display} roster={run.roster} busy={busy} returnFocus={returnFocus} onCancel={()=>setReplacing(false)} onChoose={name=>recruit(false,name)}/>}
 </section>;
}
