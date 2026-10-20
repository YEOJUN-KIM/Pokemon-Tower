'use client';
import {useEffect,useLayoutEffect,useRef,useState,useId} from 'react';
import {GameStatus} from './game-menu';
import {ToolVoucherDialog} from './tool-voucher-dialog';
import {ItemTargetList} from './item-target-list';
import {vitaminDisabledReason} from '../shared/vitamin-eligibility';
import {itemName} from '../data/held-items';
import type {RunView} from '../shared/contracts';
import {bagPocketNames,type BagPocket,type BagEntry} from '../data/bag';
import {PokedexDialog} from './pokedex-dialog';
import {selectGameCursor} from './game-keyboard';
import {MoveLearningPanel} from './move-learning-panel';
import {pokemonName,species} from './catalog';
import {PokemonImage} from './pokemon-image';
import {TmIcon} from './tm-icon';
import {moveInfo} from '../data/move-info';
import {TypeBadge} from './type-badge';
import {MoveCategoryBadge} from './move-category-badge';
import styles from './styles/bag.module.css';

type Props={run:RunView;busy:boolean;submit:(body:Record<string,unknown>)=>Promise<void>;error?:string};
export function BagButton(props:Props){const [open,setOpen]=useState(false),trigger=useId();return <><button className={`secondary-button ${styles.trigger}`} data-open-bag data-bag-trigger={trigger} disabled={props.busy||props.run.state!=='select'} onClick={()=>setOpen(true)}>배낭</button>{open&&<Bag {...props} returnFocus={`[data-bag-trigger="${trigger}"]`} onClose={()=>setOpen(false)}/>}</>;}
export function Bag({run,busy,submit,error,onClose,returnFocus='[data-open-bag]'}:Props&{onClose:()=>void;returnFocus?:string}){
 const [pocket,setPocket]=useState<BagPocket>('tools'),[selected,setSelected]=useState(''),[stage,setStage]=useState<'list'|'targets'|'moves'|'voucher'>('list'),[target,setTarget]=useState('');
 const root=useRef<HTMLDivElement>(null),receipts=useRef(new Map<string,string>());
 useLayoutEffect(()=>{if(stage==='list')selectGameCursor(root.current?.querySelector<HTMLButtonElement>('[data-bag-entry]')??root.current?.querySelector<HTMLButtonElement>('[data-game-tabs] [aria-pressed=true]'));},[pocket,stage]);
 const bag=run.bag,entries=bag?.entries.filter(e=>e.pocket===pocket)??[],entry=entries.find(e=>e.id===selected)??entries[0];
 function changePocket(next:BagPocket){setPocket(next);setSelected('');setStage('list');}
 useEffect(()=>{const node=root.current;if(!node)return;const observer=new MutationObserver(()=>{const button=node.querySelector<HTMLElement>('[data-game-cursor=true][data-bag-entry]');if(button)setSelected(button.dataset.bagEntry!);});observer.observe(node,{subtree:true,attributes:true,attributeFilter:['data-game-cursor']});return()=>observer.disconnect();},[]);
 function back(){if(busy)return;if(stage==='moves')setStage('targets');else if(stage==='targets'||stage==='voucher')setStage('list');else onClose();}
 function begin(item=entry){if(!item||busy||item.action==='view')return;setSelected(item.id);if(item.action==='voucher'){setStage('voucher');if(!item.voucher)void useVoucher(item,'open');return;}setStage('targets');requestAnimationFrame(()=>selectGameCursor(root.current?.querySelector<HTMLButtonElement>('[data-bag-target]:not(:disabled)')));}
 async function use(item:BagEntry,target:string|null,slot:number|null=null){const key=JSON.stringify([item.id,target,slot,item.quantity,run.bag?.currentMoves[target??'']]),requestId=receipts.current.get(key)??crypto.randomUUID();receipts.current.set(key,requestId);try{await submit({type:'bag-use',runId:run.id,requestId,entryId:item.id,target,slot});receipts.current.delete(key);setStage('list');}catch{/* Keep the same receipt for a safe retry; the parent displays the error. */}}
 async function useVoucher(item:BagEntry,target:unknown){const key=JSON.stringify([item.id,target]),requestId=receipts.current.get(key)??crypto.randomUUID();receipts.current.set(key,requestId);await submit({type:'bag-use',runId:run.id,requestId,entryId:item.id,target});receipts.current.delete(key);}
 if(stage==='voucher'&&entry?.voucher)return <ToolVoucherDialog entry={entry} run={run} busy={busy} error={error} onUse={target=>useVoucher(entry,target)} onClose={()=>setStage('list')}/>;
 return <PokedexDialog title="배낭 · 이번 도전" large context="bag" controls={stage==='list'?[{key:'↑ / ↓',label:'선택'},{key:'← / → · Q / E',label:'Pocket'},{key:'Enter / Z',label:'사용'},{key:'Esc / X',label:'닫기'}]:[{key:'방향키',label:'선택'},{key:'Enter / Z',label:'결정'},{key:'Esc / X',label:'뒤로'}]} onClose={back} returnFocus={returnFocus} className={styles.dialog}>
  <div ref={root} className={styles.scope} data-testid="bag" data-keyboard-pocket-scope={stage==='list'?true:undefined}>
   <nav className={styles.pockets} data-game-tabs aria-label="배낭 Pocket">{bag?.pockets.map(id=><button key={id} aria-pressed={pocket===id} onClick={()=>changePocket(id)}>{bagPocketNames[id]}</button>)}</nav>
   <div className={styles.content}>{stage==='list'?<div className={styles.layout}><div className={styles.list} data-keyboard-list aria-label={bagPocketNames[pocket]}>{entries.map((item,index)=><button key={item.id} data-bag-entry={item.id} data-initial-focus={index===0||undefined} aria-pressed={entry?.id===item.id} onFocus={event=>{setSelected(item.id);selectGameCursor(event.currentTarget);}} onPointerEnter={event=>{if(event.pointerType==='mouse'){setSelected(item.id);selectGameCursor(event.currentTarget);}}} onClick={event=>{setSelected(item.id);begin(item);}}><span className={styles.entryName}>{item.action==='machine'&&item.move&&moveInfo[item.move]&&<TmIcon type={moveInfo[item.move].type}/>}<span>{item.name}{item.quantity!==undefined?` ×${item.quantity}`:''}</span></span>{item.holder&&<small>{pokemonName(run.partnerForms?.[item.holder]??item.holder)}</small>}</button>)}{!entries.length&&<p>이 Pocket은 비어 있습니다.</p>}</div><aside className={styles.detail} aria-label="배낭 아이템 상세">{entry&&<>{entry.action==='machine'?<TmIcon type={moveInfo[entry.move??'']?.type??'Normal'} size="detail"/>:entry.icon?<img src={entry.icon} width="64" height="64" alt=""/>:null}<h3>{entry.name}</h3>{entry.action==='machine'&&entry.move&&moveInfo[entry.move]&&<MachineMetadata move={entry.move}/>}<p>{entry.description}</p>{entry.holder&&<p>장착: {pokemonName(entry.holder)}</p>}{entry.action==='machine'&&<LearnablePokemonList run={run} targets={entry.targets}/>}{entry.action==='view'?<GameStatus>{entry.pocket==='battle'?'전투 중 사용할 수 있습니다.':'보유 중 · 자동 적용'}</GameStatus>:entry.action==='machine'||entry.action==='equip'?null:<button disabled={busy} onClick={()=>begin()}>사용</button>}{entry.action==='equip'&&entry.holder&&<button disabled={busy} onClick={()=>void use(entry,null)}>해제</button>}</>}</aside></div>:entry&&stage==='targets'?<section><h3>{entry.action==='equip'?`누구에게 ${entry.name}을 지니게 할까요?`:entry.action==='machine'?`누구에게 ${entry.name}을 가르칠까요?`:entry.action==='exchange'?'교환할 도구를 선택하세요.':`누구에게 ${entry.name}을 사용할까요?`}</h3><div className={styles.targets} data-keyboard-list>{entry.action!=='exchange'?<ItemTargetList run={run} showVitaminUsage={entry.action==='vitamin'} learnable={id=>entry.targets.includes(id)} getStatus={entry.action==='vitamin'?()=>'사용 가능':undefined} disabledReason={entry.action==='vitamin'?id=>vitaminDisabledReason(run.vitaminUsage,id,entry.name):entry.action==='equip'?id=>entry.targets.includes(id)?undefined:'장착 불가':undefined} move={entry.action==='machine'?entry.move:undefined} showHeldItem={entry.action==='equip'} disabled={id=>busy||!entry.targets.includes(id)||(entry.action==='vitamin'&&!!vitaminDisabledReason(run.vitaminUsage,id,entry.name))} onChoose={id=>{if(entry.action==='machine'){setTarget(id);setStage('moves');}else void use(entry,id);}}/>:entry.targets.map(id=><button data-bag-target={id} key={id} disabled={busy} onClick={()=>void use(entry,id)}>{itemName(id)}</button>)}{entry.action==='exchange'&&!entry.targets.length&&<button disabled={busy} onClick={()=>void use(entry,'owned-fallback')}>모두 보유 · 대체 보상 받기</button>}</div></section>:entry&&stage==='moves'&&bag?.partners[target]&&<MoveLearningPanel name={target} partner={bag.partners[target]} current={bag.currentMoves[target]} incoming={entry.move!} busy={busy} onChoose={slot=>void use(entry,target,slot)}/>}
   </div>
   {error&&<p role="alert">{error}</p>}{stage!=='list'&&<button className="secondary-button" data-target-cancel disabled={busy} onClick={back}>취소</button>}
  </div>
 </PokedexDialog>;
}

