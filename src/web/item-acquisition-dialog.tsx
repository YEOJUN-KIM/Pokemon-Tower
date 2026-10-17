'use client';
import {useState} from 'react';
import type {RunView} from '../shared/contracts';
import {PokedexDialog} from './pokedex-dialog';
import {ItemTargetList} from './item-target-list';
import {canEquipGimmick} from '../data/gimmicks';
import {selectedForm} from '../data/selectable-forms';
export function ItemAcquisitionDialog({run,name,item,vitamin=false,busy,error,onAcquire,onClose}:{run:RunView;name:string;item?:string;vitamin?:boolean;busy:boolean;error?:string;onAcquire:(destination:'bag'|'use',species?:string)=>void;onClose:()=>void}){
 const [targeting,setTargeting]=useState(false);
 return <PokedexDialog title={`${name} 구매`} large onClose={()=>targeting?setTargeting(false):onClose()}><div data-testid="item-acquisition">{targeting?<><p>{vitamin?'누구에게 바로 사용할까요?':'누구에게 바로 장착할까요?'}</p><ItemTargetList attribute="data-partner" showHeldItem={!vitamin} run={run} disabled={species=>busy||!!item&&(!canEquipGimmick(species,item)||!!selectedForm(species,run.partnerForms?.[species])?.requiredItem)} onChoose={species=>onAcquire('use',species)}/></>:<div className="dex-action-options"><button data-initial-focus disabled={busy} onClick={()=>setTargeting(true)}>{vitamin?'바로 사용':'바로 장착'}</button><button disabled={busy} data-testid="purchase-item-bag" onClick={()=>onAcquire('bag')}>배낭에 넣기</button></div>}{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={()=>targeting?setTargeting(false):onClose()}>취소</button></div></PokedexDialog>;
}
