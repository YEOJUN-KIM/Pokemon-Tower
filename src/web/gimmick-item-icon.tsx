import {useState,type CSSProperties} from 'react';
import {itemIcon,itemIconExtension,type HeldItem} from '../data/held-items';
import {assetRegistry} from '../assets/registry';
import {AssetImage} from './asset-image';

const frames=new Map<string,CSSProperties>();
export function GimmickItemIcon({item}:{item:HeldItem}){
 const src=assetRegistry.item(itemIcon(item),itemIconExtension(item));
 const [frame,setFrame]=useState<{src:string;style:CSSProperties}|null>(null);
 const style=frames.get(src)??(frame?.src===src?frame.style:undefined);
 return <span className="gimmick-item-visual" aria-hidden="true"><AssetImage className="gimmick-item-icon" src={src} fallbackSrc={assetRegistry.placeholders.gimmick} data-gimmick-item={item} width={88} height={94} alt="" style={style} onLoad={event=>{
  const cached=frames.get(src);if(cached){setFrame({src,style:cached});return;}
  const image=event.currentTarget,w=image.naturalWidth,h=image.naturalHeight;
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context||!w||!h)return;
  context.drawImage(image,0,0);const pixels=context.getImageData(0,0,w,h).data;
  let left=w,right=-1,top=h,bottom=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)return;
  const scale=86/Math.max(right-left+1,bottom-top+1);
  const measured:CSSProperties={width:`${w*scale}%`,height:`${h*scale}%`,left:`${50-(left+right+1)*scale/2}%`,top:`${50-(top+bottom+1)*scale/2}%`};
  frames.set(src,measured);setFrame({src,style:measured});
 }}/></span>;
}
