import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root=process.env.Z_AI_OUTPUT??'artifacts/experiments/balance/z-ai-20261018';
const json=p=>JSON.parse(readFileSync(p,'utf8')),jsonl=p=>readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const inventory=json(root+'/inventory.json'),ids=new Set(inventory.map(r=>r.id));
const rows={before:jsonl(root+'/before-battles.jsonl'),after:jsonl(root+'/after-battles.jsonl')};
const cache=new Map(jsonl(root+'/outcomes.jsonl').map(r=>[r.key,r]));
const metricHash=createHash('sha256').update('final-model-2\n'+['scripts/lib/z-ai-telemetry.ts','src/battle/z-decision.ts'].map(p=>readFileSync(p,'utf8')).join('\n')).digest('hex');
for(const phase of ['before','after'])for(const r of rows[phase])if(cache.get(r.key)?.z)assert.equal(cache.get(r.key).metricHash,metricHash,'Stale metric cache');
const pct=x=>x===null?'—':(100*x).toFixed(2)+'%',num=x=>x===null?'—':x.toFixed(2);
const mean=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
const median=x=>x.length?[...x].sort((a,b)=>a-b)[Math.floor(x.length/2)]:null;
const table=(head,body)=>['| '+head.join(' | ')+' |','| '+head.map(()=> '---').join(' | ')+' |',...body.map(r=>'| '+r.join(' | ')+' |')].join('\n');
const hash=p=>createHash('sha256').update(readFileSync(p,'utf8').replaceAll('\r\n','\n')).digest('hex');
assert.equal(hash('src/data/normal-npc-templates.json'),'8906f2dc9b8fd7b71989624f1b12ed88620892c4d4ee69c340bdc7fd9f763f24');
assert.equal(hash('src/battle/npc-policy-v11.ts'),'55a8d77c1ee445754818e9567d616eff2b68e2695b86b81d71574c070d17edb6');
assert.equal(hash('src/battle/z-move-policy.ts'),'968e8e897323195f974c40e27092592ab73602c70e67a84163392b93ac4ef09a');
const key=r=>[r.theme,r.floor,r.kind,r.npcId,r.caseId,r.rule,r.n].join(':');
const beforeMap=new Map(rows.before.map(r=>[key(r),r]));
assert.equal(rows.before.length,89856);assert.equal(rows.after.length,89856);
const referencePaths=['artifacts/experiments/balance/named-selection-20261018/after-battles.jsonl','artifacts/experiments/balance/kanto-completion-20261018/after-battles.jsonl'];
let baselineVerified=0;
if(referencePaths.every(existsSync)){
 const reference=new Map(referencePaths.flatMap(jsonl).map(r=>[key(r),r]));
 for(const r of rows.before.filter(r=>r.kind!=='supplemental')){const old=reference.get(key(r));assert.ok(old);assert.equal(r.key,old.key);assert.equal(r.winner,old.winner);baselineVerified++;}
}
const nonZ=[];
for(const r of rows.after){const old=beforeMap.get(key(r));assert.ok(old);assert.ok(!r.error&&!old.error);if(!cache.get(r.key).z){assert.equal(r.key,old.key);assert.equal(r.winner,old.winner);assert.equal(cache.get(r.key).hash,cache.get(old.key).hash);nonZ.push(r);}}
for(const id of ids)assert.ok(rows.after.some(r=>r.npcId===id),id);
function stats(list){
 const z=list.map(r=>cache.get(r.key).z).filter(Boolean),carriers=z.flatMap(r=>r.carriers),decisions=z.flatMap(r=>r.decisions);
 const uses=z.flatMap(r=>r.basic.used.filter(u=>u.kind==='z')),spent=decisions.filter(d=>d.used),gains=spent.flatMap(d=>d.gain===null?[]:[d.gain]);
 return {n:list.length,wins:list.filter(r=>r.winner==='Player').length,winRate:list.length?list.filter(r=>r.winner==='Player').length/list.length:null,equipped:carriers.length,matching:carriers.filter(r=>r.matchingMove).length,used:uses.length,useRate:carriers.length?uses.length/carriers.length:null,turn:mean(uses.map(u=>u.turn)),ownHP:mean(uses.map(u=>u.hp).filter(x=>x!==null)),targetHP:mean(uses.map(u=>u.targetHP).filter(x=>x!==null)),opportunities:decisions.filter(d=>d.opportunity&&d.actualAction).length,miss:decisions.filter(d=>d.miss).length,waste:spent.filter(d=>d.waste).length,immuneWaste:spent.filter(d=>d.blockedUse).length,diedBeforeAction:carriers.filter(c=>c.diedBeforeAction).length,diedAfterAction:carriers.filter(c=>c.diedAfterAction).length,unusedSurvived:carriers.filter(c=>!c.used&&!c.died).length,meanGain:mean(gains),medianGain:median(gains),lowGain:spent.filter(d=>d.lowGain).length,highGain:gains.filter(g=>g>=50).length,attackUses:gains.length,zKO:spent.filter(d=>d.zKO).length,zKORate:gains.length?spent.filter(d=>d.zKO).length/gains.length:null};
}
const totals=Object.fromEntries(['before','after'].map(p=>[p,stats(rows[p].filter(r=>ids.has(r.npcId)))]));
const allZTotals=Object.fromEntries(['before','after'].map(p=>[p,stats(rows[p])]));
const ordinaryIds=[...new Set(rows.after.filter(r=>r.kind==='ordinary'&&cache.get(r.key).z).map(r=>r.npcId))];
const ordinary=ordinaryIds.map(id=>({id,name:rows.after.find(r=>r.npcId===id).name,before:stats(rows.before.filter(r=>r.npcId===id)),after:stats(rows.after.filter(r=>r.npcId===id))}));
const bands=['1-50','51-100'];
const npc=inventory.flatMap(s=>bands.map(band=>({id:s.id,name:s.name,role:s.role,band,before:stats(rows.before.filter(r=>r.npcId===s.id&&r.band===band)),after:stats(rows.after.filter(r=>r.npcId===s.id&&r.band===band))})));
const perNpc=inventory.map(s=>({id:s.id,name:s.name,before:stats(rows.before.filter(r=>r.npcId===s.id)),after:stats(rows.after.filter(r=>r.npcId===s.id))}));
const themes=['kanto','johto','hoenn','sinnoh','unova','kalos','alola','galar','paldea'];
const regions=themes.flatMap(theme=>bands.map(band=>({theme,band,before:stats(rows.before.filter(r=>r.theme===theme&&r.band===band&&!['hidden','supplemental'].includes(r.kind))),after:stats(rows.after.filter(r=>r.theme===theme&&r.band===band&&!['hidden','supplemental'].includes(r.kind)))})));
const byRule=['basic','mega','dynamax','tera','chaos','z'].map(rule=>({rule,before:stats(rows.before.filter(r=>r.rule===rule&&r.kind!=='supplemental')),after:stats(rows.after.filter(r=>r.rule===rule&&r.kind!=='supplemental'))}));
const samples=[];
for(const phase of ['before','after'])for(const file of readdirSync(root+'/traces').filter(f=>f.startsWith(phase+'-'))){
 const log=json(root+'/traces/'+file);for(const d of log.z.decisions)samples.push({phase,file,id:log.foe.npcId,name:log.foe.name,winner:log.winner,...d});
}
const examples=[];
for(const phase of ['before','after'])for(const [kind,filter] of [
 ['Z 전용 KO',d=>d.used&&d.zKO&&d.candidates.find(c=>c.command===d.action)?.zOnlyKO],
 ['좋은 절약',d=>!d.used&&d.actualAction&&d.normalKO&&d.action.startsWith('move ')],
 ['위기 사용',d=>d.used&&d.selfHP<.3],
 ['Miss',d=>d.miss],['Waste',d=>d.used&&d.waste],
]){const d=samples.find(d=>d.phase===phase&&filter(d));examples.push({phase,kind,example:d??null});}
const review=existsSync(root+'/quality-review.json')?json(root+'/quality-review.json'):{};
if(Object.keys(review).length){assert.deepEqual(Object.keys(review).sort(),[...ids].sort());for(const r of Object.values(review))assert.ok(['Good','Mostly Good','Needs Review','Problematic'].includes(r.quality)&&r.reason);}
const result={totals,allZTotals,ordinary,npc,perNpc,regions,byRule,nonZ:nonZ.length,baselineVerified,examples,review};
writeFileSync(root+'/summary.json',JSON.stringify(result,null,2));
writeFileSync(root+'/npc-win-rates.csv',['id,name,band,n,before,after,delta',...npc.map(r=>[r.id,r.name,r.band,r.after.n,r.before.winRate,r.after.winRate,r.after.winRate-r.before.winRate].join(','))].join('\n')+'\n');
writeFileSync(root+'/z-quality.csv',['id,before_use,after_use,miss_before,miss_after,waste_before,waste_after,death_before_action,death_after_action,used,review',...perNpc.map(r=>[r.id,r.before.useRate,r.after.useRate,r.before.miss,r.after.miss,r.before.waste,r.after.waste,r.after.diedBeforeAction,r.after.diedAfterAction,r.after.used,review[r.id]?.quality??'Needs Review'].join(','))].join('\n')+'\n');
const report=[
 '# Z기술 AI 전후 밸런스·활용 보고서','',
 '2026-10-18. 기준 커밋: d538331fa1b275bfa3f57d4cf647f92b57b6072a. 승률은 플레이어 대리 AI의 독립 단일 전투 승률이며 사람의 실력별 승률·연속 돌파율이 아니다. 사용률을 최대화하지 않고 공개 정보에서의 기회 포착과 자원 절약을 평가한다.','',
 '## A. 기존 정책과 저장 호환','',
 'v9~v11은 일반 행동을 먼저 고른 후 같은 슬롯의 Z만 검토했다. 일반 선택이 coverage·회복·교체이면 다른 슬롯의 유리한 Z는 검토하지 않았다. 기존 HP parser는 84%와 fnt를 충분히 처리하지 못했고, 일반기로도 마무리가 가능한지 비교하지 않았다.','',
 '기존 z-move-policy.ts와 chooseZMove는 그대로 보존했다. d538331f의 npc-policy.ts는 npc-policy-v11.ts로 내용과 해시를 보존했다. 새 전투만 tower-policy-v12를 저장하며, v11은 archived factory, v9/v10은 기존 ZMovePolicy로 복원한다. old tier/tactic, packed team, seed, 명령 이력, Tera carrier 해석을 유지했다. Raid의 기존 v10 경로도 유지한다.','',
 '## B. 새 판단 방식','',
 '- Tactical은 같은 슬롯의 Z를 중심으로 단순 비교하되 다른 슬롯도 Z 전용 고확률 KO나 저HP 위기이면 확인한다. Expert는 가능한 모든 Z 슬롯의 추가 피해·자원 가치를 최선 일반 공격 및 기존 정책이 고른 보조/교체 행동과 비교한다.',
 '- 일반 공격이 추정 잔여 HP 이상이면 Z를 보존한다. 일반 최선으로는 부족하고 Z가 잔여HP110% 이상인 KO에는 보너스를 주고, 일반 최선 대비 유효 추가 피해·1회 자원 비용·자신의 HP·최근 공개 공격·생존 아군 수를 반영한다. 낮은 HP만으로 무조건 소비하지 않는다.',
 '- 기존 expected damage의 가변 위력0 문제(풀묶기 등), 혼내기의 명목 위력0을 비례 확대하는 오류, 일반기는 비활성이지만 합법 Z가 가능한 트림 같은 슬롯, Z의 기본기 명중률 가중, 공개된 방어 타입을 새 판단 안에서 보완했다. 기존 정책/요청의 점수는 바꾸지 않았다.',
 '- Status Z는 설치된 Showdown 데이터의 heal·boost·clearnegativeboost를 별도 판단한다. 고HP 회복, 이미 충분한 랭크, 복구할 하락 랭크가 없는 상황에서는 절약한다. 기존 일반 정책이 실제 선택한 status에만 적용하며 모든 status 효과를 새 엔진으로 구현하지 않았다.',
 '- 상대의 실제 EV/IV·미공개 기술/특성/도구·미래 명령·RNG를 읽지 않는다. Expert의 무효 필터와 측정기의 독립 observer는 공개된 증거만 사용한다. 측정 observer가 행동 정책에 추가 정보를 주지 않는 것도 검사했다.','',
 '- 일반 선택을 다른 슬롯의 Z로 대체하면 미실행 setup·상태기·교체의 내부 사용 기록을 복원한다. 기존 공통 정책에는 v12만 호출하는 작은 checkpoint hook을 추가했으며, archived 정책의 choose 경로는 이를 호출하지 않는다. 실행하지 않은 나쁜음모를 쓴 것으로 기억하는 회귀를 테스트했다.','',
 '## 측정 조건과 지표 정의','',
 '- 9개 지역의 기존 4팀×6룰×4개 고정 경로/전투 시드×100층을 유지했다. 86,400정규 조건과 관동/성도 히든384조건이다. 루트에 없는 Z signature NPC/구간은 기존 event snapshot 생성 경로로45층/75층에 보충한3,072조건이며 지역별 난이도 집계에는 넣지 않았다. 총89,856조건/phase, 오류0.',
 `- 보존된 이전 실험이 있는 ${baselineVerified}개 정규/히든 baseline 조건은 입력 키·승패까지 원본 결과와 일치한다. 나머지 보조 조건도 동일한 frozen v11 factory로 실행했다.`,
 '- runtime definition에서 Z signature58개 ID를 자동 추출했다. 지역에 Z signature가 없는 경우도 그대로 기록했다. 후보/기술/도구/특성/성격/포인트/에이스/선출 규칙/등장률은 변경하지 않았다. NPC 데이터와 archived 정책은 고정 해시로 검증한다.',
 '- 플레이어는 기존 스타팅/공격/내구/전용기4팀과 고정 ZMovePolicy(p1)다. 기술배치 일부는 미완성이며 실전 최적화 팀이 아니다. 층별 IV/포인트·성격·장비·테라 티켓0·누적 피해/상점/회복약 제외 조건도 동일하다.',
 '- 가능/사용률의 분모는 실제 선출된 Z크리스탈 보유 carrier다. matching은 그 packed team에 호환 기술이 있는지 별도 확인한다. 벤치에서 전투가 끝난 경우도 가능 분모에 포함한다. 해금 전에는 가능0이며 이때 낮은 사용률로 판정하지 않는다.',
 '- Miss: 공개 추정으로 일반 최선은 잔여 HP 미만이고 적어도 한 Z는 잔여 HP×1.10 이상인데, 담당이 실제 일반 행동을 수행한 결정. 상대의 실제 숨은 내구나 행동 순서까지 보장한 확정 오답은 아니다. 회복/교체·위협과 실제 로그도 함께 검토한다.',
 '- Waste: 실제 Z가 발동했으나 일반 최선으로 잔여 HP 이상이거나 이미 공개된 무효 증거가 있는 경우. 상대 HP25%만으로 낭비라고 하지 않는다. 실제 더 높은/낮은 내구·명중·보호·RNG로 추정과 결과는 달라질 수 있다.',
 '- carrier death는 실제 faint 로그로 행동 전 KO와 한 번 이상 기술을 실행했지만 Z 없이 KO를 구분한다. 행동하지 않고 생존/벤치로 끝난 경우는 별도다. death 자체를 정책 오류로 단정하지 않는다.',
 '- gain은 사용 시 Z 예상 피해−대응 일반 공격 예상 피해(HP 단위), low gain은 추정 상대 최대 HP10% 미만, high gain은50HP 이상이다. 일반 슬롯이 비활성이면 대응 일반 가치는0이며, 실제 결정에서는 다른 최선 일반 공격과 별도로 비교한다. median은 정렬 중앙값이다. KO conversion은 Z 발동 뒤 그 공격 처리 중 상대 faint가 기록된 비율로 status 사용을 제외한다.',
 '- 동일 입력 캐시를 공유하므로 조건 수는 독립 표본 수가 아니다. 정책과 metric 구현 해시를 저장하고 변경 시 Z 대전은 재측정했다. 전후의 상태·전투 길이가 달라지므로 Miss 절대 수와 기회 대비 비율을 함께 본다.','',
 '## C. 전체 Z telemetry','',
 table(['phase','가능 / 호환','사용','사용률','평균 턴','평균 자기HP','평균 상대HP','Miss / 행동 기회','Waste','행동 전 KO','행동 후 미사용 KO'],Object.entries(totals).map(([p,s])=>[p,`${s.equipped}/${s.matching}`,s.used,pct(s.useRate),num(s.turn),pct(s.ownHP),pct(s.targetHP),`${s.miss}/${s.opportunities}`,s.waste,s.diedBeforeAction,s.diedAfterAction])),'',
 table(['phase','공격 Z','KO / 비율','gain 평균','gain 중앙값','low gain','high gain','공개 무효에 소비','미사용 생존/벤치'],Object.entries(totals).map(([p,s])=>[p,s.attackUses,`${s.zKO}/${pct(s.zKORate)}`,num(s.meanGain),num(s.medianGain),s.lowGain,s.highGain,s.immuneWaste,s.unusedSurvived])),'',
 '위 표는 명시적 Z signature58개 ID다. 일반 클래스의 Elite/Master 등급은 전투 생성 중 룰과 등급에 따라 기믹을 받는다. 이번 루트에서 Z가 실제 생성된15개 클래스도 별도로 집계했다. 같은 일반 전투가9개 테마에 반복되므로 독립 표본 수로 해석하지 않는다.','',
 table(['범위 / phase','Z가능','사용','Miss / 기회','Waste','행동 전 KO','행동 후 미사용 KO'],Object.entries(allZTotals).map(([p,s])=>[`일반 클래스 포함 / ${p}`,s.equipped,s.used,`${s.miss}/${s.opportunities}`,s.waste,s.diedBeforeAction,s.diedAfterAction])),'',
 table(['생성형 일반 NPC / ID','N','승률 Before→After','사용률 Before→After','Miss Before→After','Waste Before→After'],ordinary.map(r=>[`${r.name} / ${r.id}`,r.after.n,`${pct(r.before.winRate)}→${pct(r.after.winRate)}`,`${pct(r.before.useRate)}→${pct(r.after.useRate)}`,`${r.before.miss}→${r.after.miss}`,`${r.before.waste}→${r.after.waste}`])),'',
 '## D. 기존 Z NPC 승률 변화','',
 table(['NPC / ID','구간','N','Before 승률','After 승률','변화(%p)'],npc.map(r=>[`${r.name} / ${r.id}`,r.band,r.after.n,pct(r.before.winRate),pct(r.after.winRate),num((r.after.winRate-r.before.winRate)*100)])),'',
 '## E. Z 활용과 carrier 행동','',
 '다음 표는 NPC별 두 구간 합산이다. 구간별 세부 값은 summary.json의 npc, 결정 단위 근거는 outcomes.jsonl의 z.decisions와 traces에 보존한다. 평가와 이유는 실제 trace·시점·상성·표본을 검토한 quality-review.json에서 읽으며 단일 자동 threshold로 정하지 않는다.','',
 table(['NPC / ID','Before 사용률','After 사용률','Miss Before','Miss After','Waste Before','Waste After','평균 턴 Before→After'],perNpc.map(r=>[`${r.name} / ${r.id}`,pct(r.before.useRate),pct(r.after.useRate),r.before.miss,r.after.miss,r.before.waste,r.after.waste,`${num(r.before.turn)}→${num(r.after.turn)}`])),'',
 table(['NPC / ID','Z 가능 Before→After','사용 Before→After','평균 자기HP Before→After','평균 상대HP Before→After'],perNpc.map(r=>[`${r.name} / ${r.id}`,`${r.before.equipped}→${r.after.equipped}`,`${r.before.used}→${r.after.used}`,`${pct(r.before.ownHP)}→${pct(r.after.ownHP)}`,`${pct(r.before.targetHP)}→${pct(r.after.targetHP)}`])),'',
 table(['NPC / ID','행동 전 KO Before→After','행동했지만 Z 미사용 KO Before→After','Z 사용 Before→After','공격 Z KO/사용 Before→After','평가','검토 근거'],perNpc.map(r=>[`${r.name} / ${r.id}`,`${r.before.diedBeforeAction}→${r.after.diedBeforeAction}`,`${r.before.diedAfterAction}→${r.after.diedAfterAction}`,`${r.before.used}→${r.after.used}`,`${r.before.zKO}/${r.before.attackUses}→${r.after.zKO}/${r.after.attackUses}`,review[r.id]?.quality??'Needs Review',review[r.id]?.reason??'최종 로그 검토 전'])),'',
 '## F. 대표 실제 전투 로그','',
 ...examples.flatMap(({phase,kind,example:d})=>d?[`- ${phase} ${kind}: ${d.name}(${d.id}), turn${d.turn}, 자기HP${pct(d.selfHP)}, 상대${d.target} HP${pct(d.targetHP)}, 일반 예상${num(d.normal)}, 추정 잔여HP${num(d.estimatedTargetHP)}, 선택 ${d.action}, 실제Z ${d.used}, 실제KO ${d.zKO}. trace: ${d.file}. 후보: ${d.candidates.map(c=>`${c.command} ${c.label}=${num(c.damage)}`).join('; ')}.`]:[`- ${phase} ${kind}: 저장된 대표 trace 표본에서 해당 사례 없음. 전체 전투에서도 없다는 뜻은 아니다.`]),'',
 '## G. 지역별·룰별 변화','',
 table(['지역','구간','N','Before','After','변화(%p)'],regions.map(r=>[r.theme,r.band,r.after.n,pct(r.before.winRate),pct(r.after.winRate),num((r.after.winRate-r.before.winRate)*100)])),'',
 '아래 룰 표는 정규+히든만 포함한다. basic/mega/dynamax/tera에서도 NPC signature Z가 별도 해금되므로 결과가 바뀔 수 있다. 플레이어 룰이 basic이라는 이유로 NPC도 비Z라고 분류하지 않는다.','',
 table(['플레이어 룰','N','Before','After','변화(%p)'],byRule.map(r=>[r.rule,r.after.n,pct(r.before.winRate),pct(r.after.winRate),num((r.after.winRate-r.before.winRate)*100)])),'',
 '## H. 비Z 회귀와 데이터 보존','',
 `NPC가 Z크리스탈을 갖지 않은 ${nonZ.length}조건은 입력 키·승패·프로토콜 hash가 전후 일치한다(공통 캐시 재사용). 별도로 Basic/Tactical/Expert×basic/mega/dynamax/tera/chaos의15쌍을 실제 재실행하여 모든 결정과 공개 로그가 일치함을 검사했고, Expert의 해당 Mega/Tera/Dynamax 발동도 확인했다.`,
 'NPC 샘플/runtime·층별 생성·기믹 도구는 그대로다. 아카이브 v11/v9 Z의 내용 고정, 과거 v11 및 새 v12 reconnect/replay, 기존 retry/snapshot 테스트를 포함한다.','',
 '## I. 한계와 남은 문제','',
 '예상 피해는 상대 종족값과 중립 레벨50 내구를 가정한다. 숨은 도구/특성/실제 노력치, 미래 명령, 보호, 대타·급소·RNG·다중 타격 변동까지 확정하지 않는다. 따라서 예상 KO와 실제 KO 차이는 policy 오류와 추정 오차를 분리해야 한다. 본 작업은 일반 정책의 회복/setup/교체 판단을 재작성하지 않는다.',
 'Z크리스탈은 원래 도구를 대체한다. 사용률·승률 변화는 AI 전후 비교이고 Wise Glasses/Focus Sash/Sitrus Berry를 되돌린 대조 실험은 하지 않았다. 아이템 기회비용을 Z 판단 오류로 단정하지 않는다.',
 '라이치(named-olivia)의 전반 검토 원본에는 Lycanium Z에 필요한 Stone Edge가 없다. 기존 applyNpcGimmick이 호환 기술을 주입하는 경로가 있으며, 실제 packed team의 호환성을 별도 집계했다. 요청대로 원본을 수정하지 않았다.','',
 ...(existsSync(root+'/conclusion.md')?[readFileSync(root+'/conclusion.md','utf8')]:['최종 비교 해석은 검토 후 기록한다.']),'',
 '## 검증 결과','',
 ...(existsSync(root+'/validation.json')?json(root+'/validation.json').entries.map(s=>'- '+s):['검증 진행 중.']),'',
 '## 재현·산출물','',
 `산출물: ${root}. inventory.json, before-runtime.json, before/after manifests·battles·reports, outcomes.jsonl, traces, summary.json, npc-win-rates.csv, z-quality.csv, quality-review.json, report.md. 캐시 없이도 같은 입력을 재현할 수 있으며 동일 설치 엔진을 사용한다.`,
 '```powershell',
 "$env:Z_AI_OUTPUT='artifacts/experiments/balance/z-ai-20261018'",
 '# 새 출력 폴더에서는 먼저 폴더를 만들고 baseline runtime을 before-runtime.json으로 보존한다.',
 'node --import tsx scripts/simulate-z-ai.ts --before',
 'node --import tsx scripts/simulate-z-ai.ts',
 'node --import tsx scripts/refresh-z-ai-traces.ts',
 'node --import tsx scripts/validate-z-ai-traces.ts',
 'node scripts/report-z-ai.mjs',
 '# report.md를 검토한 뒤 artifacts/reports/npc/z-move-ai-balance-report.md에 반영한다.',
 '```','',
 '기존 관동/선출 보고서 생성기도 이제 기본적으로 실험 폴더의 documents에 생성한다. 추적 문서를 명시적으로 갱신하려면 NPC_REPORT_DOCS_OUTPUT을 지정한다. 기존 workspace 검사에서 발견된 직접 docs 출력 문제를 정리한 것이며 NPC 데이터 변경은 없다.',
];
writeFileSync(root+'/report.md',report.join('\n')+'\n');
console.log(JSON.stringify({totals,nonZ:nonZ.length,perNpc},null,2));
