import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import preservation from '../tests/fixtures/kalos-tuning-preservation.json' with {type:'json'};
import common from '../tests/fixtures/kalos-preservation.json' with {type:'json'};

const root='artifacts/experiments/balance/kalos-tuning-20261018';
const original='artifacts/experiments/balance/kalos-20261018';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const lines=(p:string):any[]=>readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
const ids=new Set(preservation.ids),names:Record<string,string>={'named-ramos':'후쿠지','named-siebold':'즈미','named-wikstrom':'간피'};
const oldFocused=lines(original+'/after-focused.jsonl').filter(r=>ids.has(r.id));
const before=[...oldFocused,...lines(original+'/coverage/after-focused.jsonl').filter(r=>ids.has(r.id))].filter(r=>r.rule==='basic');
const after=lines(root+'/final/after-focused.jsonl');
const holdBefore=lines(root+'/holdout-before/before-focused.jsonl'),holdAfter=lines(root+'/holdout-after/after-focused.jsonl');
const allRules=lines(root+'/all-rules/after-focused.jsonl');
for(const rows of [before,after,holdBefore,holdAfter])assert.equal(rows.length,240);
assert.equal(allRules.length,288);assert.equal(oldFocused.length,288);
for(const rows of [before,after,holdBefore,holdAfter,allRules])assert.ok(rows.every(r=>!r.error&&['Player','Tower AI'].includes(r.winner)));
const key=(r:any)=>[r.id,r.floor,r.n,r.caseId,r.rule].join(':');
for(const [b,a] of [[before,after],[holdBefore,holdAfter],[oldFocused,allRules]])assert.deepEqual(b.map(key).sort(),a.map(key).sort());
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
assert.equal(fileHash(root+'/baseline-runtime.json'),json(original+'/after-focused-manifest.json').loadedRuntimeHash,'Original simulation must use exactly the pre-tuning runtime');
const reviewed=json('scripts/data/npc/normal-npc-samples.json').samples,runtime=json('src/data/normal-npc-templates.json');
const sort=(a:any,b:any)=>(a.id+a.stage).localeCompare(b.id+b.stage);
assert.equal(hash(runtime.filter((r:any)=>!ids.has(r.id)).sort(sort)),preservation.runtime);
assert.equal(hash(reviewed.filter((r:any)=>!ids.has(r.id)).sort(sort)),preservation.source);
for(const [path,expected]of Object.entries(common.common))assert.equal(createHash('sha256').update(readFileSync(path,'utf8').replace(/\r\n/g,'\n')).digest('hex'),expected,path);
for(const [path,rows]of [[root+'/final/after-focused-manifest.json',after],[root+'/holdout-after/after-focused-manifest.json',holdAfter],[root+'/all-rules/after-focused-manifest.json',allRules]] as const){assert.equal(json(path).loadedRuntimeHash,fileHash('src/data/normal-npc-templates.json'));assert.ok(rows.length);}
const stats=(rows:any[])=>({battles:rows.length,npcWins:rows.filter(r=>r.winner==='Tower AI').length,errors:rows.filter(r=>r.error).length});
const result=(rows:any[])=>{const s=stats(rows);return `${(100*s.npcWins/s.battles).toFixed(1)}% (${s.npcWins}/${s.battles})`;};
// Primary/basic seeds 1–2 also occur in all-rules: count those battles once.
const uniqueAfter=[...after,...holdAfter,...allRules.filter(r=>r.rule!=='basic')];assert.equal(new Set(uniqueAfter.map(key)).size,720);
const baseline=json(root+'/baseline-reviewed.json').samples;
const summaries=[...ids].map(id=>{
 const old=baseline.find((r:any)=>r.id===id),current=reviewed.find((r:any)=>r.id===id);
 const rows=uniqueAfter.filter(r=>r.id===id);
 return {id,name:names[id],ace:current.ace,signature:current.signature,primary:{before:stats(before.filter(r=>r.id===id)),after:stats(after.filter(r=>r.id===id))},holdout:{before:stats(holdBefore.filter(r=>r.id===id)),after:stats(holdAfter.filter(r=>r.id===id))},allRules:{before:stats(oldFocused.filter(r=>r.id===id)),after:stats(allRules.filter(r=>r.id===id))},changes:current.team.flatMap((p:any)=>{
  const b=old.team.find((b:any)=>b.species===p.species);return !b||JSON.stringify(p)!==JSON.stringify(b)?[{species:p.species,before:b??null,after:p}]:[];
 }),removed:old.team.filter((p:any)=>!current.team.some((n:any)=>n.species===p.species)),usage:current.team.map((p:any)=>{
  const moves=Object.fromEntries(p.profile.moves.map((move:string)=>[move,rows.reduce((n,r)=>n+(r.moveUsage?.[p.species]?.[move]??0),0)]));
  return {species:p.species,selectedBattles:rows.filter(r=>r.team.includes(p.species)).length,actedBattles:rows.filter(r=>Object.keys(r.moveUsage?.[p.species]??{}).length).length,directKOs:rows.reduce((n,r)=>n+(r.directKOs?.[p.species]??0),0),moves,zeroMoves:Object.entries(moves).filter(([,n])=>n===0).map(([move])=>({move,classification:Showdown.Dex.moves.get(move).category==='Status'||Showdown.Dex.moves.get(move).priority>0?'조건부 / 행동 기회':'상성 / 표본 부족'}))};
 }),mega:{available:rows.reduce((n,r)=>n+r.telemetry.available.filter((m:any)=>m.kind==='mega').length,0),legalAvailable:rows.filter(r=>r.megaAvailability.some((m:any)=>m.legalDecisionTurns.length)).length,used:rows.reduce((n,r)=>n+r.mega.length,0)}};
});
const lineups=json(root+'/final/after-lineups.json');
assert.equal(lineups.reduce((n:number,l:any)=>n+l.draws,0),9000);
for(const l of lineups){const row=reviewed.find((r:any)=>r.id===l.id);assert.equal(l.ace,l.draws);assert.equal(l.success,l.draws);if(row.signature)assert.equal(l.carrier,l.draws);for(const p of row.team)assert.ok(Object.keys(l.teams).some(k=>k.split(' / ').includes(p.species)));}
const validation=existsSync(root+'/validation.json')?json(root+'/validation.json'):null;
const audit={date:'2026-10-18',baseCommit:preservation.baseCommit,scope:[...ids],method:'NPC win rates, four fixed teams, matched seeds/floors; primary basic seeds 1–10, separate holdout teams seeds 11–20, six-rule regression seeds 1–2. Do not interpret as human win probability.',holdoutCases:json(root+'/holdout-cases.json'),independentAfterBattles:720,summaries,lineups,preservation,validation,sourceHashes:Object.fromEntries(['scripts/data/npc/kalos-design.json','scripts/review-kalos-npc-samples.ts','src/data/normal-npc-templates.json','scripts/simulate-kalos-npcs.ts'].map(p=>[p,fileHash(p)]))};
mkdirSync('artifacts/reports/npc',{recursive:true});writeFileSync('artifacts/reports/npc/kalos-tuning.json',JSON.stringify(audit,null,2)+'\n');
const md=['# 간피·후쿠지·즈미 소규모 조정','', '2026-10-18. f4018e89의 세 NPC만 조정했다. 목표 승률에 맞추는 반복 최적화는 하지 않았다. 소폭 파일럿 후 역할 보완을 한 번 추가하고, 기술 사용 검사에서 중복 슬롯을 정리했다. 그 최종 세트를 기존 상대 팀과 별도 상대 팀·새 seed에서 다시 측정했다.','',
 '## NPC 승률 Before → After','',
 '| NPC | 기존 네 팀 / Basic, 80전씩 | 별도 네 팀·새 seed / Basic, 80전씩 | 기존 네 팀 / 여섯 룰, 96전씩 |','|---|---|---|---|',
 ...summaries.map(s=>`| ${s.name} | ${result(before.filter(r=>r.id===s.id))} → ${result(after.filter(r=>r.id===s.id))} | ${result(holdBefore.filter(r=>r.id===s.id))} → ${result(holdAfter.filter(r=>r.id===s.id))} | ${result(oldFocused.filter(r=>r.id===s.id))} → ${result(allRules.filter(r=>r.id===s.id))} |`),'',
 '**표는 모두 NPC 승률이다.** 기존 네 팀은 starters/offense/bulk/signature이고, 별도 팀은 Venusaur/Jolteon/Rotom, Arcanine/Flygon/Lucario, Dragonite/Weavile/Conkeldurr, Snorlax/Crobat/Milotic이다. 공통 AI와 층별 성장·학습 포인트는 동일하다. Basic 비교 F45/F95, 같은 seed와 같은 플레이어 세트로 짝지었다. 고정 AI 단판 결과이며 사람 승률 또는 모든 팀에 대한 일반적인 난도를 뜻하지 않는다.','',
 '즈미는 여전히 강하지만 전기/풀 대응 팀에는 별도 검사 20전 모두 패배했다. 간피는 불꽃/땅 상대에 별도 검사 20전 모두 패배했고, 후쿠지도 특정 상대에 취약한 풀 관장으로 남는다. 이 타입 차이를 억지로 없애지 않았다.','',
 '## 변경 이유','',
 '- 간피: 물리 투자/Adamant Aegislash의 Shadow Ball을 Shadow Claw로 통일하고 Weakness Policy로 약점 피격 후 반격을 보완했다. Mega Scizor는 유지하며 X-Scissor를 Iron Head로 바꿔 Bullet Punch 외의 강한 강철 자속기를 확보했다. Aggron은 반동기 없는 Rock Head 대신 Sturdy, Leftovers 대신 Assault Vest를 사용한다. Escavalier는 Knock Off를 Close Combat으로 바꿔 즉시 격투 화력을 추가했다.',
 '- 후쿠지: Gogoat Ace·Jumpluff·Trevenant는 그대로다. Leafeon 한 자리만 Ludicolo로 바꿔 여섯 후보 모두 풀 타입을 유지하면서 물 견제를 확보했다. Ludicolo는 원작 소유 주장이 아닌 타워 확장이다. Victreebel의 Knock Off는 Toxic으로, Tangrowth의 Knock Off/Sludge Bomb은 Focus Blast/Ancient Power로 바꾸어 특수 투자와 견제를 맞췄다. 시험한 Leaf Storm은 Giga Drain의 선택을 가려 최종 세트에서 제거했다.',
 '- 즈미: Clawitzer Ace/Mega Launcher와 네 기술은 그대로다. Starmie의 Life Orb를 Mystic Water, Thunderbolt를 Recover로 바꿔 전기 견제를 줄이고 물/에스퍼 회복형 역할로 정리했다. Greninja는 Protean 대신 Torrent로 네 타입의 자속 화력을 낮췄다. 후보·Mega 없음 정책·나머지 네 멤버는 보존했다.',
 '- 처음 파일럿의 Leafeon Double-Edge 교체는 최종 후보에서 제외되어 현재 적용되지 않는다. 파일럿은 별도 pilot/에 보관하며 최종 표에 섞지 않았다.','',
 '## 최종 세트와 실행 기록',''];
