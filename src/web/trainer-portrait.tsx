'use client';
import {useEffect,useRef,useState} from 'react';
import assets from '../data/trainer-assets.json';
import {assetRegistry} from '../assets/registry';
const inventory=assets as Record<string,{kind:string;width:number;height:number}>;
export function trainerAsset(key?:string){return key&&inventory[key]?.kind==='battle-sprite'?key:null;}
/** Only audited pixel assets enter battle/event positions. Artwork never becomes a sprite fallback. */
export function TrainerPortrait({sprite,alt,className='',width,height}:{sprite?:string;alt:string;className?:string;width?:number;height?:number}){
 const [failed,setFailed]=useState<Set<string>>(()=>new Set()),key=trainerAsset(sprite),primary=key?assetRegistry.trainer(key):null;
 const fallback=!primary||failed.has(primary),shown=fallback?assetRegistry.placeholders.trainer:primary;
 const image=useRef<HTMLImageElement>(null);
 const reject=()=>setFailed(current=>new Set([...current,shown]));
 useEffect(()=>{if(image.current?.complete&&image.current.currentSrc&&image.current.naturalWidth===0)reject();},[shown]);
 if(failed.has(shown))return <span role="img" aria-label={alt} className={className} data-trainer-fallback>?</span>;
 return <img ref={image} className={className} width={width} height={height} src={shown} alt={alt} data-trainer-asset={fallback?'pixel-silhouette':'battle-sprite'} data-trainer-fallback={fallback||undefined} style={{imageRendering:'pixelated'}} onError={reject}/>;
}
