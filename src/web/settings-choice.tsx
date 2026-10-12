'use client';
import {useState} from 'react';
import {PokedexDialog} from './pokedex-dialog';

export function SettingsChoice({name,label,value,options,onChange}:{name:string;label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void}){
  const [open,setOpen]=useState(false);
  return <><button className="settings-choice-trigger" data-settings-choice={name} aria-label={label} aria-haspopup="dialog" onClick={()=>setOpen(true)}>{options.find(option=>option.value===value)?.label}<span aria-hidden="true">▾</span></button>
    {open&&<PokedexDialog title={label} onClose={()=>setOpen(false)} returnFocus={`[data-settings-choice="${name}"]`} initialFocus="[data-initial-focus]" className="settings-choice-dialog"><div className="settings-choice-grid" data-keyboard-grid>{options.map(option=><button key={option.value} aria-label={option.label} aria-pressed={option.value===value} data-initial-focus={option.value===value||undefined} onClick={()=>{onChange(option.value);setOpen(false);}}>{option.label}{option.value===value&&<span aria-hidden="true"> ✓</span>}</button>)}</div><p className="setting-note">방향키로 선택 · Z / Enter로 결정 · X로 취소</p></PokedexDialog>}
  </>;
}