function MachineMetadata({move}:{move:string}){
 const info=moveInfo[move];
 return <><div className={styles.moveLabels}><TypeBadge type={info.type}/><MoveCategoryBadge category={info.category}/></div><dl className={styles.moveStats}><div><dt>위력</dt><dd>{info.power||'—'}</dd></div><div><dt>명중률</dt><dd>{info.accuracy===true?'필중':`${info.accuracy}%`}</dd></div><div><dt>PP</dt><dd>{info.pp}</dd></div></dl></>;
}

function LearnablePokemonList({run,targets}:{run:RunView;targets:string[]}){
 return <section aria-label="배울 수 있는 포켓몬"><h4 className={styles.learnableHeading}>배울 수 있는 포켓몬</h4>{targets.length?<ul className={styles.learnablePokemon}>{targets.map(name=>{
  const displayName=run.partnerForms?.[name]??name,info=species[displayName]??species[name],profile=run.adjustment?.entries.find(entry=>entry.species===name)?.profile;
  return <li key={name} className={styles.learnablePokemonChip}>{info&&<PokemonImage id={info.id} spriteKey={info.spriteKey} shiny={profile?.shiny} name={pokemonName(displayName)} width={32} height={32} fallback={<span aria-hidden="true">◇</span>}/>}<span>{pokemonName(displayName)}</span></li>;
 })}</ul>:<p>현재 없음</p>}</section>;
}
