import {test,expect} from '@playwright/test';
import {dexSearch} from './dex-filters';

test('all Lumineon animation frames remain inside the image frame',async({page})=>{
  await page.goto('/pokedex');await dexSearch(page).fill('네오라이트');
  await page.getByRole('button',{name:'네오라이트 상세 보기',exact:true}).click();
  const image=page.getByRole('dialog',{name:'네오라이트 선택 메뉴'}).locator('img');
  await expect(image).toHaveAttribute('src',/457\.gif$/);
  // Full-frame analysis places the lowest opaque pixel at 98%, with a 2% margin.
  await expect(image.locator('xpath=..')).toHaveAttribute('data-animation-measured','true');
  const bounds=await image.evaluate(async(img:HTMLImageElement)=>{
    const Decoder=(window as unknown as {ImageDecoder:new(options:unknown)=>{tracks:{ready:Promise<void>;selectedTrack:{frameCount:number}};decode:(options:unknown)=>Promise<{image:CanvasImageSource & {displayWidth:number;displayHeight:number;close:()=>void}}>;close:()=>void}}).ImageDecoder;
    const decoder=new Decoder({data:await fetch(img.src).then(r=>r.arrayBuffer()),type:'image/gif'});await decoder.tracks.ready;
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true})!;
    const scaleX=parseFloat(img.style.width),scaleY=parseFloat(img.style.height),offsetX=parseFloat(img.style.left),offsetY=parseFloat(img.style.top);
    let minX=100,minY=100,maxX=0,maxY=0;const count=decoder.tracks.selectedTrack.frameCount;
    for(let frameIndex=0;frameIndex<count;frameIndex++){
      const {image}=await decoder.decode({frameIndex});canvas.width=image.displayWidth;canvas.height=image.displayHeight;ctx.drawImage(image,0,0);image.close();
      const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>32){minX=Math.min(minX,offsetX+x/canvas.width*scaleX);maxX=Math.max(maxX,offsetX+(x+1)/canvas.width*scaleX);minY=Math.min(minY,offsetY+y/canvas.height*scaleY);maxY=Math.max(maxY,offsetY+(y+1)/canvas.height*scaleY);}
    }
    decoder.close();return {minX,maxX,minY,maxY,count};
  });
  expect(bounds.count).toBeGreaterThan(1);expect(bounds.minX).toBeGreaterThanOrEqual(0);expect(bounds.maxX).toBeLessThanOrEqual(100);expect(bounds.minY).toBeGreaterThanOrEqual(0);expect(bounds.maxY).toBeCloseTo(98,3);
  await page.screenshot({path:'test-results/lumineon-framing.png'});
});
