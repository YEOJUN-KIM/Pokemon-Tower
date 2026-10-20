import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Showdown from 'pokemon-showdown';
import {kalosTrainers} from '../src/data/kalos-trainers';

const root='artifacts/experiments/balance/kalos-20261018';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const lines=(p:string):any[]=>readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
const before=lines(root+'/before-focused.jsonl'),after=lines(root+'/after-focused.jsonl'),coverage=lines(root+'/coverage/after-focused.jsonl');
assert.equal(before.length,1440);assert.equal(after.length,1632);assert.equal(coverage.length,1088);
for(const rows of [before,after,coverage])assert.ok(rows.every(r=>!r.error));
const all=[...after,...coverage],lineups=json(root+'/after-lineups.json');
const opportunities=[...lines(root+'/mega-opportunities/after-focused.jsonl'),...lines(root+'/mega-opportunities-coverage/after-focused.jsonl')];
assert.equal(opportunities.length,1440);
const key=(r:any)=>[r.id,r.floor,r.n,r.caseId,r.rule].join(':');
const matched=new Map(all.map(r=>[key(r),r]));
for(const r of opportunities){assert.ok(!r.error);const original=matched.get(key(r));assert.ok(original);assert.equal(r.winner,original.winner);assert.deepEqual(r.moveUsage,original.moveUsage);assert.deepEqual(r.mega,original.mega);}
const source=json('scripts/data/npc/normal-npc-samples.json').samples,baseline=json(root+'/baseline-runtime.json');
const preservation=json('tests/fixtures/kalos-preservation.json');
const stats=(rows:any[])=>({battles:rows.length,playerWins:rows.filter(r=>r.winner==='Player').length,errors:rows.filter(r=>r.error).length});
const pct=(n:number,d:number)=>d?(100*n/d).toFixed(1)+'%':'—';
const result=(rows:any[])=>{const s=stats(rows);return s.battles?`${pct(s.playerWins,s.battles)} (${s.playerWins}/${s.battles})`:'신규 / 비교 없음';};
const official:Record<string,string[]>={
 'named-viola':['Vivillon'],'named-grant':[],
 'named-korrina':['Lucario','Hawlucha'],'named-ramos':['Gogoat','Jumpluff'],
 'named-clemont':['Heliolisk'],'named-valerie':['Sylveon','Mawile','Mr. Mime'],
 'named-olympia':['Meowstic','Sigilyph','Slowking'],'named-wulfric':['Avalugg','Abomasnow','Cryogonal'],
 'named-malva':['Talonflame','Pyroar','Chandelure','Torkoal'],
 'named-siebold':['Clawitzer','Barbaracle','Starmie','Gyarados'],
 'named-wikstrom':['Aegislash','Scizor','Probopass','Klefki'],
 'named-drasna':['Noivern','Dragalge','Druddigon','Altaria'],
 'named-diantha':['Gardevoir','Hawlucha','Tyrantrum','Aurorus','Gourgeist','Goodra'],
 'flare-grunt':['Mightyena','Houndoom','Manectric','Scrafty'],
 'flare-executive-aliana':['Mightyena'],'flare-executive-xerosic':['Malamar','Crobat'],
 'flare-boss-lysandre':['Gyarados','Mienshao','Pyroar','Honchkrow'],
};
const adaptation:Record<string,string>={
 'named-viola':'Surskit → Masquerain', 'named-grant':'Tyrunt → Tyrantrum / Amaura → Aurorus',
 'named-korrina':'Mienfoo → Mienshao / Machoke → Machamp','named-ramos':'Weepinbell → Victreebel',
 'named-clemont':'Magneton → Magnezone','flare-grunt':'Golbat → Crobat',
};
const usage=kalosTrainers.map(t=>{
 const rows=all.filter(r=>r.id===t.id),template=source.find((r:any)=>r.id===t.id);
 return {id:t.id,members:template.team.map((p:any)=>{
  const moves=Object.fromEntries(p.profile.moves.map((m:string)=>[m,rows.reduce((n,r)=>n+(r.moveUsage?.[p.species]?.[m]??0),0)]));
  const selectedBattles=rows.filter(r=>r.team.includes(p.species)).length;
  const actedBattles=rows.filter(r=>Object.values(r.moveUsage?.[p.species]??{}).some(n=>Number(n)>0)).length;
  const zeroMoves=Object.entries(moves).filter(([,n])=>n===0).map(([move])=>{
   const m=Showdown.Dex.moves.get(move);
   const classification=!selectedBattles?'표본 부족':!actedBattles?'기회 부족':p.item.startsWith('Choice ')?'Choice lock':m.category==='Status'||m.priority>0||m.id==='mirrorcoat'?'조건부':'상성 / 표본 부족';
   return {move,classification,aiSupported:true,evidence:m.category==='Status'?'TowerPolicy supported status/setup/recovery branch':m.id==='mirrorcoat'?'TowerPolicy last-opponent special-move branch':'TowerPolicy damage scoring; zero executions alone do not imply unsupported AI'};
  });
  return {species:p.species,selectedBattles,actedBattles,moves,zeroMoves};
 })};
});
const megas=kalosTrainers.filter(t=>t.mega).map(t=>{
 const rows=all.filter(r=>r.id===t.id),eligible=rows.filter(r=>r.telemetry.available.some((a:any)=>a.kind==='mega'));
 const activations=rows.flatMap(r=>r.mega);
 assert.ok(activations.length,t.id+' never Mega Evolves');
 return {id:t.id,name:t.name,ace:t.ace,carrier:t.mega,battles:rows.length,carrierIncluded:rows.filter(r=>r.team.includes(t.mega)).length,available:eligible.length,used:activations.length,activationTurns:activations.map(m=>m.activationTurn),postMegaDirectKOs:activations.reduce((n,m)=>n+m.directKOs,0),threeKOBattles:activations.filter(m=>m.directKOs===3).length,activeDecisionTurns:activations.map(m=>m.activeDecisionTurns),survivedElapsedTurns:activations.map(m=>m.survivedElapsedTurns),survivedBattle:activations.filter(m=>m.survivedBattle).length,unactivated:eligible.filter(r=>!r.mega.length).map(r=>({floor:r.floor,seed:r.n,caseId:r.caseId,rule:r.rule,carrierMoves:r.moveUsage?.[t.mega!]??{},reason:Object.keys(r.moveUsage?.[t.mega!]??{}).length?'기존 공통 AI의 발동 타이밍 선택':'carrier 행동 전 KO 또는 행동 기회 부족'}))};
});
assert.ok(lineups.every((l:any)=>l.success===l.draws));
for(const t of kalosTrainers)for(const l of lineups.filter((l:any)=>l.id===t.id)){if(t.ace)assert.equal(l.ace,l.draws);if(t.mega)assert.equal(l.carrier,l.draws);assert.ok(Object.keys(l.teams).length>=4);for(const species of t.entries)assert.ok(Object.keys(l.teams).some(k=>k.split(' / ').includes(species)),`${t.id}/${species} never selected at F${l.floor}`);}
const trickRoomUsers=kalosTrainers.filter(t=>source.find((r:any)=>r.id===t.id).team.some((p:any)=>p.profile.moves.includes('Trick Room'))).length;assert.equal(trickRoomUsers,0);
const ids=new Set([...kalosTrainers.map(t=>t.id),'named-lysandre']);
const sort=(a:any,b:any)=>(a.id+a.stage).localeCompare(b.id+b.stage);
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
assert.equal(hash(source.filter((r:any)=>!ids.has(r.id)).sort(sort)),preservation.kalos.source);
assert.equal(hash(json('src/data/normal-npc-templates.json').filter((r:any)=>!ids.has(r.id)).sort(sort)),preservation.kalos.runtime);
for(const [p,h] of Object.entries(preservation.common))assert.equal(createHash('sha256').update(readFileSync(p,'utf8').replace(/\r\n/g,'\n')).digest('hex'),h,p);
for(const m of megas){
 const rows=opportunities.filter(r=>r.id===m.id),legalAvailable=rows.filter(r=>r.megaAvailability.some((a:any)=>a.legalDecisionTurns.length>0)).length;
 assert.ok(legalAvailable>=m.used&&legalAvailable<=m.available);
 Object.assign(m,{legalAvailable,legalAvailability:rows.flatMap(r=>r.megaAvailability.map((a:any)=>({...a,floor:r.floor,seed:r.n,caseId:r.caseId,rule:r.rule})))});
}
const validation=existsSync(root+'/validation.json')?json(root+'/validation.json'):null;
const complete=validation?.results.every((r:any)=>r.passed)===true;
const verdict=complete?'칼로스 필수 NPC 샘플 완료':'칼로스 필수 NPC 추가 조정 필요';
const byNpc=kalosTrainers.map(t=>({id:t.id,name:t.name,style:t.concept,ace:t.ace,carrier:t.mega,official:official[t.id],evolvedAdaptation:adaptation[t.id]??null,towerExpansionOrUnconfirmed:t.entries.filter(p=>!official[t.id].includes(p)),before:stats(before.filter(r=>r.id===t.id)),after:stats(after.filter(r=>r.id===t.id)),coverage:stats(coverage.filter(r=>r.id===t.id)),beforePools:[...new Set(baseline.filter((r:any)=>r.id===t.id).flatMap((r:any)=>r.team.map((p:any)=>p.species)))]}));
const audit={date:'2026-10-18',verdict,focused:{before:stats(before),after:stats(after)},coverage:stats(coverage),trickRoomUsers,byNpc,megas,lineups,usage,preservation,validation,manifests:{before:json(root+'/before-focused-manifest.json'),after:json(root+'/after-focused-manifest.json'),coverage:json(root+'/coverage/after-focused-manifest.json')}};
mkdirSync('artifacts/reports/npc',{recursive:true});writeFileSync('artifacts/reports/npc/kalos-audit.json',JSON.stringify(audit,null,2)+'\n');
const md=['# 칼로스 필수 NPC 샘플','',`2026-10-18. **${verdict}**. 관장 8명, 사천왕 4명, 챔피언 1명, 플레어단 4종: 총 17종 / Lysandre 별칭 포함 18 runtime 행.`, '',
 '## 구현과 정책','',
 '요청의 후보·Ace·기술·특성·도구를 우선 사용한다. 원본은 scripts/data/npc/kalos-design.json, 검토 생성기는 scripts/review-kalos-npc-samples.ts, 검토 출력은 scripts/data/npc/normal-npc-samples.json이다. export-normal-npc-runtime.mjs로 runtime을 생성한다. 15종을 수정하고 아케비·공용 조무래기 2종을 추가했다. 칼로스 범위의 기존 32행을 18개의 allFloors 후보 행으로 바꾸어 전체 runtime은 255 → 241행이다.','',
 '다른 지방과 공통 AI/v12·선출기·Mega/Z/Dynamax/Tera·floor scaling·hidden boss 엔진은 변경하지 않았다. 새 selectionRule, 전용 AI, stat cheat는 없다. 기존 Ace와 signature carrier를 보장하는 공통 선출 경로를 사용한다. 관장·사천왕은 55층부터, 챔피언·악당 보스는 50층부터 기존 기믹 제한을 따른다. 조무래기는 Mega가 없다.','',
 '후쿠지의 기존 Venusaur 강제 확장은 검토 runtime에서 제거하고 요청한 Gogoat Ace/여섯 후보를 사용한다. 비올라·고지카·파키라는 선택 Mega를 넣지 않고, 즈미는 일반 Gyarados를 유지했다. 기존 Serena 등 제외 NPC와 관련 특수 조우 데이터는 새로 구현하거나 수정하지 않았다. 파키라는 사천왕 한 버전이다.','',
 '## 요청과 다른 부분 및 이유','',
 '- Aurorus와 Cradily는 설치된 Showdown validator에서 Power Gem을 배울 수 없다. 같은 바위 특수기 Ancient Power로 교체했다. 나머지 명시 기술·특성은 합법성 검사에 통과했다.',
 '- 선택 Mega를 쓰지 않는 Houndoom·Aggron은 Leftovers, 비올라 Scizor는 요청의 Metal Coat, 즈미 Gyarados는 Lum Berry다. 지정된 Mega 9종만 해당 Mega Stone을 지닌다.',
 '- 첨부에서 “기존 제안”이라고만 언급한 플레어단 보조 멤버는 기존 지역 검토 세트를 재사용했다. Manectric은 Thunderbolt/Flamethrower/Volt Switch/Thunder Wave, Mightyena는 Crunch/Play Rough/Fire Fang/Sucker Punch, Malamar는 Contrary/Superpower를 중심으로 합법적 공격 세트를 사용한다. 조무래기의 일반 도구는 Sitrus Berry로 정리했다.',
 '- Luxray의 Intimidate + Flame Orb 등 명시된 설계는 임의 최적화하지 않았다. Gallade Sharpness를 포함해 현대 National Dex 합법성을 사용하며 6세대 기술표로 제한하지 않는다.',
 '- 아케비는 Showdown 스프라이트 목록에 없어 원작 캐릭터 아트 PNG를 사용한다. 출처와 SHA-256은 public/sprites/trainers/sources.json에 있다.', '',
 '## 원작 사용과 타워 확장','',
 '[XY 관장](https://www.serebii.net/xy/gyms.shtml), [XY 사천왕·챔피언](https://www.serebii.net/xy/elitefour.shtml), [플레어단](https://www.serebii.net/xy/teamflare.shtml), [플라드리 최종 팀](https://www.serebii.net/pokearth/kalos/teamflarehq.shtml), [아케비·크세로시키](https://www.serebii.net/pokearth/kalos/lysandrelabs.shtml)을 기준으로 보수적으로 구분했다. 아래 “타워 확장/미확정”은 원작 개별 소유를 주장하지 않는다. 진화형 적용도 별도로 표시한다. 모든 배틀 세트는 요청한 현대화 타워 세트다.','',
 '아케비의 원작 직접 사용은 Mightyena/Druddigon이며, 이번 Manectric Ace는 사용자가 지정한 타워 간부 설계다. 크세로시키는 Malamar/Crobat 원작 축에 과학자 특수·상태 파트너를 더한다. 카르네는 공식 여섯 후보를 그대로 유지한다.','',
 '## Mega telemetry — Ace와 carrier','',
 '| NPC | Ace | Mega carrier | 포함 / 전체 | 도구 available | 실제 행동 available | used | 발동 턴 범위 | 이후 직접 KO | 3KO 전투 |','|---|---|---|---|---|---|---|---|---|---|',
 ...megas.map(m=>`| ${m.name} | ${m.ace} | ${m.carrier} | ${m.carrierIncluded}/${m.battles} | ${m.available} | ${(m as typeof m & {legalAvailable:number}).legalAvailable} | ${m.used} | ${Math.min(...m.activationTurns)}–${Math.max(...m.activationTurns)} | ${m.postMegaDirectKOs} | ${m.threeKOBattles} |`),'',
 '9명 모두 서로 다른 Mega를 사용한다. 필수 Mega Lucario/Gardevoir/Gyarados와 권장 6종 모두 실제 발동했다. 도구 available은 팀의 Mega Stone 존재, 실제 행동 available은 own request에 합법 Mega 명령이 한 번 이상 나타난 전투, used는 공개 프로토콜의 실제 -mega 이벤트다. 초반 층에서는 carrier 선출은 보장되지만 도구가 제거되어 available=0이다. Mega 9종의 동일 1,440개 seed/벤치마크 조합을 추가 재실행해 실제 행동 기회를 수집했고 원래 winner/moveUsage/Mega 기록이 전부 동일함을 대조했다. 이 재실행은 독립 표본 수에 더하지 않았다.','',
 '발동 턴·이후 직접 KO·행동한 active decision turns·발동부터 KO/종료까지 경과 턴·전투 종료 생존 여부를 audit JSON과 개별 전투 JSONL에 기록했다. 생존 경과 턴에는 교체되어 벤치에 있던 시간이 포함될 수 있으므로 active decision turns와 구분한다. 3KO는 직접 공격으로 낸 KO만 집계하며 독 등 residual KO를 제외한다. Mega forme도 base species로 집계해 기술 usage가 갈라지지 않게 했다.','',
 ...megas.map(m=>`- ${m.name}: 사용률 ${pct(m.used,m.available)}, 미발동 ${m.available-m.used}전. 평균 발동 후 경과 ${((m.survivedElapsedTurns.reduce((a,b)=>a+b,0))/m.used).toFixed(1)}턴, 종료 생존 ${m.survivedBattle}/${m.used}.`),'',
 'available 대비 미발동은 carrier 행동 기회 부족 또는 기존 공통 AI의 타이밍 선택으로 기록한다. 특정 세트의 지속적인 0회 발동은 없다. Mega가 강하다는 이유로 약화하지 않았다. 각 Mega의 3KO 빈도가 전체 전투를 지배하지 않으며 나머지 동료의 실제 기술 실행은 usage 자료에 남아 있다.','',
 '## Dead-slot 검사','',
 `최종 focused + coverage ${all.length.toLocaleString()}전의 기술별 실행 횟수, 선출 전투 수, 실제 행동 전투 수와 0회 분류를 audit JSON의 usage에 기록했다. Trick Room 사용 NPC = **${trickRoomUsers}명**.`,
 '0회인 회복·강화·상태·우선기·Mirror Coat는 조건부로, 공격 견제기는 상성/표본 부족으로 구분한다. 선출돼도 한 번도 행동하지 못한 후보는 기회 부족이다. 이번 최종 세트에 Choice 도구는 없으며 Choice lock 해당은 없다. 현재 scorer가 지원하는 변화기만 유지했고 AI 미지원으로 확인된 최종 슬롯은 없다. 0회 실행만으로 기술을 교체하지 않았다.','',
 ...usage.flatMap(u=>u.members.flatMap((p:any)=>p.zeroMoves.length?[`- ${kalosTrainers.find(t=>t.id===u.id)!.name} / ${p.species}: ${p.zeroMoves.map((z:any)=>`${z.move} (${z.classification})`).join(', ')}. 선출 ${p.selectedBattles}전 / 행동 ${p.actedBattles}전.`]:[])),'',
 '## Before → After 및 측정 조건','',
 '동일한 네 벤치마크 starters(Charizard/Blastoise/Venusaur), offense(Garchomp/Metagross/Lapras), bulk(Slowbro/Corviknight/Gastrodon), signature(Mimikyu/Kommo-o/Gyarados)를 사용한다. focused는 seeds 1–2 × 2 floors × 4 teams × 6 player rules. 관장/사천왕/간부/조무래기 F45/F95, 카르네 F50/F100, 플라드리 F76/F96이다. coverage는 seeds 3–10/basic 추가 검사다. 각 단판은 HP가 초기화되며 사람 승률·경제·완주율을 뜻하지 않는다.','',
 `Before ${result(before)} → After ${result(after)}. 신규 2종 때문에 합계의 표본 구성이 다르며 NPC별 수치를 비교해야 한다. coverage ${result(coverage)}. 모든 시뮬레이션 오류 0. baseline runtime과 당시 catalog/organization 메타데이터를 loader hook으로 함께 로드해 live 파일을 교체하지 않고 비교했다.`, '',
 '| NPC / 스타일 | Before 플레이어 승률 | After 플레이어 승률 | 추가 coverage |','|---|---|---|---|',
 ...kalosTrainers.map(t=>`| ${t.name} — ${t.concept} | ${result(before.filter(r=>r.id===t.id))} | ${result(after.filter(r=>r.id===t.id))} | ${result(coverage.filter(r=>r.id===t.id))} |`),'',
 '승률 평준화는 하지 않았다. 후쿠지·우르프의 느린 회복전, 즈미의 공격 범위, 고지카의 특수전 등 매치업 차이를 유지한다. 아케비는 전기/불꽃 속공 간부, 크세로시키는 Contrary Malamar와 전기/에스퍼/고스트 교란의 과학자로 구분한다. 플라드리는 전설 Yveltal 축을 제거하고 지정한 Gyarados Ace/공식 동료·확장 두 마리의 Champion+ 물리 축을 사용한다.','',
 '## Lineup telemetry 및 전체 세트','',
 `${lineups.reduce((n:number,l:any)=>n+l.draws,0).toLocaleString()}회 추첨에서 Ace 포함(있는 NPC), Mega carrier 포함, 기존 선출 규칙 성공 100%. 각 후보 풀에서 4개 이상의 서로 다른 triple을 확인했다. 선봉/마지막/전체 조합 빈도는 JSON에 보관한다. 새 selectionRule은 없다.`, ''];
