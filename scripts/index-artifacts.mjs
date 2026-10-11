import {readdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import path from 'node:path';

// Read metadata only. Keep frozen experiment paths and content intact.
const root='artifacts',ignored=new Set(['artifacts/index.json','artifacts/index.md','artifacts/README.md']);
const walk=dir=>readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):e.isFile()?[dir+'/'+e.name]:[]);
const all=walk(root).filter(p=>!ignored.has(p));
const manifests=all.filter(p=>p.endsWith('-manifest.json')).map(p=>{
 const m=JSON.parse(readFileSync(p,'utf8'));
 return{path:p,id:m.id??null,notes:m.notes??null,referencedFiles:(m.files??[]).filter(f=>typeof f?.path==='string').map(f=>f.path)};
});
const references=new Map();
for(const m of manifests)for(const p of m.referencedFiles){const refs=references.get(p)??[];refs.push(m.path);references.set(p,refs);}
const entries=all.map(p=>({path:p,bytes:statSync(p).size,extension:path.extname(p),directory:path.posix.dirname(p),referencedBy:references.get(p)??[]}));
const byDirectory={};
for(const f of entries){const row=byDirectory[f.directory]??={files:0,bytes:0};row.files++;row.bytes+=f.bytes;}
const bytes=entries.reduce((s,f)=>s+f.bytes,0);
writeFileSync(root+'/index.json',JSON.stringify({schemaVersion:1,files:entries.length,bytes,excludes:[...ignored],notes:'Metadata inventory, not an integrity audit. referencedBy covers files[] manifest paths only, not dynamic references in scripts or tests. Missing references and unreferenced files must not be interpreted as safe to delete.',byDirectory,manifests,entries},null,2)+'\n');
const dirs=Object.entries(byDirectory).sort(([a],[b])=>a.localeCompare(b)).map(([dir,r])=>`| ${dir} | ${r.files} | ${(r.bytes/1024**2).toFixed(1)} |`).join('\n');
const links=manifests.map(m=>`- [${path.posix.basename(m.path)}](${m.path.slice(root.length+1)})`).join('\n');
writeFileSync(root+'/index.md',`# 실험 파일 목록\n\n<code>node scripts/index-artifacts.mjs</code> 생성. ${entries.length}개 파일, ${(bytes/1024**3).toFixed(2)}GiB. 안내문과 생성된 색인은 집계에서 제외한다. 전체 경로·크기·manifest 참조는 [index.json](index.json). 무결성 검증 결과나 삭제 가능 목록이 아니다.\n\n| 디렉터리 | 파일 수 | MiB |\n|---|---:|---:|\n${dirs}\n\n## 재현 manifest\n\n${links}\n`);
console.log(`Indexed ${entries.length} files, ${(bytes/1024**3).toFixed(2)} GiB; ${manifests.length} manifests`);
