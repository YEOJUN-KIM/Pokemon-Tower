'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {usePathname,useRouter} from 'next/navigation';
import {TutorialStep,tutorialCopy,tutorialHints,type TutorialState} from '../data/tutorial';
import {selectGameCursor} from './game-keyboard';
import styles from './styles/tutorial.module.css';

type TutorialContextValue={state:TutorialState|null;report:(event:string,party?:string[],species?:string)=>Promise<void>;refresh:()=>Promise<void>};
const TutorialContext=createContext<TutorialContextValue>({state:null,report:async()=>{},refresh:async()=>{}});
export const useTutorial=()=>useContext(TutorialContext);

type Guide={target:HTMLElement|null;host:HTMLElement;text:string;next?:string;resume?:string};
function guideFor(state:TutorialState,path:string):Guide {
  const dialog=Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1);
  const host=dialog??document.body,scope=dialog??document;
  const find=(selector:string)=>scope.querySelector<HTMLElement>(selector);
  const card=()=>state.selectedSpecies?find(`.dex-card[data-species="${CSS.escape(state.selectedSpecies)}"]:not(.locked)`):find('[data-tutorial="starter-list"]');
  const matchesTarget=!state.selectedSpecies||dialog?.dataset.pokemonSpecies===state.selectedSpecies;
  const close=()=>find('.dex-dialog-heading>button');
  const copy=tutorialCopy[state.step];
  let target:HTMLElement|null=null,next=copy.next,text=copy.text,resume:string|undefined;
  switch(state.step) {
    case TutorialStep.StartGame: target=document.querySelector('[data-tutorial="game-start"]');if(!target)resume='/';break;
    case TutorialStep.SelectPokemon:
      if(path!=='/battle'){resume='/battle?prepare=1';break;}
      target=find('[aria-label="포켓몬 넣기"]')??find('[data-tutorial="starter-list"]');break;
    case TutorialStep.RemovePokemon:
      if(path!=='/battle'){resume='/battle?prepare=1';break;}
      target=find('[aria-label="파티에서 제외"], [aria-label="포켓몬 제외"]')??find('[data-party-slot]:not([data-empty])');break;
    case TutorialStep.PokemonInfo:
      target=dialog?(matchesTarget?find('[aria-label="포켓몬 정보"]')??close():close()):card();break;
    case TutorialStep.PokemonInfoViewed:
      target=matchesTarget?find('[data-tutorial="pokemon-info"]'):close();break;
    case TutorialStep.StatUpgrade:
      if(path!=='/pokedex'){resume='/pokedex';break;}
      target=dialog&&!matchesTarget?close():find('[data-testid="ev-picker"] .game-dialog-body')??find('[data-settings-save]:not(:disabled)')??find('[data-tutorial="stat-training"]')??find('[aria-label="포켓몬 설정"]')??(dialog?close():card());
      if(find('[data-testid="ev-amount"]'))text=tutorialHints.statPicker;
      break;
    case TutorialStep.CompleteTeam:
      if(path!=='/battle'){resume='/battle?prepare=1';target=dialog?close():null;break;}
      target=find('[aria-label="포켓몬 넣기"]')??(dialog?close():find('[data-tutorial="starter-list"]'));break;
    case TutorialStep.StartBattle:
      if(path!=='/battle'){resume='/battle?prepare=1';break;}
      target=find('[data-confirm-yes]')??find('[data-tutorial="start-battle"]');break;
    case TutorialStep.TypeGuide:
      target=find('[data-tutorial="battle-moves"]')??find('[data-mode="moves"]');
      if(target?.matches('[data-mode="moves"]'))text=tutorialHints.openMoves;
      break;
    case TutorialStep.RecruitmentGuide:
    case TutorialStep.RecruitmentChoice:
      target=find('[data-testid="recruit-menu"] .game-dialog-body')??find('[data-testid="recruitment"]')??find('[data-tutorial="recruit-open"]');
      if(target?.matches('[data-tutorial="recruit-open"]')){text=tutorialHints.openRecruitment;next=undefined;}
      break;
  }
  if(!resume&&!target && [TutorialStep.SelectPokemon,TutorialStep.RemovePokemon,TutorialStep.PokemonInfo,TutorialStep.PokemonInfoViewed,TutorialStep.StatUpgrade,TutorialStep.CompleteTeam,TutorialStep.StartBattle].includes(state.step as never) && !['/battle','/pokedex'].includes(path))resume='/battle?prepare=1';
  return {target,host,text,next,resume};
}