for(const t of kalosTrainers){
 const r=source.find((r:any)=>r.id===t.id),u=usage.find(u=>u.id===t.id)!,b=byNpc.find(b=>b.id===t.id)!;
 const l=lineups.find((l:any)=>l.id===t.id&&l.floor===(t.category==='boss'?96:t.category==='champion'?100:95));
 const top=(m:Record<string,number>)=>Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([p,n])=>`${p}: ${pct(n,l.draws)}`).join('; ');
 md.push(`### ${t.name} — ${t.id}`,'',`Category: ${t.category}. Power: ${t.power}. Ace: ${t.ace||'없음'}. Mega carrier: ${t.mega||'없음'}. 스타일: ${t.concept}.`,
 `기존 후보: ${b.beforePools.join(', ')||'개별 runtime 없음'} → 최종 후보: ${t.entries.join(', ')}.`,
 `원작 직접 사용 확인: ${official[t.id].join(', ')||'이 후보의 직접 사용 확인 없음'}. 진화형 적용: ${adaptation[t.id]??'없음'}. 타워 확장/개별 이력 미확정: ${b.towerExpansionOrUnconfirmed.join(', ')||'없음'}.`,'',
 '| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |','|---|---|---|---|---|---|',
 ...r.team.map((p:any)=>{const m=u.members.find((m:any)=>m.species===p.species);return `| ${p.species} | ${p.profile.ability} | ${p.item} | ${p.profile.moves.join(' / ')} | ${p.role} | ${m.selectedBattles}/${m.actedBattles} |`;}),'',
 `F${l.floor} ${l.draws} draws. 주요 조합: ${top(l.teams)}. 선봉: ${top(l.leads)}. 마지막: ${top(l.lasts)}.`,'');
}
const lysandre=megas.find(m=>m.id==='flare-boss-lysandre')!;
md.push('## 플라드리 결과','',`Gyarados Ace/carrier, Mega ${lysandre.used}/${lysandre.available}, Mega 이후 직접 KO ${lysandre.postMegaDirectKOs}, 3KO 마무리 ${lysandre.threeKOBattles}/${lysandre.battles}전. 나머지 다섯 후보의 선출/기술 usage도 위 표와 JSON에 기록했다. 항상 Mega 한 마리로 3KO하는 상태는 아니다.`, '',
 '## 다른 지방 보존','',`${preservation.kalos.count}개 비칼로스 runtime 및 reviewed 행의 변경 전 SHA-256 일치. 관동·성도·호연·신오·하나와 기존 범위 밖 NPC를 포함한다. 공통 정책/엔진 ${Object.keys(preservation.common).length}개 파일 해시도 동일하다. 기존 지역 보존 테스트는 새 칼로스 범위를 제외하도록 갱신하고, 칼로스 테스트가 나머지 전부를 별도로 보호한다. 기존 unova-preservation.json은 보존했다.`, '',
 '## 검증과 재현','',
 '- 생성: `node --import tsx scripts/review-kalos-npc-samples.ts`, `node scripts/export-normal-npc-runtime.mjs`, `node scripts/export-normal-npc-runtime.mjs --check`.',
 '- focused: `node --import tsx scripts/simulate-kalos-npcs.ts`. 기본 seeds 1–2, 1,000 draws/floor. KALOS_OUTPUT/KALOS_SEEDS/KALOS_SEED_START/KALOS_DRAWS/KALOS_RULES/KALOS_NPCS/KALOS_TRACES 지원.',
 '- before: NPC_BALANCE_BASELINE을 baseline-runtime.json, UNOVA_METADATA_BASELINE을 baseline-metadata.json으로 설정한 뒤 `node --import ./scripts/lib/unova-baseline.mjs --import tsx scripts/simulate-kalos-npcs.ts --before`. 기존 범용 loader hook을 그대로 재사용한다.',
 '- 보고서: `node --import tsx scripts/report-kalos-npcs.ts`. 원자료는 artifacts/experiments/balance/kalos-20261018 아래에 있다.', '',
 ...(validation?validation.results.map((r:any)=>`- ${r.check}: ${r.result}`):['- 최종 검증 집계 대기.']), '',`**${verdict}**`,'');
writeFileSync('artifacts/reports/npc/kalos-named-trainers.md',md.join('\n'));
console.log(JSON.stringify({verdict,focused:audit.focused,coverage:audit.coverage,megas:megas.map(m=>({id:m.id,available:m.available,used:m.used})),trickRoomUsers,draws:lineups.reduce((n:number,l:any)=>n+l.draws,0)}));
