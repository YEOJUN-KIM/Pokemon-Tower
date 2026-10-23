import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';

const failures=[];
const rootDocs=new Set(['README.md','STATUS.md','SESSION_HANDOFF.md']);
for(const entry of readdirSync('docs',{withFileTypes:true})){
  if(entry.isFile()&&entry.name.endsWith('.md')&&!rootDocs.has(entry.name))failures.push(`docs/${entry.name}: place current guides by topic and change reports in artifacts`);
}
const packageScripts=JSON.parse(readFileSync('package.json','utf8')).scripts;
for(const [name,command]of Object.entries(packageScripts)){
  for(const match of command.matchAll(/scripts\/[\w./-]+\.(?:mjs|cjs|ts|ps1)\b/g))if(!existsSync(match[0]))failures.push(`package.json ${name}: missing script ${match[0]}`);
}
const schemaVersion=readFileSync('src/server/schema.ts','utf8').match(/PRAGMA user_version\s*=\s*(\d+)/)?.[1];
const aiVersion=readFileSync('src/server/tower-store.ts','utf8').match(/AI_VERSION\s*=\s*'([^']+)'/)?.[1];
for(const file of ['docs/STATUS.md','docs/engineering/DATABASE.md']){
  const source=readFileSync(file,'utf8');
  if(!schemaVersion||!source.includes(`schema ${schemaVersion}`))failures.push(`${file}: update current DB schema`);
}
if(!aiVersion||!readFileSync('docs/engineering/ARCHITECTURE.md','utf8').includes(aiVersion))failures.push('docs/engineering/ARCHITECTURE.md: update current AI version');
const walk=dir=>existsSync(dir)?readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):e.isFile()?[dir+'/'+e.name]:[]):[];
// Ignored local reports are optional. Official documentation must work in a fresh clone.
const markdown=[...walk('docs'),'README.md','scripts/README.md',...walk('tests/fixtures')].filter(f=>f.endsWith('.md'));
let links=0;
for(const file of markdown){
  const text=readFileSync(file,'utf8').replace(/```[\s\S]*?```/g,'');
  for(const match of text.matchAll(/!?\[[^\]\n]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)){
    const target=match[1];if(/^(https?:|mailto:|#|codex:|app:)/.test(target))continue;
    const raw=target.split('#')[0];let decoded;try{decoded=decodeURIComponent(raw)}catch{continue;}
    const resolved=path.resolve(path.dirname(file),decoded);
    if(resolved===path.resolve('artifacts')||resolved.startsWith(path.resolve('artifacts')+path.sep))failures.push(`${file}: official link depends on ignored artifacts: ${target}`);
    links++;if(!existsSync(resolved))failures.push(`${file}: missing link ${target}`);
  }
}
for(const file of walk('docs'))if(/\.(sqlite|csv|jsonl|log)$/.test(file))failures.push(`${file}: generated data does not belong in docs`);
for(const file of walk('scripts').filter(f=>/\.(mjs|ts|py)$/.test(f))){
  if(file==='scripts/check-workspace.mjs')continue;
  const source=readFileSync(file,'utf8');
  if(/write-.*-report/.test(file)&&source.includes("['docs/STATUS.md','docs/SESSION_HANDOFF.md']"))failures.push(`${file}: report generator edits current docs`);
  if(/writeFile(?:Sync)?\(['"]docs\/(?!images\/)/.test(source))failures.push(`${file}: report output must stay outside docs`);
  if(source.includes('docs/gameplay/npc-team-samples.json')||source.includes('docs/gameplay/normal-npc-samples.json'))failures.push(`${file}: stale NPC input path`);
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`Workspace structure OK: ${markdown.length} Markdown files, ${links} local links; current docs and report outputs are separated.`);
