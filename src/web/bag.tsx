'use client';
import {useEffect,useRef,useState,useId} from 'react';
import {ItemTargetList} from './item-target-list';
import {vitaminDisabledReason} from '../shared/vitamin-eligibility';
import {itemName} from '../data/held-items';
import type {RunView} from '../shared/contracts';
import {bagPocketNames,type BagPocket,type BagEntry} from '../data/bag';
import {PokedexDialog} from './pokedex-dialog';
import {selectGameCursor} from './game-keyboard';
import {MoveLearningPanel} from './move-learning-panel';
import {pokemonName} from './catalog';
import {moveInfo} from '../data/move-info';
import {TypeBadge} from './type-badge';
import {MoveCategoryBadge} from './move-category-badge';
import styles from './styles/bag.module.css';

type Props={run:RunView;busy:boolean;submit:(body:Record<string,unknown>)=>Promise<void>;error?:string};
export function BagButton(props:Props){const [open,setOpen]=useState(false),trigger=useId();return <><button className="secondary-button" data-open-bag data-bag-trigger={trigger} disabled={props.busy||props.run.state!=='select'} onClick={()=>setOpen(true)}>배낭</button>{open&&<Bag {...props} returnFocus={`[data-bag-trigger="${trigger}"]`} onClose={()=>setOpen(false)}/>}</>;}
export function Bag({run,busy,submit,error,onClose,returnFocus='[data-open-bag]'}:Props&{onClose:()=>void;returnFocus?:string}){
 const [pocket,setPocket]=useState<BagPocket>('tools'),[selected,setSelected]=useState(''),[stage,setStage]=useState<'list'|'targets'|'moves'>('list'),[target,setTarget]=useState('');
 const root=useRef<HTMLDivElement>(null),receipts=useRef(new Map<string,string>());
 const bag=run.bag,entries=bag?.entries.filter(e=>e.pocket===pocket)??[],entry=entries.find(e=>e.id===selected)??entries[0];
 function changePocket(next:BagPocket){setPocket(next);setSelected('');setStage('list');requestAnimationFrame(()=>selectGameCursor(root.current?.querySelector<HTMLButtonElement>('[data-bag-entry]')??root.current?.querySelector<HTMLButtonElement>('[data-game-tabs] [aria-pressed=true]')));}
 useEffect(()=>{const node=root.current;if(!node)return;const observer=new MutationObserver(()=>{const button=node.querySelector<HTMLElement>('[data-game-cursor=true][data-bag-entry]');if(button)setSelected(button.dataset.bagEntry!);});observer.observe(node,{subtree:true,attributes:true,attributeFilter:['data-game-cursor']});return()=>observer.disconnect();},[]);
 function back(){if(busy)return;if(stage==='moves')setStage('targets');else if(stage==='targets')setStage('list');else onClose();}
 function begin(item=entry){if(!item||busy||item.action==='view')return;setSelected(item.id);setStage('targets');requestAnimationFrame(()=>selectGameCursor(root.current?.querySelector<HTMLButtonElement>('[data-bag-target]:not(:disabled)')));}
 async function use(item:BagEntry,target:string|null,slot:number|null=null){const key=JSON.stringify([item.id,target,slot,item.quantity,run.bag?.currentMoves[target??'']]),requestId=receipts.current.get(key)??crypto.randomUUID();receipts.current.set(key,requestId);try{await submit({type:'bag-use',runId:run.id,requestId,entryId:item.id,target,slot});receipts.current.delete(key);setStage('list');}catch{/* Keep the same receipt for a safe retry; the parent displays the error. */}}
 return <PokedexDialog title="배낭 · 이번 도전" large onClose={back} returnFocus={returnFocus} className={styles.dialog}>
  <div ref={root} className={styles.scope} data-testid="bag" data-keyboard-pocket-scope={stage==='list'?true:undefined}>
   <nav className={styles.pockets} data-game-tabs aria-label="배낭 Pocket">{bag?.pockets.map(id=><button key={id} aria-pressed={pocket===id} onClick={()=>changePocket(id)}>{bagPocketNames[id]}</button>)}</nav>
   <div className={styles.content}>{stage==='list'?<div className={styles.layout}><div className={styles.list} data-keyboard-list aria-label={bagPocketNames[pocket]}>{entries.map((item,index)=><button key={item.id} data-bag-entry={item.id} data-initial-focus={index===0||undefined} aria-pressed={entry?.id===item.id} onFocus={event=>{setSelected(item.id);selectGameCursor(event.currentTarget);}} onPointerEnter={event=>{if(event.pointerType==='mouse'){setSelected(item.id);selectGameCursor(event.currentTarget);}}} onClick={event=>{setSelected(item.id);if(event.detail===0||item.action==='machine')begin(item);}}><span>{item.name}{item.quantity!==undefined?` ×${item.quantity}`:''}</span>{item.holder&&<small>{pokemonName(run.partnerForms?.[item.holder]??item.holder)}</small>}</button>)}{!entries.length&&<p>이 Pocket은 비어 있습니다.</p>}</div><aside className={styles.detail} aria-label="배낭 아이템 상세">{entry&&<>{entry.action==='machine'?<svg width="64" height="64" viewBox="0 0 40 40" aria-label="기술머신"><circle cx="20" cy="20" r="17" fill="#bdd1e8"/><circle cx="20" cy="20" r="5" fill="#263341"/></svg>:entry.icon?<img src={entry.icon} width="64" height="64" alt=""/>:null}<h3>{entry.name}</h3>{entry.action==='machine'&&entry.move&&moveInfo[entry.move]&&<MachineMetadata move={entry.move}/>}<p>{entry.description}</p>{entry.holder&&<p>장착: {pokemonName(entry.holder)}</p>}{entry.action==='machine'&&<p>배울 수 있는 포켓몬: {entry.targets.map(pokemonName).join(', ')||'현재 없음'}</p>}{entry.action==='view'?<p>{entry.pocket==='battle'?'전투 중 사용할 수 있습니다.':'보유 중 · 자동 적용'}</p>:entry.action==='machine'?null:<button disabled={busy} onClick={()=>begin()}>{entry.action==='equip'?'지니게 하기':'사용'}</button>}{entry.action==='equip'&&entry.holder&&<button disabled={busy} onClick={()=>void use(entry,null)}>해제</button>}</>}</aside></div>:entry&&stage==='targets'?<section><h3>{entry.action==='equip'?`누구에게 ${entry.name}을 지니게 할까요?`:entry.action==='machine'?`누구에게 ${entry.name}을 가르칠까요?`:entry.action==='exchange'?'교환할 도구를 선택하세요.':`누구에게 ${entry.name}을 사용할까요?`}</h3><div className={styles.targets} data-keyboard-list>{entry.action!=='exchange'?<ItemTargetList run={run} learnable={id=>entry.targets.includes(id)} getStatus={entry.action==='vitamin'?()=>'사용 가능':undefined} disabledReason={entry.action==='vitamin'?id=>vitaminDisabledReason(run.vitaminUsage,id,entry.name):undefined} move={entry.action==='machine'?entry.move:undefined} showHeldItem={entry.action==='equip'} disabled={id=>busy||!entry.targets.includes(id)||(entry.action==='vitamin'&&!!vitaminDisabledReason(run.vitaminUsage,id,entry.name))} onChoose={id=>{if(entry.action==='machine'){setTarget(id);setStage('moves');}else void use(entry,id);}}/>:entry.targets.map(id=><button data-bag-target={id} key={id} disabled={busy} onClick={()=>void use(entry,id)}>{itemName(id)}</button>)}{entry.action==='exchange'&&!entry.targets.length&&<button disabled={busy} onClick={()=>void use(entry,'owned-fallback')}>모두 보유 · 대체 보상 받기</button>}</div></section>:entry&&stage==='moves'&&bag?.partners[target]&&<MoveLearningPanel name={target} partner={bag.partners[target]} current={bag.currentMoves[target]} incoming={entry.move!} busy={busy} onChoose={slot=>void use(entry,target,slot)}/>}
   </div>
   {error&&<p role="alert">{error}</p>}<button className="secondary-button" data-target-cancel disabled={busy} onClick={back}>{stage==='list'?'닫기':'취소'}</button><small>↑↓ 선택 · ←→ Pocket · Q/E Pocket · Z/Enter 사용 · X 뒤로</small>
  </div>
 </PokedexDialog>;
}

function MachineMetadata({move}:{move:string}){
 const info=moveInfo[move];
 return <><div className={styles.moveLabels}><TypeBadge type={info.type}/><MoveCategoryBadge category={info.category}/></div><dl className={styles.moveStats}><div><dt>위력</dt><dd>{info.power||'—'}</dd></div><div><dt>명중률</dt><dd>{info.accuracy===true?'필중':`${info.accuracy}%`}</dd></div><div><dt>PP</dt><dd>{info.pp}</dd></div></dl></>;
}
