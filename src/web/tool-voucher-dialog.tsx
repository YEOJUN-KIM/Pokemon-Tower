'use client';
import {useState} from 'react';
import type {BagEntry} from '../data/bag';
import type {RunView} from '../shared/contracts';
import {itemName,itemIcon,itemIconExtension,isHeldItem} from '../data/held-items';
import {PokedexDialog} from './pokedex-dialog';
import {ItemAcquisitionDialog} from './item-acquisition-dialog';
export function ToolVoucherDialog({entry,run,busy,error,onUse,onClose}:{entry:BagEntry;run:RunView;busy:boolean;error?:string;onUse:(target:unknown)=>Promise<void>;onClose:()=>void}){
 const [item,setItem]=useState('');
 if(item)return <ItemAcquisitionDialog title={`${itemName(item)} 획득`} name={itemName(item)} item={item} run={run} busy={busy} error={error} onClose={()=>setItem('')} onAcquire={(destination,species)=>void onUse({drawIndex:entry.voucher!.drawIndex,item,destination,...(species?{species}:{})}).then(onClose).catch(()=>{})}/>;
 return <PokedexDialog title={entry.name} onClose={onClose}><p>도구 하나를 선택하세요.</p><div className="dex-action-options" data-keyboard-list data-testid="tool-voucher-candidates">{entry.voucher?.candidates.map((id,i)=><button data-initial-focus={i===0||undefined} key={id} disabled={busy} onClick={()=>setItem(id)}>{isHeldItem(id)&&<img className="held-item-icon" src={`/sprites/items/${itemIcon(id)}.${itemIconExtension(id)}`} width={24} height={24} alt="" aria-hidden="true"/>}<span>{itemName(id)}</span></button>)}</div>{error&&<p role="alert">{error}</p>}</PokedexDialog>;
}
