import {npcSamples} from '../src/data/npc-samples';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='https://play.pokemonshowdown.com/sprites/trainers/';
const response=await fetch(base,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Cannot read trainer index');
const html=await response.text();
mkdirSync('.data/cache/import',{recursive:true});writeFileSync('.data/cache/import/npc-trainer-sprite-index.html',html);
const figures=new Map([...html.matchAll(/<figure id="([^"]+)">([\s\S]*?)<\/figure>/g)].map(([,id,body])=>[id,{artist:body.match(/<br\s*\/?>\s*by ([^<]+)/)?.[1]?.trim()}]));
const manifestPath='public/sprites/trainers/sources.json',manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
const reviewed=[];
for(const portrait of new Set(npcSamples.map(s=>s.portrait))){
 const file=`public/sprites/trainers/${portrait}.png`,old=manifest.portraits.find((p:{portrait:string})=>p.portrait===portrait);
 const url=old?.url??`${base}${portrait}.png`,canonical=new URL(url).pathname.split('/').at(-1)!;
 const info=figures.get(canonical);
 if(!info)throw Error(`Missing index entry: ${portrait} -> ${canonical}`);
 if(info.artist&&!existsSync(file)){reviewed.push({portrait,url,artist:info.artist,status:'review-required'});continue;}
 if(!existsSync(file)){
  const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Download failed: ${portrait}`);
  const data=Buffer.from(await r.arrayBuffer());if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not PNG');
  writeFileSync(file,data);
 }
 const entry={...old,portrait,url,status:old?'existing':'downloaded',reviewedOn:'2026-10-16',review:info.artist?'existing-credited-asset':'game-class-no-individual-credit-listed',...(info.artist?{artist:info.artist,creditSource:base}:{}),sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};
 if(old)Object.assign(old,entry);else manifest.portraits.push(entry);
 reviewed.push(entry);
}
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
mkdirSync('artifacts/reports/npc',{recursive:true});
const reviewRequiredCandidates=['pokemonbreeder-gen7','pokemonranger-gen6','veteran-gen7','acetrainer-gen6'].map(portrait=>({portrait,url:base+portrait+'.png',artist:figures.get(portrait+'.png')?.artist,status:'review-required-not-imported'}));
writeFileSync('artifacts/reports/npc/npc-sprite-review.json',JSON.stringify({reviewRequiredCandidates,checkedOn:'2026-10-16',index:base,credits:base+'?filter=credited',policy:'Import only listed game classes without individual artist credits. Custom/unreviewed assets remain TODO; existing credited assets keep their attribution.',reviewed},null,2)+'\n');
console.log(JSON.stringify({used:reviewed.length,downloaded:reviewed.filter(r=>r.status==='downloaded').length,reviewRequired:reviewed.filter(r=>r.status==='review-required')}));
