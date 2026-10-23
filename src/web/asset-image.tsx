'use client';
import {useEffect,useRef,useState,type ImgHTMLAttributes} from 'react';
import {assetRegistry} from '../assets/registry';

export function AssetImage({src,fallbackSrc=assetRegistry.placeholders.item,...props}:Omit<ImgHTMLAttributes<HTMLImageElement>,'src'|'onError'>&{src:string;fallbackSrc?:string}){
  const [failed,setFailed]=useState<Set<string>>(()=>new Set());
  const shown=[src,fallbackSrc].find(url=>url&&!failed.has(url));
  const image=useRef<HTMLImageElement>(null);
  const reject=(url:string)=>setFailed(current=>new Set([...current,url]));
  // A server-rendered image can fail before React attaches its onError handler.
  useEffect(()=>{if(shown&&image.current?.complete&&image.current.currentSrc&&image.current.naturalWidth===0)reject(shown);},[shown]);
  if(!shown)return <span className={props.className} role={props.alt?'img':undefined} aria-label={props.alt||undefined}/>;
  return <img {...props} ref={image} src={shown} onError={()=>reject(shown)}/>;
}
