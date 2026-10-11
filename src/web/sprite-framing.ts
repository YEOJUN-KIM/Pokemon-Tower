import type {CSSProperties} from 'react';

type DecodedFrame=CanvasImageSource & {displayWidth:number;displayHeight:number;close:()=>void};
type Decoder={tracks:{ready:Promise<void>;selectedTrack?:{frameCount:number}};decode:(options:{frameIndex:number})=>Promise<{image:DecodedFrame}>;close:()=>void};
type DecoderClass={new(options:{data:ArrayBuffer;type:string}):Decoder};
export type SpriteFraming={png:string;style:CSSProperties;heightFraction:number};
const pending=new Map<string,Promise<SpriteFraming|null>>();

// A bouncing GIF needs the opaque bounds of every frame, not just its load frame.
export function animationFraming(url:string):Promise<SpriteFraming|null> {
  const cached=pending.get(url);if(cached)return cached;
  const task=(async()=>{
    const ImageDecoder=(globalThis as unknown as {ImageDecoder?:DecoderClass}).ImageDecoder;
    if(!ImageDecoder)return null;
    let decoder:Decoder|undefined;
    try {
      const response=await fetch(url);if(!response.ok)return null;
      decoder=new ImageDecoder({data:await response.arrayBuffer(),type:url.endsWith('.gif') ? 'image/gif' : 'image/png'});
      await decoder.tracks.ready;
      const count=decoder.tracks.selectedTrack?.frameCount ?? 0;
      let left=Infinity,right=-1,top=Infinity,bottom=-1,w=0,h=0,png='';
      const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return null;
      for(let index=0;index<count;index++) {
        const {image}=await decoder.decode({frameIndex:index});
        try {
          w=image.displayWidth;h=image.displayHeight;canvas.width=w;canvas.height=h;
          context.drawImage(image,0,0);if(index===0)png=canvas.toDataURL('image/png');
          const pixels=context.getImageData(0,0,w,h).data;
          for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
        } finally {image.close();}
      }
      if(left>right)return null;
      const scale=88/Math.max(right-left+1,bottom-top+1);
      return {png,heightFraction:(bottom-top+1)/Math.max(right-left+1,bottom-top+1),style:{width:`${w*scale}%`,height:`${h*scale}%`,left:`${50-(left+(right-left+1)/2)*scale}%`,top:`${98-(bottom+1)*scale}%`}};
    } catch {return null;} finally {decoder?.close();}
  })();
  pending.set(url,task);return task;
}
