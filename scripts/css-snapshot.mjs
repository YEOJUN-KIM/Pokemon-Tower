import {chromium} from '@playwright/test';
import {mkdir, writeFile, readFile} from 'node:fs/promises';

// Screen comparison against a running local server, using a dedicated audit account.
const phase=process.argv[2]??'before';
const origin=process.env.CSS_AUDIT_URL??'http://127.0.0.1:3000';
const folder='artifacts/temporary/css-structure';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const properties=['display','position','width','height','padding','margin','color','backgroundColor','border','borderRadius','fontSize','fontFamily','gridTemplateRows','gridTemplateColumns','gap','boxShadow','overflow','outline'];
const results=[];
try {
  let storageState;
  try { storageState=JSON.parse(await readFile(`${folder}/session.json`,'utf8')); } catch {}
  const context=await browser.newContext({storageState});
  if(!storageState) {
    await context.request.get(origin+'/account');
    const response=await context.request.post(origin+'/api/account',{headers:{Origin:origin},data:{action:'register',username:`css_${Date.now().toString(36)}`,password:'css-audit-local-2026'}});
    if(!response.ok())throw new Error(`CSS audit account: HTTP ${response.status()}`);
    await context.storageState({path:`${folder}/session.json`});
  }
  const page=await context.newPage();
  for(const width of [1280,390])for(const route of ['/','/battle','/pokedex','/settings','/upgrades','/account']) {
    await page.setViewportSize({width,height:900});
    await page.goto(origin+route);
    await page.locator('main').first().waitFor({state:'visible'});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>!document.querySelector('main[aria-busy="true"]'));
    if(new URL(page.url()).pathname!==route)throw new Error(`Unexpected redirect: ${route} -> ${page.url()}`);
    await page.screenshot({path:`${folder}/${phase}-${route.replaceAll('/','')||'title'}-${width}.png`,fullPage:true,animations:'disabled'});
    const styles=await page.evaluate(properties=>Array.from(document.querySelectorAll('main,main button,main dialog,.battle-panel,.health-card,.command-area,.arena')).filter(el=>el.getClientRects().length).map(el=>({tag:el.tagName,class:el.className,styles:Object.fromEntries(properties.map(name=>[name,getComputedStyle(el)[name]]))})),properties);
    results.push({width,route,url:new URL(page.url()).pathname,styles});
    await writeFile(`${folder}/${phase}.json`,JSON.stringify(results,null,2));
  }
  await writeFile(`${folder}/${phase}.json`,JSON.stringify(results,null,2));
  if(phase==='after') {
    const before=JSON.parse(await readFile(`${folder}/before.json`,'utf8'));
    const differences=[];
    for(let i=0;i<results.length;i++)if(JSON.stringify(before[i])!==JSON.stringify(results[i]))differences.push({route:results[i].route,width:results[i].width,before:before[i],after:results[i]});
    await writeFile(`${folder}/differences.json`,JSON.stringify(differences,null,2));
    console.log(JSON.stringify({screens:results.length,differences:differences.map(x=>({route:x.route,width:x.width}))}));
  }else console.log(`Captured ${results.length} screen/viewport combinations.`);
}finally {await browser.close();}
