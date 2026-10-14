import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {pokedexEntries} from '../src/server/pokedex-entries';

test.describe.configure({mode:'parallel'});
const entries=pokedexEntries();
for(let generation=1;generation<=9;generation++)test(`audit every generation ${generation} dex sprite`,async({page})=>{
 test.setTimeout(600000);
 await page.setViewportSize({width:1920,height:902});await page.goto('/pokedex');
 await expect(page.getByTestId('dex-progress')).toHaveText(`3 / ${entries.length}`);
 const group=entries.filter(entry=>entry.generation===generation),records:unknown[]=[],issues:string[]=[];
 const preview=page.getByTestId('dex-partner-display');
 for(const [index,entry] of group.entries()){
  try{
   await page.getByRole('searchbox',{name:'검색'}).fill(entry.species);
   const card=page.locator(`.dex-card[data-species=${JSON.stringify(entry.species)}]`);
   await card.click();await page.getByRole('dialog',{name:entry.name+' 선택 메뉴'}).getByRole('button',{name:entry.name+' 선택 메뉴 닫기'}).click();
   const img=preview.locator('img');
   await expect(img.locator('..')).toHaveAttribute('data-framing-ready','true',{timeout:20000});
   const source=await img.getAttribute('src');
   if(source?.endsWith('.gif'))await expect(img.locator('..')).toHaveAttribute('data-animation-measured','true',{timeout:20000});
   await expect.poll(()=>img.evaluate((image:HTMLImageElement)=>image.getBoundingClientRect().width/image.naturalWidth),{timeout:5000}).toBeLessThanOrEqual(2.01);
   const metric=await img.evaluate((image:HTMLImageElement)=>{
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    const box=image.getBoundingClientRect(),frame=image.parentElement!.getBoundingClientRect(),scale=box.width/image.naturalWidth;
    return {source:image.src,nativeWidth:image.naturalWidth,nativeHeight:image.naturalHeight,opaqueWidth:right-left+1,opaqueHeight:bottom-top+1,pixelScale:scale,rendering:getComputedStyle(image).imageRendering,filter:getComputedStyle(image).filter,visibleWidth:(right-left+1)*scale,visibleHeight:(bottom-top+1)*scale,clipped:box.x+left*scale<frame.x-1||box.y+top*scale<frame.y-1||box.x+(right+1)*scale>frame.right+1||box.y+(bottom+1)*scale>frame.bottom+1};
   });
   records.push({species:entry.species,name:entry.name,generation,...metric});
   if(metric.opaqueWidth<=0||metric.opaqueHeight<=0||metric.clipped||metric.rendering!=='pixelated'||metric.filter!=='none')issues.push(entry.species+': '+JSON.stringify(metric));
  }catch(error){issues.push(entry.species+': '+String(error));await page.goto('/pokedex');}
  if((index+1)%25===0)console.log(`Sprite audit generation ${generation}: ${index+1}/${group.length}`);
 }
 const directory='artifacts/qa/assets/reports/pokedex-sprites';await mkdir(directory,{recursive:true});
 await writeFile(`${directory}/generation-${generation}.json`,JSON.stringify({generation,expected:group.length,checked:records.length,issues,records},null,2));
 await preview.screenshot({path:`artifacts/qa/screenshots/pokedex-audit/generation-${generation}.png`});
 expect(issues,issues.join('\n')).toEqual([]);expect(records).toHaveLength(group.length);
});
