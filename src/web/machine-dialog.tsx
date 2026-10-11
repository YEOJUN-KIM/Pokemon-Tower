'use client';
import {useState} from 'react';
import type {MachineOffer,RunView} from './contracts';
import {moves,pokemonName} from './catalog';
import {PokedexDialog} from './pokedex-dialog';
import {MoveDetails} from './recruit-move-picker';
import {MoveLearningPanel} from './move-learning-panel';
import {RunPartnerList} from './run-partner-list';
import {selectGameCursor} from './game-keyboard';
import {machineRarity} from '../data/machine-rarities';
import {rarityColors} from '../data/held-item-shop';

export function MachineDialog({run,offer,coins,busy,error,submit,onClose}:{run:RunView;offer:MachineOffer;coins:number;busy:boolean;error?:string;submit:(body:Record<string,unknown>)=>Promise<void>;onClose:()=>void}) {
  const [target,setTarget]=useState(''),[stage,setStage]=useState<'targets'|'mode'|'moves'|'confirm'>('targets'),[slot,setSlot]=useState<number|null>(null);
  const current=run.machineShop?.currentMoves[target] ?? [],partner=run.machineShop?.partners[target];
  const focus=(selector:string)=>requestAnimationFrame(()=>selectGameCursor(document.querySelector<HTMLButtonElement>(`[data-testid="machine-confirmation"] ${selector}`)));
  function back(){if(busy)return;if(offer.purchased){onClose();return;}if(stage==='confirm'){setStage(slot===null ? 'mode' : 'moves');focus(slot===null ? '.machine-mode button' : `[data-learning-slot="${slot}"]`);}else if(stage==='moves'){setStage('mode');focus('.machine-mode button');}else if(stage==='mode'){setStage('targets');focus(`button[data-target="${target}"]`);}else onClose();}
  return <PokedexDialog title={`기술머신 · ${moves[offer.move]?.name ?? offer.move}`} titleColor={rarityColors[offer.rarity ?? machineRarity(offer.move)]} large className="maintenance-dialog" onClose={back} returnFocus={`button[data-machine="${offer.move}"]`}>
    <div className="machine-screen" data-testid="machine-confirmation">
      <span className="machine-wallet">보유 {coins.toLocaleString()}코인 · 가격 {offer.price}코인</span>
      {offer.purchased ? <div role="status"><h3>기술머신 구매 완료!</h3><p>{pokemonName(offer.buyer ?? target)}의 도감에 {moves[offer.move]?.name ?? offer.move}을 저장했어요.</p><button className="primary-button" data-initial-focus onClick={onClose}>상점으로 돌아가기</button></div> : <>
        {stage==='targets' && <><p>어느 포켓몬에게 가르칠까요?</p><RunPartnerList run={run} label="기술머신 대상" attribute="data-target" disabled={name=>busy||!offer.targets.includes(name)} onChoose={name=>{setTarget(name);setStage('mode');setSlot(null);focus('.machine-mode button');}} detail={name=>offer.targets.includes(name)?'배울 수 있다!':run.machineShop?.currentMoves[name]?.includes(offer.move)?'이미 배치 중':run.machineShop?.partners[name]?.knownMoves.includes(offer.move)?'이미 수집한 기술':'배울 수 없다'}/><MoveDetails name={offer.move} label="기술머신"/></>}
        {stage==='mode' && <><h3>{pokemonName(target)}에게 가르치기</h3><MoveDetails name={offer.move} label="기술머신"/><div className="recruit-mode-buttons machine-mode" role="group" aria-label="기술머신 사용 방식"><button className="secondary-button" disabled={busy} onClick={()=>{setSlot(null);setStage('confirm');focus('.machine-buy');}}>도감에만 저장</button><button className="secondary-button" disabled={busy} onClick={()=>{setStage('moves');focus('[data-learning-slot="0"]');}}>바로 장착</button></div><p>도감에는 영구 저장하며, 바로 장착하면 이번 도전의 기술도 바꿉니다.</p></>}
        {stage==='moves' && partner && <MoveLearningPanel name={target} partner={partner} current={current} incoming={offer.move} busy={busy} onChoose={index=>{setSlot(index);setStage('confirm');focus('.machine-buy');}}/>}
        {stage==='confirm' && <section className="machine-replace-confirm" aria-label="기술머신 교체 확인"><h3>{slot===null ? `${pokemonName(target)}의 도감에 저장할까요?` : current[slot] ? `${moves[current[slot]]?.name ?? current[slot]}을 잊고 ${moves[offer.move]?.name ?? offer.move}을 배울까요?` : `${moves[offer.move]?.name ?? offer.move}을 배울까요?`}</h3><div className="recruit-move-comparison" aria-label="기술머신 교체 비교">{slot!==null && <MoveDetails name={current[slot]} label="잊을 기술"/>}<MoveDetails name={offer.move} label="배울 기술"/></div><p>{offer.price}코인을 사용합니다. 잊은 기술은 도감에서 다시 배치할 수 있어요.</p><button className="primary-button machine-buy" data-initial-focus disabled={busy || coins<offer.price} onClick={()=>void submit({type:'purchase-machine',revision:run.shopRerolls?.machines.count??0,runId:run.id,floor:run.floor,move:offer.move,species:target,slot})}>{busy ? '구매 중…' : `${offer.price}코인에 구매·${slot===null ? '저장' : '장착'}`}</button></section>}
        {error && <p className="error-banner" role="alert">{error}</p>}
        <button className="secondary-button machine-back" disabled={busy} onClick={back}>{stage==='targets' ? '취소 · X' : '뒤로 · X'}</button>
      </>}
    </div>
  </PokedexDialog>;
}
