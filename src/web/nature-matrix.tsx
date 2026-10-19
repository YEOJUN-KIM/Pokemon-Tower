'use client';
import {natures,natureLabel,statNames,type StatKey} from '../data/training';
import {useEffect,useRef,useState} from 'react';

const axes:StatKey[]=['atk','def','spa','spd','spe'];
const neutral=['Quirky','Bashful','Hardy','Docile','Serious'];
export function NatureMatrix({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}) {
  const [preview,setPreview]=useState(value),ref=useRef<HTMLElement>(null),nature=natures.find(item=>item.id===preview);
  useEffect(()=>{const root=ref.current;const update=(event:Event)=>{const id=(event.target as HTMLElement).closest<HTMLElement>('[data-nature]')?.dataset.nature;if(id)setPreview(id);};root?.addEventListener('game-cursor-change',update);return()=>root?.removeEventListener('game-cursor-change',update);},[]);
  return <section ref={ref} className="nature-matrix"><div className="nature-matrix-heading"><strong>성격 선택</strong><span aria-live="polite">{natureLabel(preview)}</span></div><table aria-label="성격 선택표"><caption>행은 상승하는 능력치, 열은 하락하는 능력치입니다. 대각선은 보정 없는 성격입니다.</caption><thead><tr><th scope="col">상승 ↑<br/>하락 →</th>{axes.map(key=><th scope="col" key={key} className={nature?.minus===key?'nature-axis-active':''}>{statNames[key]} ↓</th>)}</tr></thead><tbody>{axes.map((plus,row)=><tr key={plus}><th scope="row" className={nature?.plus===plus?'nature-axis-active':''}>{statNames[plus]} ↑</th>{axes.map((minus,column)=>{
    const nature=plus===minus ? natures.find(item=>item.id===neutral[row])! : natures.find(item=>item.plus===plus && item.minus===minus)!;
    return <td key={minus}><button type="button" data-nature={nature.id} onPointerEnter={()=>setPreview(nature.id)} onFocus={()=>setPreview(nature.id)} data-initial-focus={value===nature.id || undefined} disabled={disabled} aria-label={natureLabel(nature.id)} aria-pressed={value===nature.id} className={row===column ? 'nature-neutral' : ''} onClick={()=>onChange(nature.id)}>{nature.name}</button></td>;
  })}</tr>)}</tbody></table></section>;
}