export function TutorialManager({children}:{children:ReactNode}) {
  const path=usePathname(),router=useRouter();
  const [state,setState]=useState<TutorialState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirmSkip,setConfirmSkip]=useState(false);
  const stateRef=useRef(state);stateRef.current=state;
  const queue=useRef(Promise.resolve()),revision=useRef(0),failed=useRef<{event:string;party?:string[];species?:string}|null>(null),saving=useRef(false);
  const refresh=useCallback(async()=>{
    if(saving.current||failed.current)return;
    const version=++revision.current;
    try {
      const response=await fetch('/api/tutorial',{cache:'no-store'});
      if(response.status===401){if(version===revision.current)setState(null);return;}
      if(!response.ok)throw Error('튜토리얼 상태를 불러오지 못했습니다.');
      const data:TutorialState=await response.json();if(version===revision.current){setState(data);setError('');}
    }catch(e){setError(e instanceof Error?e.message:'서버에 연결할 수 없습니다.');}
  },[]);
  const report=useCallback((event:string,party?:string[],species?:string)=>{
    const work=async()=>{
      if(!stateRef.current||stateRef.current.step===TutorialStep.Completed)return;
      ++revision.current;setBusy(true);saving.current=true;
      try {
        const response=await fetch('/api/tutorial',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,expected:stateRef.current.step,party,species})});
        const data=await response.json();if(!response.ok)throw Error(data.error??'안내 진행을 저장하지 못했습니다.');
        stateRef.current=data;setState(data);setError('');failed.current=null;
      }catch(e){failed.current={event,party,species};setError(e instanceof Error?e.message:'서버에 연결할 수 없습니다.');}
      finally{setBusy(false);saving.current=false;}
    };
    queue.current=queue.current.then(work,work);return queue.current;
  },[]);
  useEffect(()=>{if(path==='/account'){setState(null);return;}void refresh();},[path,refresh]);
  useEffect(()=>{
    if(!state || state.step===TutorialStep.Completed || path==='/account')return;
    const focus=()=>void refresh();window.addEventListener('focus',focus);
    const timer=setInterval(()=>void refresh(),3000);
    return()=>{clearInterval(timer);window.removeEventListener('focus',focus);};
  },[state?.step,path,refresh]);
  useEffect(()=>{
    if(state?.step===TutorialStep.StartGame&&path==='/battle')void report('enter-selection');
  },[state?.step,path,report]);
  return <TutorialContext.Provider value={{state,report,refresh}}>{children}
    {state&&state.step!==TutorialStep.Completed&&path!=='/account'&&<TutorialOverlay state={state} path={path} busy={busy} error={error} confirmSkip={confirmSkip} onSkip={()=>setConfirmSkip(true)} onCancelSkip={()=>setConfirmSkip(false)} onConfirmSkip={()=>{void report('skip').then(()=>setConfirmSkip(false));}} onNext={()=>void report('next')} onBegin={()=>void report('begin')} onResume={url=>router.push(url)} onRetry={()=>{const retry=failed.current;if(retry)void report(retry.event,retry.party,retry.species);else void refresh();}}/>}
  </TutorialContext.Provider>;
}

