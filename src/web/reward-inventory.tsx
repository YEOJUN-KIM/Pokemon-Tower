'use client';
import {useRef,useState} from 'react';
import type {RunView} from '../shared/contracts';
import {pokemonName} from './catalog';

export function RewardInventory({run,busy,submit}:{run:RunView;busy:boolean;submit:(body:Record<string,unknown>)=>Promise<void>}){
 const [opened,setOpened]=useState<Record<string,boolean>>({});
 const pending=useRef<Record<string,{requestId:string;choice:string}>>({});
 if(!run.rewardInventory?.length)return null;
 return <section aria-label="보상 보관함"><h3>보상 보관함 · 이번 도전</h3><p>영양제는 기존 섭취 제한을 따릅니다. 기술머신은 기술을 영구 해금하며 정비에서 장착할 수 있습니다.</p>
 {run.rewardInventory.map(entry=><div key={entry.id}><button className="secondary-button" aria-expanded={!!opened[entry.id]} disabled={busy} onClick={()=>setOpened({...opened,[entry.id]:!opened[entry.id]})}>{entry.label} ×{entry.quantity}</button>{opened[entry.id]&&<div data-keyboard-list>{entry.choices.map(choice=><button className="secondary-button" key={choice.id} disabled={busy} onClick={()=>{
  const previous=pending.current[entry.id];const request=previous?.choice===choice.id?previous:{choice:choice.id,requestId:crypto.randomUUID()};pending.current[entry.id]=request;
  void submit({type:'reward-use',runId:run.id,entryId:entry.id,choiceId:choice.id,requestId:request.requestId});
 }}>{run.roster.includes(choice.id)?pokemonName(choice.id):choice.label}</button>)}{!entry.choices.length&&<p>현재 사용할 수 있는 대상이 없습니다. 이후 출전 준비에서 사용할 수 있습니다.</p>}</div>}</div>)}
 </section>;
}
