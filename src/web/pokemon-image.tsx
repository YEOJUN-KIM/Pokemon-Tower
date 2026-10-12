'use client';
import megaSprites from '../data/mega-sprite-availability.json' with {type:'json'};

import {useEffect,useMemo,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {missingDotAnimation} from '../data/sprite-animation';
import formAvailability from '../data/form-sprite-availability.json' with {type:'json'};
import {pixelSpriteSources} from '../data/pixel-sprites';
import {animationFraming} from './sprite-framing';
import {localPokemonSources} from '../data/local-pokemon-sprites';

const posters=new Map<string,{png:string;style:CSSProperties;heightFraction?:number}>();
const readyFrames=new Set<string>();
export function pokemonImageSources(id:number,back=false,animated=false,spriteKey:string|number=id,shiny=false):string[] {
  const local=(paths:string[])=>localPokemonSources(paths,id,spriteKey,back,shiny);
  if(shiny){const side=back?'back/':'';return local(id<650 ? [`versions/generation-v/black-white/animated/${side}shiny/${spriteKey}.gif`,`${side}shiny/${spriteKey}.png`] : [`${side}shiny/${spriteKey}.png`]);}
  const mega=(megaSprites as Record<string,{key:string;animatedFront:boolean;animatedBack:boolean}>)[spriteKey];
  if(mega){const base='/sprites/gimmicks/'+(back?'back/':'front/')+mega.key;return animated && (back?mega.animatedBack:mega.animatedFront) ? [base+'.gif',base+'.png'] : [base+'.png'];}
  // Modern species use community pixel sprites, never the model-rendered GIF fallback.
  if(id>=650){const pixel=pixelSpriteSources(spriteKey,back,animated);if(pixel.length)return pixel;}
  const side=back ? 'back/' : '',png=`${side}${spriteKey}.png`;
  const form=(formAvailability as Record<string,{dotBoth:boolean;showdownBoth:boolean}>)[spriteKey];
  if(!animated || (form ? !form.dotBoth : missingDotAnimation.has(id)))return local([png]);
  return local([`versions/generation-v/black-white/animated/${side}${spriteKey}.gif`,png]);
}

export function PokemonImage({shiny=false,id,spriteKey=id,name,back=false,animated=false,width=96,height=96,lazy=false,sizeScale=1,stableFrame=false,matchBaseHeight=false,maxPixelScale,onVisibleTop,fallback}:{shiny?:boolean;id:number;spriteKey?:string|number;name:string;back?:boolean;animated?:boolean;width?:number;height?:number;lazy?:boolean;sizeScale?:number;stableFrame?:boolean;matchBaseHeight?:boolean;maxPixelScale?:number;onVisibleTop?:(top:number)=>void;fallback:ReactNode}) {
  const sources=useMemo(()=>pokemonImageSources(id,back,true,spriteKey,shiny),[id,back,spriteKey,shiny]);
  const [failed,setFailed]=useState<Set<string>>(()=>new Set());
  const frame=useRef<HTMLSpanElement>(null);
  const [frameWidth,setFrameWidth]=useState(width);
  const [nativeWidth,setNativeWidth]=useState<{source:string;width:number}|null>(null);
  useEffect(()=>{if(!maxPixelScale || !frame.current)return;const observer=new ResizeObserver(([entry])=>setFrameWidth(entry.contentRect.width));observer.observe(frame.current);return ()=>observer.disconnect();},[maxPixelScale]);
  const image=useRef<HTMLImageElement>(null),url=sources.find(source=>!failed.has(source));
  const [fit,setFit]=useState<{source:string;style:CSSProperties}|null>(null);
  const [heightMatch,setHeightMatch]=useState<{source:string;factor:number}|null>(null);
  const [measuredAnimation,setMeasuredAnimation]=useState<string|null>(null);
  function measure(element:HTMLImageElement) {
    if(url && element.naturalWidth)setNativeWidth(current=>current?.source===url&&current.width===element.naturalWidth ? current : {source:url,width:element.naturalWidth});
    try {
      const w=element.naturalWidth,h=element.naturalHeight,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const context=canvas.getContext('2d',{willReadFrequently:true});if(!context || !w || !h)return;
      context.drawImage(element,0,0);const pixels=context.getImageData(0,0,w,h).data;let left=w,right=0,top=h,bottom=0;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      if(left>right)return;
      // Until all GIF frames are measured, contain the full canvas so nothing clips.
      if(url?.endsWith('.gif')){left=0;top=0;right=w-1;bottom=h-1;}
      const extent=Math.max(right-left+1,bottom-top+1),scale=88/extent;
      const style:CSSProperties={width:`${w*scale}%`,height:`${h*scale}%`,left:`${50-(left+(right-left+1)/2)*scale}%`,top:`${100-(bottom+1)*scale}%`};
      if(url){if(!posters.has(url))posters.set(url,{png:canvas.toDataURL('image/png'),style,heightFraction:(bottom-top+1)/extent});if(!url.endsWith('.gif'))readyFrames.add(url);setFit({source:url,style:posters.get(url)?.style ?? style});}
    } catch {if(url){readyFrames.add(url);setFit({source:url,style:{width:'100%',height:'100%',left:0,top:0}});} }
  }
  const reject=(source:string)=>setFailed(current=>new Set([...current,source]));
  useEffect(()=>{
    // Ignore unloaded lazy images; recover failures that occurred before hydration.
    if(url && image.current?.complete && image.current.currentSrc && image.current.naturalWidth===0)reject(url);
    else if(url && image.current?.complete && image.current.naturalWidth)measure(image.current);
  },[url]);
  useEffect(()=>{
    if(!url || (!url.endsWith('.gif') && !matchBaseHeight))return;
    let active=true;
    void (async()=>{const result=await animationFraming(url);const base=matchBaseHeight ? await animationFraming(pokemonImageSources(id,back,true,id)[0]) : null;return {result,factor:result && base ? Math.min(base.heightFraction/result.heightFraction,.98/(.88*sizeScale)) : 1};})().then(({result,factor})=>{readyFrames.add(url);if(result)posters.set(url,result);if(active){if(result)setFit({source:url,style:result.style});else if(image.current?.complete && image.current.naturalWidth)measure(image.current);setHeightMatch({source:url,factor});setMeasuredAnimation(url);}});
    return ()=>{active=false;};
  },[url,matchBaseHeight,id,back,sizeScale]);
  const poster=url ? posters.get(url) : undefined,shown=url && !animated && poster ? poster.png : url;
  const baseStyle=(poster?.style ?? (fit && fit.source===url ? fit.style : undefined)) as {width?:string|number;height?:string|number;left?:string|number;top?:string|number}|undefined;
  const rawPixelScale=nativeWidth && nativeWidth.source===url && baseStyle ? frameWidth*parseFloat(String(baseStyle.width ?? 100))/100/nativeWidth.width : 0;
  const detailScale=maxPixelScale && rawPixelScale>0 ? Math.min(1,maxPixelScale/rawPixelScale) : 1;
  const effectiveScale=detailScale*sizeScale*(matchBaseHeight && heightMatch?.source===url ? (heightMatch?.factor ?? 1) : 1);
  const visibleTop=Math.max(2,98-88*effectiveScale*(poster?.heightFraction ?? 1));
  useEffect(()=>{onVisibleTop?.(visibleTop);},[onVisibleTop,visibleTop]);
  const sizedStyle=effectiveScale===1 ? baseStyle : {width:`${parseFloat(String(baseStyle?.width ?? 100))*effectiveScale}%`,height:`${parseFloat(String(baseStyle?.height ?? 100))*effectiveScale}%`,left:`${50+(parseFloat(String(baseStyle?.left ?? 0))-50)*effectiveScale}%`,top:`${98+(parseFloat(String(baseStyle?.top ?? 0))-98)*effectiveScale}%`};
  const framingReady=!!url && readyFrames.has(url) && !!baseStyle && (!matchBaseHeight || heightMatch?.source===url);
  return url ? <span ref={frame} className="pokemon-image-frame" style={{width,height}} data-framing-ready={framingReady} data-size-scale={sizeScale} data-animation-measured={measuredAnimation===url ? 'true' : undefined}><img ref={image} crossOrigin="anonymous" onLoad={e=>measure(e.currentTarget)} style={{...sizedStyle,...(maxPixelScale ? {imageRendering:'pixelated' as const} : {}),visibility:stableFrame && !framingReady ? 'hidden' : undefined}} src={shown} alt={name} width={width} height={height} loading={lazy ? 'lazy' : 'eager'} decoding="async" draggable={false} onError={()=>reject(url)}/></span> : fallback;
}
