'use client';
import {useState} from 'react';
import assets from '../data/trainer-assets.json';
const inventory=assets as Record<string,{kind:string;width:number;height:number}>;
export function trainerAsset(key?:string){return key&&inventory[key]?.kind==='battle-sprite'?key:null;}
/** Only audited pixel assets enter battle/event positions. Artwork never becomes a sprite fallback. */
export function TrainerPortrait({sprite,alt,className='',width,height}:{sprite?:string;alt:string;className?:string;width?:number;height?:number}){
 const [failed,setFailed]=useState<string|null>(null),key=trainerAsset(sprite),fallback=!key||failed===key,shown=fallback?'acetrainer-gen4':key;
 if(failed===shown)return <span role="img" aria-label={alt} className={className} data-trainer-fallback>?</span>;
 return <img className={className} width={width} height={height} src={`/sprites/trainers/${shown}.png`} alt={alt} data-trainer-asset={fallback?'pixel-silhouette':'battle-sprite'} data-trainer-fallback={fallback||undefined} style={{imageRendering:'pixelated',...(fallback?{filter:'brightness(0)'}:{})}} onError={()=>setFailed(shown)}/>;
}