function TutorialOverlay({state,path,busy,error,confirmSkip,onSkip,onCancelSkip,onConfirmSkip,onNext,onBegin,onResume,onRetry}:{state:TutorialState;path:string;busy:boolean;error:string;confirmSkip:boolean;onSkip:()=>void;onCancelSkip:()=>void;onConfirmSkip:()=>void;onNext:()=>void;onBegin:()=>void;onResume:(url:string)=>void;onRetry:()=>void}) {
  const [frame,setFrame]=useState<{guide:Guide;rect:{left:number;top:number;width:number;height:number}|null;w:number;h:number}|null>(null);
  const root=useRef<HTMLDivElement>(null);
  const [messageHeight,setMessageHeight]=useState(270);
  useEffect(()=>{
    let pending=0;
    const measure=()=>{
      pending=0;const guide=guideFor(state,path),bounds=guide.target?.getBoundingClientRect();
      const rect=bounds&&bounds.width>0&&bounds.height>0&&bounds.right>0&&bounds.bottom>0&&bounds.left<innerWidth&&bounds.top<innerHeight?{left:Math.max(0,bounds.left-4),top:Math.max(0,bounds.top-4),width:Math.min(innerWidth,bounds.right+4)-Math.max(0,bounds.left-4),height:Math.min(innerHeight,bounds.bottom+4)-Math.max(0,bounds.top-4)}:null;
      setFrame(previous=>previous&&previous.guide.host===guide.host&&previous.guide.target===guide.target&&previous.guide.text===guide.text&&previous.guide.next===guide.next&&previous.guide.resume===guide.resume&&previous.w===innerWidth&&previous.h===innerHeight&&JSON.stringify(previous.rect)===JSON.stringify(rect)?previous:{guide,rect,w:innerWidth,h:innerHeight});
    };
    const schedule=()=>{if(!pending)pending=requestAnimationFrame(measure);};
    const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','disabled','aria-busy']});
    const resize=new ResizeObserver(schedule);resize.observe(document.documentElement);
    window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);measure();
    return()=>{observer.disconnect();resize.disconnect();cancelAnimationFrame(pending);window.removeEventListener('resize',schedule);document.removeEventListener('scroll',schedule,true);};
  },[state.step,state.selectedSpecies,path]);
  const host=frame?.guide.host;
  useEffect(()=>{
    if(!(host instanceof HTMLDialogElement))return;
    // A transformed native modal otherwise becomes a containing block for the viewport spotlight.
    const transform=host.style.transform,overflow=host.style.overflow;
    host.style.transform='none';host.style.overflow='visible';
    window.dispatchEvent(new Event('resize'));
    return()=>{host.style.transform=transform;host.style.overflow=overflow;};
  },[host]);
  const waiting=state.step===TutorialStep.AwaitVictory;
  const informational=[TutorialStep.NotStarted,TutorialStep.Introduction,TutorialStep.Completion].includes(state.step as never);
  const visible=!!frame&&(confirmSkip||informational||!!frame.rect||!!frame.guide.resume||state.step===TutorialStep.PokemonInfoViewed);
  useEffect(()=>{
    const message=root.current?.querySelector<HTMLElement>('[data-tutorial-message]');
    if(!message)return;
    const measure=()=>setMessageHeight(Math.ceil(message.getBoundingClientRect().height));
    const observer=new ResizeObserver(measure);observer.observe(message);measure();
    return()=>observer.disconnect();
  },[visible,host,state.step,confirmSkip]);
  useEffect(()=>{
    const target=frame?.guide.target;if(!target)return;
    const observer=new ResizeObserver(()=>window.dispatchEvent(new Event('resize')));observer.observe(target);
    return()=>observer.disconnect();
  },[frame?.guide.target]);
  useEffect(()=>{
    if(!visible)return;
    const readingRecruitment=state.step===TutorialStep.RecruitmentGuide&&!frame?.guide.target?.matches('[data-tutorial="recruit-open"]');
    const target=confirmSkip||readingRecruitment?null:frame?.guide.target;
    const allowed=(element:EventTarget|null)=>element instanceof Node&&(!!root.current?.contains(element)||!!target?.contains(element));
    const block=(event:Event)=>{if(!allowed(event.target)){event.preventDefault();event.stopImmediatePropagation();}};
    const items=()=>[...Array.from(target?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)')??[]),...(target?.matches('button:not(:disabled),a[href],input:not(:disabled)')?[target]:[]),...Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')??[])].filter(e=>e.getClientRects().length>0);
    const key=(event:KeyboardEvent)=>{
      if(event.ctrlKey||event.metaKey||event.altKey)return;
      if(event.key==='Shift')return; // Keep battle animation skipping available.
      if(event.target instanceof HTMLInputElement&&allowed(event.target)&&['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();event.stopImmediatePropagation();
      const options=items(),active=document.activeElement as HTMLElement,index=options.indexOf(active);
      if(['Tab','ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key)){
        const delta=event.shiftKey||['ArrowUp','ArrowLeft'].includes(event.key)?-1:1;
        const next=options[(Math.max(0,index)+delta+options.length)%options.length];next?.focus({preventScroll:true});selectGameCursor(next);
      }else if(['Enter',' ','z','Z'].includes(event.key)&&!event.repeat&&allowed(active))active?.click();
    };
    const first=items()[0];first?.focus({preventScroll:true});selectGameCursor(first);
    document.addEventListener('click',block,true);document.addEventListener('pointerdown',block,true);window.addEventListener('keydown',key,true);document.addEventListener('focusin',block,true);
    return()=>{document.removeEventListener('click',block,true);document.removeEventListener('pointerdown',block,true);window.removeEventListener('keydown',key,true);document.removeEventListener('focusin',block,true);};
  },[visible,frame?.guide.target,frame?.guide.next,frame?.guide.resume,frame?.guide.text,confirmSkip,state.step,busy]);
  if(!frame)return null;
  const {w,h}=frame,rect=confirmSkip||informational?null:frame.rect;
  const width=Math.min(360,w-24),boxHeight=Math.min(messageHeight,h-24);
  let left=(w-width)/2,top=(h-boxHeight)/2;
  if(rect){
    if(w-rect.left-rect.width>=width+24){left=rect.left+rect.width+12;top=Math.max(12,Math.min(h-boxHeight-12,rect.top));}
    else if(rect.left>=width+24){left=rect.left-width-12;top=Math.max(12,Math.min(h-boxHeight-12,rect.top));}
    else {left=Math.max(12,Math.min(w-width-12,rect.left));top=rect.top>=boxHeight+24?rect.top-boxHeight-12:Math.min(h-boxHeight-12,rect.top+rect.height+12);}
  }
  const copy=tutorialCopy[state.step];
  const targetSpecies=frame.guide.target?.dataset.species??frame.guide.target?.closest<HTMLElement>('[data-pokemon-species]')?.dataset.pokemonSpecies;
  return createPortal(<div ref={root} className={styles.layer} data-testid="tutorial-overlay" data-tutorial-step={state.step} data-tutorial-target-species={targetSpecies}>
    {visible&&<>
      {rect?<><div className={styles.shade} style={{left:0,top:0,width:w,height:rect.top}}/><div className={styles.shade} style={{left:0,top:rect.top,width:rect.left,height:rect.height}}/><div className={styles.shade} style={{left:rect.left+rect.width,top:rect.top,width:Math.max(0,w-rect.left-rect.width),height:rect.height}}/><div className={styles.shade} style={{left:0,top:rect.top+rect.height,width:w,height:Math.max(0,h-rect.top-rect.height)}}/><div className={styles.spotlight} style={rect}/></>:<div className={styles.shade} style={{inset:0}}/>}
      <section data-tutorial-message className={styles.message} role="region" aria-label="튜토리얼 안내" aria-live="polite" style={{left,top,width,maxHeight:h-24}}>
        <small>{confirmSkip?'안내 종료':'처음 함께하는 PokeTower'} {rect&&<span aria-hidden="true">↖</span>}</small>
        <h2>{confirmSkip?'튜토리얼을 건너뛸까요?':copy.title}</h2>
        <p>{confirmSkip?'현재 포켓몬과 게임 진행은 그대로 유지되며, 이후 안내가 표시되지 않습니다.':frame.guide.text}</p>
        {error&&<p role="alert">{error} <button onClick={onRetry}>다시 연결</button></p>}
        <div className={styles.actions}>
          {confirmSkip?<><button disabled={busy} onClick={onCancelSkip}>계속 안내받기</button><button disabled={busy} onClick={onConfirmSkip}>건너뛰기 확정</button></>:state.step===TutorialStep.NotStarted?<><button disabled={busy} onClick={onBegin}>처음이에요</button><button disabled={busy} onClick={onConfirmSkip}>알고 있어요 / 건너뛰기</button></>:<>
            {frame.guide.next&&<button disabled={busy} onClick={onNext}>{frame.guide.next}</button>}
            {frame.guide.resume&&<button onClick={()=>onResume(frame.guide.resume!)}>{state.step===TutorialStep.StatUpgrade?'도감 관리로 이동':state.step===TutorialStep.CompleteTeam?'파티 편성으로 돌아가기':'안내 화면으로 이동'}</button>}
            <button className={styles.skip} disabled={busy} onClick={onSkip}>튜토리얼 건너뛰기</button>
          </>}
        </div>
        {busy&&<span role="status">저장 중…</span>}
      </section>
    </>}
    {!visible&&!confirmSkip&&<button className={styles.waiting} onClick={onSkip}>{waiting?'첫 승리 후 안내가 이어집니다 · ':''}튜토리얼 건너뛰기</button>}
  </div>,frame.guide.host);
}