for(const s of summaries){const row=reviewed.find((r:any)=>r.id===s.id);md.push(`### ${s.name}`,'',`Ace: ${s.ace}. Mega carrier: ${s.signature?.species??'없음'}.`,'', '| 후보 | 특성 | 도구 | 기술 | 선출 / 행동 전투 | 직접 KO |','|---|---|---|---|---|---|',...row.team.map((p:any)=>{const u=s.usage.find((u:any)=>u.species===p.species)!;return `| ${p.species} | ${p.profile.ability} | ${p.item} | ${p.profile.moves.join(' / ')} | ${u.selectedBattles} / ${u.actedBattles} | ${u.directKOs} |`;}),'',`Mega: 도구 available=${s.mega.available}, 합법 명령 available=${s.mega.legalAvailable}, used=${s.mega.used}.`,...s.usage.filter((u:any)=>u.zeroMoves.length).map((u:any)=>`- 0회 사용: ${u.species} — ${u.zeroMoves.map((z:any)=>`${z.move} (${z.classification})`).join(', ')}. 0회만으로 미지원 판정하지 않는다.`),'');}
md.push('## 보존과 검증','',
 '대상 밖 238개 reviewed/runtime 행은 f4018e89와 SHA-256이 같다. 다른 칼로스 NPC 14종, 다른 지방 전체, 공통 정책·선출·기믹·성장·히든보스 엔진을 보존했다. 새 selectionRule이나 trainer-specific AI는 없다. 간피 Mega Scizor와 세 Ace, 모든 후보의 9,000회 선출 및 Trick Room 0을 유지한다. 원작 사용과 타워 확장을 혼동하지 않도록 새 Ludicolo를 확장으로 명시했다.','',
 '최종 독립 After 표본은 720전이다. 원래 Basic 240전, 별도 상대 Basic 240전, 여섯 룰의 중복 Basic을 뺀 240전이다. 여섯 룰 파일에는 총 288전이 있으며 Basic 48전이 첫 집계와 겹친다. Before 역시 같은 조합으로 비교했다. 모든 전투 오류 0. 기술별 usage와 조건부 0회 목록은 kalos-tuning.json에 있다.','',
 ...(validation?validation.results.map((r:any)=>`- ${r.check}: ${r.result}`):['- 최종 테스트 집계 대기.']), '',
 '## 재현','',
 '`node --import tsx scripts/review-kalos-npc-samples.ts` → `node scripts/export-normal-npc-runtime.mjs --check`.','',
 '시뮬레이터의 KALOS_NPCS=named-wikstrom,named-ramos,named-siebold, KALOS_RULES=basic, KALOS_SEEDS=10, KALOS_OUTPUT을 지정한다. 별도 상대는 KALOS_CASES=scripts/data/npc/kalos-tuning-cases.json, KALOS_SEED_START=11을 사용한다. Before는 NPC_BALANCE_BASELINE=.../baseline-runtime.json과 --import ./scripts/lib/unova-baseline.mjs, --before를 사용한다.','',
 '`node --import tsx scripts/report-kalos-tuning.ts`는 동일 전투 키, 런타임 해시, 대상 밖 보존, 표본 수와 오류를 확인하고 이 보고서와 audit JSON을 생성한다. 원자료는 artifacts/experiments/balance/kalos-tuning-20261018에 있다.','');
writeFileSync('docs/gameplay/kalos-npc-tuning.md',md.join('\n'));
console.log(JSON.stringify(summaries.map(s=>({name:s.name,primary:s.primary,holdout:s.holdout,mega:s.mega}))));
