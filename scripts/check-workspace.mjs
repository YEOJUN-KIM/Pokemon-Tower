import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';

const failures=[];
const walk=dir=>existsSync(dir)?readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):e.isFile()?[dir+'/'+e.name]:[]):[];
const markdown=[...walk('docs'),...walk('artifacts'),'README.md','scripts/README.md'].filter(f=>f.endsWith('.md'));
let links=0;
for(const file of markdown){
  const text=readFileSync(file,'utf8').replace(/```[\s\S]*?```/g,'');
  for(const match of text.matchAll(/!?\[[^\]\n]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)){
    const target=match[1];if(/^(https?:|mailto:|#|codex:|app:)/.test(target))continue;
    const raw=target.split('#')[0];let decoded;try{decoded=decodeURIComponent(raw)}catch{continue;}
    const resolved=path.resolve(path.dirname(file),decoded);
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
