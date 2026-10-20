'use client';
import {vitaminDisabledReason} from '../shared/vitamin-eligibility';
import {useState} from 'react';
import type {RunView} from '../shared/contracts';
import {PokedexDialog} from './pokedex-dialog';
import {ItemTargetList} from './item-target-list';
import {canEquipGimmick} from '../data/gimmicks';
import {hasFixedFormItem} from '../data/form-items';
import {selectedForm} from '../data/selectable-forms';
export function ItemAcquisitionDialog({run,name,item,vitamin=false,busy,error,onAcquire,onClose,title}:{run:RunView;name:string;item?:string;vitamin?:boolean;busy:boolean;error?:string;onAcquire:(destination:'bag'|'use',species?:string)=>void;onClose:()=>void;title?:string}){
 const [targeting,setTargeting]=useState(false);
 const disabledReason=(species:string)=>vitamin?vitaminDisabledReason(run.vitaminUsage,species,name):item&&(!canEquipGimmick(species,item,run.partnerForms?.[species])||hasFixedFormItem(species,selectedForm(species,run.partnerForms?.[species])?.requiredItem))?'장착 불가':undefined;
 return <PokedexDialog title={title??`${name} 구매`} large onClose={()=>targeting?setTargeting(false):onClose()}><div data-testid="item-acquisition">{targeting?<><p>{vitamin?'누구에게 바로 사용할까요?':'누구에게 바로 장착할까요?'}</p><ItemTargetList showVitaminUsage={vitamin} attribute="data-partner" showHeldItem={!vitamin} run={run} getStatus={vitamin?()=>'사용 가능':undefined} disabledReason={disabledReason} disabled={()=>busy} onChoose={species=>onAcquire('use',species)}/></>:<div className="dex-action-options"><button data-initial-focus disabled={busy} onClick={()=>setTargeting(true)}>{vitamin?'바로 사용':'바로 장착'}</button><button disabled={busy} data-testid="purchase-item-bag" onClick={()=>onAcquire('bag')}>배낭에 넣기</button></div>}{error&&<p role="alert">{error}</p>}<button data-target-cancel disabled={busy} onClick={()=>targeting?setTargeting(false):onClose()}>취소</button></div></PokedexDialog>;
}
