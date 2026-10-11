'use client';
import {TypeBadge} from './type-badge';
import {MoveCategoryBadge} from './move-category-badge';
import {useEffect,useRef,useState} from 'react';
import type {MachinePartner} from './contracts';
import {statKeys,statNames} from '../data/training';
import {abilityNames} from './pokedex-data';
import {moves,pokemonName,species} from './catalog';
import {moveInfo} from '../data/move-info';
import {PokemonImage} from './pokemon-image';
import {MoveDetails} from './recruit-move-picker';
import {selectGameCursor} from './game-keyboard';

export function PartnerStats({name,partner}:{name:string;partner:MachinePartner}) {
  const info=species[name];
  return <section className="learning-partner" aria-label={`${pokemonName(name)} 능력치`}><div className="learning-identity"><PokemonImage id={info.id} spriteKey={info.spriteKey} name={pokemonName(name)} animated width={72} height={72} fallback={<span>◇</span>}/><div><strong>{pokemonName(name)}</strong><small>Lv.{partner.level} · {info.types.join(' / ')}</small><small>특성 · {abilityNames[partner.ability] ?? partner.ability}</small></div></div><dl className="learning-stats">{statKeys.map(key=><div key={key} className={key==='atk' || key==='spa' ? 'offensive-stat' : ''}><dt>{statNames[key]}</dt><dd>{partner.stats[key]}</dd></div>)}</dl></section>;
}

export function MoveLearningPanel({name,partner,current,incoming,busy,onChoose}:{name:string;partner:MachinePartner;current:string[];incoming:string;busy:boolean;onChoose:(slot:number)=>void}) {
  const [focused,setFocused]=useState(0),root=useRef<HTMLElement>(null);
  useEffect(()=>{
    const panel=root.current;if(!panel)return;
    const observer=new MutationObserver(()=>{const cursor=panel.querySelector<HTMLElement>('[data-game-cursor=true][data-learning-slot]');if(cursor)setFocused(Number(cursor.dataset.learningSlot));});
    observer.observe(panel,{subtree:true,attributes:true,attributeFilter:['data-game-cursor']});return ()=>observer.disconnect();
  },[]);
  return <section ref={root} className="move-learning-panel"><PartnerStats name={name} partner={partner}/><div className="learning-incoming"><MoveDetails name={incoming} label="새로 배울 기술"/></div><div className="learning-moves" data-keyboard-list role="group" aria-label="기술머신 교체할 기술"><h3>잊을 기술을 선택하세요</h3>{[...current,...(current.length<4 ? [undefined] : [])].map((move,index)=>{const info=move ? moveInfo[move] : undefined;return <button className="secondary-button" data-learning-slot={index} key={index} disabled={busy} onFocus={()=>setFocused(index)} onPointerMove={event=>{if(event.movementX || event.movementY)selectGameCursor(event.currentTarget);}} onClick={()=>onChoose(index)}><strong>{index+1}. {move ? moves[move]?.name ?? move : '빈 기술 칸'}</strong><small className="learning-move-meta">{info ? <><TypeBadge type={info.type}/><MoveCategoryBadge category={info.category}/><span>PP {info.pp}</span></> : '새 기술을 추가합니다'}</small></button>;})}</div><div className="learning-description" aria-label="선택한 기술 상세"><MoveDetails name={current[focused]} label="선택한 현재 기술"/></div><p className="learning-hint">방향키 선택 · Enter/Z 확인 · X 돌아가기</p></section>;
}
