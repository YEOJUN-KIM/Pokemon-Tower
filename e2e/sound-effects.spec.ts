import {test,expect} from '@playwright/test';
import {effectPreviews} from '../src/web/sound-design';
test('every effect preview schedules audio and mute stops active sources',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
 const meter=window as unknown as {sfxStarts:number;activeSfx:number};meter.sfxStarts=0;meter.activeSfx=0;
 for(const proto of [OscillatorNode.prototype,AudioBufferSourceNode.prototype]){
 const start=proto.start;proto.start=function(...args:Parameters<typeof start>){meter.sfxStarts++;meter.activeSfx++;this.addEventListener('ended',()=>meter.activeSfx--,{once:true});return Reflect.apply(start,this,args);};
 }
 });
 await page.goto('/settings');const preview=page.getByRole('button',{name:'효과음 들어보기',exact:true});await expect(preview).toBeDisabled();
 await page.getByLabel('전체 음소거').uncheck();await expect(preview).toBeEnabled();
 for(const id of Object.keys(effectPreviews)){
 await page.getByLabel('미리듣기 효과음').selectOption(id);const before=await page.evaluate(()=>(window as unknown as {sfxStarts:number}).sfxStarts);await preview.click();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {sfxStarts:number}).sfxStarts)).toBeGreaterThan(before);
 }
 await page.getByLabel('미리듣기 효과음').selectOption('dynamaxGrow');await preview.click();await page.getByLabel('전체 음소거').check();await expect(preview).toBeDisabled();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {activeSfx:number}).activeSfx)).toBe(0);
 await page.getByLabel('전체 음소거').uncheck();await page.getByLabel('효과음 크기').fill('0');await expect(preview).toBeDisabled();
 expect(errors).toEqual([]);
});
